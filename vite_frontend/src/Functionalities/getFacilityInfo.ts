import { type FacilityAddedEvent, type FacilityContract } from "../types";
import { type Inspector, type FacilityMeta, UserFacilityRole, type SignedContract } from "../types";
import type { AuthenticationResult } from "../Dashboards/dashboard_types";
import { FactoryContractRead } from "./../HashGraphUtils/Contracts/Factory/FactoryRead";
import { FacilityContractRead } from "../HashGraphUtils/Contracts/Facility/FacilityRead";
import { AccountId } from "@hiero-ledger/sdk";
import { FactoryEvents } from "./../HashGraphUtils/Events/factory";
import type { DAOMemberAddedEvent } from "../HashGraphUtils/Events/types";

export const getFacilityURI = async (facility_address: string): Promise<string | null> => {
  return await FacilityContractRead.getLandingPageURI(facility_address);
};

export async function resolveEvmAddress(accountId: string): Promise<string> {
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
  );
  if (!res.ok) throw new Error(`Mirror node lookup failed: ${res.status}`);
  const data = await res.json();
  return data.evm_address;
}

export const getFacilityAddresses = async (): Promise<string[]> =>
  await FactoryContractRead.getDeployedFacilities();

export const get_signed_contracts = async (
  facility_address: string
): Promise<FacilityContract[]> => {
  return (await FactoryContractRead.getFacilitySignedContracts(facility_address)).map(
    (element): FacilityContract => ({
      ContractIPFS_CID: element.DocumentCID,
      signed: true,
    })
  );
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

export const getFacilityMeta = async (facility_address: string): Promise<FacilityMeta | null> => {
  return FactoryContractRead.getFacilityGlobalInfo(facility_address);
};

export const authenticateFacility = async (
  facility_address: string,
  user_account_id: AccountId
): Promise<AuthenticationResult> => {
  let role: UserFacilityRole;
  let user_role: string;
  const current_user: string = await resolveEvmAddress(user_account_id.toString());

  if (await FacilityContractRead.hasAccountRole(facility_address, UserFacilityRole.Admin, current_user)) {
    user_role = "Admin";
    role = UserFacilityRole.Admin;
  } else if (await FacilityContractRead.hasAccountRole(facility_address, UserFacilityRole.Relayer, current_user)) {
    user_role = "Relayer";
    role = UserFacilityRole.Relayer;
  } else {
    user_role = "Observer";
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

export const getFacilityDocs = async (facility_address: string): Promise<string[]> => {
  return await FacilityContractRead.getFacilityDocs(facility_address);
};

export const FetchAllFacilities = async (): Promise<Record<string, FacilityMeta>> => {
  const facilities_info: Record<string, FacilityMeta> = {};
  const rawFacilities = await FactoryContractRead.getDeployedFacilities();
  const facilities = Array.from(rawFacilities);

  for (const facility of facilities) {
    try {
      facilities_info[facility] = await FactoryContractRead.getFacilityGlobalInfo(facility);
    } catch (err) {
      console.warn(`[FetchAllFacilities] Skipping ${facility}:`, err);
    }
  }

  return facilities_info;
};

export const getAllContracts = async (): Promise<string[]> => {
  return (await FactoryContractRead.getFactoryLegalContracts()).map(
    (element) => element.cid
  );
};

export const getFacilitySignedContracts = async (
  facilityAddress: string
): Promise<SignedContract[]> => {
  return await FactoryContractRead.getFacilitySignedContracts(facilityAddress);
};

export const FetchAllFacilityCreationEvents = async (): Promise<FacilityAddedEvent[]> => {
  return await FactoryEvents.getFacilityAddedEvents();
};

export const FetchAllDAOMemberAddedEvents = async (): Promise<Record<string, DAOMemberAddedEvent>> => {
  const events = await FactoryEvents.getDAOMemberAddedEvents();
  return events.reduce<Record<string, DAOMemberAddedEvent>>((acc, element) => {
    if (element.newMemberAddress) {
      acc[element.newMemberAddress.toLowerCase()] = element;
    }
    return acc;
  }, {});
};