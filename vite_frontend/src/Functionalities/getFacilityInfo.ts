import type { FacilityContract } from "../types";
import { FACILITY_LANDING_PAGES , FACILITY_CONTRACTS_SIGNED , CONTRACTS_IN_ORDER , FACILITY_META , FACILITY_DOCS } from "../Dashboards/dashboard_constants";
import type { Inspector  , FacilityMeta} from "../types";
import type { AuthenticationResult } from "../Dashboards/dashboard_types";

export const getFacilityURI = (facility_address: string): string | null => {
  return FACILITY_LANDING_PAGES[facility_address] ?? null;
};

// ============== MOCK FUNCTIONS (replace later) ==============

export const getFacilityAddresses = (): string[] => Object.keys(FACILITY_LANDING_PAGES);

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
export const getFacilityMeta = (facility_address: string): FacilityMeta | null => {
  return FACILITY_META[facility_address] ?? null;
};

/**
 * Mock authenticate. TODO: replace with real auth.
 */
export const authenticateFacility = async (
  facility_address: string
): Promise<AuthenticationResult> => {
  await new Promise((r) => setTimeout(r, 400));
  return {
    facilityAddress: facility_address,
    authenticated: true,
    wallet: `0xAUTHED${facility_address.slice(4, 12)}`,
    message: `Facility ${facility_address} authenticated successfully.`,
  };
};



export const getFacilityDocs = (facility_address: string): string[] => {
  return FACILITY_DOCS[facility_address] ?? [];
};