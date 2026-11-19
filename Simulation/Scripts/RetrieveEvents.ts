// file: FacilitySetData.ts
import addresses from "./addresses.json";
import { loadContracts } from "./config";
import { Facilities } from "../Workflow/Init/full_config.json";
import { evmAddr, fetchRevertReason } from "./FacilityCreation";

/** Same try/catch + mirror-node revert decoding as createFacilities.main() */
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

  const signer = await helper.createSignerFromPrivateKey("DO NOT SHARE"); // TODO: put your admin/operator private key here

  await runStep("BackFillEventsForDebugging", () =>
    factoryContractWrite.FactoryWriteContract.BackFillEventsForDebugging(signer)
  );

  console.log("✅ Backfill completed successfully.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}