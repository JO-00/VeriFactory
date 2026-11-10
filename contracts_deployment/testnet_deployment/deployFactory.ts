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
    ContractFunctionParameters,
    Hbar,
    ContractByteCodeQuery,
    ContractCreateTransaction,
    FileCreateTransaction,
    FileAppendTransaction,
    FileId
} from "@hiero-ledger/sdk";

import { Interface } from "ethers";
import { config } from "dotenv";
import { FacilityParamsBuilder } from "../common_utils/FactoryParamBuilder";
import { exit } from "process";

config();

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const OUT_DIR = path.resolve(
    __dirname,
    "../../hashgraph/out"
);

// Fill manually with the FacilityRegistry EVM address.
const FACILITY_IMPLEMENTATION_ADDRESS = "0x0000000000000000000000000000000000adb6b4";

// Leave empty to deploy.
// Fill with existing Hedera Contract IDs to reuse deployments.

const EXISTING = {
    factory: "0.0.11394765",
    committee: "0.0.11394768",
    init: "0.0.11394772",
    visualization: "0.0.11394774"
};

const MAX_TRANSACTION_FEE_HBAR = 20;

const FACTORY_GAS = 15_000_000;
const FACET_GAS = 8_000_000;
const REGISTRATION_GAS = 1_000_000;

// --------------------------------------------------
// ARTIFACT LOADER
// --------------------------------------------------

