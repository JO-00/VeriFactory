// ============== MeasurementViewer.tsx ==============

import React, { useEffect, useMemo, useState } from 'react';
import { sha256, toUtf8Bytes, recoverAddress, hashMessage } from 'ethers';
import { FieldBlock } from './../Dashboards/FacilityDashboard/DashboardUtils';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// ── Raw IPFS document shape (per the Python signer) ──
interface RawMeasurementDoc {
  variables: Record<string, number | number[]>;
  Unit: Record<string, string>;
  md: Record<string, string>;
  signature?: string;
}

// ── Canonical JSON exactly as the Python signer produces it ──
const canonicalize = (obj: unknown): string => {
  // sort_keys=True, separators=(",", ":"), ensure_ascii=False
  const sortValue = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortValue);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sortValue((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sortValue(obj));
};

// ── Verify: sha256(canonical_json_without_signature), signed as "sha256:<hex>" ──
const verifySignature = (
  doc: RawMeasurementDoc,
  expectedKey: string | null,
): { status: 'valid' | 'invalid' | 'unknown'; recovered?: string; error?: string } => {
  if (!doc.signature) {
    return { status: 'invalid', error: 'No signature in document.' };
  }

  try {
    const { signature, ...rest } = doc;
    const canonical = canonicalize(rest);
    const digestHex = sha256(toUtf8Bytes(canonical)); // 0x + 64 hex
    const digestNo0x = digestHex.replace(/^0x/, '');
    const message = `sha256:${digestNo0x}`;
    const recovered = recoverAddress(hashMessage(message), `0x${signature.replace(/^0x/, '')}`);

    if (!expectedKey) {
      return { status: 'unknown', recovered };
    }

    const ok = recovered.toLowerCase() === expectedKey.toLowerCase();
    return { status: ok ? 'valid' : 'invalid', recovered };
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
  cid: string;
  /** Resolved gateway public key (EVM address) for signature verification. */
  gatewayKey?: string | null;
}

export const MeasurementViewer: React.FC<MeasurementViewerProps> = ({
  cid,
  gatewayKey,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<RawMeasurementDoc | null>(null);

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

  const verification = useMemo(() => {
    if (!doc) return null;
    return verifySignature(doc, gatewayKey ?? null);
  }, [doc, gatewayKey]);

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

      {loading && <div className="text-sm text-ink-muted">Loading measurement…</div>}
      {error && (
        <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
          {error}
        </div>
      )}

      {doc && (
        <>
          {/* Verification */}
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
              Signature
            </div>
            {verification?.status === 'valid' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-[#b7e0c1] bg-[#eefaf1] text-[#1f6b36] text-[0.72rem] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f6b36]" />
                Verified
              </span>
            )}
            {verification?.status === 'invalid' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] text-[0.72rem] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a12626]" />
                Invalid signature
              </span>
            )}
            {verification?.status === 'unknown' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border border-border-strong bg-surface-muted text-ink-muted text-[0.72rem] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                Unverified (no gateway key)
              </span>
            )}
            {verification?.recovered && (
              <div className="text-[0.68rem] font-mono text-ink-faint mt-1">
                signer: {verification.recovered}
              </div>
            )}
            {verification?.error && (
              <div className="text-[0.68rem] text-[#a12626] mt-1">{verification.error}</div>
            )}
          </div>

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