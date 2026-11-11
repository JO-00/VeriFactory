import { BigNumber } from "bignumber.js";
import { AbiCoder, JsonRpcProvider, Interface } from "ethers";
import { ContractId } from "@hiero-ledger/sdk";
import type {CadencePolicy , Gateway} from "./../../../types"

// ==========================================
// Data Structures
// ==========================================






// ==========================================
// Read Implementation
// ==========================================

const HEDERA_RPC_URL = "https://testnet.hashio.io/api";

let provider: JsonRpcProvider | null = null;

function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(HEDERA_RPC_URL);
  }
  return provider;
}


async function callMirrorNode(
  targetAddress: string, // Accepts "0.0.12345" OR "0x1234..."
  functionName: string,
  inputTypes: string[],
  args: unknown[]
): Promise<string> {
  // Parses 0.0.X or 0x... and converts to the correct EVM address
  const contractId = ContractId.fromString(targetAddress);
  const rawAddress = contractId.toEvmAddress();
  const evmAddress = rawAddress.startsWith("0x") ? rawAddress : `0x${rawAddress}`;

  const signature = "function " + functionName + "(" + inputTypes.join(",") + ")";
  const iface = new Interface([signature]);
  const data = iface.encodeFunctionData(functionName, args);

  return await getProvider().send("eth_call", [
    {
      to: evmAddress,
      data: data,
    },
    "latest",
  ]);
}

export class FacilityContractRead  {
  static async getAllGateways(facilityAddress: string): Promise<string[]> {
    const raw = await callMirrorNode(facilityAddress, "getAllGateways", [], []);
    const coder = AbiCoder.defaultAbiCoder();
    const [gateways] = coder.decode(["string[]"], raw);
    return gateways;
  }

  static async getAllRelayers(facilityAddress: string): Promise<string[]> {
    const raw = await callMirrorNode(facilityAddress, "getAllRelayers", [], []);
    const coder = AbiCoder.defaultAbiCoder();
    const [relayers] = coder.decode(["address[]"], raw);
    return relayers;
  }

  static async getRelayerGateways(
    facilityAddress: string,
    relayer: string
  ): Promise<string[]> {
    const raw = await callMirrorNode(
      facilityAddress,
      "getRelayerGateways",
      ["address"],
      [relayer]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [gateways] = coder.decode(["string[]"], raw);
    return gateways;
  }

  static async getGatewayInfo(
    facilityAddress: string,
    gatewayId: string
  ): Promise<Gateway> {
    const raw = await callMirrorNode(
      facilityAddress,
      "getGatewayInfo",
      ["string"],
      [gatewayId]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [info] = coder.decode(
      [
        "tuple(string gatewayId, address activeKey, address managingRelayer, bool isActive, uint256 registeredAt)",
      ],
      raw
    );

    return {
      gatewayId: info.gatewayId,
      activeKey: info.activeKey,
      managingRelayer: info.managingRelayer,
      isActive: info.isActive,
      registeredAt: new BigNumber(info.registeredAt.toString()),
    };
  }

  static async getGatewayKey(
    facilityAddress: string,
    gatewayId: string
  ): Promise<string> {
    const raw = await callMirrorNode(
      facilityAddress,
      "getGatewayKey",
      ["string"],
      [gatewayId]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [key] = coder.decode(["address"], raw);
    return key;
  }

  static async getGatewayPolicy(
    facilityAddress: string,
    gatewayId: string
  ): Promise<CadencePolicy> {
    const raw = await callMirrorNode(
      facilityAddress,
      "getGatewayPolicy",
      ["string"],
      [gatewayId]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [policy] = coder.decode(
      ["tuple(uint256 expectedInterval, uint256 gracePeriod)"],
      raw
    );

    return {
      expectedInterval: new BigNumber(policy.expectedInterval.toString()),
      gracePeriod: new BigNumber(policy.gracePeriod.toString()),
    };
  }

  static async hasAccountRole(
    facilityAddress: string,
    role: Uint8Array | string,
    account: string
  ): Promise<boolean> {
    const raw = await callMirrorNode(
      facilityAddress,
      "hasAccountRole",
      ["bytes32", "address"],
      [role, account]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [hasRole] = coder.decode(["bool"], raw);
    return hasRole;
  }

  
}