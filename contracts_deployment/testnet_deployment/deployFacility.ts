import * as fs from "fs";
import * as path from "path";
import {
    Client,
    PrivateKey,
    AccountId,
    ContractCreateFlow,
    ContractByteCodeQuery
} from "@hiero-ledger/sdk";
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

    // 2. Connect to Hedera Testnet
    const operatorId = process.env.OPERATOR_ID;
    const privateKey = process.env.ECDSA_PRIVATE_KEY;

    if (!operatorId) {
        throw new Error("OPERATOR_ID is missing from .env");
    }

    if (!privateKey) {
        throw new Error("ECDSA_PRIVATE_KEY is missing from .env");
    }

    const client = Client.forTestnet();

    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromStringECDSA(privateKey)
    );

    console.log("Hedera operator:", operatorId);

    try {
        // 3. Deploy FacilityRegistry
        console.log("\nDeploying FacilityRegistry...");

        const deployTx = new ContractCreateFlow()
            .setBytecode(bytecode)
            .setGas(10_000_000);

        const response = await deployTx.execute(client);

        console.log("Transaction:", response.transactionId.toString());

        const receipt = await response.getReceipt(client);

        if (receipt.status.toString() !== "SUCCESS") {
            throw new Error(
                `FacilityRegistry deployment failed: ${receipt.status}`
            );
        }

        const contractId = receipt.contractId;

        if (!contractId) {
            throw new Error("Contract ID missing from deployment receipt.");
        }

        // 4. Retrieve and verify deployed contract bytecode
        const deployedBytecode = await new ContractByteCodeQuery()
            .setContractId(contractId)
            .execute(client);

        if (deployedBytecode.length === 0) {
            throw new Error("No contract bytecode found at deployed address.");
        }

        console.log("\n==================================");
        console.log("FacilityRegistry deployed!");
        console.log("==================================");
        console.log("Contract ID:", contractId.toString());
        console.log("EVM Address:", contractId.toEvmAddress());
        console.log("Transaction:", response.transactionId.toString());
        console.log("Runtime size:", deployedBytecode.length, "bytes");
        console.log("==================================");

    } finally {
        client.close();
    }
}

main().catch(console.error);