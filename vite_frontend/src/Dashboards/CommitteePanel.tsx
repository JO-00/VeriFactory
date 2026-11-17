// ============== CommitteePanel.tsx ==============

import React, { useEffect, useState } from 'react';
import {
  getFacilityMeta,
  FetchAllDAOMemberAddedEvents,
} from '../Functionalities/getFacilityInfo';
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
import type { DAOMemberAddedEvent } from '../HashGraphUtils/Events/types';

// ------------------------------------------------------------
// Silhouette avatar
// ------------------------------------------------------------
const PersonSilhouette: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" fill={color} />
  </svg>
);

// ------------------------------------------------------------
// Modal for DAO Member Event
// ------------------------------------------------------------
const DAOMemberEventModal: React.FC<{
  memberAddress: string;
  event: DAOMemberAddedEvent | undefined;
  onClose: () => void;
}> = ({ memberAddress, event, onClose }) => {
  if (!event) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={onClose}>
        <div className="bg-surface border border-border rounded-md p-6 max-w-md w-full text-ink" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-2">No Event Data</h2>
          <p className="text-sm text-ink-muted">
            No <code>DAOMemberAdded</code> event found for <span className="font-mono break-all">{memberAddress}</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-[5px] bg-surface-muted border border-border-strong py-2 text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${event.transactionHash}`;
  const stakeHbar = (Number(event.stake) / 100_000_000).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="bg-surface border border-border rounded-md w-[80vw] max-w-lg flex flex-col overflow-hidden text-ink" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div className="text-sm font-semibold">DAO Member Added</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1.5 text-[0.75rem]">
            <div className="text-ink-muted">Member Wallet</div>
            <div className="font-mono break-all">{event.newMemberAddress}</div>

            <div className="text-ink-muted">Staked Amount</div>
            <div className="font-semibold text-success">{stakeHbar} HBAR</div>

            <div className="text-ink-muted">Facility</div>
            <div className="font-mono break-all">{event.facilityAddress}</div>

            <div className="text-ink-muted">Timestamp</div>
            <div>{new Date(event.timestampDate).toLocaleString()}</div>

            <div className="text-ink-muted">Transaction</div>
            <div className="font-mono break-all">{event.transactionHash}</div>

            <div className="text-ink-muted">Block / Log</div>
            <div className="font-mono">
              {event.blockNumber} / {event.logIndex ?? '—'}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-2">
            <a
              href={mirrorNodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex justify-center items-center gap-2 rounded-[5px] border border-accent bg-accent text-white px-4 py-2 text-xs font-semibold hover:brightness-110 transition-colors"
            >
              <span>View Raw JSON on Mirror Node</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommitteePanel: React.FC = () => {
  const { accountId } = useWallet();
  const [loading, setLoading] = useState(true);
  const [committee, setCommittee] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<{ candidate: string; is_compliant: boolean }[]>([]);
  const [votesFrozen, setVotesFrozen] = useState(false);
  const [isCommitteeMember, setIsCommitteeMember] = useState(false);
  const [top6, setTop6] = useState<CandidateVotes[]>([]);
  const [inspectorMap, setInspectorMap] = useState<Record<string, string[]>>({});

  const [daoEvents, setDaoEvents] = useState<Record<string, DAOMemberAddedEvent>>({});
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});

  const [nowUnix, setNowUnix] = useState(() => Date.now() / 1000);
  const [canGenerate, setCanGenerate] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [rankingMode, setRankingMode] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [comm, cands, frozen, isMember, events] = await Promise.all([
          get_current_committee().catch(() => [] as string[]),
          get_candidates().catch(() => [] as { candidate: string; is_compliant: boolean }[]),
          get_votes_status().catch(() => false),
          is_user_committee_member(accountId).catch(() => false),
          FetchAllDAOMemberAddedEvents().catch(() => ({} as Record<string, DAOMemberAddedEvent>)),
        ]);
        if (cancelled) return;

        setCommittee(comm);
        setCandidates(cands);
        setVotesFrozen(frozen);
        setIsCommitteeMember(isMember);
        setDaoEvents(events);

        if (frozen) {
          const winners = await get_top_6_candidates();
          if (cancelled) return;
          setTop6(winners);

          const map = await get_facility_to_inspector_map(winners.slice(0, 5).map((c) => c.wallet));
          if (cancelled) return;
          setInspectorMap(map);

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

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const now = Date.now() / 1000;
      setNowUnix(now);

      const [gen, secs] = await Promise.all([
        can_generate_new_committee(now).catch(() => false),
        get_seconds_until_next_committee(now).catch(() => 0),
      ]);
      if (cancelled) return;

      setCanGenerate(gen);
      setSecondsLeft(secs);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
            type="button"
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

      {/* Current committee (CLICKABLE) */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold mb-2">Current committee</h2>
        <div className="bg-surface border border-border rounded-md px-4 py-4">
          {committee.length === 0 ? (
            <div className="text-xs text-ink-muted">No active committee generated yet.</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {committee.map((wallet) => (
                <button
                  key={wallet}
                  type="button"
                  onClick={() => setSelectedMember(wallet)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer hover:bg-surface-muted p-2 rounded-md transition-colors"
                  title={`View DAO event for ${wallet}`}
                >
                  <div className="w-12 h-12 rounded-full bg-surface-muted border-2 border-[#22c55e] group-hover:border-accent group-hover:scale-105 flex items-center justify-center overflow-hidden transition-all">
                    <div className="w-7 h-7">
                      <PersonSilhouette color="#94a3b8" />
                    </div>
                  </div>
                  <div className="font-mono text-[0.65rem] text-ink-muted group-hover:text-ink">
                    {wallet.slice(0, 6)}…{wallet.slice(-4)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Votes status */}
      <section className="mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-sm font-semibold">Votes status</div>
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
                      <tr key={`candidate-${i}`} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2 text-ink-muted">{i + 1}</td>
                        <td className="px-4 py-2 font-mono text-[0.75rem] break-all">
                          {c?.wallet || '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {c?.votes !== undefined ? String(c.votes) : '—'}
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
              {top6.slice(0, 5).map((c, i) => (
                <div
                  key={`inspector-${c.wallet ?? 'unknown'}-${i}`}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-md"
                  title={c.wallet ?? 'Unknown'}
                >
                  <div className="w-12 h-12 rounded-full bg-surface-muted border-2 border-[#22c55e] flex items-center justify-center overflow-hidden">
                    <div className="w-7 h-7">
                      <PersonSilhouette color="#94a3b8" />
                    </div>
                  </div>
                  <div className="font-mono text-[0.65rem] text-ink-muted">
                    {c.wallet ? `${c.wallet.slice(0, 6)}…${c.wallet.slice(-4)}` : '—'}
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

      {/* Ranking / Candidates (UNTOUCHED, NO MODAL) */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Rank candidates</h2>
          <div className="flex items-center gap-2">
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
                type="button"
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
                type="button"
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
              const isRankingActive = rankingMode && isCommitteeMember && !votesFrozen;

              return (
                <button
                  key={c.candidate}
                  type="button"
                  onClick={() => {
                    if (isRankingActive) {
                      toggleCandidate(c.candidate);
                    }
                  }}
                  title={
                    isRankingActive
                      ? `Click to rank ${c.candidate}`
                      : c.candidate
                  }
                  className={`relative flex flex-col items-center gap-1.5 p-1 rounded-md transition ${
                    isRankingActive
                      ? 'cursor-pointer hover:bg-surface-muted group'
                      : 'cursor-default'
                  }`}
                >
                  {ranked && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {idx + 1}
                    </span>
                  )}
                  <div
                    className="w-12 h-12 rounded-full bg-surface-muted border-2 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                    style={{ borderColor: c.is_compliant ? '#22c55e' : '#ef4444' }}
                  >
                    <div className="w-7 h-7">
                      <PersonSilhouette color="#94a3b8" />
                    </div>
                  </div>
                  <div className="font-mono text-[0.6rem] text-ink-muted group-hover:text-ink">
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
                type="button"
                onClick={resetRanking}
                className="ml-3 underline text-ink-muted hover:text-ink"
              >
                clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Modal (Only triggered from Current Committee section) */}
      {selectedMember && (
        <DAOMemberEventModal
          memberAddress={selectedMember}
          event={daoEvents[selectedMember.toLowerCase()]}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

export default CommitteePanel;