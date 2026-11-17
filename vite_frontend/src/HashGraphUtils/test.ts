import { FactoryContractRead } from "./Contracts/Factory/FactoryRead";

async function main(): Promise<void> {
  const frozen = await FactoryContractRead.getDeployedFacilities();
  console.log(frozen)
}

main();