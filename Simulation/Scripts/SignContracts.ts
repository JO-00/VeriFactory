// file: SignContracts.ts
import addresses from "./addresses.json";
import { loadContracts } from "./config";
import { Facilities } from "../Workflow/Init/full_config.json";
import { evmAddr, fetchRevertReason } from "./FacilityCreation";

// --- 1. REPLICATE THE SOLIDITY SIGNING LOGIC ---


// --- 2. SEND TO YOUR BLOCKCHAIN ---
async function runStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const status = err?.status?.toString() ?? null;
    if (status === "INSUFFICIENT_PAYER_BALANCE") {
      console.error(`FAILED [${label}]: payer out of HBAR — aborting`);
      throw err;
    }
    const reason = err?.transactionId
      ? await fetchRevertReason(err.transactionId)
      : err?.message;
    console.error(`FAILED [${label}]:`, {
      status,
      transactionId: err?.transactionId?.toString() ?? null,
      revertReason: reason,
    });
    throw err;
  }
}

async function main() {
  const [facilityContractRead, facilityContractWrite, factoryContractRead, factoryContractWrite, helper] = await loadContracts();

  // Canonical facility per owner (addresses.json is source of truth)
  const canonicalByOwner = new Map<string, string>();
  for (const a of addresses) {
    canonicalByOwner.set(a.ownerAddress.toLowerCase(), a.facilityAddress.toLowerCase());
  }

  for (const facility of Facilities) {
    const ownerEvm = evmAddr(helper, facility.actors.Owner).toLowerCase();
    const facilityAddress = canonicalByOwner.get(ownerEvm);

    if (!facilityAddress) {
      console.warn(`[${facility.Name}] no canonical address for owner ${ownerEvm} — skip`);
      continue;
    }

    const contractsToSign: string[] = facility.ContractsSigned ?? [];
    if (contractsToSign.length === 0) {
      console.log(`[${facility.Name}] no contracts to sign in config — skip`);
      continue;
    }

    console.log(`\n[${facility.Name}] facility=${facilityAddress} — signing ${contractsToSign.length} contracts`);
    const ownerSigner = await helper.createSignerFromPrivateKey(facility.actors.Owner);

    for (let i = 0; i < contractsToSign.length; i++) {
      const cid = contractsToSign[i];

      // Sign it off-chain
      const { v, r, s } = helper.generateHederaSignature(facility.actors.Owner, cid, facilityAddress);
      
      console.log(`  [${i}] Signing CID: ${cid.slice(0, 10)}...`);
      console.log(`      v=${v}, r=${r.slice(0, 10)}...`);

      // Send it on-chain using your existing function
      await runStep(`${facility.Name} SignTangibleContract[${i}]`, () =>
        factoryContractWrite.FactoryWriteContract.signTangibleContract(
          ownerSigner,
          cid,
          facilityAddress,
          v,
          r,
          s
        )
      );

      console.log(`  ✅ [${i}] Signed successfully`);
    }
  }

  console.log("\nall facilities processed");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}