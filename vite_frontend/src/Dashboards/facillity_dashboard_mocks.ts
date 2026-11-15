// ============== facillity_dashboard_mocks.ts ==============
import { EventReader } from "../HashGraphUtils/Events";
import { FacilityContractRead } from "../HashGraphUtils/Contracts/Facility/FacilityRead";
import { FacilityContractWrite } from "../HashGraphUtils/Contracts/Facility/FacilityWrite";
import type { Measurement , CadencePolicy, FacilityAddedEvent, RelayerRegisteredEvent , KeyRotatedEvent, StakedMember, SignedContract} from "../types";
import { Signer } from "@hiero-ledger/sdk";
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

// gateway → relayers managing it
const RELAYERS_PER_GATEWAY: Record<string, string[]> = {
  [GATEWAYS[0]]: [RELAYERS[0], RELAYERS[1]],
  [GATEWAYS[1]]: [RELAYERS[1]],
  [GATEWAYS[2]]: [RELAYERS[0], RELAYERS[2]],
  [GATEWAYS[3]]: [RELAYERS[2]],
};

// relayer → gateways it manages
const GATEWAYS_PER_RELAYER: Record<string, string[]> = {
  [RELAYERS[0]]: [GATEWAYS[0], GATEWAYS[2]],
  [RELAYERS[1]]: [GATEWAYS[0], GATEWAYS[1]],
  [RELAYERS[2]]: [GATEWAYS[2], GATEWAYS[3]],
};

// ============================================================
// Relayer registration
// ============================================================

const RELAYER_REGISTERED_AT: Record<string, number> = {
  [RELAYERS[0]]: Date.UTC(2026, 0, 15) / 1000, // 15 Jan 2026
  [RELAYERS[1]]: Date.UTC(2026, 3, 2) / 1000,  // 2 Apr 2026
  [RELAYERS[2]]: Date.UTC(2026, 6, 20) / 1000, // 20 Jul 2026
};

// ============================================================
// Gateway cadence
// ============================================================

const GATEWAY_CADENCE: Record<string, CadencePolicy> = {
  [GATEWAYS[0]]: { expectedInterval: 3600, gracePeriod: 300 },
  [GATEWAYS[1]]: { expectedInterval: 7200, gracePeriod: 600 },
  [GATEWAYS[2]]: { expectedInterval: 1800, gracePeriod: 120 },
  [GATEWAYS[3]]: { expectedInterval: 86400, gracePeriod: 3600 },
};

// ============================================================
// Measurements
// ============================================================

const MEASUREMENTS_PER_GATEWAY: Record<string, Measurement[]> = {
  [GATEWAYS[0]]: [
    {
      documentCid: 'bafkreiAm1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      verified: true,
    },
    {
      documentCid: 'bafkreiAm2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      verified: true,
    },
  ],
  [GATEWAYS[1]]: [
    {
      documentCid: 'bafkreiAm3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig3cccccccccccccccccccccccccccccccccccccc',
      verified: false,
    },
  ],
  [GATEWAYS[2]]: [
    {
      documentCid: 'bafkreiAm4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig4dddddddddddddddddddddddddddddddddddddd',
      verified: true,
    },
    {
      documentCid: 'bafkreiAm5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig5eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      verified: true,
    },
    {
      documentCid: 'bafkreiAm6xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      signature: '0xSig6ffffffffffffffffffffffffffffffffffffff',
      verified: false,
    },
  ],
  [GATEWAYS[3]]: [],
};

// ============================================================
// Events
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
  await EventReader.getKeyRotatedEventsByGateway({facilityAddress, gatewayId})


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

// ── Ban / unban gateway ──
const BANNED_GATEWAYS = new Set<string>();

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
export const getAllMeasurements = async (facilityAddress: string, gatewayId : string): Promise<Measurement[]> =>
  MEASUREMENTS_PER_GATEWAY[gatewayId] ?? [];
export const getRelayerRegisteredAt = async (facilityAddress : string , relayerAddress: string): Promise<RelayerRegisteredEvent | null> =>
  await EventReader.getRelayerRegistrationEvent({facilityAddress , relayerAddress});
export const getFacilityAddedEvent = async (facility_address : string): Promise<FacilityAddedEvent|undefined> => {
  for (const event of await EventReader.getFacilityAddedEvents()){
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