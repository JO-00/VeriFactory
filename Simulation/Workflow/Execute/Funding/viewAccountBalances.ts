import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();

import {
  Client,
  PrivateKey,
  AccountId,
  MirrorNodeAccountBalanceQuery,
  Hbar,
} from "@hiero-ledger/sdk";

type Actor = { role: string; privateKey: string };

function getAllActors(): Actor[] {
  const configPath = path.resolve(__dirname, "../Init/full_config.json");
  const rawData = fs.readFileSync(configPath, "utf8");
  const data = JSON.parse(rawData);

  const facilities = data.Facilities || [];
  const actors: Actor[] = [];

  for (const facility of facilities) {
    const a = facility.actors || {};

    const owners = Array.isArray(a.Owner)
      ? a.Owner
      : a.Owner
        ? [a.Owner]
        : [];

    for (const k of owners) actors.push({ role: "Owner", privateKey: k });
    for (const k of a.DAOMembers || []) actors.push({ role: "DAOMember", privateKey: k });
    for (const k of a.Relayers || []) actors.push({ role: "Relayer", privateKey: k });
    for (const k of a.Candidates || []) actors.push({ role: "Candidate", privateKey: k });
    for (const k of a.Gateways || []) actors.push({ role: "Gateway", privateKey: k });
  }

  return actors;
}

async function checkBalancesFromActors(
  client: Client,
  actors: Actor[]
): Promise<Array<{ role: string; evmAddress: string; balanceHbar: string; error?: string }>> {
  const results: Array<{ role: string; evmAddress: string; balanceHbar: string; error?: string }> = [];
  const ONE_HBAR_TINYBARS = 100_000_000;

  for (const actor of actors) {
    let evmAddress: string;
    try {
      const privateKey = PrivateKey.fromStringECDSA(actor.privateKey);
      evmAddress = "0x" + privateKey.publicKey.toEvmAddress();
    } catch (e: any) {
      results.push({
        role: actor.role,
        evmAddress: "???",
        balanceHbar: "balance 0",
        error: `Invalid private key: ${e.message}`,
      });
      console.log(`${actor.role} -> ??? -> balance 0 (invalid key)`);
      continue;
    }

    try {
      const balance = await new MirrorNodeAccountBalanceQuery()
        .setAccountId(evmAddress)
        .execute(client);

      const tinybars = balance.hbars.toTinybars().toNumber();
      if (tinybars < ONE_HBAR_TINYBARS) {
        results.push({ role: actor.role, evmAddress, balanceHbar: "balance 0" });
        console.log(`${actor.role} -> ${evmAddress} -> balance 0`);
      } else {
        const shown = balance.hbars.toString();
        results.push({ role: actor.role, evmAddress, balanceHbar: shown });
        console.log(`${actor.role} -> ${evmAddress} -> ${shown}`);
      }
    } catch {
      results.push({ role: actor.role, evmAddress, balanceHbar: "balance 0", error: "doesn't exist" });
      console.log(`${actor.role} -> ${evmAddress} -> balance 0`);
    }
  }

  return results;
}

async function aa() {
  const operator_key = process.env.OPERATOR_KEY!;
  const operator_id = process.env.OPERATOR_ID!;

  const client = Client.forTestnet().setOperator(
    AccountId.fromString(operator_id),
    PrivateKey.fromStringECDSA(operator_key)
  );

  try {
    const results = await checkBalancesFromActors(client, getAllActors());
    console.log(results);
  } finally {
    client.close();
  }
}

aa();