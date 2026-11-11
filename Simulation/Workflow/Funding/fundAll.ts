

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

// Allocations
const AMOUNTS = {
  Owner: 5,       // HBAR
  DAOMembers: 2,  // Tinybars
  Relayers: 2,    // Tinybars
  Candidates: 2,  // Tinybars
  Gateways: 1,    // Tinybar
};

let successfulTransfers = 0;
let failedTransfers = 0;
let totalHbarSent = 0;
let totalTinybarsSent = 0;

/**
 * Send HBAR or tinybars to an EVM address.
 */
async function sendTinybarsToEvm(
  client: Client,
  senderPrivateKey: PrivateKey,
  senderAccountId: AccountId,
  receiverEvmAddress: string,
  amount: number,
  isOwner: boolean
) {
  // Owner allocation is converted from HBAR.
  // Other actors receive the exact tinybar amount.
  const amountInTinybars = isOwner
    ? Hbar.from(amount).toTinybars()
    : BigInt(amount);

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

  // Sign with operator private key
  const signedTx = await frozenTx.sign(senderPrivateKey);

  // Execute
  const response = await signedTx.execute(client);

  // Get receipt
  const receipt = await response.getReceipt(client);

  return { response, receipt };
}

/**
 * Derive EVM address and fund actor.
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
    if (
      typeof actorPrivateKey !== "string" ||
      !actorPrivateKey.trim()
    ) {
      console.warn(`Skipping empty ${actorType} private key.`);
      return;
    }

    const receiverKey = PrivateKey.fromStringECDSA(
      actorPrivateKey.trim()
    );

    const receiverEvmAddress =
      receiverKey.publicKey.toEvmAddress();

    const isOwner = actorType === "Owner";

    console.log(`\nFunding ${actorType}`);
    console.log(`Address: ${receiverEvmAddress}`);

    const { receipt } = await sendTinybarsToEvm(
      client,
      operatorKey,
      operatorId,
      receiverEvmAddress,
      amount,
      isOwner
    );

    console.log(`SUCCESS: ${receipt.status}`);

    successfulTransfers++;

    if (isOwner) {
      totalHbarSent += amount;
    } else {
      totalTinybarsSent += amount;
    }

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
    // Load JSON configuration
    const configPath = path.resolve(
      __dirname,
      "../Init/full_config.json"
    );

    const rawData = fs.readFileSync(configPath, "utf8");
    const data = JSON.parse(rawData);

    const facilities = data.Facilities || [];

    console.log(`Found ${facilities.length} facilities.\n`);

    for (const [index, facility] of facilities.entries()) {
      console.log(
        `\n========== ${facility.Name || `Facility #${index + 1}`} ==========`
      );

      const actors = facility.actors || {};

      // Normalize Owner: single private key or array
      const owners = Array.isArray(actors.Owner)
        ? actors.Owner
        : actors.Owner
          ? [actors.Owner]
          : [];

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
            `Invalid ${group.name} list. Skipping.`
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
    console.log(`Total HBAR allocated to Owners: ${totalHbarSent}`);
    console.log(`Total tinybars allocated to other actors: ${totalTinybarsSent}`);

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
