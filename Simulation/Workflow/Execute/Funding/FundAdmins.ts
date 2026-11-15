import {
  Client,
  TransferTransaction,
  Hbar,
  PrivateKey,
  AccountId,
  HbarUnit,
} from "@hiero-ledger/sdk";

import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { loadContracts } from "../../../Scripts/config";
import {evmAddr } from "./../../../Scripts/FacilityCreation"

config();
import {Facilities} from "./../../Init/full_config.json"


async function sendTinybarsToEvm(
  client: Client,
  senderPrivateKey: PrivateKey,
  senderAccountId: AccountId,
  receiverEvmAddress: string,
  amountInHbar: number
) {
  const amountInTinybars = Hbar.from(amountInHbar).toTinybars();

  const transferTx = new TransferTransaction()
    .addHbarTransfer(
      senderAccountId,
      Hbar.fromTinybars(amountInTinybars).negated()
    )
    .addHbarTransfer(
      receiverEvmAddress,
      Hbar.fromTinybars(amountInTinybars)
    );

  // Freeze transaction
  const frozenTx = transferTx.freezeWith(client);

  // Sign with sender's private key
  const signedTx = await frozenTx.sign(senderPrivateKey);

  // Execute transaction
  const response = await signedTx.execute(client);

  // Get receipt
  const receipt = await response.getReceipt(client);

  return { response, receipt };
}


async function main(){
    const [
        facilityContractRead,
        facilityContractWrite,
        factoryContractRead,
        factoryContractWrite,
        helper,
      ] = await loadContracts();
      if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
    throw new Error("Missing OPERATOR_ID or OPERATOR_KEY in .env");
  }

  const operatorId = AccountId.fromString(
    process.env.OPERATOR_ID
  );

  const operatorKey = PrivateKey.fromStringECDSA(
    process.env.OPERATOR_KEY
  );

  const client = Client.forTestnet().setOperator(
    operatorId,
    operatorKey
  );
    for (const facility of Facilities){
        const owner_addr = evmAddr(helper,facility.actors.Owner);
        await sendTinybarsToEvm(client,operatorKey,operatorId,owner_addr,10)
    }

}
main()