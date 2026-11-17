import type { CandidateVotes  } from '../types';
import { COMMITTEE_PERIOD_SECONDS } from '../Dashboards/dashboard_constants';
import { FactoryContractRead } from '../HashGraphUtils/Contracts/Factory/FactoryRead';
import { resolveEvmAddress } from './getFacilityInfo';
import { FactoryEvents } from '../HashGraphUtils/Events/factory';
import { Signer , Status} from '@hiero-ledger/sdk';
import { FactoryWriteContract } from '../HashGraphUtils/Contracts/Factory/FactoryWrite';

export async function get_latest_committee_generation_timestamp(): Promise<bigint> {
  return await FactoryContractRead.latestCommitteeGenerationTimestamp();
}

export async function get_member_stake_info (wallet : string) {
  return await FactoryEvents.getDAOMemberStakeInfo(wallet);
}

export async function get_votes_status(): Promise<boolean> {
  return await FactoryContractRead.votesFrozen();
}

export async function get_current_committee(): Promise<string[]> {
  return await FactoryContractRead.getCurrentCommittee();
}

export async function get_candidates(){
  const ret = (await FactoryContractRead.getCandidates()).map(
    element => ({
      candidate : element.candidate.wallet,
      is_compliant : element.is_compliant
    })
  );
  return ret;
}

export async function get_top_6_candidates(): Promise<CandidateVotes[]> {
  const votes = await FactoryContractRead.getTop6Votes();
  // Filter out nulls/empty slots to prevent crashes in the UI
  return votes.filter((c) => c && c.wallet && c.wallet !== '0x0000000000000000000000000000000000000000');
}

export async function get_facility_to_inspector_map(
  winningInspectors: string[]
): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  
  // Filter out null/zero addresses
  const validInspectors = winningInspectors.filter(
    (w) => w && w !== '0x0000000000000000000000000000000000000000'
  );

  await Promise.all(
    validInspectors.map(async (w) => {
      try {
        map[w] = await get_inspector_facilities(w);
      } catch (err) {
        console.warn(`Failed to fetch facilities for ${w}`, err);
        map[w] = [];
      }
    })
  );

  return map;
}

export async function get_inspector_facilities(
  winningInspector: string
): Promise<string[]> {
  const deployedFacilities = await FactoryContractRead.getDeployedFacilities();
  const rawFacilities = await FactoryContractRead.getInspectorFacilities(winningInspector);
  
  // Filter to deployed facilities and remove duplicates
  return Array.from(new Set(rawFacilities)).filter(c => deployedFacilities.includes(c));
}

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

export async function generate_new_committee(signer : Signer){
  await FactoryWriteContract.generateNewCommittee(signer);
}

export async function get_inspector_legal_contract(){
  return await FactoryContractRead.getInspectorLegalContract();
}

export async function assign_inspectors_to_facilities(signer : Signer){
  const tx = await FactoryWriteContract.AssignInspectorsToFacilities(signer);
  return tx?.status === Status.Success;
}

export async function can_assign_inspectors() : Promise<boolean>{
  return (await FactoryContractRead.getInspectorFacilities((await FactoryContractRead.getTop6Votes())[0].wallet)).length === 0
}