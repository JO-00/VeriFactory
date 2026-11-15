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
    const reason = err?.transactionId
      ? await fetchRevertReason(err.transactionId)
      : err?.message;
    console.error(`FAILED [${label}]:`, {
      status: err?.status?.toString() ?? null,
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

  for (const facility of Facilities) {
    // ---- pair by owner address, NOT by array index ----
    const ownerEvm = evmAddr(helper, facility.actors.Owner).toLowerCase();

    const entry = addresses.find(
      (a) => a.ownerAddress?.toLowerCase() === ownerEvm
    );
    if (!entry) {
      throw new Error(`[${facility.Name}] no deployed facility for owner ${ownerEvm}`);
    }
    const facilityAddress = entry.facilityAddress;

    // ---- skip if already configured ----
    const currentUri =
      await facilityContractRead.FacilityContractRead.getLandingPageURI(facilityAddress);
    if (currentUri !== "") {
      console.log(`${facility.Name} done (uri already set: ${currentUri})`);
      continue; // NOT break — don't abort remaining facilities
    }

    // belt-and-braces: the chain must agree this owner is the admin
    const onChainAdmin = (
      await facilityContractRead.FacilityContractRead.getAdmin(facilityAddress)
    ).toLowerCase();
    if (onChainAdmin !== ownerEvm) {
      throw new Error(
        `[${facility.Name}] admin mismatch: config=${ownerEvm} chain=${onChainAdmin}`
      );
    }

    const ownerSigner = await helper.createSignerFromPrivateKey(facility.actors.Owner);

    console.log(
      `[${facility.Name}] owner=${ownerEvm} → facility=${facilityAddress} — setting URI`
    );

    // facility-level, once
    await runStep(`${facility.Name} setLandingPageURI`, () =>
      facilityContractWrite.FacilityContractWrite.setLandingPageURI(
        ownerSigner,
        facilityAddress,
        facility.LandingPageURI
      )
    );

    console.log(`[${facility.Name}] done — uri set to ${facility.LandingPageURI}`);
  }

  console.log("all facilities processed");
}
/*
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
*/