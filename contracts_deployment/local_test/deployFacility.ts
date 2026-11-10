
import * as fs from "fs";
import * as path from "path";
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import { config } from "dotenv";

config();

async function main() {
    // 1. Load the Foundry artifact
    const artifactPath = path.join(
        __dirname,
        "../../hashgraph/out/FacilityRegistry.sol/FacilityRegistry.json"
    );

    if (!fs.existsSync(artifactPath)) {
        throw new Error("FacilityRegistry artifact not found. Run forge build first.");
    }

    const artifact = JSON.parse(
        fs.readFileSync(artifactPath, "utf8")
    );

    const bytecode = artifact.bytecode.object;

    if (!bytecode || bytecode === "0x") {
        throw new Error("FacilityRegistry bytecode is empty!");
    }

    // 2. Connect to Anvil
    const provider = new JsonRpcProvider(
        "http://127.0.0.1:8545"
    );

    const privateKey = process.env.ANVIL_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("ANVIL_PRIVATE_KEY is missing from .env");
    }

    const wallet = new Wallet(privateKey, provider);

    console.log("Anvil account:", wallet.address);

    // 3. Deploy FacilityRegistry
    const factory = new ContractFactory(
        artifact.abi,
        bytecode,
        wallet
    );

    console.log("\nDeploying FacilityRegistry...");

    const facility = await factory.deploy();

    const tx = facility.deploymentTransaction();

    if (!tx) {
        throw new Error("Deployment transaction not found.");
    }

    console.log("Transaction:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("FacilityRegistry deployment failed.");
    }

    // 4. Retrieve and verify deployed address
    const address = await facility.getAddress();

    const deployedCode = await provider.getCode(address);

    if (deployedCode === "0x") {
        throw new Error("No contract code found at deployed address.");
    }

    console.log("\n==================================");
    console.log("FacilityRegistry deployed!");
    console.log("==================================");
    console.log("Address:", address);
    console.log("Transaction:", tx.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Runtime size:", (deployedCode.length - 2) / 2, "bytes");
    console.log("==================================");
}

main().catch(console.error);
