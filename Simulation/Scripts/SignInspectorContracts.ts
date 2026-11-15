// file: SignInspector.ts
import { loadContracts } from "./config";
import { Candidates } from "../Workflow/Init/full_config.json";
import { fetchRevertReason, evmAddr } from "./FacilityCreation";

const INSPECTOR_CID = "bafkreih6vihdkwrurh4h5lksitxzqgn4stpxqadxujxkulfppilmw3xqf4";

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
    console.error(`FAILED [${label}]:`, { status, revertReason: reason });
    throw err;
  }
}

async function main() {
  // Note: helper is now destructured from loadContracts()
  const [facilityContractRead, facilityContractWrite, factoryContractRead, factoryContractWrite, helper] = await loadContracts();

  const candidates = Candidates || [];

  for (const candidate of candidates) {
    const pk = candidate.Wallet;
    const evmAddress = evmAddr(helper, pk).toLowerCase();

    // Skip if already compliant on-chain
    if (candidate.IsCompliant) {
      console.log(`Candidate ${evmAddress} already marked compliant in config — skip`);
      continue;
    }

    console.log(`\nCandidate ${evmAddress} signing Inspector...`);

    // 1. Generate the signature using the new helper function
    const { v, r, s } = helper.signInspectorMessage(pk, INSPECTOR_CID);
    console.log(`  v=${v}, r=${r.slice(0, 10)}...`);

    // 2. Send to the contract
    await runStep(`Candidate ${evmAddress} InspectorSignContract`, async () =>
      factoryContractWrite.FactoryWriteContract.signInspectorContract(
        await helper.createSignerFromPrivateKey(pk),
        v,
        r,
        s
      )
    );

    console.log(`  ✅ Signed and marked compliant.`);
  }

  console.log("\nall candidates processed.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}