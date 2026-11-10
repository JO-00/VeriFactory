
import * as fs from "fs";
import * as path from "path";

import {
    JsonRpcProvider,
    Wallet,
    ContractFactory,
    Contract,
    Interface,
    NonceManager
} from "ethers";

import { config } from "dotenv";
import { FacilityParamsBuilder } from "../common_utils/FactoryParamBuilder";

config();

// --------------------------------------------------
// ARTIFACT LOADER
// --------------------------------------------------

const OUT_DIR = path.resolve(
    __dirname,
    "../../hashgraph/out"
);

function findArtifact(names: string[]): any {
    const candidates: string[] = [];

    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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

    console.log(`Loaded ${artifact.contractName}: ${candidates[0]}`);

    return artifact;
}

// --------------------------------------------------
// DEPLOYMENT HELPERS
// --------------------------------------------------

async function deployFacet(
    name: string,
    artifact: any,
    wallet: Wallet|NonceManager
): Promise<string> {

    console.log(`\nDeploying ${name}...`);

    const bytecode = artifact.bytecode.object.startsWith("0x")
        ? artifact.bytecode.object
        : "0x" + artifact.bytecode.object;

    const factory = new ContractFactory(
        artifact.abi,
        bytecode,
        wallet
    );

    const contract = await factory.deploy();

    const tx = contract.deploymentTransaction();

    if (!tx) {
        throw new Error(`${name}: deployment transaction missing`);
    }

    console.log("Transaction:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(`${name}: deployment failed`);
    }

    const address = await contract.getAddress();

    console.log(`${name} deployed:`, address);
    console.log("Gas used:", receipt.gasUsed.toString());

    return address;
}

// --------------------------------------------------
// FACET REGISTRATION
// --------------------------------------------------

async function registerFacet(
    name: string,
    factory: Contract,
    facetAddress: string,
    artifact: any,
    functionNames: string[]
) {

    const iface = new Interface(artifact.abi);

    const selectors = functionNames.map(functionName => {
        const fragment = iface.getFunction(functionName);

        if (!fragment) {
            throw new Error(
                `${name}: function not found in ABI: ${functionName}`
            );
        }

        return fragment.selector;
    });

    console.log(`\nRegistering ${name}`);
    console.log("Functions:", functionNames.length);

    const tx = await factory.addFacet(
        facetAddress,
        selectors
    );

    console.log("Registration transaction:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(`${name}: registration failed`);
    }

    // Verify every selector
    for (const selector of selectors) {
        const registeredAddress = await factory.facets(selector);

        if (
            registeredAddress.toLowerCase() !==
            facetAddress.toLowerCase()
        ) {
            throw new Error(
                `${name}: selector verification failed: ${selector}`
            );
        }
    }

    console.log(`${name}: ${selectors.length} selectors verified`);
    console.log("Gas used:", receipt.gasUsed.toString());
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

    // 2. Connect to Anvil

    const provider = new JsonRpcProvider(
        "http://127.0.0.1:8545"
    );

    const privateKey = process.env.ANVIL_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("ANVIL_PRIVATE_KEY missing");
    }

    const wallet = new Wallet(privateKey, provider);
    const signer = new NonceManager(wallet);

    console.log("\nAnvil account:", wallet.address);

    // 3. Deploy Factory

    const implementationAddress =
        "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const constructorParams =
        FacilityParamsBuilder.buildConstructorParams(
            implementationAddress,
            []
        );

    const factoryBytecode =
        factoryArtifact.bytecode.object.startsWith("0x")
            ? factoryArtifact.bytecode.object.slice(2)
            : factoryArtifact.bytecode.object;

    const deploymentData =
        "0x" +
        factoryBytecode +
        Buffer.from(constructorParams).toString("hex");

    console.log("\nDeploying Factory...");

    const factoryTx = await signer.sendTransaction({
        data: deploymentData,
        gasLimit: 30_000_000
    });

    console.log("Transaction:", factoryTx.hash);

    const factoryReceipt = await factoryTx.wait();

    if (!factoryReceipt || factoryReceipt.status !== 1) {
        throw new Error("Factory deployment failed");
    }

    const factoryAddress = factoryReceipt.contractAddress;

    if (!factoryAddress) {
        throw new Error("Factory address unavailable");
    }

    console.log("Factory deployed:", factoryAddress);
    console.log("Gas used:", factoryReceipt.gasUsed.toString());

    // 4. Deploy facet implementations

    const committeeAddress = await deployFacet(
        "CommitteeInspector",
        committeeArtifact,
        signer
    );

    const initAddress = await deployFacet(
        "InitFactory",
        initArtifact,
        signer
    );

    const visualizationAddress = await deployFacet(
        "Visualization",
        visualizationArtifact,
        signer
    );

    // 5. Connect to Factory

    const factory = new Contract(
        factoryAddress,
        factoryArtifact.abi,
        signer
    );

    // 6. Register CommitteeInspector selectors

    await registerFacet(
        "CommitteeInspector",
        factory,
        committeeAddress,
        committeeArtifact,
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
        ]
    );

    // 7. Register Visualization selectors

    await registerFacet(
        "Visualization",
        factory,
        visualizationAddress,
        visualizationArtifact,
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
        ]
    );

    // 8. Register InitFactory selectors

    await registerFacet(
        "InitFactory",
        factory,
        initAddress,
        initArtifact,
        [
            "createFacility",
            "removeFacilityFromPlatform",
            "updateFacilityMeta",
            "addFacilityDocument",
            "replaceFacilityDocument",
            "SignTangibleContract",
            "setLogo",
            "setPlatformDocs"
        ]
    );

    // 9. Final summary

    console.log("\n======================================");
    console.log("FACTORY DEPLOYMENT COMPLETE");
    console.log("======================================");

    console.log("Factory:             ", factoryAddress);
    console.log("CommitteeInspector:  ", committeeAddress);
    console.log("InitFactory:         ", initAddress);
    console.log("Visualization:       ", visualizationAddress);

    console.log("======================================");
}

main().catch(error => {
    console.error("\nDEPLOYMENT ERROR:");
    console.error(error);
    process.exitCode = 1;
});
