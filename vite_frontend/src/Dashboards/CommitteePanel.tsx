// ============== CommitteePanel.tsx ==============

import React, { useEffect, useState } from 'react';
import { getFacilityMeta } from '../Functionalities/getFacilityInfo';
import {
  get_current_committee,
  get_candidates,
  get_votes_status,
  get_top_6_candidates,
  get_facility_to_inspector_map,
  can_generate_new_committee,
  get_seconds_until_next_committee,
  format_remaining_time,
  is_user_committee_member,
} from '../Functionalities/committee_math';
import { MAX_PREFERENCES } from './dashboard_constants';
import type { CandidateVotes } from '../types';
import { useWallet } from '../Common/WalletProvider';

// ------------------------------------------------------------
// Silhouette avatar
// ------------------------------------------------------------
const PersonSilhouette: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" fill={color} />
  </svg>
);

const CommitteePanel: React.FC = () => {
  // ----- async data states -----
  const { accountId } = useWallet();
  const [loading, setLoading] = useState(true);
  const [committee, setCommittee] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<{ candidate: string; is_compliant: boolean }[]>([]);
  const [votesFrozen, setVotesFrozen] = useState(false);
  const [isCommitteeMember, setIsCommitteeMember] = useState(false);
  const [top6, setTop6] = useState<CandidateVotes[]>([]);
  const [inspectorMap, setInspectorMap] = useState<Record<string, string[]>>({});
  
  // To resolve facility names for the inspected list
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});

  // ----- countdown -----
  const [nowUnix, setNowUnix] = useState(() => Date.now() / 1000);
  const [canGenerate, setCanGenerate] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // ----- ranking state -----
  const [rankingMode, setRankingMode] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);

  // 1. Initial Fetch
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Fetch independent data in parallel
        const [comm, cands, frozen, isMember] = await Promise.all([
          get_current_committee(),
          get_candidates(),
          get_votes_status(),
          is_user_committee_member(accountId),
        ]);
        if (cancelled) return;

        setCommittee(comm);
        setCandidates(cands);
        setVotesFrozen(frozen);
        setIsCommitteeMember(isMember);

        // If votes are frozen, fetch the results & inspector map
        if (frozen) {
          const winners = await get_top_6_candidates();
          if (cancelled) return;
          setTop6(winners);

          const map = await get_facility_to_inspector_map(winners.slice(0, 5).map((c) => c.wallet));
          if (cancelled) return;
          setInspectorMap(map);

          // Resolve facility names for the inspector map
          const allFacilities = Object.values(map).flat();
          const names: Record<string, string> = {};
          await Promise.all(
            allFacilities.map(async (addr) => {
              const meta = await getFacilityMeta(addr);
              names[addr] = meta?.name ?? addr;
            })
          );
          if (cancelled) return;
          setFacilityNames(names);
        }
      } catch (err) {
        console.error('[CommitteePanel] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // 2. Countdown timer
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const now = Date.now() / 1000;
      setNowUnix(now);
      
      const [gen, secs] = await Promise.all([
        can_generate_new_committee(now),
        get_seconds_until_next_committee(now),
      ]);
      if (cancelled) return;
      
      setCanGenerate(gen);
      setSecondsLeft(secs);
    };

    // Run immediately
    tick();

    // Then every second
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ----- ranking logic -----
  const toggleCandidate = (wallet: string) => {
    if (!rankingMode || !isCommitteeMember) return;
    setPreferences((prev) => {
      if (prev.includes(wallet)) {
        return prev.filter((w) => w !== wallet);
      }
      if (prev.length >= MAX_PREFERENCES) return prev;
      return [...prev, wallet];
    });
  };

  const resetRanking = () => {
    setPreferences([]);
    setRankingMode(false);
  };

  const submit = () => {
    console.log('submitting preferences', preferences);
  };

  const canSubmit = isCommitteeMember && preferences.length >= 1 && !votesFrozen;

  if (loading) {
    return (
      <div className="text-ink">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Committee</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Current committee, voting window, and candidate ranking.
          </p>
        </div>
        <div className="text-sm text-ink-muted">Loading committee data…</div>
      </div>
    );
  }

  return (
    <div className="text-ink">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Committee</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Current committee, voting window, and candidate ranking.
          </p>
        </div>

        {/* Countdown + generate button */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[0.7rem] uppercase tracking-wide text-ink-muted">
              Next committee in
            </div>
            <div className="text-lg font-semibold tracking-[-0.02em] tabular-nums">
              {format_remaining_time(secondsLeft)}
            </div>
          </div>
          <button
            onClick={() => {
              if (canGenerate) console.log('button clicked');
            }}
            disabled={!canGenerate}
            className={`rounded-[5px] px-3.5 py-2 text-sm font-semibold border ${
              canGenerate
                ? 'border-success bg-success text-white hover:brightness-110 cursor-pointer'
                : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
            }`}
          >
            Generate New Committee
          </button>
        </div>
      </div>

      {/* Current committee */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold mb-2">Current committee</h2>
        <div className="bg-surface border border-border rounded-md px-4 py-4">
          <div className="flex flex-wrap gap-3">
            {committee.map((wallet) => (
              <div
                key={wallet}
                className="flex flex-col items-center gap-1.5"
                title={wallet}
              >
                <div
                  className="w-12 h-12 rounded-full bg-surface-muted border-2 flex items-center justify-center overflow-hidden"
                  style={{ borderColor: '#22c55e' }}
                >
                  <div className="w-7 h-7">
                    <PersonSilhouette color="#94a3b8" />
                  </div>
                </div>
                <div className="font-mono text-[0.65rem] text-ink-muted">
                  {wallet.slice(0, 6)}…{wallet.slice(-4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Votes status */}
      <section className="mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3 flex items-center justify-between">
            <div>
            <div className="flex items-center gap-1.5">
                <div className="text-sm font-semibold">Votes status</div>
                {/* Info icon with conditions tooltip */}
                <span
                title={
                    'Votes freeze when any one of these is true:\n' +
                    '• 5 or fewer candidates are registered.\n' +
                    '• The 5th and 6th candidates differ by at least 5 votes, ' +
                    'with at least 4 committee members having voted.\n' +
                    '• At least 3 committee members have voted and at least ' +
                    '2 days have passed since the last committee generation.'
                }
                className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border-strong text-[10px] font-semibold text-ink-muted cursor-help select-none"
                aria-label="Votes freeze conditions"
                >
                ?
                </span>
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
                {votesFrozen
                ? 'Frozen — results available below.'
                : 'Not frozen — committee members can still vote.'}
            </div>
            </div>
            <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                votesFrozen
                ? 'bg-[#e8f7ee] text-success'
                : 'bg-surface-muted text-ink-muted'
            }`}
            >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {votesFrozen ? 'Frozen' : 'Open'}
            </span>
        </div>
        </section>

      {/* Results — only visible when frozen */}
      {votesFrozen && (
        <>
          <section className="mb-5">
            <h2 className="text-sm font-semibold mb-2">Top candidates</h2>
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-muted border-b border-border">
                    <th className="text-left font-medium px-4 py-2.5">#</th>
                    <th className="text-left font-medium px-4 py-2.5">Candidate</th>
                    <th className="text-right font-medium px-4 py-2.5">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {top6.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-ink-muted">
                        No candidates.
                      </td>
                    </tr>
                  ) : (
                    top6.map((c, i) => (
                      <tr key={c.wallet} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2 text-ink-muted">{i + 1}</td>
                        <td className="px-4 py-2 font-mono text-[0.75rem] break-all">
                          {c.wallet}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {String(c.votes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-5">
            <h2 className="text-sm font-semibold mb-2">Current inspectors</h2>
            <div className="bg-surface border border-border rounded-md px-4 py-4 flex flex-wrap gap-3">
              {top6.slice(0, 5).map((c) => (
                <div key={c.wallet} className="flex flex-col items-center gap-1.5" title={c.wallet}>
                  <div
                    className="w-12 h-12 rounded-full bg-surface-muted border-2 flex items-center justify-center overflow-hidden"
                    style={{ borderColor: '#22c55e' }}
                  >
                    <div className="w-7 h-7">
                      <PersonSilhouette color="#94a3b8" />
                    </div>
                  </div>
                  <div className="font-mono text-[0.65rem] text-ink-muted">
                    {c.wallet.slice(0, 6)}…{c.wallet.slice(-4)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <h2 className="text-sm font-semibold mb-2">Facilities inspected</h2>
            <div className="bg-surface border border-border rounded-md divide-y divide-border">
              {Object.entries(inspectorMap).map(([inspector, facilities]) => (
                <div key={inspector} className="px-4 py-3">
                  <div className="font-mono text-[0.75rem] text-ink break-all">
                    {inspector}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {facilities.map((addr) => {
                      const name = facilityNames[addr] || addr;
                      return (
                        <span
                          key={addr}
                          title={addr}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-surface-muted border border-border text-ink-muted"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Ranking */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Rank candidates</h2>
          <div className="flex items-center gap-2">
            {/* Rank button + tooltip */}
            <span
                title={
                !isCommitteeMember
                    ? 'You are not a committee member'
                    : votesFrozen
                    ? 'Votes are frozen — ranking is closed'
                    : rankingMode
                    ? 'Click to stop ranking'
                    : 'Click to start ranking candidates'
                }
                className="inline-flex"
            >
                <button
                onClick={() => {
                    setRankingMode((v) => !v);
                    if (rankingMode) setPreferences([]);
                }}
                disabled={!isCommitteeMember || votesFrozen}
                className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold border ${
                    isCommitteeMember && !votesFrozen
                    ? rankingMode
                        ? 'border-accent bg-accent text-white cursor-pointer'
                        : 'border-border-strong bg-surface text-ink hover:border-accent cursor-pointer'
                    : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
                }`}
                >
                {rankingMode ? 'Stop ranking' : 'Rank'}
                </button>
            </span>

            {/* Submit button + tooltip */}
            <span
                title={
                !isCommitteeMember
                    ? 'You are not a committee member'
                    : votesFrozen
                    ? 'Votes are frozen — submissions are closed'
                    : preferences.length === 0
                    ? 'Select at least 1 candidate to submit'
                    : `Submit ${preferences.length} preference${preferences.length === 1 ? '' : 's'}`
                }
                className="inline-flex"
            >
                <button
                onClick={submit}
                disabled={!canSubmit}
                className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold border ${
                    canSubmit
                    ? 'border-success bg-success text-white hover:brightness-110 cursor-pointer'
                    : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
                }`}
                >
                Submit
                </button>
            </span>
            </div>
        </div>

        {!isCommitteeMember && (
          <div className="text-xs text-ink-muted mb-2">
            You are not a committee member — ranking disabled.
          </div>
        )}

        <div className="bg-surface border border-border rounded-md px-4 py-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-3">
            {candidates.map((c) => {
              const idx = preferences.indexOf(c.candidate);
              const ranked = idx !== -1;
              return (
                <button
                  key={c.candidate}
                  onClick={() => toggleCandidate(c.candidate)}
                  title={c.candidate}
                  disabled={!rankingMode || !isCommitteeMember || votesFrozen}
                  className={`relative flex flex-col items-center gap-1.5 p-1 rounded-md transition ${
                    rankingMode && isCommitteeMember && !votesFrozen
                      ? 'cursor-pointer hover:bg-surface-muted'
                      : 'cursor-default'
                  }`}
                >
                  {ranked && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {idx + 1}
                    </span>
                  )}
                  <div
                    className="w-12 h-12 rounded-full bg-surface-muted border-2 flex items-center justify-center overflow-hidden"
                    style={{ borderColor: c.is_compliant ? '#22c55e' : '#ef4444' }}
                  >
                    <div className="w-7 h-7">
                      <PersonSilhouette color="#94a3b8" />
                    </div>
                  </div>
                  <div className="font-mono text-[0.6rem] text-ink-muted">
                    {c.candidate.slice(0, 5)}…
                  </div>
                </button>
              );
            })}
          </div>

          {rankingMode && preferences.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border text-xs text-ink-muted">
              Picked {preferences.length}/{MAX_PREFERENCES}:
              {preferences.map((p, i) => (
                <span key={p} className="ml-1.5 font-mono">
                  {i + 1}. {p.slice(0, 6)}…{p.slice(-4)}
                </span>
              ))}
              <button
                onClick={resetRanking}
                className="ml-3 underline text-ink-muted hover:text-ink"
              >
                clear
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CommitteePanel;