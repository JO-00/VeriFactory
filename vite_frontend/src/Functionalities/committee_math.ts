// ============== committee_math.ts ==============

import { FACILITY_DAO_MEMBERS } from '../Dashboards/dashboard_constants';
import { FACILITY_META } from '../Dashboards/dashboard_constants';
import type { CandidateVotes , WrappedCandidate } from '../types';
import { LAST_GENERATION_UNIX , CURRENT_USER_ADDRESS, COMMITTEE_PERIOD_SECONDS } from '../Dashboards/dashboard_constants';




export function get_latest_committee_generation_timestamp(): bigint {
  return BigInt(LAST_GENERATION_UNIX);
}

// ============================================================
// Mock: votes frozen?
// ============================================================

export function get_votes_status(): boolean {
  return false; // not frozen yet — committee can still vote
}

// ============================================================
// Mock: current committee (5 fixed wallets)
// ============================================================

const ALL_DAO_WALLETS: string[] = Object.values(FACILITY_DAO_MEMBERS)
  .flat()
  .map((m) => m.wallet);

export function get_current_committee(): string[] {
  // Hardcoded — fixed seats chosen at authoring time.
  const FIXED_SEATS = [
    ALL_DAO_WALLETS[0],
    ALL_DAO_WALLETS[1],
    ALL_DAO_WALLETS[2],
    ALL_DAO_WALLETS[4],
    ALL_DAO_WALLETS[7],
  ].filter(Boolean); // defensive if the mock changes
  return FIXED_SEATS;
}

// ============================================================
// Mock: 20 candidates
// ============================================================

const CANDIDATE_POOL: WrappedCandidate[] = [
  '0xa1010000000000000000000000000000000000a1',
  '0xa1020000000000000000000000000000000000a1',
  '0xa1030000000000000000000000000000000000a1',
  '0xa1040000000000000000000000000000000000a1',
  '0xa1050000000000000000000000000000000000a1',
  '0xa1060000000000000000000000000000000000a1',
  '0xa1070000000000000000000000000000000000a1',
  '0xa1080000000000000000000000000000000000a1',
  '0xa1090000000000000000000000000000000000a1',
  '0xa1100000000000000000000000000000000000a1',
  '0xa1110000000000000000000000000000000000a1',
  '0xa1120000000000000000000000000000000000a1',
  '0xa1130000000000000000000000000000000000a1',
  '0xa1140000000000000000000000000000000000a1',
  '0xa1150000000000000000000000000000000000a1',
  '0xa1160000000000000000000000000000000000a1',
  '0xa1170000000000000000000000000000000000a1',
  '0xa1180000000000000000000000000000000000a1',
  '0xa1190000000000000000000000000000000000a1',
  '0xa1200000000000000000000000000000000000a1',
].map((wallet, i) => ({
  candidate: wallet,
  // Make roughly 3/4 compliant, alternating pattern for visual variety
  is_compliant: i % 4 !== 3,
}));

export function get_candidates(): WrappedCandidate[] {
  return CANDIDATE_POOL;
}

// ============================================================
// Mock: top 6 winning candidates (only meaningful when frozen)
// ============================================================

const TOP_6_MOCK: CandidateVotes[] = [
  { wallet: CANDIDATE_POOL[2].candidate, votes: 17 },
  { wallet: CANDIDATE_POOL[0].candidate, votes: 14 },
  { wallet: CANDIDATE_POOL[5].candidate, votes: 12 },
  { wallet: CANDIDATE_POOL[9].candidate, votes: 9 },
  { wallet: CANDIDATE_POOL[1].candidate, votes: 7 },
  { wallet: CANDIDATE_POOL[3].candidate, votes: 3 },
];

export function get_top_6_candidates(): CandidateVotes[] {
  // Only meaningful when votes are frozen. Caller should gate on
  // get_votes_status() === true.
  return TOP_6_MOCK;
}

// ============================================================
// Mock: facility-to-inspector assignment for the current 4-week term
// ============================================================

export function get_facility_to_inspector_map(
  winningInspectors: string[]
): Record<string, string[]> {
  // Contract assigns round-robin: facility i -> inspector i % 5.
  const facilityAddresses = Object.keys(FACILITY_META);
  const map: Record<string, string[]> = {};
  winningInspectors.forEach((w) => {
    map[w] = [];
  });
  facilityAddresses.forEach((facility, i) => {
    const inspector = winningInspectors[i % winningInspectors.length];
    if (inspector && map[inspector]) map[inspector].push(facility);
  });
  return map;
}

// ============================================================
// Auto: is the current user a committee member?
// ============================================================

export function is_current_user_committee_member(): boolean {
  return get_current_committee().includes(CURRENT_USER_ADDRESS);
}

// ============================================================
// Timing: can we generate a new committee yet?
// ============================================================

export function can_generate_new_committee(nowUnix = Date.now() / 1000): boolean {
  const last = Number(get_latest_committee_generation_timestamp());
  return nowUnix >= last + COMMITTEE_PERIOD_SECONDS;
}

export function get_seconds_until_next_committee(nowUnix = Date.now() / 1000): number {
  const last = Number(get_latest_committee_generation_timestamp());
  return Math.max(0, last + COMMITTEE_PERIOD_SECONDS - nowUnix);
}

// ============================================================
// UI: human-friendly countdown
// ============================================================

export function format_remaining_time(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Ready';
  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (weeks > 0) return `${weeks}w ${remDays}d`;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}