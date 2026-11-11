import { Client, TransferTransaction, Hbar, PrivateKey, AccountId } from "@hiero-ledger/sdk";
import { config } from "dotenv";
config();
/**
 * Send HBAR from a specified private key account to an EVM address
 * @param client - Initialized Hiero client (testnet)
 * @param senderPrivateKey - Sender's private key (string format)
 * @param senderAccountId - Sender's account ID (e.g., "0.0.1234")
 * @param receiverEvmAddress - Receiver's EVM address
 * @param amountInTinybars - Amount in tinybars (positive number)
 */
async function sendTinybarsToEvm(client, senderPrivateKey, senderAccountId, receiverEvmAddress, amountInTinybars) {
    // 1. Build transfer
    const transferTx = new TransferTransaction()
        .addHbarTransfer(senderAccountId, Hbar.fromTinybars(amountInTinybars).negated())
        .addHbarTransfer(receiverEvmAddress, Hbar.fromTinybars(amountInTinybars));
    // 2. Freeze FIRST (locks node/tx ID, makes hash stable)
    const frozenTx = transferTx.freezeWith(client);
    // 3. THEN sign with the sender's key
    const signedTx = await frozenTx.sign(senderPrivateKey);
    // 4. Execute and get receipt
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);
    return { response, receipt };
}
async function main() {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    const receiverKey = PrivateKey.fromStringECDSA(process.env.RECEIVER_PRIVATE_KEY);
    console.log(`sending to ${receiverKey.publicKey.toEvmAddress()}`);
    try {
        await sendTinybarsToEvm(client, operatorKey, operatorId, receiverKey.publicKey.toEvmAddress(), 1);
    }
    finally {
        client.close(); // Key: release connections and allow the process to exit
    }
}
main();
