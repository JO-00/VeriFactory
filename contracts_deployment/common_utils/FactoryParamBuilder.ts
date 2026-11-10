import { AbiCoder, getBytes } from "ethers";
import {
  FACILITY_CONTRACTS,
  INSPECTOR_CONTRACT,
  FacilityDocumentInput
} from "./DocsData";

export class FacilityParamsBuilder {

  private static readonly DOCUMENT =
    "tuple(string cid,string docType,string title,uint256 uploadedAt)";

  private static normalizeDoc(doc: FacilityDocumentInput, timestamp: number) {
    return {
      cid: doc.cid,
      docType: doc.docType,
      title: doc.title,
      uploadedAt: timestamp
    };
  }

  public static buildConstructorParams(
    implementationAddress: string,
    platformDocs: string[]
  ): Uint8Array {

    const timestamp = Math.floor(Date.now() / 1000);

    const facilityContracts = FACILITY_CONTRACTS.map(doc =>
      this.normalizeDoc(doc, timestamp)
    );

    const inspectorContract = this.normalizeDoc(
      INSPECTOR_CONTRACT,
      timestamp
    );

    const encoded = AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "string[]",
        `${this.DOCUMENT}[]`,
        this.DOCUMENT
      ],
      [
        implementationAddress,
        platformDocs,
        facilityContracts,
        inspectorContract
      ]
    );

    return getBytes(encoded);
  }
}