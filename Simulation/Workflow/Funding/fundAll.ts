import {
  Client,
  TransferTransaction,
  Hbar,
  PrivateKey,
  AccountId,
} from "@hiero-ledger/sdk";

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config();

// Allocation amounts in HBAR
const AMOUNTS = {
  Owner: 5,
  DAOMembers: 2,
  Relayers: 2,
  Candidates: 2,
  Gateways: 1,
};

let successfulTransfers = 0;
let failedTransfers = 0;
let totalHbarSent = 0;

/**
 * Send HBAR to an EVM address derived from a recipient private key.
 */
async function sendTinybarsToEvm(
  client: Client,
  senderPrivateKey: PrivateKey,
  senderAccountId: AccountId,
  receiverEvmAddress: string,
  amountInHbar: number
) {
  const amountInTinybars = Hbar.from(amountInHbar).toTinybars();

  const transferTx = new TransferTransaction()
    .addHbarTransfer(
      senderAccountId,
      Hbar.fromTinybars(amountInTinybars).negated()
    )
    .addHbarTransfer(
      receiverEvmAddress,
      Hbar.fromTinybars(amountInTinybars)
    );

  // Freeze transaction
  const frozenTx = transferTx.freezeWith(client);

  // Sign with sender's private key
  const signedTx = await frozenTx.sign(senderPrivateKey);

  // Execute transaction
  const response = await signedTx.execute(client);

  // Get receipt
  const receipt = await response.getReceipt(client);

  return { response, receipt };
}

/**
 * Derive recipient EVM address and fund it.
 */
async function fundActor(
  client: Client,
  operatorKey: PrivateKey,
  operatorId: AccountId,
  actorPrivateKey: string,
  amount: number,
  actorType: string
) {
  try {
    if (!actorPrivateKey || typeof actorPrivateKey !== "string") {
      console.warn(`Skipping empty ${actorType} private key.`);
      return;
    }

    const receiverKey = PrivateKey.fromStringECDSA(
      actorPrivateKey.trim()
    );

    const receiverEvmAddress =
      receiverKey.publicKey.toEvmAddress();

    console.log(
      `\nFunding ${actorType}: ${receiverEvmAddress}`
    );

    const { receipt } = await sendTinybarsToEvm(
      client,
      operatorKey,
      operatorId,
      receiverEvmAddress,
      amount
    );

    console.log(
      `SUCCESS: ${amount} HBAR | ${receipt.status}`
    );

    successfulTransfers++;
    totalHbarSent += amount;

  } catch (error) {
    console.error(`FAILED funding ${actorType}:`, error);
    failedTransfers++;
  }
}

async function main() {
  if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
    throw new Error("Missing OPERATOR_ID or OPERATOR_KEY in .env");
  }

  const operatorId = AccountId.fromString(
    process.env.OPERATOR_ID
  );

  const operatorKey = PrivateKey.fromStringECDSA(
    process.env.OPERATOR_KEY
  );

  const client = Client.forTestnet().setOperator(
    operatorId,
    operatorKey
  );

  try {
    // Load facilities JSON
    const configPath = path.resolve(
      __dirname,
      "../Init/full_config.json"
    );

    const rawData = fs.readFileSync(configPath, "utf8");
    const data = JSON.parse(rawData);

    const facilities = data.Facilities || [];

    console.log(
      `Found ${facilities.length} facilities.\n`
    );

    for (const [index, facility] of facilities.entries()) {
      console.log(
        `\n========== ${facility.Name || `Facility #${index + 1}`} ==========`
      );

      const actors = facility.actors || {};

      // Owner: single private key or array
      const owners = Array.isArray(actors.Owner)
        ? actors.Owner
        : actors.Owner
          ? [actors.Owner]
          : [];

      // Actor groups and their allocations
      const actorGroups = [
        {
          name: "Owner",
          keys: owners,
          amount: AMOUNTS.Owner,
        },
        {
          name: "DAOMembers",
          keys: actors.DAOMembers || [],
          amount: AMOUNTS.DAOMembers,
        },
        {
          name: "Relayers",
          keys: actors.Relayers || [],
          amount: AMOUNTS.Relayers,
        },
        {
          name: "Candidates",
          keys: actors.Candidates || [],
          amount: AMOUNTS.Candidates,
        },
        {
          name: "Gateways",
          keys: actors.Gateways || [],
          amount: AMOUNTS.Gateways,
        },
      ];

      for (const group of actorGroups) {
        if (!Array.isArray(group.keys)) {
          console.warn(
            `Invalid ${group.name} private key list. Skipping.`
          );
          continue;
        }

        for (const privateKey of group.keys) {
          await fundActor(
            client,
            operatorKey,
            operatorId,
            privateKey,
            group.amount,
            group.name
          );
        }
      }
    }

    console.log("\n========== FUNDING SUMMARY ==========");
    console.log(`Successful transfers: ${successfulTransfers}`);
    console.log(`Failed transfers: ${failedTransfers}`);
    console.log(`Total HBAR sent: ${totalHbarSent}`);

    if (failedTransfers > 0) {
      console.log("\nFunding completed with errors.");
    } else {
      console.log("\nAll attempted transfers succeeded.");
    }

  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
