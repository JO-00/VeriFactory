import type { CandidateVotes , WrappedCandidate } from '../types';
import { COMMITTEE_PERIOD_SECONDS } from '../Dashboards/dashboard_constants';
import { FactoryContractRead } from '../HashGraphUtils/Contracts/Factory/FactoryRead';
import { resolveEvmAddress } from './getFacilityInfo';




export async function get_latest_committee_generation_timestamp(): Promise<bigint> {
  return await FactoryContractRead.latestCommitteeGenerationTimestamp();
}

// ============================================================
// Mock: votes frozen?
// ============================================================

export async function get_votes_status(): Promise<boolean> {
  return await FactoryContractRead.votesFrozen();
}


export async function get_current_committee(): Promise<string[]> {
  return await FactoryContractRead.getCurrentCommittee();
}


export async function get_candidates(){
  return (await FactoryContractRead.getCandidates()).map(
    element => ({
      candidate : element.candidate.wallet,
      is_compliant : element.is_compliant
    })
  );
}



export function get_top_6_candidates(): Promise<CandidateVotes[]> {
  return FactoryContractRead.getTop6Votes();
}

// ============================================================
// Mock: facility-to-inspector assignment for the current 4-week term
// ============================================================

export async function get_facility_to_inspector_map(
  winningInspectors: string[]
):Promise <Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  winningInspectors.forEach( async(w) => {
    map[w] = await FactoryContractRead.getInspectorFacilities(w);
  });
  return map;
}

// ============================================================
// Auto: is the current user a committee member?
// ============================================================

export async function is_user_committee_member(account_id : string): Promise<boolean> {
  const committee = await FactoryContractRead.getCurrentCommittee();
  return committee.includes(await resolveEvmAddress(account_id));
}

export async function can_generate_new_committee(nowUnix = Date.now() / 1000): Promise<boolean> {
  const last = Number(await get_latest_committee_generation_timestamp());
  return nowUnix >= last + COMMITTEE_PERIOD_SECONDS;
}

export async function get_seconds_until_next_committee(nowUnix = Date.now() / 1000): Promise<number> {
  const last = Number(await get_latest_committee_generation_timestamp());
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