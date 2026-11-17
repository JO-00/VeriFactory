// src/createTopics.ts
import { Client, PrivateKey, TopicCreateTransaction } from "@hiero-ledger/sdk";
import { requireEnv } from "./env.js";

async function createPublicTopic(client: Client, memo: string): Promise<string> {
  const txResponse = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .execute(client);

  const receipt = await txResponse.getReceipt(client);
  if (!receipt.topicId) {
    throw new Error(`Topic creation succeeded but topicId was null for memo: ${memo}`);
  }

  return receipt.topicId.toString();
}

async function main(): Promise<void> {
  const operatorId = requireEnv("OPERATOR_ID");
  const operatorKeyHex = requireEnv("OPERATOR_KEY");

  // Your key is ECDSA (secp256k1) — the DER form starting with "3030..." and
  // the raw 32-byte form both belong to ECDSA. Load it explicitly so the SDK
  // signs with the correct curve instead of defaulting to ED25519.
  const operatorKey = PrivateKey.fromStringECDSA(operatorKeyHex);

  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  try {
    const gatewayTopicId = await createPublicTopic(
      client,
      "Facility Gateway Document Attestations v1"
    );
    const inspectionTopicId = await createPublicTopic(
      client,
      "Facility Inspection Reports v1"
    );

    console.log("Topics created successfully:");
    console.log(`GATEWAY_TOPIC_ID=${gatewayTopicId}`);
    console.log(`INSPECTION_TOPIC_ID=${inspectionTopicId}`);
  } finally {
    client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});