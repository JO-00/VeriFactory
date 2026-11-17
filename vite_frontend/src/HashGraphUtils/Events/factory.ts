import { FACTORY_CONTRACT_ADDRESS } from '../configs';
import { createEventFetcher } from './mirrorClient';
import { encodeAddressTopic } from './helpers';
import type { EventQueryOptions, DAOMemberStakeInfo, DAOMemberAddedEvent } from './types';
import type { FacilityAddedEvent } from '../../types';

const queryFacilityAdded = createEventFetcher<FacilityAddedEvent>(
  'event FacilityAdded(address indexed facilityAddress, string name, address indexed addedBy, string location, string sectorType, bool isActive)',
  (args, meta) => ({
    facilityAddress: args.facilityAddress as string,
    name: args.name as string,
    addedBy: args.addedBy as string,
    location: args.location as string,
    sectorType: args.sectorType as string,
    isActive: args.isActive as boolean,
    ...meta,
  })
);

const queryDAOMemberAdded = createEventFetcher<DAOMemberStakeInfo>(
  'event DAOMemberAdded(address indexed facilityAddress, address indexed new_member, uint256 stake)',
  (args, meta) => ({
    memberAddress: args.new_member as string,
    stake: Number(args.stake),
    ...meta,
  })
);

const queryDAOMemberAddedFull = createEventFetcher<DAOMemberAddedEvent>(
  'event DAOMemberAdded(address indexed facilityAddress, address indexed new_member, uint256 stake)',
  (args, meta) => ({
    facilityAddress: args.facilityAddress as string,
    newMemberAddress: args.new_member as string,
    stake: Number(args.stake),
    ...meta,
  })
);

export class FactoryEvents {
  static async getFacilityAddedEvents(
    options: EventQueryOptions = {}
  ): Promise<FacilityAddedEvent[]> {
    return queryFacilityAdded(FACTORY_CONTRACT_ADDRESS, options);
  }

  static async getDAOMemberAddedEvents(
    options: EventQueryOptions = {}
  ): Promise<DAOMemberAddedEvent[]> {
    return queryDAOMemberAddedFull(FACTORY_CONTRACT_ADDRESS, options);
  }

  /**
   * Fetch stake info for a specific wallet address.
   * Returns null if the wallet was never staked as a DAO member.
   */
  static async getDAOMemberStakeInfo(
    memberAddress: string
  ): Promise<DAOMemberStakeInfo | null> {
    const queryOptions: EventQueryOptions = {
      topic2: encodeAddressTopic(memberAddress),
    };

    const events = await queryDAOMemberAdded(FACTORY_CONTRACT_ADDRESS, queryOptions);

    return events.length > 0 ? events[0] : null;
  }
}