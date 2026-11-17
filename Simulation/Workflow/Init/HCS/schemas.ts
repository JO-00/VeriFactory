// src/schemas.ts
import type { TypedDataDomain, TypedDataField } from "ethers";

export type HexAddress = `0x${string}`;
export type HexSignature = `0x${string}`;

export interface GatewayDocumentData {
  facilityAddress: HexAddress;
  gatewayId: string;
  gatewayAddress: HexAddress;
  documentCID: string;
}

export interface SignedGatewayDocument extends GatewayDocumentData {
  signature: HexSignature;
}

export interface InspectionReportData {
  facilityAddress: HexAddress;
  inspectorAddress: HexAddress;
  reportCID: string;
}

export interface SignedInspectionReport extends InspectionReportData {
  signature: HexSignature;
}

export const EIP712_DOMAIN: TypedDataDomain = {
  name: "FacilityRegistry",
  version: "1",
  chainId: 296, // 296 = Hedera Testnet, 295 = Hedera Mainnet
};

export const GATEWAY_DOCUMENT_TYPES: Record<string, TypedDataField[]> = {
  GatewayDocument: [
    { name: "facilityAddress", type: "address" },
    { name: "gatewayId", type: "string" },
    { name: "gatewayAddress", type: "address" },
    { name: "documentCID", type: "string" },
  ],
};

export const INSPECTION_REPORT_TYPES: Record<string, TypedDataField[]> = {
  InspectionReport: [
    { name: "facilityAddress", type: "address" },
    { name: "inspectorAddress", type: "address" },
    { name: "reportCID", type: "string" },
  ],
};

// Runtime type guards for untrusted public HCS messages
const isHex = (val: unknown): val is `0x${string}` =>
  typeof val === "string" && /^0x[0-9a-fA-F]+$/.test(val);

export function isSignedGatewayDocument(
  payload: unknown
): payload is SignedGatewayDocument {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    isHex(p.facilityAddress) &&
    typeof p.gatewayId === "string" &&
    isHex(p.gatewayAddress) &&
    typeof p.documentCID === "string" &&
    isHex(p.signature)
  );
}

export function isSignedInspectionReport(
  payload: unknown
): payload is SignedInspectionReport {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    isHex(p.facilityAddress) &&
    isHex(p.inspectorAddress) &&
    typeof p.reportCID === "string" &&
    isHex(p.signature)
  );
}