import {FacilityContractRead} from "./Contracts/Facility/FacilityRead"
async function main(): Promise<void> {
  try {
    const gateway = await FacilityContractRead.getR();
    console.log(`got ${events.length} FacilityAdded events`);
    console.log(events);
  } catch (err) {
    console.error('[main] failed to fetch FacilityAdded events:', err);
  }
}

main();