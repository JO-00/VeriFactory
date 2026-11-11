// ============== dao_math.ts ==============
// Pure helpers for DAO stats. No React here.

import { FACILITY_DAO_MEMBERS } from './../Dashboards/dashboard_constants';
import type { StakedMember } from '../types';

export interface FacilityDAOStats {
  address: string;
  name: string;              // resolved by caller, optional
  memberCount: number;
  totalStaked: number;       // sum of member amounts
  stakes: number[];          // per-member amounts in order
}

export interface DAOGlobalStats {
  totalMembers: number;
  totalStaked: number;
  facilitiesWithMembers: number;
  facilitiesWithFullHouse: number; // facilities with exactly 3 members
  maxMembersPerFacility: number;   // 3 per contract
}

export interface CommitteeDrawProbabilities {
  /** number of members this facility has in the global DAO */
  memberCount: number;
  /** P(at least 1 of this facility's members is in the drawn committee) */
  pAtLeast1: number;
  /** P(at least 2 of this facility's members are in the drawn committee) */
  pAtLeast2: number;
  /** P(all 3 of this facility's members are in the drawn committee) */
  pAll: number;
}

// Committee size is hardcoded to 5 in the contract (`pickRandom(l.DAO, 5)`).
export const COMMITTEE_SIZE = 5;

// ============================================================
// Per-facility and global helpers
// ============================================================

export function getFacilityStakes(facilityAddress: string): StakedMember[] {
  return FACILITY_DAO_MEMBERS[facilityAddress] ?? [];
}

export function computeFacilityDAOStats(
  facilityAddress: string,
  name?: string
): FacilityDAOStats {
  const members = getFacilityStakes(facilityAddress);
  const stakes = members.map((m) => Number(m.amount));
  const totalStaked = stakes.reduce((a, b) => a + b, 0);
  return {
    address: facilityAddress,
    name: name ?? facilityAddress,
    memberCount: members.length,
    totalStaked,
    stakes,
  };
}

export function computeGlobalDAOStats(facilityAddresses: string[]): DAOGlobalStats {
  let totalMembers = 0;
  let totalStaked = 0;
  let facilitiesWithMembers = 0;
  let facilitiesWithFullHouse = 0;

  for (const addr of facilityAddresses) {
    const stats = computeFacilityDAOStats(addr);
    totalMembers += stats.memberCount;
    totalStaked += stats.totalStaked;
    if (stats.memberCount > 0) facilitiesWithMembers++;
    if (stats.memberCount === 3) facilitiesWithFullHouse++;
  }

  return {
    totalMembers,
    totalStaked,
    facilitiesWithMembers,
    facilitiesWithFullHouse,
    maxMembersPerFacility: 3,
  };
}

// ============================================================
// Committee-draw probabilities
// ============================================================
//
// The contract does: `pickRandom(l.DAO, 5)` — uniformly draw 5 distinct
// members from the whole DAO without replacement.
//
// For a facility with k ∈ {0,1,2,3} members, P(exactly j of its members are
// picked) is the hypergeometric distribution:
//
//   P(j) = C(k, j) * C(N-k, 5-j) / C(N, 5)
//
// We expose P(at least 1), P(at least 2), P(all).
//
// Edge cases:
//  - N < 5  → the contract falls back to `current_committee = DAO` (everyone
//    is "picked"), so all of the facility's members are guaranteed in.
//  - N == 0 → no committee can be drawn.
// ============================================================

function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  // multiplicative formula, safer for large-ish n
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

export function computeCommitteeDrawProbabilities(
  memberCount: number,
  totalDAOMembers: number,
  committeeSize: number = COMMITTEE_SIZE
): CommitteeDrawProbabilities {
  const k = Math.max(0, Math.min(3, memberCount)); // contract max 3 per facility
  const N = Math.max(0, totalDAOMembers);
  const S = committeeSize;

  // No members in DAO, or facility has nobody: nothing to pick.
  if (N === 0 || k === 0) {
    return { memberCount: k, pAtLeast1: 0, pAtLeast2: 0, pAll: 0 };
  }

  // Contract fallback: DAO ≤ 5 → whole DAO becomes committee.
  if (N <= S) {
    return {
      memberCount: k,
      pAtLeast1: 1,
      pAtLeast2: k >= 2 ? 1 : 0,
      pAll: k === 3 ? 1 : 0,
    };
  }

  const denom = nCk(N, S);

  // P(exactly j) for j = 0..min(k, S)
  const pExactly: number[] = [];
  for (let j = 0; j <= k; j++) {
    if (j > S) { pExactly.push(0); continue; }
    pExactly.push((nCk(k, j) * nCk(N - k, S - j)) / denom);
  }

  const pAtLeast1 = 1 - (pExactly[0] ?? 0);
  const pAtLeast2 = pExactly.slice(2).reduce((a, b) => a + b, 0);
  const pAll = k === 3 ? pExactly[3] ?? 0 : 0;

  return { memberCount: k, pAtLeast1, pAtLeast2, pAll };
}

// ============================================================
// Convenience: build the full probability table for the UI
// ============================================================

export interface FacilityProbabilityRow extends CommitteeDrawProbabilities {
  address: string;
  name: string;
  totalStaked: number;
}

export function computeProbabilityTable(
  facilities: { address: string; name: string }[],
  totalDAOMembers: number
): FacilityProbabilityRow[] {
  const rows: FacilityProbabilityRow[] = facilities.map((f) => {
    const stats = computeFacilityDAOStats(f.address, f.name);
    const probs = computeCommitteeDrawProbabilities(stats.memberCount, totalDAOMembers);
    return {
      address: f.address,
      name: f.name,
      totalStaked: stats.totalStaked,
      ...probs,
    };
  });

  // Only facilities that actually have ≥1 member dominate anything.
  return rows
    .filter((r) => r.memberCount > 0)
    .sort((a, b) => b.pAtLeast1 - a.pAtLeast1 || b.totalStaked - a.totalStaked);
}

// ============================================================
// Formatting helpers for the UI
// ============================================================

export function formatStake(amount: number): string {
  const hbar = amount / 100_000_000; // 1 HBAR = 100,000,000 tinybar
  // trim trailing zeros for a cleaner look: 0.25 / 1 / 1.25 ...
  return `${hbar.toFixed(2).replace(/\.?0+$/, '')} HBAR`;
}

export function formatPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}