import { BigNumber } from "bignumber.js";
import { AbiCoder, JsonRpcProvider, Interface, keccak256, toUtf8Bytes } from "ethers";
import { ContractId } from "@hiero-ledger/sdk";
import  {type CadencePolicy ,type Gateway, UserFacilityRole} from "./../../../types"
import {getCallerName} from "./../../debug"


const ROLE_HASH: Record<UserFacilityRole, string> = {
  [UserFacilityRole.Admin]:    keccak256(toUtf8Bytes("ADMIN")),
  [UserFacilityRole.Relayer]:  keccak256(toUtf8Bytes("RELAYER")),
  [UserFacilityRole.Observer]: keccak256(toUtf8Bytes("OBSERVER")),
};


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
  let evmAddress: string;
  if (targetAddress.startsWith("0x")) {
    evmAddress = targetAddress;
  } else {
    const contractId = ContractId.fromString(targetAddress);
    const rawAddress = contractId.toEvmAddress();
    evmAddress = rawAddress.startsWith("0x") ? rawAddress : `0x${rawAddress}`;
  }

  // console.log(getCallerName());
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

  static async getLandingPageURI(
    facilityAddress: string
  ): Promise<string> {
    const raw = await callMirrorNode(
      facilityAddress,
      "LandingPageURI",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [uri] = coder.decode(["string"], raw);
    return uri;
  }

  static async getEmergencyStatus(
    facilityAddress: string
  ): Promise<boolean> {
    const raw = await callMirrorNode(
      facilityAddress,
      "emergencyOverride",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [emergency_status] = coder.decode(["bool"], raw);
    return emergency_status;
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
    role: UserFacilityRole,
    account: string
  ): Promise<boolean> {
    const raw = await callMirrorNode(
      facilityAddress,
      "hasAccountRole",
      ["bytes32", "address"],
      [ROLE_HASH[role], account]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [hasRole] = coder.decode(["bool"], raw);
    return hasRole;
  }
  static async getUserRole(
    facilityAddress : string,
    account : string
  ) : Promise<UserFacilityRole>{
    const raw = await callMirrorNode(
      facilityAddress,
      "getUserRole",
      ["address"],
      [account]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [Role] = coder.decode(["uint8"], raw);
    return Role;
  }
  static async getAdmin(
    facilityAddress : string
  ) : Promise<string>{
    const raw = await callMirrorNode(
      facilityAddress,
      "admin",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [admin] = coder.decode(["address"], raw);
    return admin;
  }
  static async getFacilityDocs(facilityAddress : string){
    const raw = await callMirrorNode(
      facilityAddress,
      "getFacilityDocs",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [documents] = coder.decode(["Document[]"], raw);
    return documents;
  }

  
}