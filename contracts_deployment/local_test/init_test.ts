
import * as fs from "fs";
import * as path from "path";

import {
    JsonRpcProvider,
    Wallet,
    Contract,
    NonceManager
} from "ethers";

import { config } from "dotenv";
config();

// --------------------------------------------------
// HARDCODED ADDRESSES
// --------------------------------------------------

const FACTORY_ADDRESS =
    "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707";

const COMMITTEE_ADDRESS =
    "0x0165878a594ca255338adfa4d48449f69242eb8f";

const INIT_ADDRESS =
    "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853";

const VISUALIZATION_ADDRESS =
    "0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6";

// --------------------------------------------------
// ARTIFACT LOADER
// --------------------------------------------------

const OUT_DIR = path.resolve(__dirname, "../../hashgraph/out");

function findArtifact(name: string): any {
    function walk(dir: string): string | undefined {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const found = walk(fullPath);
                if (found) return found;
            } else if (entry.name === `${name}.json`) {
                return fullPath;
            }
        }
        return undefined;
    }

    const artifactPath = walk(OUT_DIR);

    if (!artifactPath) {
        throw new Error(`Artifact not found: ${name}`);
    }

    console.log(`Loaded ${name}: ${artifactPath}`);

    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {

    const provider = new JsonRpcProvider("http://127.0.0.1:8545");

    const privateKey = process.env.ANVIL_PRIVATE_KEY;
    if (!privateKey) throw new Error("ANVIL_PRIVATE_KEY missing");

    const wallet = new Wallet(privateKey, provider);
    const signer = new NonceManager(wallet);

    console.log("\nTester:", wallet.address);

    // 1. Load ABIs

    const initArtifact = findArtifact("InitFactory");
    const vizArtifact = findArtifact("Visualization");

    // 2. Check deployed code

    for (const [name, address] of [
        ["Factory", FACTORY_ADDRESS],
        ["CommitteeInspector", COMMITTEE_ADDRESS],
        ["InitFactory", INIT_ADDRESS],
        ["Visualization", VISUALIZATION_ADDRESS]
    ] as const) {
        const code = await provider.getCode(address);

        if (code === "0x") {
            throw new Error(`${name} has no deployed code at ${address}`);
        }

        console.log(`${name}: code exists`);
    }

    // 3. IMPORTANT:
    // Use the Factory address with the facet ABI.
    // This tests delegatecall routing.

    const viz = new Contract(
        FACTORY_ADDRESS,
        vizArtifact.abi,
        provider
    );

    const init = new Contract(
        FACTORY_ADDRESS,
        initArtifact.abi,
        signer
    );

    // --------------------------------------------------
    // TEST 1: VISUALIZATION READ FUNCTIONS
    // --------------------------------------------------

    console.log("\n========== READ TESTS ==========");

    const count = await viz.getFacilityCount();
    console.log("Facility count:", count.toString());

    const facilities = await viz.getDeployedFacilities();
    console.log("Deployed facilities:", facilities);

    const docs = await viz.getFactoryDocs();
    console.log("Factory docs:", docs);

    const legalContracts = await viz.getFactoryLegalContracts();
    console.log("Legal contracts:", legalContracts);

    const inspectorContract = await viz.getInspectorLegalContract();
    console.log("Inspector contract:", inspectorContract);

    // --------------------------------------------------
    // TEST 2: INITFACTORY WRITE + VISUALIZATION READ
    // --------------------------------------------------

    console.log("\n========== WRITE TEST ==========");

    const originalDocs: string[] = await viz.getFactoryDocs();

    console.log("Original docs:", originalDocs);

    const testDocs = ["ANVIL_FACET_ROUTING_TEST"];

    console.log("Calling setPlatformDocs through Factory...");

    const tx = await init.setPlatformDocs(testDocs);

    console.log("Transaction:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("setPlatformDocs transaction failed");
    }

    console.log("Write transaction successful!");

    // Read through a DIFFERENT facet.

    const updatedDocs = await viz.getFactoryDocs();

    console.log("Docs after write:", updatedDocs);

    if (
        updatedDocs.length !== 1 ||
        updatedDocs[0] !== testDocs[0]
    ) {
        throw new Error("Shared storage / facet routing test failed");
    }

    console.log("SUCCESS: InitFactory and Visualization share storage!");

    // --------------------------------------------------
    // TEST 3: RESTORE ORIGINAL DOCS
    // --------------------------------------------------

    console.log("\n========== RESTORE ==========");

    const restoreTx = await init.setPlatformDocs(originalDocs);
    await restoreTx.wait();

    const restoredDocs = await viz.getFactoryDocs();

    console.log("Restored docs:", restoredDocs);

    console.log("\n================================");
    console.log("ALL INITIAL TESTS PASSED");
    console.log("================================");
}

main().catch(error => {
    console.error("\nTEST ERROR:");
    console.error(error);
    process.exitCode = 1;
});
