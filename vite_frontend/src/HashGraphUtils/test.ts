import {FactoryContractRead} from "./Contracts/Factory/FactoryRead"



async function main(){
    const docs : string[] = await FactoryContractRead.getFactoryLegalContracts();
    console.log(docs);
}
main();