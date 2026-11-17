// ============== RelayerGateways.tsx ==============

import React, { useEffect, useMemo, useState } from 'react';
import {
  getGatewaysForRelayer,
  getGatewayStatus,
  getAllMeasurements,
  getRelayerRegisteredAt,
  getGatewayReassignedEvents,
  getKeyRotatedEvents,
  getGatewayAssignedEvents,
  shortAddr,
  formatCadence,
  formatTimestamp,
} from './../facillity_dashboard_mocks';
import { MeasurementViewer } from './../../Components/MeasurementViewer';
import type {
  GatewayAssignedEvent,
  GatewayReassignedEvent,
  GatewayDocumentAttestation,
} from './../facillity_dashboard_mocks';
import type { CadencePolicy, RelayerRegisteredEvent, KeyRotatedEvent } from './../../types';
import {
  StatusPill,
  StatCard,
  SectionHeader,
  EmptyHint,
  EventList,
} from './DashboardUtils';
import type {
  EntityModalProps,
  RelayerBodyProps,
  GatewayBodyProps,
} from '../dashboard_types';
import BigNumber from 'bignumber.js';
import { FacilityContractRead } from '../../HashGraphUtils/Contracts/Facility/FacilityRead';

// ============================================================
// Gateway body
// ============================================================

