import {
  Client,
  PrivateKey,
  MirrorNodeAccountBalanceQuery,
} from "@hiero-ledger/sdk";

import * as fs from "fs";
import * as path from "path";

interface Facility {
  Name?: string;
  actors?: {
    Owner?: string | string[];
    DAOMembers?: string[];
    Relayers?: string[];
    Candidates?: string[];
    Gateways?: string[];
  };
}

function normalizeKeys(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (key): key is string =>
        typeof key === "string" && key.trim().length > 0
    );
  }

  return [];
}

async function main() {
  const configPath = path.resolve(
    __dirname,
    "../Init/full_config.json"
  );

  const data = JSON.parse(
    fs.readFileSync(configPath, "utf8")
  );

  const facilities: Facility[] = data.Facilities || [];
  const client = Client.forTestnet();

  const actorTypes = [
    "Owner",
    "DAOMembers",
    "Relayers",
    "Candidates",
    "Gateways",
  ] as const;

  try {
    for (const facility of facilities) {
      for (const actorType of actorTypes) {
        const keys = normalizeKeys(facility.actors?.[actorType]);

        for (const privateKeyString of keys) {
          try {
            const privateKey =
              PrivateKey.fromStringECDSA(privateKeyString);

            const address =
              privateKey.publicKey.toEvmAddress();

            const balance =
              await new MirrorNodeAccountBalanceQuery()
                .setAccountId(address)
                .execute(client);

            console.log(
              `${actorType} -> ${address} -> ${balance.hbars.toString()} HBAR`
            );
          } catch {
            let address = "INVALID_KEY";

            try {
              address = PrivateKey
                .fromStringECDSA(privateKeyString)
                .publicKey.toEvmAddress();
            } catch { }

            console.log(
              `${actorType} -> ${address} -> NOT_FOUND`
            );
          }
        }
      }
    }
  } finally {
    client.close();
  }
}

main().catch(console.error);
