import { createEventFetcher } from './mirrorClient';
import { encodeAddressTopic, encodeStringTopic } from './helpers';
import type { EventQueryOptions } from './types';
import type { KeyRotatedEvent, RelayerRegisteredEvent } from '../../types';

const queryRelayerRegistered = createEventFetcher<
  Omit<RelayerRegisteredEvent, 'facilityAddress'>
>(
  'event RelayerRegistered(address indexed relayerAddress, string name)',
  (args, meta) => ({
    relayerAddress: args.relayerAddress as string,
    name: args.name as string,
    ...meta,
  })
);

const queryKeyRotated = createEventFetcher<
  Omit<KeyRotatedEvent, 'facilityAddress' | 'gatewayId'>
>(
  'event KeyRotated(string indexed gatewayId, address oldKey, address newKey, bool indexed isAnomalous, uint256 timestamp)',
  (args, meta) => {
    const contractTimestamp = args.timestamp as bigint;
    const contractTimestampMs = Number(contractTimestamp) * 1000;

    return {
      gatewayIdHash: args.gatewayId.hash as string,
      oldKey: args.oldKey as string,
      newKey: args.newKey as string,
      isAnomalous: args.isAnomalous as boolean,
      contractTimestamp,
      contractTimestampMs,
      contractTimestampDate: new Date(contractTimestampMs),
      ...meta,
    };
  }
);

export class FacilityEvents {
  static async getAllRelayerRegistrationEvents(
    facilityAddress: string,
    options: EventQueryOptions = {}
  ): Promise<RelayerRegisteredEvent[]> {
    const events = await queryRelayerRegistered(facilityAddress, options);
    return events.map((e) => ({ ...e, facilityAddress }));
  }

  static async getRelayerRegistrationEvent(
    {
      facilityAddress,
      relayerAddress,
    }: { facilityAddress: string; relayerAddress: string },
    options: Omit<EventQueryOptions, 'topic1'> = {}
  ): Promise<RelayerRegisteredEvent | null> {
    const topic1 = encodeAddressTopic(relayerAddress);
    const events = await queryRelayerRegistered(facilityAddress, {
      ...options,
      topic1,
    });
    const match = events[0];
    return match ? { ...match, facilityAddress } : null;
  }

  static async getKeyRotatedEventsByGateway(
    {
      facilityAddress,
      gatewayId,
    }: { facilityAddress: string; gatewayId: string },
    options: Omit<EventQueryOptions, 'topic1'> = {}
  ): Promise<KeyRotatedEvent[]> {
    const topic1 = encodeStringTopic(gatewayId);
    const events = await queryKeyRotated(facilityAddress, {
      ...options,
      topic1,
    });
    return events.map((e) => ({ ...e, facilityAddress, gatewayId }));
  }
}