import {
  ContractId,
  ContractExecuteTransaction,
  Signer,
  Client,
  TransactionReceipt,
} from "@hiero-ledger/sdk";
import {facilityAbi} from "./../../Abis"


export class FacilityContractWrite {
  private static encodeData(functionName: string, args: unknown[]): Uint8Array {
    const hexString = facilityAbi.encodeFunctionData(functionName, args);
    return Buffer.from(hexString.replace("0x", ""), "hex");
  }

  private static async execute(
    signer: Signer,
    facilityAddress: string,
    functionName: string,
    args: unknown[],
    gas: number
  ): Promise<TransactionReceipt> {
    const targetId = ContractId.fromEvmAddress(0, 0, facilityAddress);
    const parameters = this.encodeData(functionName, args);

    const transaction = new ContractExecuteTransaction()
      .setContractId(targetId)
      .setFunctionParameters(parameters)
      .setGas(gas);

    const response = await transaction.executeWithSigner(signer);
    console.log("Transaction ID:", response.transactionId.toString());

    const receipt = await response.getReceipt(Client.forTestnet());
    console.log("Transaction status:", receipt.status.toString());

    return receipt;
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