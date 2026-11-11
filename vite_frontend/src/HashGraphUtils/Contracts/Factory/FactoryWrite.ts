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
    const contractId = await this.getContractId();
    const parameters = this.encodeData("createFacility", [
      name,
      location,
      sectorType,
      initialRelayers,
      gateways,
      contracts,
    ]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }

  static async addFacilityDocument(
    signer: Signer,
    facilityAddress: string,
    cid: string,
    docType: string,
    title: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const contractId = await this.getContractId();
    const parameters = this.encodeData("addFacilityDocument", [
      facilityAddress,
      cid,
      docType,
      title,
    ]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
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
    const contractId = await this.getContractId();
    const parameters = this.encodeData("replaceFacilityDocument", [
      facilityAddress,
      oldCid,
      newCid,
      newDocType,
      newTitle,
    ]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
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
    const contractId = await this.getContractId();
    const parameters = this.encodeData("SignTangibleContract", [
      documentCid,
      facilityAddress,
      v,
      r,
      s,
    ]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }

  // ==========================================
  // ICommitteeInspector Functions
  // ==========================================

  static async generateNewCommittee(
    signer: Signer,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const contractId = await this.getContractId();
    const parameters = this.encodeData("generate_new_committee", []);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }

  static async rankCandidates(
    signer: Signer,
    preferences: string[],
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const contractId = await this.getContractId();
    const parameters = this.encodeData("rank_candidates", [preferences]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }

  static async becomeCandidate(
    signer: Signer,
    attachedDocuments: string[],
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const contractId = await this.getContractId();
    const parameters = this.encodeData("become_candidate", [attachedDocuments]);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }

  static async quitCandidateship(
    signer: Signer,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    const contractId = await this.getContractId();
    const parameters = this.encodeData("quit_candidateship", []);

    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
  }
}