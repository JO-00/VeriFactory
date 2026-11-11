import {
  Client,
  ContractExecuteTransaction,
  ContractId,
  ContractFunctionParameters,
  AccountId,
  PrivateKey,
  Hbar,
} from "@hiero-ledger/sdk";
import { config } from "dotenv";

config();

/**
 * Estimate the cost of calling a contract function (no execution, no gas spent)
 */
async function estimateContractCallCost(
  client: Client,
  contractId: string,
  functionName: string,
  params: ContractFunctionParameters,
  gasLimit: number = 1_000_000
) {
  // 1. Build the contract call transaction
  const contractTx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(contractId))
    .setGas(gasLimit)
    .setFunction(functionName, params);

  // 2. Freeze first (required for accurate estimation)
  const frozenTx = contractTx.freezeWith(client);

  // 3. Estimate fee (no arguments, returns tinycents)
  const estimate = await frozenTx.estimateFee().execute(client);

  return {
    totalTinycents: estimate.total.toString(),
    totalHbar: new Hbar(estimate.total, HbarUnit.Tinycent).toString(),
  };
}

async function main() {
  // ===== Configuration area =====
  const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY!);
  const contractId = process.env.CONTRACT_ID!; // e.g. "0.0.1234567"

  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  try {
    // ===== Function and parameters to estimate =====
    // Example: call setMessage(string) function
    const functionName = "setMessage";
    const params = new ContractFunctionParameters().addString("hello from estimate");

    // Optional: adjust gasLimit based on function complexity (default 1_000_000)
    const gasLimit = 1_000_000;

    const result = await estimateContractCallCost(
      client,
      contractId,
      functionName,
      params,
      gasLimit
    );

    console.log("=== Fee Estimation Result ===");
    console.log(`Function: ${functionName}`);
    console.log(`Estimated fee (tinycents): ${result.totalTinycents}`);
    console.log(`Estimated fee (HBAR, at current rate approximation): ${result.totalHbar}`);
  } finally {
    client.close();
  }
}

main().catch(console.error);