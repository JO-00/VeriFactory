import {
  ContractId,
  ContractExecuteTransaction,
  Signer,
  Client,
  TransactionReceipt,
} from "@hiero-ledger/sdk";


import { FACTORY_CONTRACT_ADDRESS } from "./../../configs";
import { factoryAbi } from "../../Abis";
import type { DocumentInput , InitialGatewayInput } from "../../../types";

// Full ABI definition for encoding function calls


export class FactoryWriteContract {
  private static async getContractId(): Promise<ContractId> {
    return ContractId.fromString(FACTORY_CONTRACT_ADDRESS);
  }

  private static encodeData(functionName: string, args: unknown[]): Uint8Array {
    const hexString = factoryAbi.encodeFunctionData(functionName, args);
    return Buffer.from(hexString.replace("0x", ""), "hex");
  }

  private static async execute(signer : Signer, params : Uint8Array, gas : number, fee?: string){
    const contractId = await this.getContractId();
    let transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(params)
      .setGas(gas);

    if (fee) transaction = transaction.setPayableAmount(Number(fee) / 100_000_000);

    const response = await transaction.executeWithSigner(signer);

    return await response.getReceipt(Client.forTestnet());

  }

  // ==========================================
  // IInitFactory Functions
  // ==========================================

  static async createFacility(
    signer: Signer,
    name: string,
    location: string,
    sectorType: string,
    initialRelayers: string[],
    gateways: InitialGatewayInput[],
    contracts: DocumentInput[],
    gas: number = 3_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("createFacility", [
      name,
      location,
      sectorType,
      initialRelayers,
      gateways,
      contracts,
    ]);

    return await this.execute(signer, parameters , gas);
  }

  static async addFacilityDocument(
    signer: Signer,
    facilityAddress: string,
    cid: string,
    docType: string,
    title: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("addFacilityDocument", [
      facilityAddress,
      cid,
      docType,
      title,
    ]);

    return await this.execute(signer, parameters , gas);
  }

  static async replaceFacilityDocument(
    signer: Signer,
    facilityAddress: string,
    oldCid: string,
    newCid: string,
    newDocType: string,
    newTitle: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("replaceFacilityDocument", [
      facilityAddress,
      oldCid,
      newCid,
      newDocType,
      newTitle,
    ]);

    return await this.execute(signer, parameters , gas);
  }

  static async signTangibleContract(
    signer: Signer,
    documentCid: string,
    facilityAddress: string,
    v: number,
    r: Uint8Array | string,
    s: Uint8Array | string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("SignTangibleContract", [
      documentCid,
      facilityAddress,
      v,
      r,
      s,
    ]);

    return await this.execute(signer, parameters , gas);
  }

  // ==========================================
  // ICommitteeInspector Functions
  // ==========================================

  static async generateNewCommittee(
    signer: Signer,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("generate_new_committee", []);
    return await this.execute(signer, parameters , gas);
  }

  static async rankCandidates(
    signer: Signer,
    preferences: string[],
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("rank_candidates", [preferences]);
    return await this.execute(signer, parameters , gas);
  }

  static async becomeCandidate(
    signer: Signer,
    attachedDocuments: string[],
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("become_candidate", [attachedDocuments]);
    return await this.execute(signer, parameters , gas);
  }

  static async quitCandidateship(
    signer: Signer,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("quit_candidateship", []);

    return await this.execute(signer, parameters , gas);
  }
  static async setCommitteeMember(
    signer : Signer,
    facilityAddress : string,
    newCommitteeMemberAddress : string,
    fee : string,
    gas: number = 1_000_000
  ){
    const parameters = this.encodeData("set_committee_member",[newCommitteeMemberAddress , facilityAddress]);
    return await this.execute(signer, parameters , gas, fee);
  }
  static async removeCommitteeMember(
    signer : Signer,
    facilityAddress : string,
    newCommitteeMemberAddress : string,
    gas: number = 1_000_000
  ){
    const parameters = this.encodeData("remove_committee_member",[newCommitteeMemberAddress , facilityAddress]);
    return await this.execute(signer, parameters , gas);
  }

  static async deleteFacility(
    signer: Signer,
    facilityAddress: string,
    last_document_cid : string = "",
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData('removeFacilityFromPlatform', [facilityAddress,last_document_cid]);
    return await this.execute(signer, parameters, gas);
  }

  static async signInspectorContract(
    signer: Signer,
    v: number,
    r: Uint8Array | string,
    s: Uint8Array | string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("InspectorSignContract", [
      v,
      r,
      s,
    ]);
    return await this.execute(signer, parameters , gas);
  }

  static async BackFillEventsForDebugging(
    signer : Signer,
    gas : number = 1_000_000
  ) : Promise <TransactionReceipt>{
    const parameters = this.encodeData("backfillEvents",[]);
    return await this.execute(signer,parameters,gas);
  }
  static async addFacet(
    signer: Signer,
    facet: string,
    selectors: string[],
    gas: number = 1_500_000
  ): Promise<TransactionReceipt> {
    const parameters = this.encodeData("addFacet", [
      facet,
      selectors,
    ]);

    return await this.execute(signer, parameters, gas);
  }

  static async AssignInspectorsToFacilities(signer : Signer , gas : number = 1_500_000) : Promise <TransactionReceipt>{
    const parameters = this.encodeData("assign_inspectors_if_frozen", [])
    const receipt = await this.execute(signer , parameters , gas);
    return receipt;
  }


}