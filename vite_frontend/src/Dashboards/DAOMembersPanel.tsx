// ============== DAOMembersPanel.tsx ==============

import React, { useEffect, useState } from 'react';
import { FACILITY_META } from '../Dashboards/dashboard_constants';
import { getFacilityMeta } from '../Functionalities/getFacilityInfo';
import {
  computeGlobalDAOStats,
  computeFacilityDAOStats,
  computeProbabilityTable,
  formatStake,
  formatPct,
  COMMITTEE_SIZE,
} from '../Functionalities/dao_math';

type FacilityRow = {
  address: string;
  name: string;
  memberCount: number;
  stakes: number[];
  totalStaked: number;
};

type ProbRow = {
  address: string;
  name: string;
  memberCount: number;
  totalStaked: number;
  pAtLeast1: number;
  pAtLeast2: number;
  pAll: number;
};

const DAOMembersPanel: React.FC = () => {
  const addresses = React.useMemo(() => Object.keys(FACILITY_META), []);

  const [facilityRows, setFacilityRows] = useState<FacilityRow[]>([]);
  const [probRows, setProbRows] = useState<ProbRow[]>([]);
  const [globalStats, setGlobalStats] = useState(() =>
    computeGlobalDAOStats([])
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Resolve all facility names first
      const resolved = await Promise.all(
        addresses.map(async (address) => {
          const meta = await getFacilityMeta(address);
          return { address, name: meta?.name ?? address };
        })
      );

      const nameByAddress = new Map(resolved.map((r) => [r.address, r.name]));

      const rows: FacilityRow[] = addresses.map((address) => ({
        ...computeFacilityDAOStats(address, nameByAddress.get(address)),
      }));

      const gStats = computeGlobalDAOStats(addresses);

      const probs = computeProbabilityTable(
        resolved,
        gStats.totalMembers
      );

      if (cancelled) return;

      setFacilityRows(rows);
      setGlobalStats(gStats);
      setProbRows(probs);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [addresses]);

  if (loading) {
    return (
      <div className="text-ink">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">DAO Members</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Who secures the network — one wallet per seat, up to 3 seats per facility.
          </p>
        </div>
        <div className="text-sm text-ink-muted">Loading DAO members…</div>
      </div>
    );
  }

  return (
    <div className="text-ink">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-[-0.01em]">DAO Members</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Who secures the network — one wallet per seat, up to 3 seats per facility.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">DAO members</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.totalMembers}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Total staked</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {formatStake(globalStats.totalStaked)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Facilities with members</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.facilitiesWithMembers}
            <span className="text-ink-faint text-lg">/{addresses.length}</span>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Full houses (3/3)</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {globalStats.facilitiesWithFullHouse}
          </div>
        </div>
      </div>

      {/* Per-facility spending (flex list) */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-ink mb-2">
          What each facility spent on DAO seats
        </h2>
        <div className="bg-surface border border-border rounded-md divide-y divide-border">
          {facilityRows.map((row) => {
            const empty = row.memberCount === 0;
            const seats = row.memberCount;
            const pct = Math.min(100, Math.round((seats / 3) * 100));
            const barColor =
              seats === 0
                ? '#3b82f6'   // blue
                : seats === 1
                ? '#22c55e'   // green
                : seats === 2
                ? '#eab308'   // yellow
                : '#ef4444';  // red

            return (
              <div key={row.address} className="flex items-center gap-4 px-4 py-3">
                {/* Left: name + address */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{row.name}</div>
                  <div className="font-mono text-[0.7rem] text-ink-muted break-all">
                    {row.address}
                  </div>
                </div>

                {/* Middle: seats progress bar */}
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

                {/* Right: per-seat stakes + total */}
                <div className="shrink-0 w-56 text-right text-[0.72rem] text-ink-muted">
                  {empty ? (
                    <span className="text-ink-faint">no seats</span>
                  ) : (
                    row.stakes.map((s, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-ink-faint"> · </span>}
                        {formatStake(s)}
                      </span>
                    ))
                  )}
                </div>

                <div className="shrink-0 w-24 text-right font-medium text-sm">
                  {empty ? '—' : formatStake(row.totalStaked)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dominating facilities & draw probabilities (original table) */}
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
                    No DAO members yet.
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
                    <td className="text-right px-4 py-2.5">
                      {formatPct(row.pAtLeast1)}
                    </td>
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