const GatewayBody: React.FC<GatewayBodyProps> = ({
  facilityAddress,
  gateway,
  page,
  setPage,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [policy, setPolicy] = useState<CadencePolicy>({
    expectedInterval: BigNumber(0),
    gracePeriod: BigNumber(0),
  });
  const [measurements, setMeasurements] = useState<GatewayDocumentAttestation[]>([]);
  const [assigned, setAssigned] = useState<GatewayAssignedEvent[]>([]);
  const [reassigned, setReassigned] = useState<GatewayReassignedEvent[]>([]);
  const [rotations, setRotations] = useState<KeyRotatedEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, docs, a, ra, k] = await Promise.all([
          getGatewayStatus(facilityAddress, gateway),
          getAllMeasurements(facilityAddress, gateway),
          getGatewayAssignedEvents(facilityAddress, gateway),
          getGatewayReassignedEvents(facilityAddress, gateway),
          getKeyRotatedEvents(facilityAddress, gateway),
        ]);
        if (cancelled) return;
        setPolicy(p);
        setMeasurements(docs);
        setAssigned(a);
        setReassigned(ra);
        setRotations(k);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gateway.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [facilityAddress, gateway]);

  const historicalKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const rot of rotations) {
      if (rot.oldKey) keys.add(rot.oldKey);
      if (rot.newKey) keys.add(rot.newKey);
    }
    return Array.from(keys);
  }, [rotations]);

  // ── Measurement detail page ──
  if (page.kind === 'measurement-detail') {
    const attestation: GatewayDocumentAttestation =
      'documentCID' in page.measurement
        ? (page.measurement as unknown as GatewayDocumentAttestation)
        : measurements.find((m) => m.documentCID === page.measurement.documentCid) ?? {
            id: 0,
            consensusTimestamp: '',
            facilityAddress,
            gatewayId: '',
            gatewayAddress: gateway,
            documentCID: page.measurement.documentCid,
            signature: page.measurement.signature ?? '',
            createdAt: '',
          };

    return (
      <MeasurementViewer
        attestation={attestation}
        gatewayKey={gateway && gateway !== '…' ? gateway : null}
        historicalKeys={historicalKeys}
      />
    );
  }

  // ── Loading / error ──
  if (loading) {
    return <div className="text-sm text-ink-muted">Loading gateway…</div>;
  }
  if (error) {
    return (
      <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
        {error}
      </div>
    );
  }

  // ── Overview page ──
  return (
    <div className="space-y-6">
      {/* Cadence */}
      <section>
        <SectionHeader icon="⏱" title="Cadence policy" />
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Expected interval" value={formatCadence(policy.expectedInterval.toNumber())} />
          <StatCard label="Grace period" value={formatCadence(policy.gracePeriod.toNumber())} />
        </div>
      </section>

      {/* Measurements */}
      <section>
        <SectionHeader icon="📡" title="Measurements" count={measurements.length} />
        {measurements.length === 0 ? (
          <EmptyHint>No measurements yet.</EmptyHint>
        ) : (
          <div className="space-y-1.5">
            {measurements.map((m) => (
              <button
                key={`${m.documentCID}-${m.consensusTimestamp}`}
                onClick={() =>
                  setPage({
                    kind: 'measurement-detail',
                    measurement: {
                      ...m,
                      documentCid: m.documentCID,
                      verified: false,
                    },
                  })
                }
                className="w-full text-left bg-surface-muted border border-border rounded-[5px] px-3 py-2.5 hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.72rem] break-all text-ink group-hover:text-accent">
                    {shortAddr(m.documentCID, 12, 8)}
                  </span>
                  <span className="text-[0.68rem] font-mono text-ink-muted group-hover:text-accent">
                    view ↗
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Key Rotations */}
      <section>
        <SectionHeader icon="🔑" title="Key rotations" count={rotations.length} />
        {rotations.length === 0 ? (
          <EmptyHint>No key rotations recorded.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {rotations.map((rot) => (
              <div
                key={`${rot.transactionHash}-${rot.logIndex}`}
                className="bg-surface-muted border border-border rounded-[5px] px-3 py-2.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusPill
                    ok={!rot.isAnomalous}
                    okText="Normal rotation"
                    badText="Anomalous rotation"
                    compact
                  />
                  <span className="text-[0.72rem] text-ink-muted font-mono">
                    {formatTimestamp(rot.contractTimestampMs / 1000)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-[0.75rem]">
                  <span
                    title={rot.oldKey}
                    className="px-2 py-0.5 rounded bg-surface border border-border-strong text-ink-muted"
                  >
                    {shortAddr(rot.oldKey, 8, 6)}
                  </span>
                  <span className="text-ink-faint">→</span>
                  <span
                    title={rot.newKey}
                    className="px-2 py-0.5 rounded bg-surface border border-border-strong text-ink font-semibold"
                  >
                    {shortAddr(rot.newKey, 8, 6)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-[0.7rem] font-mono">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${rot.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={rot.transactionHash}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border border-border-strong bg-surface text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors"
                    >
                      <span className="text-ink-muted">tx:</span>
                      <span>{shortAddr(rot.transactionHash, 10, 6)}</span>
                      <span aria-hidden="true">↗</span>
                    </a>

                    <a
                      href={`https://testnet.mirrornode.hedera.com/api/v1/blocks/${rot.blockNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Block #${rot.blockNumber} · tx ${rot.transactionIndex} · log ${rot.logIndex}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border border-border-strong bg-surface text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors"
                    >
                      <span className="text-ink-muted">block:</span>
                      <span>
                        #{rot.blockNumber} ({rot.transactionIndex}:{rot.logIndex})
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>

                  <span className="text-[0.68rem] text-ink-faint italic">
                    consensus ts: {rot.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <SectionHeader icon="🕓" title="History" />
        <EventList assigned={assigned} reassigned={reassigned} rotations={[]} />
      </section>
    </div>
  );
};

// ============================================================
// Relayer body
// ============================================================

const RelayerBody: React.FC<RelayerBodyProps> = ({
  facilityAddress,
  relayer,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateways, setGateways] = useState<string[]>([]);
  const [registeredAt, setRegisteredAt] = useState<RelayerRegisteredEvent | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [g, ra] = await Promise.all([
          getGatewaysForRelayer(facilityAddress, relayer),
          getRelayerRegisteredAt(facilityAddress, relayer),
        ]);
        if (cancelled) return;
        setGateways(g);
        setRegisteredAt(ra);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load relayer.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [facilityAddress, relayer]);

  if (loading) {
    return <div className="text-sm text-ink-muted">Loading relayer…</div>;
  }
  if (error) {
    return (
      <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader icon="📅" title="Registration" />
        {!registeredAt ? (
          <EmptyHint>No RelayerRegistered event found.</EmptyHint>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <StatCard
                label="Relayer name"
                value={registeredAt.name || '—'}
              />
              <StatCard
                label="Registered at"
                value={formatTimestamp(registeredAt.timestampMs / 1000)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] font-mono">
              <a
                href={`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${registeredAt.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title={registeredAt.transactionHash}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border border-border-strong bg-surface-muted text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors"
              >
                <span className="text-ink-muted">tx:</span>
                <span>{shortAddr(registeredAt.transactionHash, 10, 6)}</span>
                <span aria-hidden="true">↗</span>
              </a>

              <a
                href={`https://testnet.mirrornode.hedera.com/api/v1/blocks/${registeredAt.blockNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Block #${registeredAt.blockNumber} · tx ${registeredAt.transactionIndex} · log ${registeredAt.logIndex}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] border border-border-strong bg-surface-muted text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition-colors"
              >
                <span className="text-ink-muted">block:</span>
                <span>
                  #{registeredAt.blockNumber} ({registeredAt.transactionIndex}:{registeredAt.logIndex})
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="flex items-center justify-between text-[0.68rem] text-ink-faint italic font-mono">
              <span>from RelayerRegistered event</span>
              <span>consensus ts: {registeredAt.timestamp}</span>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionHeader icon="🌐" title="Manages gateways" count={gateways.length} />
        {gateways.length === 0 ? (
          <EmptyHint>No gateways assigned.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gateways.map((g) => (
              <button
                key={g}
                onClick={() => onNavigate('gateway', g)}
                title={g}
                className="font-mono text-[0.72rem] px-2.5 py-1 rounded-[5px] border border-border-strong bg-surface-muted text-ink hover:border-accent hover:bg-accent-soft hover:text-accent cursor-pointer transition-colors"
              >
                {shortAddr(g)}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ============================================================
// Entity modal
// ============================================================

export const EntityModal: React.FC<EntityModalProps> = ({
  facilityAddress,
  selected,
  page,
  setPage,
  onClose,
  onNavigate,
}) => {
  const title = selected.kind === 'gateway' ? 'Gateway' : 'Relayer';

  const [gatewayKey, setGatewayKey] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<Error | null>(null);

  const gatewayId = selected.kind === 'gateway' ? selected.address : null;

  useEffect(() => {
    if (selected.kind !== 'gateway') {
      return;
    }

    let cancelled = false;

    (async () => {
      setGatewayKey(null);
      setGatewayError(null);

      try {
        const key = await FacilityContractRead.getGatewayKey(
          facilityAddress,
          selected.address,
        );
        if (cancelled) return;
        setGatewayKey(key);
      } catch (err) {
        if (cancelled) return;
        setGatewayError(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected.kind, selected.address, facilityAddress]);

  const displayAddress =
    selected.kind === 'gateway'
      ? gatewayKey ?? '…'
      : selected.address;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-md w-[80vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div className="min-w-0">
            <div className="text-[0.7rem] text-ink-muted uppercase tracking-wide">
              {title}
            </div>
            {selected.kind === 'relayer' && (
              <div className="font-mono text-[0.8rem] break-all">
                {selected.id}
              </div>
            )}
            {selected.kind === 'gateway' && gatewayId && (
              <div className="font-mono text-[0.8rem] break-all">
                id: {gatewayId}
              </div>
            )}
            <div className="font-mono text-[0.8rem] break-all">
              {displayAddress}
            </div>
            {gatewayError && (
              <div className="text-[0.7rem] text-red-500">
                Failed to resolve gateway key: {gatewayError.message}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {page.kind !== 'overview' && (
              <button
                onClick={() => setPage({ kind: 'overview' })}
                className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          {selected.kind === 'gateway' && !gatewayKey && !gatewayError && (
            <div className="text-sm text-ink-muted">Resolving gateway key…</div>
          )}
          {selected.kind === 'gateway' && gatewayKey && (
            <GatewayBody
              facilityAddress={facilityAddress}
              gateway={gatewayKey}
              page={page}
              setPage={setPage}
              onNavigate={onNavigate}
            />
          )}
          {selected.kind === 'relayer' && (
            <RelayerBody
              facilityAddress={facilityAddress}
              relayer={selected.address}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </div>
    </div>
  );
};