// file: RankCandidates.ts
import { loadContracts } from "./config";
import { Facilities } from "../Workflow/Init/full_config.json";
import { evmAddr, fetchRevertReason } from "./FacilityCreation";

// The 5 owners you provided
const targetOwners = [
  '0x9E262221B441A42FF4679867bBeE1Ff64568970B',
  '0xfB59BA06742263d48b652ec44F8Ba6392921741E',
  '0x5af95281E0fEFfD3947De7027df63301f065220b',
  '0xD881f6761335849AB054F5FB232080877C15BDB3',
  '0xDe3480dda67e2faB85a73b47478FDFd3ef3a4202'
].map(a => a.toLowerCase());

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

  // 1. Build a map of Owner EVM -> Private Key from the DAOMembers lists
  const ownerPkMap = new Map<string, string>();
  for (const facility of Facilities) {
    for (const pk of facility.actors.DAOMembers ?? []) {
      const addr = evmAddr(helper, pk).toLowerCase();
      if (targetOwners.includes(addr)) {
        ownerPkMap.set(addr, pk);
      }
    }
  }

  // 2. Fetch candidates from blockchain
  const candidates: string[] = (await factoryContractRead.FactoryContractRead.getCompliantCandidates()).map(c =>c.candidate.wallet);
  
  if (candidates.length < 5) {
    throw new Error(`Not enough candidates on-chain to pick 5. Found: ${candidates.length}`);
  }

  console.log(`Fetched ${candidates.length} candidates from on-chain.\n`);

  // 3. Generate preferences and (optionally) submit for each owner
  for (const ownerAddr of targetOwners) {
    const ownerPk = ownerPkMap.get(ownerAddr);
    if (!ownerPk) {
      console.warn(`⚠️ Could not find private key for owner ${ownerAddr} in DAOMembers. Skipping.`);
      continue;
    }

    // Fisher-Yates shuffle on a copy of the candidates array
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Take the first 5
    const preferences = shuffled.slice(0, 5);

    console.log(`========================================`);
    console.log(`Owner: ${ownerAddr}`);
    console.log(`Preferences:`, preferences);

    
    const ownerSigner = await helper.createSignerFromPrivateKey(ownerPk);

    await runStep(`Rank Candidates for ${ownerAddr}`, () =>
      factoryContractWrite.FactoryWriteContract.rankCandidates(
        ownerSigner,
        preferences
      )
    );

    console.log(`✅ Successfully ranked!`);
    
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}