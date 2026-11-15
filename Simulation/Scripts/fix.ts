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

  // Snapshot of all deployed facilities
  const deployed = (
    await factoryContractRead.FactoryContractRead.getDeployedFacilities()
  ).map((a: string) => a.toLowerCase());

  // Build admin -> [facility addresses] map, once.
  const byAdmin = new Map<string, string[]>();
  for (const addr of deployed) {
    const admin = (
      await facilityContractRead.FacilityContractRead.getAdmin(addr)
    ).toLowerCase();
    const list = byAdmin.get(admin) ?? [];
    list.push(addr);
    byAdmin.set(admin, list);
  }

  // Canonical facility per owner (from addresses.json)
  const canonicalByOwner = new Map<string, string>();
  for (const a of addresses) {
    canonicalByOwner.set(a.ownerAddress.toLowerCase(), a.facilityAddress.toLowerCase());
  }

  // Which owner are we cleaning? Derive from Facilities, but
  // skip ones with no duplicates.
  const seen = new Set<string>(); // avoid processing same owner twice
  for (const facility of Facilities) {
    const ownerEvm = evmAddr(helper, facility.actors.Owner).toLowerCase();
    if (seen.has(ownerEvm)) continue;
    seen.add(ownerEvm);

    const owned = byAdmin.get(ownerEvm) ?? [];
    if (owned.length === 0) {
      console.warn(`[${facility.Name}] no deployed facility for admin ${ownerEvm}`);
      continue;
    }
    if (owned.length === 1) {
      console.log(`[${facility.Name}] ok — 1 facility, nothing to delete`);
      continue;
    }

    const canonical = canonicalByOwner.get(ownerEvm);
    if (!canonical) {
      console.warn(
        `[${facility.Name}] admin ${ownerEvm} has ${owned.length} facilities, ` +
        `but no canonical entry in addresses.json — skipping (manual review)`
      );
      continue;
    }

    // Delete every facility for this admin EXCEPT the canonical one.
    const toDelete = owned.filter((a) => a !== canonical);

    console.log(
      `\n[${facility.Name}] admin=${ownerEvm} — ` +
      `${owned.length} facilities, canonical=${canonical}, delete=${toDelete.length}`
    );

    const ownerSigner = await helper.createSignerFromPrivateKey(
      facility.actors.Owner
    );

    for (const target of toDelete) {
      // Re-check it's still deployed (previous deletions in this run may have pruned it)
      const stillDeployed = (
        await factoryContractRead.FactoryContractRead.getDeployedFacilities()
      )
        .map((a: string) => a.toLowerCase())
        .includes(target);
      if (!stillDeployed) {
        console.log(`  ${target} already deleted — skip`);
        continue;
      }

      // It must still be this owner's admin (paranoia: it's on-chain state, could change)
      const admin = (
        await facilityContractRead.FacilityContractRead.getAdmin(target)
      ).toLowerCase();
      if (admin !== ownerEvm) {
        console.warn(`  ⚠️  ${target} admin is now ${admin}, not ${ownerEvm} — skip`);
        continue;
      }

      await runStep(`${facility.Name} deleteFacility(${target})`, () =>
        factoryContractWrite.FactoryWriteContract.deleteFacility(
          ownerSigner,
          target
        )
      );
      console.log(`  ✅ deleted ${target}`);
    }
  }

  console.log("\nall done");
}
/*
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
*/