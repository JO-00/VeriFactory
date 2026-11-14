import  {type FacilityContract } from "../types";
import { FACILITY_LANDING_PAGES , FACILITY_CONTRACTS_SIGNED , CONTRACTS_IN_ORDER , FACILITY_DOCS } from "../Dashboards/dashboard_constants";
import  { type Inspector  , type FacilityMeta, UserFacilityRole} from "../types";
import type { AuthenticationResult } from "../Dashboards/dashboard_types";
import {FactoryContractRead} from "./../HashGraphUtils/Contracts/Factory/FactoryRead"
import { FacilityContractRead } from "../HashGraphUtils/Contracts/Facility/FacilityRead";
import {AccountId} from "@hiero-ledger/sdk";

export const getFacilityURI = (facility_address: string): string | null => {
  return FACILITY_LANDING_PAGES[facility_address] ?? null;
};

export async function resolveEvmAddress(accountId: string): Promise<string> {
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
  );
  if (!res.ok) throw new Error(`Mirror node lookup failed: ${res.status}`);
  const data = await res.json();
  return data.evm_address; // 0xd41f...
}
export const getFacilityAddresses = async (): Promise<string[]> => await FactoryContractRead.getDeployedFacilities();

export const get_signed_contracts = (facility_address: string): FacilityContract[] => {
  const signedVector = FACILITY_CONTRACTS_SIGNED[facility_address] ?? [];
  return signedVector.map((bit, i) => ({
    ContractIPFS_CID: CONTRACTS_IN_ORDER[i],
    signed: bit === 1,
  }));
};

export const getFacilityInspector = (facility_address: string): Inspector => {
  return {
    wallet: `0xINSPECTOR${facility_address.slice(4, 12)}`,
    AttachedDocumentsCIDs: [
      `QmInspectorDoc_${facility_address.slice(2, 8)}`,
      `QmInspectorDoc_${facility_address.slice(2, 8)}`,
      `QmInspectorDoc_${facility_address.slice(2, 8)}`,
    ],
  };
};



/**
 * Returns FacilityMeta for a facility, or null if none.
 * TODO: Replace with your real resolver.
 */
export const getFacilityMeta = async (facility_address: string): Promise<FacilityMeta | null> => {
  return FactoryContractRead.getFacilityGlobalInfo(facility_address)
};

/**
 * Mock authenticate. TODO: replace with real auth.
 */
export const authenticateFacility = async (
  facility_address: string,
  user_account_id : AccountId
): Promise<AuthenticationResult> => {
  let role : UserFacilityRole;
  let user_role : string ;
  const current_user : string= await resolveEvmAddress(user_account_id.toString())
  console.log(await FacilityContractRead.getUserRole(facility_address , current_user))
  if (await FacilityContractRead.hasAccountRole(facility_address , UserFacilityRole.Admin , current_user)){
    user_role = "Admin";
    role = UserFacilityRole.Admin;
  }
  else if (await FacilityContractRead.hasAccountRole(facility_address , UserFacilityRole.Relayer , current_user)){
    user_role = "Relayer";
    role = UserFacilityRole.Relayer;
  }
  else {
    user_role = "Observer";
    console.log("an observer")
    role = UserFacilityRole.Observer;
  } 


  
  return {
    facilityAddress: facility_address,
    role: role,
    authenticated: true,
    wallet: `0xAUTHED${facility_address.slice(4, 12)}`,
    message: `Authenticated as ${user_role} to Facility ${facility_address} successfully.`,
  };

};



export const getFacilityDocs = (facility_address: string): string[] => {
  return FACILITY_DOCS[facility_address] ?? [];
};

export const FetchAllFacilities  = async () : Promise<Record<string,FacilityMeta>> =>{
  const facilities_info : Record<string, FacilityMeta> = {};
  const facilities : string[] = await FactoryContractRead.getDeployedFacilities();
  for (const facility of facilities){
    facilities_info[facility] = await FactoryContractRead.getFacilityGlobalInfo(facility);
  }
  return facilities_info;
  
}

export const getAllContracts = async () : Promise <string[] > => {
  return (await FactoryContractRead.getFactoryLegalContracts()).map(
    element => element.cid
  );
}

export const getFacilitySignedContracts = async (facilityAddress : string) : Promise <string[] > => {
  return (await FactoryContractRead.getFacilitySignedContracts(facilityAddress)).map(doc => doc.cid);
}