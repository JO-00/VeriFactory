// file: SetupCandidates.ts
import { 
  Client, 
  PrivateKey, 
  AccountId, 
  TransferTransaction, 
  Hbar,
  AccountCreateTransaction 
} from "@hiero-ledger/sdk";
import { config } from "dotenv";
import { Facilities, Candidates } from "../Init/full_config.json";

config();

async function main() {
  const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY!);
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  // Use the Candidates array from your JSON
  const candidates = Candidates || [];

  for (const candidate of candidates) {
    const pk = PrivateKey.fromStringECDSA(candidate.Wallet);
    const evmAddr = "0x" + pk.publicKey.toEvmAddress();
    const aliasId = AccountId.fromEvmAddress(0, 0, evmAddr);

    console.log(`\nProcessing Candidate ${evmAddr}...`);

    // 1. Create the account if it doesn't exist
    try {
      console.log(`- Creating account for alias...`);
      const createTx = await new AccountCreateTransaction()
        .setKeyWithoutAlias(pk.publicKey)
        .setInitialBalance(new Hbar(0)) // We fund it next
        .execute(client);
      await createTx.getReceipt(client);
      console.log(`  ✅ Account created.`);
    } catch (e: any) {
      // If it already exists, Hedera throws INVALID_ALIAS_KEY or similar
      if (e.message.includes("INVALID_ALIAS_KEY") || e.message.includes("ALIAS_ALREADY_ASSIGNED")) {
        console.log(`  ℹ️ Account already exists.`);
      } else {
        console.warn(`  ⚠️ Create skipped/failed: ${e.message}`);
      }
    }

    // 2. Fund with 3 HBAR
    try {
      console.log(`- Funding 3 HBAR...`);
      const transferTx = await new TransferTransaction()
        .addHbarTransfer(operatorId, new Hbar(-3))
        .addHbarTransfer(aliasId, new Hbar(3))
        .execute(client);
      
      await transferTx.getReceipt(client);
      console.log(`  ✅ Funded 3 HBAR.`);
    } catch (e: any) {
      console.error(`  ❌ Funding failed: ${e.message}`);
    }
  }

  client.close();
}

if (require.main === module) main().catch(console.error);