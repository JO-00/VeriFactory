// ============== DAOMembersPanel.tsx ==============

import React, { useEffect, useState, useMemo } from 'react';
import { FetchAllFacilities, getFacilityMeta } from '../Functionalities/getFacilityInfo';
import { getFacilityDaoMembers } from '../Dashboards/facillity_dashboard_mocks';
import {
  computeGlobalDAOStats,
  computeCommitteeDrawProbabilities,
  formatStake,
  formatPct,
  COMMITTEE_SIZE,
} from '../Functionalities/dao_math';
import type { FacilityDAOStats } from '../Functionalities/dao_math';

type RowResult =
  | { status: 'loaded'; stats: FacilityDAOStats }
  | { status: 'error'; address: string };

const DAOMembersPanel: React.FC = () => {
  const [totalFacilities, setTotalFacilities] = useState<number | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const allFacilities = await FetchAllFacilities();
        if (cancelled) return;

        const addresses = Object.keys(allFacilities);
        setTotalFacilities(addresses.length);

        // Fetch one by one so each completed entry renders immediately
        for (const address of addresses) {
          if (cancelled) return;
          setActiveAddress(address);

          try {
            const [meta, members] = await Promise.all([
              getFacilityMeta(address).catch(() => null),
              getFacilityDaoMembers(address),
            ]);

            if (cancelled) return;

            const name = meta?.name || address;
            const stakes = members.map((m) => Number(m.amount));
            const totalStaked = stakes.reduce((a, b) => a + b, 0);

            setRows((prev) => [
              ...prev,
              {
                status: 'loaded',
                stats: {
                  address,
                  name,
                  memberCount: members.length,
                  totalStaked,
                  stakes,
                },
              },
            ]);
          } catch (err) {
            console.error(`Failed to load DAO for ${address}`, err);
            if (!cancelled) {
              setRows((prev) => [...prev, { status: 'error', address }]);
            }
          }
        }

        if (!cancelled) setActiveAddress(null);
      } catch (err) {
        if (!cancelled) {
          setInitialError(
            err instanceof Error ? err.message : 'Failed to load facility addresses.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadedStats = useMemo(
    () =>
      rows
        .filter((r): r is Extract<RowResult, { status: 'loaded' }> => r.status === 'loaded')
        .map((r) => r.stats),
    [rows]
  );

  const globalStats = useMemo(() => computeGlobalDAOStats(loadedStats), [loadedStats]);

  const probRows = useMemo(() => {
    return loadedStats
      .map((stats) => {
        const probs = computeCommitteeDrawProbabilities(
          stats.memberCount,
          globalStats.totalMembers
        );
        return {
          address: stats.address,
          name: stats.name,
          memberCount: stats.memberCount,
          totalStaked: stats.totalStaked,
          ...probs,
        };
      })
      .filter((r) => r.memberCount > 0)
      .sort((a, b) => b.pAtLeast1 - a.pAtLeast1 || b.totalStaked - a.totalStaked);
  }, [loadedStats, globalStats.totalMembers]);

  if (totalFacilities === null && !initialError) {
    return (
      <div className="text-ink">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">DAO Members</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Who secures the network — one wallet per seat, up to 3 seats per facility.
          </p>
        </div>
        <div className="text-sm text-ink-muted">Loading facilities list…</div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="text-ink">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">DAO Members</h1>
        </div>
        <div className="bg-[#fdecec] border border-[#f2a3a3] rounded-md px-4 py-3 text-sm text-[#a12626]">
          {initialError}
        </div>
      </div>
    );
  }

  const totalCount = totalFacilities ?? 0;
  const isStreaming = activeAddress !== null;

  return (
    <div className="text-ink">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">DAO Members</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Who secures the network — one wallet per seat, up to 3 seats per facility.
          </p>
        </div>
        {isStreaming && (
          <div className="text-xs text-ink-muted font-mono">
            Loaded {rows.length} / {totalCount}…
          </div>
        )}
      </div>

      {/* KPI strip (updates dynamically as each row arrives) */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3.5 transition-colors">
          <div className="text-sm text-ink-muted">DAO members</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.totalMembers}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5 transition-colors">
          <div className="text-sm text-ink-muted">Total staked</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {formatStake(globalStats.totalStaked)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5 transition-colors">
          <div className="text-sm text-ink-muted">Facilities with members</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.facilitiesWithMembers}
            <span className="text-ink-faint text-lg">/{totalCount}</span>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5 transition-colors">
          <div className="text-sm text-ink-muted">Full houses (3/3)</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.facilitiesWithFullHouse}
          </div>
        </div>
      </div>

      {/* Per-facility spending (Progressive Table) */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-ink mb-2">
          What each facility spent on DAO seats
        </h2>
        <div className="bg-surface border border-border rounded-md divide-y divide-border">
          {totalCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              No facilities found.
            </div>
          ) : (
            <>
              {rows.map((row) => {
                if (row.status === 'error') {
                  return (
                    <div
                      key={row.address}
                      className="flex items-center gap-4 px-4 py-3 bg-[#fdecec]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate text-[#a12626]">
                          Failed to load
                        </div>
                        <div className="font-mono text-[0.7rem] text-[#7a1a1a] break-all">
                          {row.address}
                        </div>
                      </div>
                    </div>
                  );
                }

                const { stats } = row;
                const empty = stats.memberCount === 0;
                const seats = stats.memberCount;
                const pct = Math.min(100, Math.round((seats / 3) * 100));
                const barColor =
                  seats === 0
                    ? '#3b82f6'
                    : seats === 1
                    ? '#22c55e'
                    : seats === 2
                    ? '#eab308'
                    : '#ef4444';

                return (
                  <div
                    key={stats.address}
                    className="flex items-center gap-4 px-4 py-3 transition-opacity duration-300"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{stats.name}</div>
                      <div className="font-mono text-[0.7rem] text-ink-muted break-all">
                        {stats.address}
                      </div>
                    </div>

                    <div
                      className="shrink-0 w-48"
                      title={`${seats} DAO member${seats === 1 ? '' : 's'}`}
                    >
                      <div className="h-2.5 w-full rounded-full bg-surface-muted border border-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 w-56 text-right text-[0.72rem] text-ink-muted">
                      {empty ? (
                        <span className="text-ink-faint">no seats</span>
                      ) : (
                        stats.stakes.map((s, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-ink-faint"> · </span>}
                            {formatStake(s)}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="shrink-0 w-24 text-right font-medium text-sm">
                      {empty ? '—' : formatStake(stats.totalStaked)}
                    </div>
                  </div>
                );
              })}

              {/* Single skeleton row representing the currently fetching facility */}
              {isStreaming && (
                <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 bg-surface-muted rounded w-1/3 mb-1" />
                    <div className="font-mono text-[0.7rem] text-ink-faint truncate">
                      {activeAddress}
                    </div>
                  </div>
                  <div className="shrink-0 w-48 h-2.5 bg-surface-muted rounded-full" />
                  <div className="shrink-0 w-56 h-4 bg-surface-muted rounded" />
                  <div className="shrink-0 w-24 h-4 bg-surface-muted rounded" />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Dominating facilities & draw probabilities */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-1">
          Dominating facilities & odds of being drawn
        </h2>
        <p className="text-xs text-ink-muted mb-2">
          Every 4 weeks the contract draws {COMMITTEE_SIZE} distinct DAO members at random.
          These are the odds that a facility's seats land in that draw.
        </p>
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-b border-border">
                <th className="text-left font-medium px-4 py-2.5">Facility</th>
                <th className="text-right font-medium px-4 py-2.5">Seats</th>
                <th className="text-right font-medium px-4 py-2.5">At least 1</th>
                <th className="text-right font-medium px-4 py-2.5">At least 2</th>
                <th className="text-right font-medium px-4 py-2.5">All 3</th>
              </tr>
            </thead>
            <tbody>
              {probRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                    {isStreaming ? 'Loading DAO members…' : 'No DAO members yet.'}
                  </td>
                </tr>
              ) : (
                probRows.map((row) => (
                  <tr key={row.address} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-[0.7rem] text-ink-muted">
                        staked {formatStake(row.totalStaked)}
                      </div>
                    </td>
                    <td className="text-right px-4 py-2.5">{row.memberCount}</td>
                    <td className="text-right px-4 py-2.5">{formatPct(row.pAtLeast1)}</td>
                    <td className="text-right px-4 py-2.5">
                      {row.memberCount >= 2 ? formatPct(row.pAtLeast2) : '—'}
                    </td>
                    <td className="text-right px-4 py-2.5">
                      {row.memberCount >= 3 ? formatPct(row.pAll) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Short DAO-only explainer */}
      <section className="mt-5 bg-surface border border-border rounded-md px-4 py-4 text-sm text-ink-muted leading-relaxed">
        <h3 className="text-ink font-semibold mb-1.5">How the DAO works, in plain terms</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Each facility can stake up to <strong>3 wallets</strong> into the DAO.
            The first seat costs <strong>0.25 HBAR</strong>; every additional seat costs{' '}
            <strong>1 HBAR</strong>.
          </li>
          <li>
            All stakes across all facilities form the <strong>global DAO</strong>: the pool of
            wallets that secure the network.
          </li>
          <li>
            Every <strong>4 weeks</strong>, {COMMITTEE_SIZE} distinct wallets are drawn at random
            from the pool. Every member has an equal chance, so a facility with more seats is
            statistically more likely to be represented — but each individual seat still has the
            same odds.
          </li>
          <li>
            Removing a wallet refunds its stake and frees the seat. A wallet can only ever hold
            one DAO seat at a time.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default DAOMembersPanel;