function findArtifact(names: string[]): any {
    const candidates: string[] = [];

    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, {
            withFileTypes: true
        })) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (
                names.some(name => entry.name === `${name}.json`)
            ) {
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

    const artifact = JSON.parse(
        fs.readFileSync(candidates[0], "utf8")
    );

    console.log(
        `Loaded ${artifact.contractName}: ${candidates[0]}`
    );

    return artifact;
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalizeAddress(address: string): string {
    return address.toLowerCase().replace(/^0x/, "");
}

function getContractId(id: string): ContractId {
    return ContractId.fromString(id);
}

async function verifyContractExists(
    contractId: ContractId,
    client: Client
): Promise<void> {
    // A successful ContractCallQuery is not used here:
    // we verify the contract by querying its bytecode.

    const bytecode = await new ContractByteCodeQuery()
        .setContractId(contractId)
        .execute(client);

    if (bytecode.length === 0) {
        throw new Error(
            `No bytecode found for ${contractId.toString()}`
        );
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

    if (!bytecode || bytecode === "0x") {
        throw new Error(`${name}: bytecode is empty`);
    }

    const cleanBytecode = bytecode.startsWith("0x")
        ? bytecode.slice(2)
        : bytecode;

    if (
        cleanBytecode.length % 2 !== 0 ||
        !/^[0-9a-fA-F]+$/.test(cleanBytecode)
    ) {
        throw new Error(`${name}: invalid hexadecimal bytecode`);
    }

    console.log(`Gas limit: ${gas}`);

    const flow = new ContractCreateFlow()
    .setBytecode(cleanBytecode)
    .setGas(gas);

    const response = await flow.execute(client);
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
        const contractId = getContractId(existingId);

        console.log(`\nReusing ${name}:`, contractId.toString());

        await verifyContractExists(contractId, client);

        console.log(
            `${name} verified at:`,
            contractId.toEvmAddress()
        );

        return contractId;
    }

    return deployContract(name, bytecode, client, gas);
}

// --------------------------------------------------
// FACET REGISTRATION
// --------------------------------------------------

async function registerFacet(
    name: string,
    factoryId: ContractId,
    facetId: ContractId,
    artifact: any,
    factoryArtifact: any,
    functionNames: string[],
    client: Client
): Promise<void> {

    const iface = new Interface(artifact.abi);
    const factoryInterface = new Interface(factoryArtifact.abi);

    const selectors = functionNames.map(functionName => {
        const fragment = iface.getFunction(functionName);

        if (!fragment) {
            throw new Error(
                `${name}: function not found in ABI: ${functionName}`
            );
        }

        return fragment.selector;
    });

    const facetAddress = facetId.toEvmAddress();

    const expectedAddress = normalizeAddress(facetAddress);

    console.log(`\nChecking ${name} selectors...`);

    const missingSelectors: string[] = [];

    // Check whether a selector is already registered.
    for (const selector of selectors) {

        const calldata = factoryInterface.encodeFunctionData(
            "facets",
            [selector]
        );

        try {
            const result = await new ContractCallQuery()
                .setContractId(factoryId)
                .setGas(100_000)
                .setFunctionParameters(
                    Buffer.from(calldata.slice(2), "hex")
                )
                .execute(client);

            const registeredAddress = result.getAddress(0);
            const currentAddress = normalizeAddress(registeredAddress);

            if (currentAddress === expectedAddress) {
                continue;
            }

            if (
                currentAddress !==
                "0000000000000000000000000000000000000000"
            ) {
                throw new Error(
                    `${name}: selector ${selector} already points to ` +
                    `${registeredAddress}, expected ${facetAddress}`
                );
            }

            missingSelectors.push(selector);

        } catch (error: any) {

            // Some custom facets() getters revert when no facet exists.
            // Only treat the exact "no facet for selector" revert as missing.
            const errorData =
                error?.contractFunctionResult?.errorMessage ??
                error?.error?.contractFunctionResult?.errorMessage;

            const missingFacetRevert =
                "0x08c379a0" +
                "0000000000000000000000000000000000000000000000000000000000000020" +
                "0000000000000000000000000000000000000000000000000000000000000015" +
                "6e6f20666163657420666f722073656c6563746f72" +
                "000000000000000000000000000000000000000000000000000000000000";

            if (
                typeof errorData === "string" &&
                errorData.toLowerCase() === missingFacetRevert.toLowerCase()
            ) {
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

    console.log(`${name}: ${missingSelectors.length} selectors need registration`);

    // Encode addFacet(address,bytes4[]) using ethers.
    const encodedFunction = factoryInterface.encodeFunctionData(
        "addFacet",
        [facetAddress, missingSelectors]
    );

    const transaction = new ContractExecuteTransaction()
        .setContractId(factoryId)
        .setGas(REGISTRATION_GAS)
        .setFunctionParameters(
            Buffer.from(encodedFunction.slice(2), "hex")
        );

    console.log(`Registering ${name}...`);

    const response = await transaction.execute(client);

    console.log(
        "Registration transaction:",
        response.transactionId.toString()
    );

    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
        throw new Error(
            `${name}: registration failed: ${receipt.status}`
        );
    }

    console.log(`${name}: registration transaction successful`);

    // Verify every selector after registration.
    for (const selector of selectors) {

        const calldata = factoryInterface.encodeFunctionData(
            "facets",
            [selector]
        );

        const result = await new ContractCallQuery()
            .setContractId(factoryId)
            .setGas(100_000)
            .setFunctionParameters(
                Buffer.from(calldata.slice(2), "hex")
            )
            .execute(client);

        const registeredAddress = result.getAddress(0);

        if (
            normalizeAddress(registeredAddress) !== expectedAddress
        ) {
            throw new Error(
                `${name}: verification failed for selector ${selector}. ` +
                `Got ${registeredAddress}, expected ${facetAddress}`
            );
        }
    }

    console.log(
        `${name}: all ${selectors.length} selectors verified successfully`
    );
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {

    // 1. Load artifacts

    const factoryArtifact = findArtifact(["Factory"]);
    const committeeArtifact = findArtifact(["CommitteeInspector"]);
    const initArtifact = findArtifact(["InitFactory"]);

    const visualizationArtifact = findArtifact([
        "VisualizationFacet",
        "Visualization"
    ]);

    // 2. Connect to Hedera Testnet

    const operatorId = process.env.OPERATOR_ID;
    const privateKey = process.env.OPERATOR_KEY;

    if (!operatorId) {
        throw new Error("OPERATOR_ID missing from .env");
    }

    if (!privateKey) {
        throw new Error("ECDSA_PRIVATE_KEY missing from .env");
    }

    if (
        !EXISTING.factory &&
        !FACILITY_IMPLEMENTATION_ADDRESS
    ) {
        throw new Error(
            "FACILITY_IMPLEMENTATION_ADDRESS must be filled manually."
        );
    }

    const client = Client.forTestnet();

    const operatorKey = PrivateKey.fromStringECDSA(privateKey);

    client.setOperator(
        AccountId.fromString(operatorId),
        operatorKey
    );

    client.setDefaultMaxTransactionFee(
        new Hbar(MAX_TRANSACTION_FEE_HBAR)
    );


    console.log("\nOperator:", operatorId);
    console.log(
        "Default maximum transaction fee:",
        MAX_TRANSACTION_FEE_HBAR,
        "HBAR"
    );

    try {

        // 3. Build Factory deployment data using your builder.

        let factoryDeploymentData = "";

        if (!EXISTING.factory) {

            const constructorParams =
                FacilityParamsBuilder.buildConstructorParams(
                    FACILITY_IMPLEMENTATION_ADDRESS,
                    []
                );

            const factoryBytecode =
                factoryArtifact.bytecode.object.startsWith("0x")
                    ? factoryArtifact.bytecode.object.slice(2)
                    : factoryArtifact.bytecode.object;

            factoryDeploymentData =
                factoryBytecode +
                Buffer.from(constructorParams).toString("hex");
        }

        // 4. Deploy or reuse Factory

        const factoryId = await getOrDeploy(
            "Factory",
            EXISTING.factory,
            factoryDeploymentData,
            client,
            FACTORY_GAS
        );

        // 5. Deploy or reuse facet implementations

        const committeeId = await getOrDeploy(
            "CommitteeInspector",
            EXISTING.committee,
            committeeArtifact.bytecode.object,
            client,
            FACET_GAS
        );

        const initId = await getOrDeploy(
            "InitFactory",
            EXISTING.init,
            initArtifact.bytecode.object,
            client,
            FACET_GAS
        );

        const visualizationId = await getOrDeploy(
            "Visualization",
            EXISTING.visualization,
            visualizationArtifact.bytecode.object,
            client,
            FACET_GAS
        );

        // 6. Register CommitteeInspector selectors

        await registerFacet(
            "CommitteeInspector",
            factoryId,
            committeeId,
            committeeArtifact,
            factoryArtifact,
            [
                "generate_new_committee",
                "rank_candidates",
                "getCurrentInspectors",
                "become_candidate",
                "quit_candidateship",
                "InspectorSignContract",
                "change_candidate_documents",
                "set_committee_member",
                "remove_committee_member"
            ],
            client
        );

        // 7. Register Visualization selectors

        await registerFacet(
            "Visualization",
            factoryId,
            visualizationId,
            visualizationArtifact,
            factoryArtifact,
            [
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
                "latest_committee_generation_timestamp"
            ],
            client
        );

        // 8. Register InitFactory selectors

        await registerFacet(
            "InitFactory",
            factoryId,
            initId,
            initArtifact,
            factoryArtifact,
            [
                "createFacility",
                "removeFacilityFromPlatform",
                "updateFacilityMeta",
                "addFacilityDocument",
                "replaceFacilityDocument",
                "SignTangibleContract",
                "setLogo",
                "setPlatformDocs"
            ],
            client
        );

        // 9. Final summary

        console.log("\n======================================");
        console.log("FACTORY DEPLOYMENT COMPLETE");
        console.log("======================================");

        console.log(
            "Factory:",
            factoryId.toString(),
            factoryId.toEvmAddress()
        );

        console.log(
            "CommitteeInspector:",
            committeeId.toString(),
            committeeId.toEvmAddress()
        );

        console.log(
            "InitFactory:",
            initId.toString(),
            initId.toEvmAddress()
        );

        console.log(
            "Visualization:",
            visualizationId.toString(),
            visualizationId.toEvmAddress()
        );

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