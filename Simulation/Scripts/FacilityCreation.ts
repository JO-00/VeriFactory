// file: createFacilities.ts
import { loadContracts } from "./config";
import { Facilities } from "../Workflow/Init/full_config.json";

interface InitialGatewayInput {
  id: string;
  key: `0x${string}`;
  relayer: `0x${string}`;
}

export function decodeRevertHex(hex?: string | null): string {
  if (!hex || hex === "0x") return "(empty revert data - likely Out of Gas or bare require)";
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;

  // Error(string) -> 0x08c379a0
  if (clean.startsWith("08c379a0") && clean.length >= 136) {
    const len = parseInt(clean.slice(72, 136), 16);
    const msgHex = clean.slice(136, 136 + len * 2);
    return `Error("${Buffer.from(msgHex, "hex").toString("utf8")}")`;
  }

  // Panic(uint256) -> 0x4e487b71
  if (clean.startsWith("4e487b71") && clean.length >= 72) {
    const code = parseInt(clean.slice(8, 72), 16);
    const panicMap: Record<number, string> = {
      0x01: "assert(false)",
      0x11: "arithmetic overflow/underflow",
      0x12: "division by zero",
      0x21: "invalid enum value",
      0x32: "array out-of-bounds",
      0x41: "out of memory",
      0x51: "zero-initialized function pointer",
    };
    return `Panic(0x${code.toString(16)}: ${panicMap[code] ?? "unknown"})`;
  }

  return `CustomError/Raw(${hex})`;
}

export async function fetchRevertReason(txIdObj: any) {
  const raw = txIdObj.toString();
  const atIdx = raw.indexOf("@");
  const formatted = raw
    .replace("@", "-")
    .replace(/\./g, (m: string, offset: number) => (offset > atIdx ? "-" : m));

  for (let attempt = 1; attempt <= 5; attempt++) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${formatted}`
    );
    if (res.ok) {
      const data = await res.json();
      return {
        result: data.result,
        gasUsed: data.gas_used,
        gasLimit: data.gas_limit,
        decoded: decodeRevertHex(data.error_message),
        rawErrorMessage: data.error_message,
      };
    }
  }
  return { error: `mirror lookup 404 after 5 retries (${formatted})` };
}
/** private key -> 0x-prefixed EVM address */
export function evmAddr(helper: any, pk: string): `0x${string}` {
  const raw = helper.EVMAddressFromPrivateKey(pk); // 40 hex chars, no 0x
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
}

export function buildGatewayInputs(
  helper: any,
  facility: (typeof Facilities)[number]
): InitialGatewayInput[] {
  const matrix = facility.actors.RelayersGatewaysBinaryMatrix ?? [];
  const relayers = facility.actors.Relayers ?? [];
  const gateways = facility.actors.Gateways ?? [];

  // --- shape checks ---
  if (matrix.length !== relayers.length) {
    throw new Error(
      `[${facility.Name}] matrix has ${matrix.length} rows but ${relayers.length} relayers`
    );
  }
  for (let r = 0; r < matrix.length; r++) {
    if (matrix[r].length !== gateways.length) {
      throw new Error(
        `[${facility.Name}] matrix row ${r} has ${matrix[r].length} cols but there are ${gateways.length} gateways`
      );
    }
  }

  const out: InitialGatewayInput[] = [];
  for (let c = 0; c < gateways.length; c++) {
    // first relayer row with a 1 in this gateway's column
    const r = matrix.findIndex((row) => row[c] === 1);
    if (r === -1) {
      throw new Error(
        `[${facility.Name}] gateway col ${c} has no relayer — run the matrix fixer first`
      );
    }

    out.push({
      id: String(c), // "0","1","2",... per facility
      key: evmAddr(helper, gateways[c]), // gateway EVM address
      relayer: evmAddr(helper, relayers[r]), // assigned relayer's EVM address
    });
  }
  return out;
}

async function main() {
  // loadContracts() is async — must be awaited inside an async fn in CJS
  const [
    facilityContractRead,
    facilityContractWrite,
    factoryContractRead,
    factoryContractWrite,
    helper,
  ] = await loadContracts();

  for (const facility of Facilities) {
    const initialGateways = buildGatewayInputs(helper, facility);
    const relayerAddresses = facility.actors.Relayers.map((pk: string) =>
      evmAddr(helper, pk)
    );

    try {
      const tx_receipt =
        await factoryContractWrite.FactoryWriteContract.createFacility(
          await helper.createSignerFromPrivateKey(facility.actors.Owner),
          facility.Name,
          facility.Location,
          facility.SectorType,
          relayerAddresses,
          initialGateways,
          [],
          6_000_000
        );

      console.log({
        facility: facility.Name,
        status: tx_receipt.status.toString(),
        contractId: tx_receipt.contractId?.toString() ?? null,
        contractEvmAddress: tx_receipt.contractId
          ? `0x${tx_receipt.contractId.toSolidityAddress()}`
          : null,
        rawReceipt: tx_receipt,
      });
    } catch (err: any) {
      const reason = err?.transactionId
        ? await fetchRevertReason(err.transactionId)
        : err?.message;

      console.error(`FAILED [${facility.Name}]:`, {
        status: err?.status?.toString() ?? null,
        transactionId: err?.transactionId?.toString() ?? null,
        revertReason: reason,
        payload: {
          name: facility.Name,
          location: facility.Location,
          sectorType: facility.SectorType,
          relayers: relayerAddresses,
          gateways: initialGateways,
        },
      });
    }
  }

  process.exit(0);
}
