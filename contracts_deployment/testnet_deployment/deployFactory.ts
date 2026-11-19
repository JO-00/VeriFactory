import * as fs from "fs";
import * as path from "path";

import {
    Client,
    PrivateKey,
    AccountId,
    ContractId,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractCallQuery,
    Hbar,
    ContractByteCodeQuery,
} from "@hiero-ledger/sdk";

import { Interface } from "ethers";
import { config } from "dotenv";
import { FacilityParamsBuilder } from "../common_utils/FactoryParamBuilder";

config();

// --------------------------------------------------
// CONFIGURATION (all tunable via env vars, with defaults)
// --------------------------------------------------

const OUT_DIR = process.env.OUT_DIR
    ? path.resolve(process.env.OUT_DIR)
    : path.resolve(__dirname, "../../hashgraph/out");

const FACILITY_IMPLEMENTATION_ADDRESS =
    process.env.FACILITY_IMPLEMENTATION_ADDRESS ??
    "0x0000000000000000000000000000000000000000adb6b4";

const MAX_TRANSACTION_FEE_HBAR = Number(
    process.env.MAX_TRANSACTION_FEE_HBAR ?? 20
);

const GAS = {
    factory: Number(process.env.FACTORY_GAS ?? 15_000_000),
    facet: Number(process.env.FACET_GAS ?? 8_000_000),
    registration: Number(process.env.REGISTRATION_GAS ?? 1_000_000),
    query: Number(process.env.QUERY_GAS ?? 100_000),
};

const EXISTING = {
    factory: "0.0.11394765",
    committee: "0.0.11394768",
    init: "0.0.11394772",
    visualization: "0.0.11394774"
};

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface Artifact {
    contractName: string;
    abi: any[];
    bytecode: { object: string };
}

interface FacetConfig {
    name: string;
    artifactNames: string[];
    existingId: string;
    gas: number;
    functionNames: string[];
    /** If true, prepend FacilityParamsBuilder constructor params (Factory only). */
    prependConstructorParams?: boolean;
}

// --------------------------------------------------
// ARTIFACT LOADER
// --------------------------------------------------

const artifactCache = new Map<string, Artifact>();

function loadArtifact(names: string[]): Artifact {
    const cacheKey = names.join("|");
    const cached = artifactCache.get(cacheKey);
    if (cached) return cached;

    const candidates: string[] = [];

    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (names.some(n => entry.name === `${n}.json`)) {
                candidates.push(fullPath);
            }
        }
    }

    walk(OUT_DIR);

    if (candidates.length === 0) {
        throw new Error(
            `Artifact not found: ${names.join(" / ")}. Run forge build.`
        );
    }

    // Prefer exact-name matches over fallback names, and prefer shallow paths.
    candidates.sort((a, b) => {
        const aExact = names.includes(path.basename(a, ".json")) ? 0 : 1;
        const bExact = names.includes(path.basename(b, ".json")) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.split(path.sep).length - b.split(path.sep).length;
    });

    const artifact: Artifact = JSON.parse(
        fs.readFileSync(candidates[0], "utf8")
    );

    console.log(`Loaded ${artifact.contractName}: ${candidates[0]}`);
    artifactCache.set(cacheKey, artifact);
    return artifact;
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalizeAddress(address: string): string {
    return address.toLowerCase().replace(/^0x/, "");
}

/** Returns true if the bytecode looks deployable (non-empty valid hex). */
function isValidBytecode(bytecode: string | undefined): boolean {
    if (!bytecode) return false;
    const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
    return hex.length > 0 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex);
}

async function verifyContractExists(
    contractId: ContractId,
    client: Client
): Promise<void> {
    const bytecode = await new ContractByteCodeQuery()
        .setContractId(contractId)
        .execute(client);

    if (bytecode.length === 0) {
        throw new Error(`No bytecode found for ${contractId.toString()}`);
    }
}

// --------------------------------------------------
// DEPLOYMENT HELPER
// --------------------------------------------------

async function deployContract(
    name: string,
    bytecode: string,
    client: Client,
    gas: number
): Promise<ContractId> {
    console.log(`\nDeploying ${name}...`);

    if (!isValidBytecode(bytecode)) {
        throw new Error(`${name}: invalid or empty bytecode`);
    }

    const cleanBytecode = bytecode.startsWith("0x")
        ? bytecode.slice(2)
        : bytecode;

    console.log(`Gas limit: ${gas}`);

    const response = await new ContractCreateFlow()
        .setBytecode(cleanBytecode)
        .setGas(gas)
        .execute(client);

    const receipt = await response.getReceipt(client);

    if (!receipt.contractId) {
        throw new Error(
            `${name}: deployment returned no Contract ID. Status: ${receipt.status}`
        );
    }

    const contractId = receipt.contractId;

    console.log("----------------------------------");
    console.log(`${name} deployed successfully`);
    console.log("Status:", receipt.status.toString());
    console.log("Transaction ID:", response.transactionId.toString());
    console.log("Contract ID:", contractId.toString());
    console.log("EVM Address:", contractId.toEvmAddress());
    console.log("----------------------------------");

    return contractId;
}

