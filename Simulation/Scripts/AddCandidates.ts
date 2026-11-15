// file: AddCandidatesToBlockchain.ts
import addresses from "./addresses.json"; // not strictly needed here, but keeping your imports consistent
import { loadContracts } from "./config";
import { Candidates } from "../Workflow/Init/full_config.json";
import { evmAddr, fetchRevertReason } from "./FacilityCreation";

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
  const [
    facilityContractRead,
    facilityContractWrite,
    factoryContractRead,
    factoryContractWrite,
    helper,
  ] = await loadContracts();

  const existing_candidates : string[] = (await factoryContractRead.FactoryContractRead.getCandidates()).map(element => element.candidate.wallet.toLowerCase() );

  const candidates = Candidates || [];
  if (candidates.length === 0) {
    console.log("No candidates found in full_config.json");
    return;
  }

  console.log(`Found ${candidates.length} candidates to process.`);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const pk = candidate.Wallet;
    const candidateEvmAddr = evmAddr(helper, pk);
    if (existing_candidates.includes(candidateEvmAddr)){
        console.log(`${candidate} already exists`)
        continue
    }
    
    console.log(`\n[${i + 1}/${candidates.length}] Candidate: ${candidateEvmAddr}`);

    // 1. Check if candidate is already added
    // PLACEHOLDER: Replace `isCandidate` with your actual getter if you have one.
    // If you don't have a getter, you can comment this block out. Re-adding might revert.
    /*
    const alreadyAdded = await factoryContractRead.FactoryContractRead.isCandidate(candidateEvmAddr);
    if (alreadyAdded) {
      console.log(`  Candidate already exists on-chain — skip`);
      continue;
    }
    */

    const candidateSigner = await helper.createSignerFromPrivateKey(pk);

    // 2. Call the add candidate function
    // PLACEHOLDER: Update the method name and parameters based on your Solidity contract and wrapper.
    await runStep(`Add Candidate ${candidateEvmAddr}`, () =>
      factoryContractWrite.FactoryWriteContract.becomeCandidate(
        candidateSigner,
        []
      )
    );

    console.log(`  ✅ Candidate added.`);
  }

  console.log("\nAll candidates processed.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}