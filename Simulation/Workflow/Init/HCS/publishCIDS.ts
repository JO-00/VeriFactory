// src/submitGatewayAttestations.ts
import { Client, PrivateKey, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { Wallet, solidityPackedKeccak256, getBytes } from "ethers";
import { requireEnv } from "./env.js";

interface GatewayAttestationPayload {
  facilityAddress: string;
  gatewayId: string;
  gatewayAddress: string;
  documentCID: string;
  signature: string;
}

interface GatewayConfig {
  gatewayId: string;
  privateKeyHex: string;
  facilityAddress: string;
  cids: string[];
}

const gateway1Cids: string[] = [
  "bafkreiapaz2uai6dllhybjyhqqd5bkvfrtlio444nbw6l3d5rqf6gz5smi",
  "bafkreibygat2zznt2fqp55ak546ooaxozpx5nxjhlfdjfumjagdyqu6j3e"
];

const gateway2Cids: string[] = [
  "bafkreifixhmafioi6v4hxkwgo5yjjd3adfrcvguznakua3gpx2spuhangy",
  "bafkreifdwsgfsd3dnbxgxd7zentgkylqiktfidomentomcqxv7netk357u"
];

const gateway3Cids: string[] = [
  "bafkreid54bpxrv6jxcsn3pxreghceviihauejgkve2ojpkakmloxgpu3by",
  "bafkreifm6gagw4yewzmmmlgkvrlhnw2mnk45to4lvkvo4bdqodpzpkfhre"
];

const gateway4Cids: string[] = [
  "bafkreifaparwuqju2zx2a3l7qikz6mmsdobd2b7tjifvkwrrrw3qurexbm",
  "bafkreiga4t7grrjrb2irpow5u3bamfqwof4whesamr65uwitmg7zc5swlq"
];

const gateway5Cids: string[] = [
  "bafkreiebhybowukc72mhgufqriezq6t2ahrz2wfolvh6iub4f26knkdlaq",
  "bafkreiglsj7iyrq7cq6bdituubo3qab52tuujer4fcfxgtzn32hktys4ry"
];

const gateway6Cids: string[] = [
  "bafkreibrzc7ianccl5f5pdvgqmll4xxsp3ffms34bcfon4dylebvztcuei",
  "bafkreieqf25v4dh32tl746vurtoidtaoypx55e7vsn2hqois3yfnxat7oq"
];

const gateway7Cids: string[] = [
  "bafkreihgupvtpusqd6q6rv2qpnihnjful5q6tsjcczqdqxljmuuqhoh5mq",
  "bafkreibzxu4fnbsv6ony42ab7rz3za5siiax73v5gpd6rqpybi3thrk7g4"
];

const gateway8Cids: string[] = [
  "bafkreidxqf42ecydylt2zv4x2vjgbk3o5qyvrfw3dz2g435cbiderx4d4u",
  "bafkreige2nbnt3bf46npiaxrtoxqx6tqeznpf67l5lptlhdoh3gdpudovy"
];

const gateway9Cids: string[] = [
  "bafkreia4zi3qf3ohkxsy6nscbkacmq76vbk7rvny5cqp2jje6hd2tpvn6e",
  "bafkreifp2i2e6juypnet2kzjvrm6z7pjbw7arydffj667dh6uydhlioo6e"
];

async function buildSignedPayload(
  wallet: Wallet,
  facilityAddress: string,
  gatewayId: string,
  documentCID: string
): Promise<GatewayAttestationPayload> {
  const gatewayAddress = wallet.address;

  // Deterministic digest so key ordering/whitespace never breaks verification
  const digest = solidityPackedKeccak256(
    ["address", "string", "address", "string"],
    [facilityAddress, gatewayId, gatewayAddress, documentCID]
  );

  // Produces standard 65-byte 0x... EVM signature (verifiable via ethers.verifyMessage)
  const signature = await wallet.signMessage(getBytes(digest));

  return {
    facilityAddress,
    gatewayId,
    gatewayAddress,
    documentCID,
    signature
  };
}

async function submitAttestation(
  client: Client,
  topicId: string,
  payload: GatewayAttestationPayload
): Promise<string> {
  const message = JSON.stringify(payload);

  const txResponse = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await txResponse.getReceipt(client);
  return receipt.topicSequenceNumber?.toString() ?? "unknown";
}

async function main(): Promise<void> {
  const operatorId = requireEnv("OPERATOR_ID");
  const operatorKeyHex = requireEnv("OPERATOR_KEY");
  const gatewayTopicId = process.env.GATEWAY_TOPIC_ID ?? "0.0.11490394";

  const gateway1PrivKeyStr = "...";
  const gateway2PrivKeyStr = "...";
  const gateway3PrivKeyStr = "...";
  const gateway4PrivKeyStr = "...";
  const gateway5PrivKeyStr = "...";
  const gateway6PrivKeyStr = "...";
  const gateway7PrivKeyStr = "...";
  const gateway8PrivKeyStr = "...";
  const gateway9PrivKeyStr = "...";
  const facilityAddress = "facility addr here";

  const operatorKey = PrivateKey.fromStringECDSA(operatorKeyHex);
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  const gateways: GatewayConfig[] = [
    { gatewayId: "1", privateKeyHex: gateway1PrivKeyStr, facilityAddress, cids: gateway1Cids },
    { gatewayId: "2", privateKeyHex: gateway2PrivKeyStr, facilityAddress, cids: gateway2Cids },
    { gatewayId: "3", privateKeyHex: gateway3PrivKeyStr, facilityAddress, cids: gateway3Cids },
    { gatewayId: "4", privateKeyHex: gateway4PrivKeyStr, facilityAddress, cids: gateway4Cids },
    { gatewayId: "5", privateKeyHex: gateway5PrivKeyStr, facilityAddress, cids: gateway5Cids },
    { gatewayId: "6", privateKeyHex: gateway6PrivKeyStr, facilityAddress, cids: gateway6Cids },
    { gatewayId: "7", privateKeyHex: gateway7PrivKeyStr, facilityAddress, cids: gateway7Cids },
    { gatewayId: "8", privateKeyHex: gateway8PrivKeyStr, facilityAddress, cids: gateway8Cids },
    { gatewayId: "9", privateKeyHex: gateway9PrivKeyStr, facilityAddress, cids: gateway9Cids }
  ];

  try {
    for (const gw of gateways) {
      const wallet = new Wallet(gw.privateKeyHex);
      console.log(`\nSubmitting ${gw.cids.length} attestations for Gateway ${gw.gatewayId} (${wallet.address})...`);

      for (const cid of gw.cids) {
        const payload = await buildSignedPayload(
          wallet,
          gw.facilityAddress,
          gw.gatewayId,
          cid
        );

        const seqNum = await submitAttestation(client, gatewayTopicId, payload);
        console.log(`  [seq #${seqNum}] CID: ${cid} -> sig: ${payload.signature.slice(0, 14)}...`);
      }
    }
  } finally {
    client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});