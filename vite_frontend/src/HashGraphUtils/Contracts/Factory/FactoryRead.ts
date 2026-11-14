import { FACTORY_CONTRACT_ADDRESS } from "./../../configs";
import { ContractId } from "@hiero-ledger/sdk";
import { BigNumber } from "bignumber.js";
import { AbiCoder, JsonRpcProvider, Interface } from "ethers";
import type { FacilityMeta , DocumentInput , CandidateVotes , WrappedCandidate , StakedMember } from "../../../types";

const HEDERA_RPC_URL = "https://testnet.hashio.io/api";

let provider: JsonRpcProvider | null = null;

function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(HEDERA_RPC_URL);
  }
  return provider;
}

interface Inspector{
    wallet : string
    AttachedDocumentsCIDs : string[];
}

async function callMirrorNode(
  contractId: ContractId,
  functionName: string,
  inputTypes: string[],
  args: unknown[]
): Promise<string> {
  const rawAddress = contractId.toEvmAddress();
  const evmAddress = rawAddress.startsWith("0x") ? rawAddress : `0x${rawAddress}`;

  const signature =
    "function " + functionName + "(" + inputTypes.join(",") + ")";
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

export class FactoryContractRead {
  private static getContractId(): ContractId {
    return ContractId.fromString(FACTORY_CONTRACT_ADDRESS);
  }

  static async getFactoryDocs(): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFactoryDocs",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [docs] = coder.decode(["string[]"], raw);
    return docs;
  }

  static async getDeployedFacilities(): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getDeployedFacilities",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [facilities] = coder.decode(["address[]"], raw);
    return facilities;
  }

  static async getFacilityCount(): Promise<InstanceType<typeof BigNumber>> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityCount",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [count] = coder.decode(["uint256"], raw);
    return new BigNumber(count.toString());
  }

  static async getFactoryLegalContracts(): Promise<DocumentInput[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFactoryLegalContracts",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [contracts] = coder.decode(
      ["tuple(string cid, string docType, string title, uint256 uploadedAt)[]"],
      raw
    );
    return contracts;
  }

  static async getInspectorLegalContract(): Promise<DocumentInput> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getInspectorLegalContract",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [contractDoc] = coder.decode(
      ["tuple(string title, string doc_cid)"],
      raw
    );
    return contractDoc;
  }

  static async getFacilityGlobalInfo(facilityAddress: string): Promise<FacilityMeta> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityGlobalInfo",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [info] = coder.decode(
      [
        "tuple(address facilityAddress, string name, string location, string sectorType  , uint256 createdAt , bool isActive , string[] docCids)",
      ],
      raw
    );
    return info;
  }

  static async getFacilityDocs(facilityAddress: string): Promise<DocumentInput[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityDocs",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [docs] = coder.decode(
      ["tuple(string title, string doc_cid)[]"],
      raw
    );
    return docs;
  }

  static async getFacilitySignedContracts(
    facilityAddress: string
  ): Promise<DocumentInput[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilitySignedContracts",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [contracts] = coder.decode(
      ["tuple(string cid, string docType, string title, uint256 uploadedAt)[]"],
      raw
    );
    return contracts;
  }

  static async getFacilitiesFromSignedContract(
    contractCid: string
  ): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilitiesFromSignedContract",
      ["string"],
      [contractCid]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [facilities] = coder.decode(["address[]"], raw);
    return facilities;
  }

  static async getFacilityCommitteeMembers(
    facilityAddress: string
  ): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityCommitteeMembers",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [members] = coder.decode(["address[]"], raw);
    return members;
  }

  static async getCurrentCommittee(): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getCurrentCommittee",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [committee] = coder.decode(["address[]"], raw);
    return committee;
  }

  static async getTop6Votes(): Promise<CandidateVotes[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "get_top_6_votes",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [votes] = coder.decode(
      ["tuple(address candidate, uint256 votes)[]"],
      raw
    );
    return votes;
  }

  static async getNumberOfVoters(): Promise<InstanceType<typeof BigNumber>> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "get_number_of_voters",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [count] = coder.decode(["uint256"], raw);
    return new BigNumber(count.toString());
  }

  static async getFacilityInspector(
    facilityAddress: string
  ): Promise<Inspector> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityInspector",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [inspector] = coder.decode(
      ["tuple(address inspectorAddress, string name, bool isActive)"],
      raw
    );
    return inspector;
  }

  static async getInspectorFacilities(
    inspectorAddress: string
  ): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getInspectorFacilities",
      ["address"],
      [inspectorAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [facilities] = coder.decode(["address[]"], raw);
    return facilities;
  }

  static async getDAO(): Promise<string[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getDAO",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [daoMembers] = coder.decode(["address[]"], raw);
    return daoMembers;
  }

  static async getCandidates(): Promise<WrappedCandidate[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getCandidates",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [candidates] = coder.decode(
      [
        "tuple(tuple(address wallet, string name) candidate, bool is_compliant)[]",
      ],
      raw
    );
    return candidates;
  }

  static async getFacilityExistenceStatus(
    facilityAddress: string
  ): Promise<number> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilityExistenceStatus",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [status] = coder.decode(["uint8"], raw);
    return Number(status);
  }

  static async viewStakedMembers(
      facilityAddress: string
    ): Promise<StakedMember[]> {
      const raw = await callMirrorNode(
        this.getContractId(),
        "view_staked_members",
        ["address"],
        [facilityAddress]
      );
      const coder = AbiCoder.defaultAbiCoder();
      const [stakedMembers] = coder.decode(
        ["tuple(address wallet, uint256 amount)[]"],
        raw
      );

      return stakedMembers.toArray().map((m: { wallet: string; amount: bigint }) => ({
        wallet: m.wallet,
        amount: m.amount,
      }));
    }

  static async memberStake(who: string): Promise<InstanceType<typeof BigNumber>> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "memberStake",
      ["address"],
      [who]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [amount] = coder.decode(["uint256"], raw);
    return new BigNumber(amount.toString());
  }

  static async CandidateIsCompliant(who: string): Promise<boolean> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "CandidateIsCompliant",
      ["address"],
      [who]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [isCompliant] = coder.decode(["bool"], raw);
    return isCompliant;
  }

  static async votesFrozen(): Promise<boolean> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "votes_frozen",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [isFrozen] = coder.decode(["bool"], raw);
    return isFrozen;
  }

  static async latestCommitteeGenerationTimestamp(): Promise<InstanceType<typeof BigNumber>> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "latest_committee_generation_timestamp",
      [],
      []
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [timestamp] = coder.decode(["uint256"], raw);
    return new BigNumber(timestamp.toString());
  }
}