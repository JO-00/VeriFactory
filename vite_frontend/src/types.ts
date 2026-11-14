
export interface FacilityContract {
  ContractIPFS_CID: string;
  signed: boolean;
}

export interface Inspector {
  wallet: string;
  AttachedDocumentsCIDs: string[];
}

export interface FacilityData {
  address: string;
  contracts: FacilityContract[];
  inspector: Inspector | null;
}

import { BigNumber } from "bignumber.js";

export type BigNumberType = InstanceType<typeof BigNumber>;

export interface CadencePolicy {
  expectedInterval: BigNumberType;
  gracePeriod: BigNumberType;
}

export interface Gateway {
  gatewayId: string;
  activeKey: string;
  managingRelayer: string;
  isActive: boolean;
  registeredAt: BigNumberType;
}

export interface InitialGatewayInput {
  id: string;
  key: string;
  relayer: string;
}

export interface DocumentInput {
  cid: string;
  docType: string;
  title: string;
  uploadedAt: number | bigint;
}



export interface FacilityMeta {
    facilityAddress : string;
    name: string;
    location : string;
    sectorType : string;  
    createdAt : number | bigint;
    isActive : boolean;
    docCids : string[];    
}

export interface CandidateVotes{
    wallet : string ; 
    votes : bigint |number;
}

export interface WrappedCandidate{
  candidate : string;
  is_compliant : boolean;
}

export interface StakedMember{
  wallet : string;
  amount : bigint | number;
}

export enum UserFacilityRole{
  Admin,
  Relayer,
  Observer

}

export interface Measurement {
  documentCid: string;
  signature: string;
  verified: boolean;
}

export interface FacilityAddedEvent {
  facilityAddress: string;
  name: string;
  addedBy: string;
  location: string;
  sectorType: string;
  isActive: boolean;
  // Provenance (useful for UI / debugging)
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  timestamp: string;
}

export interface RelayerRegisteredEvent {
  facilityAddress: string;
  relayerAddress: string;
  name: string;
  transactionHash: string;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp: string;      // Raw Hedera "seconds.nanoseconds"
  timestampMs: number;    // Inferred Unix epoch in milliseconds
  timestampDate: Date;    // Inferred JS Date object
}
export interface KeyRotatedEvent {
  facilityAddress: string;
  gatewayId: string;
  gatewayIdHash: string;      // Keccak-256 hash stored in topic1
  oldKey: string;
  newKey: string;
  isAnomalous: boolean;
  contractTimestamp: bigint;  // uint256 timestamp emitted by the contract
  contractTimestampMs: number;
  contractTimestampDate: Date;
  transactionHash: string;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp: string;          // Hedera consensus "seconds.nanoseconds"
  timestampMs: number;        // Hedera consensus Unix ms
  timestampDate: Date;        // Hedera consensus Date
}