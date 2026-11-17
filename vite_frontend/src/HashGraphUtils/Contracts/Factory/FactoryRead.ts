import { FACTORY_CONTRACT_ADDRESS } from "./../../configs";
import { ContractId } from "@hiero-ledger/sdk";
import { BigNumber } from "bignumber.js";
import { AbiCoder, JsonRpcProvider, Interface } from "ethers";
import type {
  FacilityMeta,
  DocumentInput,
  CandidateVotes,
  WrappedCandidate,
  StakedMember,
  SignedContract,
} from "../../../types";

const HEDERA_RPC_URL = "https://testnet.hashio.io/api";

let provider: JsonRpcProvider | null = null;

function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(HEDERA_RPC_URL);
  }
  return provider;
}

interface Inspector {
  wallet: string;
  AttachedDocumentsCIDs: string[];
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
    return Array.from(docs);
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
    return Array.from(facilities);
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
    return Array.from(contracts).map((c: any) => ({
      cid: c.cid,
      docType: c.docType,
      title: c.title,
      uploadedAt: c.uploadedAt,
    }));
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
    return {
      title: contractDoc.title,
      doc_cid: contractDoc.doc_cid,
    } as unknown as DocumentInput;
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
        "tuple(address facilityAddress, string name, string location, string sectorType, uint256 createdAt, bool isActive, string[] docCids)",
      ],
      raw
    );
    return {
      facilityAddress: info.facilityAddress,
      name: info.name,
      location: info.location,
      sectorType: info.sectorType,
      createdAt: info.createdAt,
      isActive: info.isActive,
      docCids: Array.from(info.docCids),
    } as FacilityMeta;
  }

  static async getFacilityDocs(facilityAddress: string): Promise<string[]> {
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
    return Array.from(docs).map((c: any) => String(c.doc_cid));
  }

  static async getFacilitySignedContracts(
    facilityAddress: string
  ): Promise<SignedContract[]> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "getFacilitySignedContracts",
      ["address"],
      [facilityAddress]
    );
    const coder = AbiCoder.defaultAbiCoder();
    const [contracts] = coder.decode(
      ["tuple(string DocumentCID, uint8 v, bytes32 r, bytes32 s)[]"],
      raw
    );
    return Array.from(contracts).map((c: any) => ({
      DocumentCID: c.DocumentCID,
      v: Number(c.v),
      r: c.r,
      s: c.s,
    }));
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
    return Array.from(facilities);
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
    return Array.from(members);
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
    return Array.from(committee);
  }

  static async getTop6Votes(): Promise<CandidateVotes[]> {
    const raw = await callMirrorNode(this.getContractId(), "get_top_6_votes", [], []);
    const coder = AbiCoder.defaultAbiCoder();

    const [votesArray] = coder.decode(["tuple(address wallet, uint256 votes)[]"], raw);

    return Array.from(votesArray).map((v: any) => ({
      wallet: v.wallet,
      votes: v.votes,
    }));
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
    return Array.from(facilities);
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
    return Array.from(daoMembers);
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
    return Array.from(candidates).map((c: any) => ({
      candidate: {
        wallet: c.candidate.wallet,
        name: c.candidate.name,
      },
      is_compliant: c.is_compliant,
    }));
  }

  static async getCompliantCandidates(): Promise<WrappedCandidate[]> {
    return (await this.getCandidates()).filter((c) => c.is_compliant === true);
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

    return Array.from(stakedMembers).map((m: any) => ({
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

  static async latestCommitteeGenerationTimestamp(): Promise<bigint> {
    const raw = await callMirrorNode(
      this.getContractId(),
      "latest_committee_generation_timestamp",
      [],
      []
    );

    if (!raw || raw === "0x") throw new Error("No timestamp returned");

    const coder = AbiCoder.defaultAbiCoder();
    const [timestamp] = coder.decode(["uint256"], raw);

    return timestamp;
  }
}