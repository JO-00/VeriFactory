// file: DeployUnfreezeFacet.ts
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
    ContractByteCodeQuery
} from "@hiero-ledger/sdk";

import { Interface } from "ethers";
import { config } from "dotenv";
import { FacilityParamsBuilder } from "../common_utils/FactoryParamBuilder";

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
    committee: "0.0.11480983",
    init: "0.0.11480985",
    visualization: "0.0.11394774",
    // ADD YOUR NEW FACET HERE IF YOU WANT TO REUSE IT IN THE FUTURE
    unfreezeFacet: "0.0.11486208" 
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
// FACET REGISTRATION / UPGRADE
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

    const selectorsToRegister: string[] = [];

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

            selectorsToRegister.push(selector);
        } catch (error: any) {
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
                selectorsToRegister.push(selector);
                continue;
            }

            throw error;
        }
    }

    if (selectorsToRegister.length === 0) {
        console.log(
            `${name}: all ${selectors.length} selectors already registered`
        );
        return;
    }

    console.log(
        `${name}: ${selectorsToRegister.length} selectors need registration/update`
    );

    const encodedFunction = factoryInterface.encodeFunctionData(
        "addFacet",
        [facetAddress, selectorsToRegister]
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
    
    // We only need the Factory artifact to get the `addFacet` ABI, 
    // and the new UnfreezeFacet artifact to get its selector.
    const unfreezeFacetArtifact = findArtifact(["UnfreezeFacet"]);

    // 2. Connect to Hedera Testnet
    const operatorId = process.env.OPERATOR_ID;
    const privateKey = process.env.OPERATOR_KEY;

    if (!operatorId) throw new Error("OPERATOR_ID missing from .env");
    if (!privateKey) throw new Error("OPERATOR_KEY missing from .env");

    const client = Client.forTestnet();
    const operatorKey = PrivateKey.fromStringECDSA(privateKey);

    client.setOperator(AccountId.fromString(operatorId), operatorKey);
    client.setDefaultMaxTransactionFee(new Hbar(MAX_TRANSACTION_FEE_HBAR));

    console.log("\nOperator:", operatorId);
    console.log("Default maximum transaction fee:", MAX_TRANSACTION_FEE_HBAR, "HBAR");

    try {
        // 3. Deploy or reuse Factory (We MUST reuse it, not deploy a new one)
        if (!EXISTING.factory) {
            throw new Error("EXISTING.factory must be set. Do not deploy a fresh factory to patch!");
        }
        
        const factoryId = getContractId(EXISTING.factory);
        await verifyContractExists(factoryId, client);
        console.log(`\nReusing Factory: ${factoryId.toString()} (${factoryId.toEvmAddress()})`);

        // 4. Deploy or reuse UnfreezeFacet
        const unfreezeId = await getOrDeploy(
            "UnfreezeFacet",
            EXISTING.unfreezeFacet,
            unfreezeFacetArtifact.bytecode.object,
            client,
            FACET_GAS
        );

        // 5. Register UnfreezeFacet selector
        await registerFacet(
            "UnfreezeFacet",
            factoryId,
            unfreezeId,
            unfreezeFacetArtifact,
            factoryArtifact,
            [
                "unfreeze_votes", // <--- The function name from your Solidity
                "assign_inspectors_if_frozen"
            ],
            client
        );

        // 6. Final summary
        console.log("\n======================================");
        console.log("FACET PATCH COMPLETE");
        console.log("======================================");
        console.log("Factory:", factoryId.toString(), factoryId.toEvmAddress());
        console.log("UnfreezeFacet:", unfreezeId.toString(), unfreezeId.toEvmAddress());
        console.log("======================================");

        console.log("\nExecuting assign_inspectors_if_frozen...");
        const iface = new Interface(unfreezeFacetArtifact.abi);
        const calldata = iface.encodeFunctionData("assign_inspectors_if_frozen", []);

        const tx = await new ContractExecuteTransaction()
            .setContractId(factoryId)
            .setGas(1_000_000)
            .setFunctionParameters(Buffer.from(calldata.slice(2), "hex"))
            .execute(client);

        const receipt = await tx.getReceipt(client);
        
        if (receipt.status.toString() !== "SUCCESS") {
            throw new Error(`unfreeze_votes failed: ${receipt.status}`);
        }
        
        console.log("assign_inspectors_if_frozen executed successfully:", tx.transactionId.toString());
        

    } finally {
        client.close();
    }
}

main().catch(error => {
    console.error("\nDEPLOYMENT STOPPED");
    console.error(error);
    process.exitCode = 1;
});