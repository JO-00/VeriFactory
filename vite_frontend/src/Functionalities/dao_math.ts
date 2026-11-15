// ============== dao_math.ts ==============
// Pure helpers for DAO stats. No React, no RPC here.

export interface FacilityDAOStats {
  address: string;
  name: string;
  memberCount: number;
  totalStaked: number;
  stakes: number[];
}

export interface DAOGlobalStats {
  totalMembers: number;
  totalStaked: number;
  facilitiesWithMembers: number;
  facilitiesWithFullHouse: number;
  maxMembersPerFacility: number;
}

export interface CommitteeDrawProbabilities {
  memberCount: number;
  pAtLeast1: number;
  pAtLeast2: number;
  pAll: number;
}

export const COMMITTEE_SIZE = 5;

/**
 * Runs over the already-computed facility stats to aggregate the global numbers.
 */
export function computeGlobalDAOStats(facilityStats: FacilityDAOStats[]): DAOGlobalStats {
  let totalMembers = 0;
  let totalStaked = 0;
  let facilitiesWithMembers = 0;
  let facilitiesWithFullHouse = 0;

  for (const stats of facilityStats) {
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

function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
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
  const k = Math.max(0, Math.min(3, memberCount));
  const N = Math.max(0, totalDAOMembers);
  const S = committeeSize;

  if (N === 0 || k === 0) {
    return { memberCount: k, pAtLeast1: 0, pAtLeast2: 0, pAll: 0 };
  }

  if (N <= S) {
    return {
      memberCount: k,
      pAtLeast1: 1,
      pAtLeast2: k >= 2 ? 1 : 0,
      pAll: k === 3 ? 1 : 0,
    };
  }

  const denom = nCk(N, S);
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

export function formatStake(amount: number): string {
  const hbar = amount / 100_000_000;
  return `${hbar.toFixed(2).replace(/\.?0+$/, '')} HBAR`;
}

export function formatPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}