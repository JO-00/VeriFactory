// file: SetDAOMembers.ts
import addresses from "./addresses.json";
import { loadContracts } from "./config";
import { Facilities } from "../Workflow/Init/full_config.json";
import { evmAddr, fetchRevertReason } from "./FacilityCreation";
import { StakedMember } from "../../vite_frontend/src/types";

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

    const daoMembers: string[] = facility.actors.DAOMembers ?? [];
    if (daoMembers.length === 0) {
      console.log(`[${facility.Name}] no DAO members in config — skip`);
      continue;
    }

    // ─── READ: what members are already on-chain? ───────────────────────────
    // PLACEHOLDER — replace with your actual getter. Examples of what it might be:
    //   const onChainMembers: string[] =
    //     await facilityContractRead.FacilityContractRead.getCommitteeMembers(facilityAddress);
    //   or .getDAOMembers(facilityAddress)
    //   or .getCommittee(facilityAddress)
    //   or .getAllCommitteeMembers(facilityAddress)
    //
    // Normalize to lowercase set for O(1) lookup:
    const onChainMembers: StakedMember[] = await factoryContractRead.FactoryContractRead
      .viewStakedMembers(facilityAddress); // ← TODO: replace with the real getter name

    const onChainSet = new Set(onChainMembers.map((m) => m.wallet.toLowerCase()));

    console.log(
      `\n[${facility.Name}] owner=${ownerEvm} facility=${facilityAddress} — ` +
      `onChain=${onChainMembers.length}, config=${daoMembers.length}`
    );

    const ownerSigner = await helper.createSignerFromPrivateKey(facility.actors.Owner);

    for (let m = 0; m < daoMembers.length; m++) {
      const memberAddress = evmAddr(helper, daoMembers[m]).toLowerCase();

      // Skip if already present on-chain
      if (onChainSet.has(memberAddress)) {
        console.log(`  [${m}] ${memberAddress} already a member — skip`);
        continue;
      }

      // Fee convention from your earlier script: first member 0.25 ℏ, rest 1 ℏ.
      // If the contract expects a different scheme, adjust here.
      const fee = m === 0 ? "25000000" : "100000000";

      await runStep(`${facility.Name} setCommitteeMember[${m}](${memberAddress})`, () =>
        factoryContractWrite.FactoryWriteContract.setCommitteeMember(
          ownerSigner,
          facilityAddress,
          memberAddress,
          fee
        )
      );

      console.log(`  ✅ [${m}] ${memberAddress} added (fee=${fee})`);
      onChainSet.add(memberAddress); // reflect local state for the rest of this facility
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