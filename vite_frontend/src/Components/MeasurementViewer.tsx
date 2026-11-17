// ============== MeasurementViewer.tsx ==============

import React, { useEffect, useMemo, useState } from 'react';
import { solidityPackedKeccak256, getBytes, verifyMessage } from 'ethers';
import { FieldBlock } from './../Dashboards/FacilityDashboard/DashboardUtils';
import type { GatewayDocumentAttestation } from './../Dashboards/facillity_dashboard_mocks';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// ── Raw IPFS document shape ──
interface RawMeasurementDoc {
  variables: Record<string, number | number[]>;
  Unit: Record<string, string>;
  md: Record<string, string>;
  signature?: string;
}

// ── Verify attestation signature over solidityPackedKeccak256([facilityAddress, gatewayId, gatewayAddress, documentCID]) ──
const verifyAttestationSignature = (
  attestation: GatewayDocumentAttestation,
  expectedKey: string | null,
  historicalKeys: string[] = [],
): {
  status: 'valid' | 'invalid' | 'unknown';
  isHistorical?: boolean;
  recovered?: string;
  error?: string;
} => {
  if (!attestation.signature) {
    return { status: 'invalid', error: 'No signature in attestation.' };
  }

  try {
    const digest = solidityPackedKeccak256(
      ['address', 'string', 'address', 'string'],
      [
        attestation.facilityAddress,
        attestation.gatewayId,
        attestation.gatewayAddress,
        attestation.documentCID,
      ],
    );

    const sig = attestation.signature.startsWith('0x')
      ? attestation.signature
      : `0x${attestation.signature}`;

    const recovered = verifyMessage(getBytes(digest), sig);
    const recoveredLower = recovered.toLowerCase();

    if (recoveredLower !== attestation.gatewayAddress.toLowerCase()) {
      return {
        status: 'invalid',
        recovered,
        error: `Recovered ${recovered} does not match attestation gatewayAddress ${attestation.gatewayAddress}.`,
      };
    }

    if (expectedKey && recoveredLower === expectedKey.toLowerCase()) {
      return { status: 'valid', isHistorical: false, recovered };
    }

    if (historicalKeys.some((k) => k.toLowerCase() === recoveredLower)) {
      return { status: 'valid', isHistorical: true, recovered };
    }

    if (!expectedKey && historicalKeys.length === 0) {
      return { status: 'unknown', recovered };
    }

    return { status: 'invalid', recovered };
  } catch (err) {
    return {
      status: 'invalid',
      error: err instanceof Error ? err.message : 'Signature check failed.',
    };
  }
};

// ── Inline sparkline (no deps) ──
const Sparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({
  values,
  width = 220,
  height = 56,
}) => {
  if (values.length === 0) return null;

  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="block">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill="currentColor" />
      ))}
    </svg>
  );
};

// ── One variable row ──
const VariableCard: React.FC<{
  name: string;
  value: number | number[];
  unit?: string;
  description?: string;
}> = ({ name, value, unit, description }) => {
  const isSeries = Array.isArray(value);

  return (
    <div className="bg-surface-muted border border-border rounded-[5px] px-3 py-2.5 space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[0.8rem] text-ink font-semibold truncate">
            {name}
          </div>
          {description && (
            <div className="text-[0.7rem] text-ink-muted mt-0.5">{description}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          {isSeries ? (
            <span className="text-[0.7rem] font-mono text-ink-muted">
              {value.length} pts
            </span>
          ) : (
            <span className="font-mono text-[0.85rem] text-ink">
              {value}
              {unit ? <span className="text-ink-muted text-[0.7rem] ml-1">{unit}</span> : null}
            </span>
          )}
        </div>
      </div>

      {isSeries && (
        <div className="text-ink">
          <Sparkline values={value} />
          <div className="flex items-center justify-between text-[0.65rem] font-mono text-ink-faint mt-0.5">
            <span>
              min {Math.min(...value)}
              {unit ? ` ${unit}` : ''}
            </span>
            <span>
              max {Math.max(...value)}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── The viewer ──
export interface MeasurementViewerProps {
  attestation: GatewayDocumentAttestation;
  /** Resolved gateway public key (EVM address) for signature verification. */
  gatewayKey?: string | null;
  /** Prior EVM addresses from KeyRotated events for this gateway. */
  historicalKeys?: string[];
}

export const MeasurementViewer: React.FC<MeasurementViewerProps> = ({
  attestation,
  gatewayKey,
  historicalKeys,
}) => {
  const cid = attestation.documentCID;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<RawMeasurementDoc | null>(null);

  const verification = useMemo(
    () => verifyAttestationSignature(attestation, gatewayKey ?? null, historicalKeys ?? []),
    [attestation, gatewayKey, historicalKeys],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setDoc(null);

      try {
        const res = await fetch(`${IPFS_GATEWAY}/${cid}`);
        if (!res.ok) {
          throw new Error(`IPFS fetch failed: ${res.status} ${res.statusText}`);
        }
        const parsed = (await res.json()) as RawMeasurementDoc;
        if (cancelled) return;
        setDoc(parsed);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load measurement.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cid]);

  return (
    <div className="space-y-4">
      <FieldBlock label="Document CID" value={cid} mono />

      <div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-mono">
        <a
          href={`${IPFS_GATEWAY}/${cid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border border-border-strong bg-surface text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors"
        >
          <span className="text-ink-muted">ipfs:</span>
          <span>open raw ↗</span>
        </a>
      </div>

      {/* Verification */}
      <div>
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
          Signature
        </div>
        {verification.status === 'valid' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-[#b7e0c1] bg-[#eefaf1] text-[#1f6b36] text-[0.72rem] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f6b36]" />
            {verification.isHistorical ? 'Verified (historical key)' : 'Verified'}
          </span>
        )}
        {verification.status === 'invalid' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] text-[0.72rem] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a12626]" />
            Invalid signature
          </span>
        )}
        {verification.status === 'unknown' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-border-strong bg-surface-muted text-ink-muted text-[0.72rem] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            Unverified (no gateway key)
          </span>
        )}
        {verification.recovered && (
          <div className="text-[0.68rem] font-mono text-ink-faint mt-1">
            signer: {verification.recovered}
          </div>
        )}
        {verification.error && (
          <div className="text-[0.68rem] text-[#a12626] mt-1">{verification.error}</div>
        )}
      </div>

      {loading && <div className="text-sm text-ink-muted">Loading measurement…</div>}
      {error && (
        <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
          {error}
        </div>
      )}

      {doc && (
        <>
          {/* Global description */}
          {doc.md?.global && (
            <div className="text-[0.8rem] text-ink leading-relaxed">
              {doc.md.global}
            </div>
          )}

          {/* Variables */}
          <div className="space-y-2">
            {Object.entries(doc.variables ?? {}).map(([name, value]) => (
              <VariableCard
                key={name}
                name={name}
                value={value}
                unit={doc.Unit?.[name]}
                description={doc.md?.[name]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};