// --------------------------------------------------
// REUSE OR DEPLOY
// --------------------------------------------------

async function getOrDeploy(
    name: string,
    existingId: string,
    bytecode: string,
    client: Client,
    gas: number
): Promise<ContractId> {
    if (existingId.trim() !== "") {
        const contractId = ContractId.fromString(existingId.trim());
        console.log(`\nReusing ${name}:`, contractId.toString());

        await verifyContractExists(contractId, client);

        console.log(`${name} verified at:`, contractId.toEvmAddress());
        return contractId;
    }

    return deployContract(name, bytecode, client, gas);
}

// --------------------------------------------------
// FACET REGISTRATION
// --------------------------------------------------

/** Builds the calldata for `facets(bytes4)` query. */
function encodeFacetsQuery(
    factoryInterface: Interface,
    selector: string
): Buffer {
    const calldata = factoryInterface.encodeFunctionData("facets", [selector]);
    return Buffer.from(calldata.slice(2), "hex");
}

/** Queries a selector and returns its registered EVM address (normalized). */
async function queryRegisteredFacet(
    factoryId: ContractId,
    factoryInterface: Interface,
    selector: string,
    client: Client
): Promise<string> {
    const result = await new ContractCallQuery()
        .setContractId(factoryId)
        .setGas(GAS.query)
        .setFunctionParameters(
            encodeFacetsQuery(factoryInterface, selector)
        )
        .execute(client);

    return normalizeAddress(result.getAddress(0));
}

async function registerFacet(
    config: FacetConfig,
    factoryId: ContractId,
    facetId: ContractId,
    artifact: Artifact,
    factoryArtifact: Artifact,
    client: Client
): Promise<void> {
    const { name, functionNames } = config;
    const iface = new Interface(artifact.abi);
    const factoryInterface = new Interface(factoryArtifact.abi);

    const selectors = functionNames.map(fnName => {
        const fragment = iface.getFunction(fnName);
        if (!fragment) {
            throw new Error(`${name}: function not found in ABI: ${fnName}`);
        }
        return fragment.selector;
    });

    const facetAddress = facetId.toEvmAddress();
    const expectedAddress = normalizeAddress(facetAddress);

    console.log(`\nChecking ${name} selectors...`);

    const missingSelectors: string[] = [];

    for (const selector of selectors) {
        try {
            const currentAddress = await queryRegisteredFacet(
                factoryId,
                factoryInterface,
                selector,
                client
            );

            if (currentAddress === expectedAddress) continue;

            if (currentAddress !== "0000000000000000000000000000000000000000") {
                throw new Error(
                    `${name}: selector ${selector} already points to ` +
                    `${currentAddress}, expected ${facetAddress}`
                );
            }

            missingSelectors.push(selector);
        } catch (error: any) {
            // The facets() getter may revert with "no facet for selector".
            // That specific revert means "not registered" — everything else
            // is a real error we should surface.
            const errorData =
                error?.contractFunctionResult?.errorMessage ??
                error?.error?.contractFunctionResult?.errorMessage;

            if (typeof errorData === "string" && looksLikeMissingFacetRevert(errorData)) {
                missingSelectors.push(selector);
                continue;
            }

            throw error;
        }
    }

    if (missingSelectors.length === 0) {
        console.log(
            `${name}: all ${selectors.length} selectors already registered`
        );
        return;
    }

    console.log(
        `${name}: ${missingSelectors.length} selector(s) need registration`
    );

    const encodedFunction = factoryInterface.encodeFunctionData(
        "addFacet",
        [facetAddress, missingSelectors]
    );

    console.log(`Registering ${name}...`);

    const response = await new ContractExecuteTransaction()
        .setContractId(factoryId)
        .setGas(GAS.registration)
        .setFunctionParameters(
            Buffer.from(encodedFunction.slice(2), "hex")
        )
        .execute(client);

    console.log("Registration transaction:", response.transactionId.toString());

    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
        throw new Error(`${name}: registration failed: ${receipt.status}`);
    }

    console.log(`${name}: registration transaction successful`);

    // Verify every selector after registration.
    for (const selector of selectors) {
        const registered = await queryRegisteredFacet(
            factoryId,
            factoryInterface,
            selector,
            client
        );

        if (registered !== expectedAddress) {
            throw new Error(
                `${name}: verification failed for selector ${selector}. ` +
                `Got ${registered}, expected ${expectedAddress}`
            );
        }
    }

    console.log(
        `${name}: all ${selectors.length} selectors verified successfully`
    );
}

/**
 * Matches the ABI-encoded `Error("no facet for selector")` revert.
 * Doing this via exact string comparison is brittle; instead we detect the
 * standard Error(string) prefix and decode the string payload.
 */
