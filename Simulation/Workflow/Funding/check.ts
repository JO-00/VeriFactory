import {
  Client,
  PrivateKey,
  MirrorNodeAccountBalanceQuery
} from "@hiero-ledger/sdk";
import { config } from "dotenv";

config();

async function main() {
  // 1. Load the receiver's private key from your environment variables (.env)
  const receiverPrivateKeyString = process.env.RECEIVER_PRIVATE_KEY;
  if (!receiverPrivateKeyString) {
    throw new Error("RECEIVER_PRIVATE_KEY is missing in your environment variables.");
  }

  const receiverKey = PrivateKey.fromStringECDSA(receiverPrivateKeyString);
  const evmAddress = receiverKey.publicKey.toEvmAddress();

  console.log(`Checking balance for EVM Address: ${evmAddress}`);

  // 2. Initialize a client for Hedera Testnet 
  // (A client is needed to communicate with the network's mirror nodes)
  const client = Client.forTestnet();

  try {
    // 3. Query the mirror node for the balance using the EVM address
    const balance = await new MirrorNodeAccountBalanceQuery()
      .setAccountId(evmAddress)
      .execute(client);

    console.log(`Account Balance: ${balance.hbars.toString()}`);
  } catch (error) {
    console.error("Error fetching balance (the account may not be active/funded yet):", error);
  } finally {
    client.close();
  }
}

main();
