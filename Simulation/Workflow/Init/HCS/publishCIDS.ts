
// src/submitGatewayAttestations.ts
import { Client, PrivateKey, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { Wallet, solidityPackedKeccak256, getBytes } from "ethers";
import { ipfsFileExists , resolveHederaAccountId} from "./testIPFS";
import { createHelia, type Helia } from 'helia';


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

// ------------------------------------------------------------------
// Data: category -> (privateKeyHex -> CIDs)
// Replace the "<privateKey...>" placeholders with the actual gateway
// private keys. The address is derived from the key at runtime.
// ------------------------------------------------------------------
export const data: Record<string, Record<string, string[]>> = {
  "here we put the category of the facility" : {
    "here we put gateway 1's private key" : [
      "here we put cid 1 that concerns gateway 1",
      "here cid 2 for gateway 1 etc"
    ]
  }
}


const facility_addresses : Record<string,string> = {
  "Nuclear" : "0xF78C46Ef101BF500A8Ba8a7D4619AD1F2b06cd0E",
  "Solar" : "0x0770227A9b949c1Eba0e72569693EAC36bea3b89",
  "satellites" : "0xB85023Be15C78DdA307bBb9Dd4Cf1DA428466c28",
  "Particle Accelerators" : "0xd616cd4e87B30A6be987cf39fd7a03bb11c23eC2"
}






// ------------------------------------------------------------------
// Signing (identical to the original script)
// ------------------------------------------------------------------
async function buildSignedPayload(
  wallet: Wallet,
  facilityAddress: string,
  gatewayId: string,
  documentCID: string
): Promise<GatewayAttestationPayload> {
  const gatewayAddress = wallet.address;

  const digest = solidityPackedKeccak256(
    ["address", "string", "address", "string"],
    [facilityAddress, gatewayId, gatewayAddress, documentCID]
  );

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

// ------------------------------------------------------------------
// Build GatewayConfig[] from `data` (privateKeyHex -> CIDs)
// gatewayId is assigned sequentially per category ("1", "2", ...)
// ------------------------------------------------------------------
async function main(): Promise<void> {
  const gatewayTopicId = "0.0.11490394";
  const helia = await createHelia();

  try {
    for (const category of Object.keys(data)) {
      const facilityAddress = facility_addresses[category];
      if (!facilityAddress) {
        console.warn(`[skip] No facility address for category: ${category}`);
        continue;
      }

      console.log(`\n=== Category: ${category} (${facilityAddress}) ===`);

      const byPrivateKey = data[category];
      let idx = 1;

      for (const privateKeyHex of Object.keys(byPrivateKey)) {
        const wallet = new Wallet(privateKeyHex);
        const gatewayId = String(idx);
        const cids = byPrivateKey[privateKeyHex];

        // 1. Check IPFS existence BEFORE opening Hedera client
        const validCids: string[] = [];
        for (const cid of cids) {
          if (await ipfsFileExists(helia, cid)) {
            validCids.push(cid);
          } else {
            console.warn(`  [skip] CID not found on IPFS: ${cid}`);
          }
        }

        if (validCids.length === 0) {
          idx++;
          continue;
        }

        // 2. Resolve numeric AccountId and publish verified CIDs
        const operatorKey = PrivateKey.fromStringECDSA(privateKeyHex);
        const operatorAccountId = await resolveHederaAccountId(wallet.address);
        const client = Client.forTestnet().setOperator(operatorAccountId, operatorKey);

        try {
          for (const cid of validCids) {
            const payload = await buildSignedPayload(wallet, facilityAddress, gatewayId, cid);
            const seqNum = await submitAttestation(client, gatewayTopicId, payload);
            console.log(`  [published | seq #${seqNum}] CID: ${cid}`);
          }
        } finally {
          client.close();
        }

        idx++;
      }
    }
  } finally {
    await helia.stop();
  }
}

main()
