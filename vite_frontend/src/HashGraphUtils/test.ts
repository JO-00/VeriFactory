import {FacilityContractRead} from "./Contracts/Facility/FacilityRead"
async function main(): Promise<void> {
  try {
    const relayers = await FacilityContractRead.getAllRelayers("0x21ebc2D97a649b3f0228A711Dc65C9452FA25EB7")
    const gateways = await FacilityContractRead.getRelayerGateways("0x21ebc2D97a649b3f0228A711Dc65C9452FA25EB7",'0x6F1965133533ef3e9DA4B72B3F95BD7267344930');
    console.log(gateways)
  } catch (err) {
    console.error('[main] failed to fetch FacilityAdded events:', err);
  }
}

main();