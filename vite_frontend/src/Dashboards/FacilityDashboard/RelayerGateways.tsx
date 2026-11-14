// ============== RelayerGateways.tsx ==============

import React, { useEffect, useState } from 'react';
import {
  getRelayersForGateway,
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
import type {
  GatewayAssignedEvent,
  GatewayReassignedEvent,
  KeyRotatedEvent,
} from './../facillity_dashboard_mocks';
import type { Measurement, CadencePolicy } from './../../types';
import {
  FieldBlock,
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

  const [relayers, setRelayers] = useState<string[]>([]);
  const [policy, setPolicy] = useState<CadencePolicy>({
    expectedInterval: BigNumber(0),
    gracePeriod: BigNumber(0),
  });
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [assigned, setAssigned] = useState<GatewayAssignedEvent[]>([]);
  const [reassigned, setReassigned] = useState<GatewayReassignedEvent[]>([]);
  const [rotations, setRotations] = useState<KeyRotatedEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [r, p, m, a, ra, k] = await Promise.all([
          getRelayersForGateway(facilityAddress, gateway),
          getGatewayStatus(facilityAddress, gateway),
          getAllMeasurements(facilityAddress, gateway),
          getGatewayAssignedEvents(facilityAddress, gateway),
          getGatewayReassignedEvents(facilityAddress, gateway),
          getKeyRotatedEvents(facilityAddress, gateway),
        ]);
        if (cancelled) return;
        setRelayers(r);
        setPolicy(p);
        setMeasurements(m);
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

  // ── Measurement detail page ──
  if (page.kind === 'measurement-detail') {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldBlock label="Document CID" value={page.measurement.documentCid} mono />
          <FieldBlock label="Signature" value={page.measurement.signature} mono />
        </div>

        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
            Verification
          </div>
          <StatusPill
            ok={page.measurement.verified}
            okText="Verified"
            badText="Invalid signature"
          />
        </div>

        <div className="text-xs text-ink-faint italic pt-3 border-t border-border">
          Measurement analysis coming in a future version.
        </div>
      </div>
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

      {/* Relayers */}
      <section>
        <SectionHeader icon="🔗" title="Managed by relayers" count={relayers.length} />
        {relayers.length === 0 ? (
          <EmptyHint>No relayers assigned.</EmptyHint>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {relayers.map((r) => (
              <button
                key={r}
                onClick={() => onNavigate('relayer', r)}
                title={r}
                className="font-mono text-[0.72rem] px-2.5 py-1 rounded-[5px] border border-border-strong bg-surface-muted text-ink hover:border-accent hover:bg-accent-soft hover:text-accent cursor-pointer transition-colors"
              >
                {shortAddr(r)}
              </button>
            ))}
          </div>
        )}
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
                key={m.documentCid}
                onClick={() => setPage({ kind: 'measurement-detail', measurement: m })}
                className="w-full text-left bg-surface-muted border border-border rounded-[5px] px-3 py-2.5 hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.72rem] break-all text-ink group-hover:text-accent">
                    {shortAddr(m.documentCid, 12, 8)}
                  </span>
                  <StatusPill ok={m.verified} okText="OK" badText="BAD SIG" compact />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <SectionHeader icon="🕓" title="History" />
        <EventList assigned={assigned} reassigned={reassigned} rotations={rotations} />
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
  const [registeredAt, setRegisteredAt] = useState<number | null>(null);

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
      {/* Registered at */}
      <section>
        <SectionHeader icon="📅" title="Registered at" />
        <StatCard
          label="Registration date"
          value={registeredAt ? formatTimestamp(registeredAt) : '—'}
        />
        <div className="text-[0.68rem] text-ink-faint italic mt-1.5 font-mono">
          from RelayerRegistered event
        </div>
      </section>

      {/* Manages gateways */}
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

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-md w-[80vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div className="min-w-0">
            <div className="text-[0.7rem] text-ink-muted uppercase tracking-wide">
              {title}
            </div>
            <div className="font-mono text-[0.8rem] break-all">{selected.address}</div>
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

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {selected.kind === 'gateway' && (
            <GatewayBody
              facilityAddress={facilityAddress}
              gateway={selected.address}
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