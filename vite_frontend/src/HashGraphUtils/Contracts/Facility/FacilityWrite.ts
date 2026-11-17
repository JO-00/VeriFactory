import {
  ContractId,
  ContractExecuteTransaction,
  Signer,
  Client,
  TransactionReceipt,
  TransactionId,
} from "@hiero-ledger/sdk";
import { getBytes } from "ethers";
import { facilityAbi } from "./../../Abis";

const testnetClient = Client.forTestnet();

export class FacilityContractWrite {
  private static encodeData(functionName: string, args: unknown[]): Uint8Array {
    const hexString = facilityAbi.encodeFunctionData(functionName, args);
    return getBytes(hexString);
  }

  private static async execute(
    signer: Signer,
    facilityAddress: string,
    functionName: string,
    args: unknown[],
    gas: number
  ): Promise<TransactionReceipt> {
    try {
      const targetId = facilityAddress.startsWith("0x")
        ? ContractId.fromEvmAddress(0, 0, facilityAddress)
        : ContractId.fromString(facilityAddress);

      const parameters = this.encodeData(functionName, args);

      // Generate TransactionId using the connected wallet's AccountId
      const accountId = signer.getAccountId();
      const txId = TransactionId.generate(accountId);

      // Freeze with testnetClient so nodeAccountIds are automatically populated
      const transaction = new ContractExecuteTransaction()
        .setContractId(targetId)
        .setFunctionParameters(parameters)
        .setGas(gas)
        .setTransactionId(txId)
        .freezeWith(testnetClient);

      // Wallet signs and executes the already-frozen transaction
      const response = await transaction.executeWithSigner(signer);

      // Poll receipt via SDK client
      const receipt = await response.getReceipt(testnetClient);

      return receipt;
    } catch (error: any) {
      console.error(
        `[FacilityContractWrite.${functionName}] Execution failed:`,
        error?.message || error,
        error?.data ? JSON.stringify(error.data) : ""
      );
      throw error;
    }
  }

  // ==========================================
  // IFacilityAccess Functions
  // ==========================================

  static async grantAccountRole(
    signer: Signer,
    facilityAddress: string,
    role: Uint8Array | string,
    account: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "grantAccountRole", [role, account], gas);
  }

  static async revokeAccountRole(
    signer: Signer,
    facilityAddress: string,
    role: Uint8Array | string,
    account: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "revokeAccountRole", [role, account], gas);
  }

  static async enableEmergencyOverride(
    signer: Signer,
    facilityAddress: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "EnableEmergencyOverride", [], gas);
  }

  static async disableEmergencyOverride(
    signer: Signer,
    facilityAddress: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "DisableEmergencyOverride", [], gas);
  }

  static async setLandingPageURI(
    signer: Signer,
    facilityAddress: string,
    newUri: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "setLandingPageURI", [newUri], gas);
  }

  // ==========================================
  // IFacilityKeys Functions
  // ==========================================

  static async rotateKey(
    signer: Signer,
    facilityAddress: string,
    gatewayId: string,
    newPublicKey: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "rotateKey", [gatewayId, newPublicKey], gas);
  }

  // ==========================================
  // IFacilityPolicy Functions
  // ==========================================

  static async setGatewayPolicy(
    signer: Signer,
    facilityAddress: string,
    gatewayId: string,
    expectedInterval: number | bigint,
    gracePeriod: number | bigint,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(
      signer,
      facilityAddress,
      "setGatewayPolicy",
      [gatewayId, expectedInterval, gracePeriod],
      gas
    );
  }

  // ==========================================
  // IFacilityRelayers Functions
  // ==========================================

  static async registerRelayer(
    signer: Signer,
    facilityAddress: string,
    relayer: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "registerRelayer", [relayer], gas);
  }

  static async removeRelayer(
    signer: Signer,
    facilityAddress: string,
    relayer: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "removeRelayer", [relayer], gas);
  }

  static async assignGatewayToRelayer(
    signer: Signer,
    facilityAddress: string,
    gatewayId: string,
    initialKey: string,
    relayer: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(
      signer,
      facilityAddress,
      "assignGatewayToRelayer",
      [gatewayId, initialKey, relayer],
      gas
    );
  }

  static async reassignGatewayRelayer(
    signer: Signer,
    facilityAddress: string,
    gatewayId: string,
    newRelayer: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(
      signer,
      facilityAddress,
      "reassignGatewayRelayer",
      [gatewayId, newRelayer],
      gas
    );
  }

  static async banGateway(
    signer: Signer,
    facilityAddress: string,
    gatewayId: string,
    gas: number = 1_000_000
  ): Promise<TransactionReceipt> {
    return await this.execute(signer, facilityAddress, "banGateway", [gatewayId], gas);
  }
}