// ============== facillity_dashboard_mocks.ts ==============
import { FacilityEvents } from "../HashGraphUtils/Events/facility";
import { FactoryEvents } from "../HashGraphUtils/Events/factory";
import { FacilityContractRead } from "../HashGraphUtils/Contracts/Facility/FacilityRead";
import { FacilityContractWrite } from "../HashGraphUtils/Contracts/Facility/FacilityWrite";
import type {  CadencePolicy, FacilityAddedEvent, RelayerRegisteredEvent , KeyRotatedEvent, StakedMember, SignedContract} from "../types";
import { Signer, Status } from "@hiero-ledger/sdk";
import { FactoryContractRead } from "../HashGraphUtils/Contracts/Factory/FactoryRead";
import { FactoryWriteContract } from "../HashGraphUtils/Contracts/Factory/FactoryWrite";

// ============================================================
// Types
// ============================================================

export type BigNumberType = bigint | number;


export interface GatewayAssignedEvent {
  gatewayId: string;
  relayerAddress: string;
}

export interface GatewayReassignedEvent {
  gatewayId: string;
  oldRelayer: string;
  newRelayer: string;
}





// ============================================================
// Core entity lists
// ============================================================

const GATEWAYS: string[] = [
  '0xa1000000000000000000000000000000000000g1',
  '0xa1000000000000000000000000000000000000g2',
  '0xa1000000000000000000000000000000000000g3',
  '0xa1000000000000000000000000000000000000g4',
];

const RELAYERS: string[] = [
  '0xb2000000000000000000000000000000000000r1',
  '0xb2000000000000000000000000000000000000r2',
  '0xb2000000000000000000000000000000000000r3',
];

// ============================================================
// Relationships
// ============================================================



const GATEWAY_ASSIGNED_EVENTS: GatewayAssignedEvent[] = [
  { gatewayId: GATEWAYS[0], relayerAddress: RELAYERS[0] },
  { gatewayId: GATEWAYS[0], relayerAddress: RELAYERS[1] },
  { gatewayId: GATEWAYS[1], relayerAddress: RELAYERS[1] },
  { gatewayId: GATEWAYS[2], relayerAddress: RELAYERS[0] },
  { gatewayId: GATEWAYS[2], relayerAddress: RELAYERS[2] },
  { gatewayId: GATEWAYS[3], relayerAddress: RELAYERS[2] },
];

const GATEWAY_REASSIGNED_EVENTS: GatewayReassignedEvent[] = [
  { gatewayId: GATEWAYS[1], oldRelayer: RELAYERS[0], newRelayer: RELAYERS[1] },
];




// ============================================================
// Mock getters
// ============================================================



// ── Events ──
export const getGatewayAssignedEvents = async (facilityAddress: string, gateway :string): Promise<GatewayAssignedEvent[]> =>
  gateway
    ? GATEWAY_ASSIGNED_EVENTS.filter((e) => e.gatewayId === gateway)
    : [...GATEWAY_ASSIGNED_EVENTS];

export const getGatewayReassignedEvents = async (
  gateway: string,
  facilityAddress : string
): Promise<GatewayReassignedEvent[]> =>
  gateway
    ? GATEWAY_REASSIGNED_EVENTS.filter((e) => e.gatewayId === gateway)
    : [...GATEWAY_REASSIGNED_EVENTS];

export const getKeyRotatedEvents = async (facilityAddress: string, gatewayId : string): Promise<KeyRotatedEvent[]> =>
  await FacilityEvents.getKeyRotatedEventsByGateway({facilityAddress, gatewayId})


// ============================================================
// Formatting helpers
// ============================================================

export const shortAddr = (addr: string | undefined | null, head = 6, tail = 4): string => {
  if (!addr || typeof addr !== 'string') return '—';
  return addr.length <= head + tail + 2
    ? addr
    : `${addr.slice(0, head)}…${addr.slice(-tail)}`;
};
export const formatCadence = (seconds: number): string => {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
};

export const formatTimestamp = (ts: number): string => {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


// In facillity_dashboard_mocks.ts:
export const getAllGateways = async (facility_address: string): Promise<string[]> => {
  const res = await FacilityContractRead.getAllGateways(facility_address);
  return Array.from(res);
};

export const getAllRelayers = async (facility_address: string): Promise<string[]> => {
  const res = await FacilityContractRead.getAllRelayers(facility_address);
  return Array.from(res);
};

export const getGatewaysForRelayer = async (facility_address: string, relayer: string): Promise<string[]> => {
  const res = await FacilityContractRead.getRelayerGateways(facility_address, relayer);
  return Array.from(res);
};
export const getGatewayStatus = async (facility_address: string , gateway_id : string): Promise<CadencePolicy> =>
  await FacilityContractRead.getGatewayPolicy(facility_address , gateway_id);
export const getAllMeasurements = async (
  facilityAddress: string,
  gatewayAddress: string,
): Promise<string[]> => {
  // Map lookup, not index access. Case-insensitive fallback in case the
  // caller passes a lowercase/non-checksummed address.
  const direct = MEASUREMENTS_PER_GATEWAY.get(gatewayAddress);
  if (direct) return direct;

  const lower = gatewayAddress.toLowerCase();
  for (const [key, cids] of MEASUREMENTS_PER_GATEWAY) {
    if (key.toLowerCase() === lower) return cids;
  }
  return [];
};
export const getRelayerRegisteredAt = async (facilityAddress : string , relayerAddress: string): Promise<RelayerRegisteredEvent | null> =>
  await FacilityEvents.getRelayerRegistrationEvent({facilityAddress , relayerAddress});
export const getFacilityAddedEvent = async (facility_address : string): Promise<FacilityAddedEvent|undefined> => {
  for (const event of await FactoryEvents.getFacilityAddedEvents()){
    if (event.facilityAddress == facility_address) return event;
  }
   
  
};
export const getPublicURI = async (facility_address : string): Promise<string> => await FacilityContractRead.getLandingPageURI(facility_address);
export const isInEmergency = async (facility_address : string): Promise<boolean> => await FacilityContractRead.getEmergencyStatus(facility_address);


export async function handleUpdatePublicURI(facility_address : string,  new_uri: string, signer : Signer|null): Promise<void> {
  if (!signer) throw new Error ("invalid signer")
  await FacilityContractWrite.setLandingPageURI(signer , facility_address , new_uri);
}









export async function getFacilityDaoMembers(facilityAddress : string) : Promise<StakedMember[]>{
  return await FactoryContractRead.viewStakedMembers(facilityAddress);
}


export async function removeDaoMember(signer : Signer, facilityAddress : string,  Member : string){
  await FactoryWriteContract.removeCommitteeMember(signer , facilityAddress , Member);
}

// ── Which contracts this facility has already signed ──
export const getFacilitySignedContracts = async (
  facilityAddress: string
): Promise<SignedContract[]> => {
  return await FactoryContractRead.getFacilitySignedContracts(facilityAddress);
};

export const FreezeVotes = async (signer: Signer): Promise<boolean> => {
  const receipt = await FactoryWriteContract.attemptFreezeVotes(signer);
  return receipt?.status === Status.Success;
};