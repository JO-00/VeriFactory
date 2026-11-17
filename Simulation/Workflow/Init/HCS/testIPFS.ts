// src/checkAllCids.ts
import { createHelia, type Helia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';
import { data } from './publishCIDS';
import { AccountId } from '@hiero-ledger/sdk';

// Guard against Node v24's locked ReadableStream bug inside @helia/delegated-routing-v1-http-api-client
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err?.code === 'ERR_INVALID_STATE' && err.message?.includes('ReadableStream is locked')) {
    return;
  }
  throw err;
});
export async function resolveHederaAccountId(evmAddress: string): Promise<AccountId> {
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`
  );
  if (!res.ok) {
    throw new Error(
      `Failed to resolve Hedera AccountId for ${evmAddress} (HTTP ${res.status})`
    );
  }
  const json = (await res.json()) as { account?: string };
  if (!json.account) {
    throw new Error(`No Hedera account found on Testnet for ${evmAddress}`);
  }
  return AccountId.fromString(json.account);
}
export async function ipfsFileExists(
  helia: Helia,
  cidString: string,
  timeoutMs: number = 15000
): Promise<boolean> {
  let cid: CID;
  try {
    cid = CID.parse(cidString.replace(/^ipfs:\/\//, '').trim());
  } catch {
    return false;
  }

  const fs = unixfs(helia);
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  try {
    await Promise.race([fs.stat(cid), timeoutPromise]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
/*
async function main() {
  const helia = await createHelia();

  let total = 0;
  let ok = 0;
  const failures: { category: string; gateway: string; cid: string }[] = [];

  try {
    for (const category of Object.keys(data)) {
      const byKey = data[category];
      console.log(`\n=== ${category} ===`);

      for (const gatewayKey of Object.keys(byKey)) {
        const cids = byKey[gatewayKey];
        // Don't print the private key; print a short fingerprint instead
        const label = `${gatewayKey.slice(0, 6)}…${gatewayKey.slice(-4)}`;

        for (const cid of cids) {
          total++;
          const exists = await ipfsFileExists(helia, cid);
          if (exists) {
            ok++;
            console.log(`  [ok]   ${label}  ${cid}`);
          } else {
            failures.push({ category, gateway: label, cid });
            console.log(`  [FAIL] ${label}  ${cid}`);
          }
        }
      }
    }
  } finally {
    await helia.stop();
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total CIDs: ${total}`);
  console.log(`OK:         ${ok}`);
  console.log(`Failed:     ${failures.length}`);

  if (failures.length > 0) {
    console.log(`\nFailed CIDs:`);
    for (const f of failures) {
      console.log(`  ${f.category} / ${f.gateway} / ${f.cid}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
*/