function looksLikeMissingFacetRevert(errorData: string): boolean {
    const hex = errorData.toLowerCase().replace(/^0x/, "");
    const ERROR_SELECTOR = "08c379a0"; // Error(string)
    if (!hex.startsWith(ERROR_SELECTOR)) return false;

    try {
        const abi = new Interface(["error Error(string)"]);
        const decoded = abi.decodeErrorResult("Error", "0x" + hex);
        return String(decoded[0]).toLowerCase().includes("no facet for selector");
    } catch {
        return false;
    }
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
    // 1. Load artifacts
    const factoryArtifact = loadArtifact(["Factory"]);

    const facetConfigs: FacetConfig[] = [
        {
            name: "CommitteeInspector",
            artifactNames: ["CommitteeInspector"],
            existingId: EXISTING.committee,
            gas: GAS.facet,
            functionNames: [
                "generate_new_committee",
                "rank_candidates",
                "getCurrentInspectors",
                "become_candidate",
                "quit_candidateship",
                "InspectorSignContract",
                "change_candidate_documents",
                "set_committee_member",
                "remove_committee_member",
            ],
        },
        {
            name: "Visualization",
            artifactNames: ["VisualizationFacet", "Visualization"],
            existingId: EXISTING.visualization,
            gas: GAS.facet,
            functionNames: [
                "getFactoryDocs",
                "getDeployedFacilities",
                "getFacilityCount",
                "getFactoryLegalContracts",
                "getInspectorLegalContract",
                "getFacilityGlobalInfo",
                "getFacilityDocs",
                "getFacilitySignedContracts",
                "getFacilitiesFromSignedContract",
                "getFacilityCommitteeMembers",
                "getCurrentCommittee",
                "get_top_6_votes",
                "get_number_of_voters",
                "getFacilityInspector",
                "getInspectorFacilities",
                "getDAO",
                "getCandidates",
                "getFacilityExistenceStatus",
                "view_staked_members",
                "memberStake",
                "CandidateIsCompliant",
                "votes_frozen",
                "latest_committee_generation_timestamp",
            ],
        },
        {
            name: "InitFactory",
            artifactNames: ["InitFactory"],
            existingId: EXISTING.init,
            gas: GAS.facet,
            functionNames: [
                "createFacility",
                "removeFacilityFromPlatform",
                "updateFacilityMeta",
                "addFacilityDocument",
                "replaceFacilityDocument",
                "SignTangibleContract",
                "setLogo",
                "setPlatformDocs",
            ],
        },
    ];

    // 2. Connect to Hedera Testnet
    const operatorId = process.env.OPERATOR_ID;
    const privateKey = process.env.OPERATOR_KEY;

    if (!operatorId) throw new Error("OPERATOR_ID missing from .env");
    if (!privateKey) throw new Error("OPERATOR_KEY missing from .env");

    if (!EXISTING.factory && !FACILITY_IMPLEMENTATION_ADDRESS) {
        throw new Error(
            "FACILITY_IMPLEMENTATION_ADDRESS must be filled manually."
        );
    }

    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromStringECDSA(privateKey)
    );
    client.setDefaultMaxTransactionFee(new Hbar(MAX_TRANSACTION_FEE_HBAR));

    console.log("\nOperator:", operatorId);
    console.log(
        "Default maximum transaction fee:",
        MAX_TRANSACTION_FEE_HBAR,
        "HBAR"
    );

    try {
        // 3. Build Factory deployment bytecode.
        let factoryDeploymentData = "";

        if (!EXISTING.factory) {
            if (!isValidBytecode(factoryArtifact.bytecode.object)) {
                throw new Error("Factory: invalid bytecode in artifact");
            }

            const constructorParams = FacilityParamsBuilder.buildConstructorParams(
                FACILITY_IMPLEMENTATION_ADDRESS,
                []
            );

            const factoryBytecode = factoryArtifact.bytecode.object.startsWith("0x")
                ? factoryArtifact.bytecode.object.slice(2)
                : factoryArtifact.bytecode.object;

            factoryDeploymentData =
                factoryBytecode + Buffer.from(constructorParams).toString("hex");
        }

        // 4. Deploy or reuse Factory
        const factoryId = await getOrDeploy(
            "Factory",
            EXISTING.factory,
            factoryDeploymentData,
            client,
            GAS.factory
        );

        // 5. Deploy or reuse facets + 6. register their selectors
        const deployedFacets: Record<string, ContractId> = {};

        for (const fc of facetConfigs) {
            const artifact = loadArtifact(fc.artifactNames);

            const facetId = await getOrDeploy(
                fc.name,
                fc.existingId,
                artifact.bytecode.object,
                client,
                fc.gas
            );

            deployedFacets[fc.name] = facetId;

            await registerFacet(
                fc,
                factoryId,
                facetId,
                artifact,
                factoryArtifact,
                client
            );
        }

        // 7. Final summary
        console.log("\n======================================");
        console.log("FACTORY DEPLOYMENT COMPLETE");
        console.log("======================================");
        console.log(
            "Factory:",
            factoryId.toString(),
            factoryId.toEvmAddress()
        );
        for (const fc of facetConfigs) {
            const id = deployedFacets[fc.name];
            console.log(
                `${fc.name}:`,
                id.toString(),
                id.toEvmAddress()
            );
        }
        console.log("======================================");
    } finally {
        client.close();
    }
}

main().catch(error => {
    console.error("\nDEPLOYMENT STOPPED");
    console.error(error);
    process.exitCode = 1;
});