// ============== mirrorNodeEvents.ts ==============

import { Interface, id, getAddress, zeroPadValue } from 'ethers';
import { ContractId } from '@hiero-ledger/sdk';
import { FACTORY_CONTRACT_ADDRESS } from './configs';
import type { FacilityAddedEvent , RelayerRegisteredEvent  , KeyRotatedEvent} from '../types';
import {getCallerName} from "./debug"

const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com'; // adjust for your network
const MAX_WINDOW_MS = 7 * 86_400_000 - 60_000; // 6d 23h 59m (safely under Hedera's strict 7d cap)

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

/** Normalize "0.0.x" or "0x..." to a checksummed EVM address. */
function toEvmAddress(targetAddress: string): string {
  if (targetAddress.startsWith('0x')) return getAddress(targetAddress);
  const contractId = ContractId.fromString(targetAddress);
  const raw = contractId.toEvmAddress();
  return getAddress(raw.startsWith('0x') ? raw : `0x${raw}`);
}

/** Format ms-since-epoch as Hedera timestamp `seconds.nanoseconds`. */
function toHederaTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const nanos = (ms % 1000) * 1_000_000;
  return `${seconds}.${String(nanos).padStart(9, '0')}`;
}

const RELAYER_REGISTERED_ABI = [
  'event RelayerRegistered(address indexed relayerAddress, string name)',
];
const relayerRegisteredIface = new Interface(RELAYER_REGISTERED_ABI);
const RELAYER_REGISTERED_TOPIC0 = id('RelayerRegistered(address,string)');

/** Parse Hedera "seconds.nanoseconds" string into Unix ms. */
function parseHederaTimestampMs(hederaTimestamp: string): number {
  const [secStr, nanoStr = '0'] = hederaTimestamp.split('.');
  const seconds = Number(secStr);
  const millis = Math.floor(Number(nanoStr.padEnd(9, '0')) / 1_000_000);
  return seconds * 1000 + millis;
}
// ───────────────────────────────────────────────────────────
// 1) Generic: fetch raw logs for any event
// ───────────────────────────────────────────────────────────

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  transaction_hash: string;
  block_number: number;
  transaction_index: number;
  log_index: number;
  timestamp: string; // Hedera "seconds.nanos"
}

export interface CallMirrorNodeEventsOptions {
  /** Override the lookback window in days (default 7, clamped to <7d). */
  lookbackDays?: number;
  /** Explicit lower bound (ms since epoch). Takes precedence over lookbackDays (clamped to <7d from now). */
  fromMs?: number;
  /** Max logs per page (Hedera caps at 100). */
  pageSize?: number;
  /** Optional 32-byte hex topic1 filter for indexed first parameters. */
  topic1?: string;
}

const KEY_ROTATED_ABI = [
  'event KeyRotated(string indexed gatewayId, address oldKey, address newKey, bool indexed isAnomalous, uint256 timestamp)',
];
const keyRotatedIface = new Interface(KEY_ROTATED_ABI);
const KEY_ROTATED_TOPIC0 = id('KeyRotated(string,address,address,bool,uint256)');
/**
 * Fetch raw event logs for `eventName(types...)` emitted by `targetAddress`.
 * - Accepts "0.0.x" or "0x..." addresses
 * - Handles pagination and Hedera's `< 7d` timestamp requirement when `topic0` is set
 * - Returns the raw `logs[]` array (undecoded)
 */
export async function callMirrorNodeEvents(
  targetAddress: string, // "0.0.12345" OR "0x1234..."
  eventName: string,
  inputTypes: string[],
  options: CallMirrorNodeEventsOptions = {}
): Promise<RawLog[]> {
  const isEvmInput = targetAddress.startsWith('0x');
  const evmAddress = toEvmAddress(targetAddress).toLowerCase();

  // Canonical signature (no "event " keyword)
  const signature = `${eventName}(${inputTypes.join(',')})`;
  const topic0 = id(signature);

  const pageSize = Math.min(options.pageSize ?? 100, 100);

  // Capture `toMs` once so `toMs - fromMs` never drifts past 7 days
  const toMs = Date.now();
  const requestedFromMs =
    options.fromMs ?? toMs - (options.lookbackDays ?? 7) * 86_400_000;
  const fromMs = Math.max(requestedFromMs, toMs - MAX_WINDOW_MS);

  const all: RawLog[] = [];
  let nextUrl: string | null = null;

  while (true) {
    let url: string;

    if (nextUrl) {
      url = nextUrl.startsWith('http') ? nextUrl : `${MIRROR_NODE_URL}${nextUrl}`;
    } else {
      const params = new URLSearchParams({
        topic0,
        order: 'asc',
        limit: String(pageSize),
      });
      if (options.topic1) {
        params.set('topic1', options.topic1);
      }
      params.append('timestamp', `gte:${toHederaTimestamp(fromMs)}`);
      params.append('timestamp', `lte:${toHederaTimestamp(toMs)}`);

      url = `${MIRROR_NODE_URL}/api/v1/contracts/${targetAddress}/results/logs?${params.toString()}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Mirror node logs request failed: ${res.status} ${res.statusText} ${text}`
      );
    }

    const json = (await res.json()) as {
      logs?: RawLog[];
      links?: { next?: string | null };
    };

    if (json.logs?.length) all.push(...json.logs);

    const next = json.links?.next ?? null;
    if (!next) break;
    nextUrl = next;
  }

  // Only enforce strict EVM address matching if an explicit 0x address was passed
  // (avoids dropping logs when a 0.0.x ID resolves to a non-long-zero EVM alias)
  if (!isEvmInput) return all;

  return all.filter((log) => log.address?.toLowerCase() === evmAddress);
}

// ───────────────────────────────────────────────────────────
// 2) Typed: FacilityAdded
// ───────────────────────────────────────────────────────────



const FACILITY_ADDED_ABI = [
  'event FacilityAdded(address indexed facilityAddress, string name, address indexed addedBy, string location, string sectorType, bool isActive)',
];
const facilityAddedIface = new Interface(FACILITY_ADDED_ABI);
const FACILITY_ADDED_TOPIC0 = id(
  'FacilityAdded(address,string,address,string,string,bool)'
);

export class EventReader {

  static async getFacilityAddedEvents(
    options: CallMirrorNodeEventsOptions = {}
  ): Promise<FacilityAddedEvent[]> {
    const rawLogs = await callMirrorNodeEvents(
      FACTORY_CONTRACT_ADDRESS,
      'FacilityAdded',
      ['address', 'string', 'address', 'string', 'string', 'bool'],
      options
    );

    const out: FacilityAddedEvent[] = [];

    for (const log of rawLogs) {
      if (log.topics[0]?.toLowerCase() !== FACILITY_ADDED_TOPIC0.toLowerCase()) continue;

      try {
        const parsed = facilityAddedIface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (!parsed || parsed.name !== 'FacilityAdded') continue;

        out.push({
          facilityAddress: parsed.args.facilityAddress as string,
          name: parsed.args.name as string,
          addedBy: parsed.args.addedBy as string,
          location: parsed.args.location as string,
          sectorType: parsed.args.sectorType as string,
          isActive: parsed.args.isActive as boolean,
          transactionHash: log.transaction_hash,
          blockNumber: log.block_number,
          logIndex: log.log_index,
          timestamp: log.timestamp,
        });
      } catch (err) {
        console.warn('[getFacilityAddedEvents] failed to decode log', log, err);
      }
    }

    return out;
  }

  static async getAllRelayerRegistrationEvents(
    facilityAddress: string,
    options: CallMirrorNodeEventsOptions = {}
  ): Promise<RelayerRegisteredEvent[]> {
    const rawLogs = await callMirrorNodeEvents(
      facilityAddress,
      'RelayerRegistered',
      ['address', 'string'],
      options
    );

    const out: RelayerRegisteredEvent[] = [];

    for (const log of rawLogs) {
      if (log.topics[0]?.toLowerCase() !== RELAYER_REGISTERED_TOPIC0.toLowerCase()) continue;

      try {
        const parsed = relayerRegisteredIface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (!parsed || parsed.name !== 'RelayerRegistered') continue;

        const timestampMs = parseHederaTimestampMs(log.timestamp);

        out.push({
          facilityAddress,
          relayerAddress: parsed.args.relayerAddress as string,
          name: parsed.args.name as string,
          transactionHash: log.transaction_hash,
          blockNumber: log.block_number,
          transactionIndex: log.transaction_index,
          logIndex: log.log_index,
          timestamp: log.timestamp,
          timestampMs,
          timestampDate: new Date(timestampMs),
        });
      } catch (err) {
        console.warn('[getAllRelayerRegistrationEvents] failed to decode log', log, err);
      }
    }

    return out;
  }
  static async getRelayerRegistrationEvent(
    {
      facilityAddress,
      relayerAddress,
    }: {
      facilityAddress: string;
      relayerAddress: string;
    },
    options: Omit<CallMirrorNodeEventsOptions, 'topic1'> = {}
  ): Promise<RelayerRegisteredEvent | null> {
    const normalizedRelayerEvm = toEvmAddress(relayerAddress);
    const topic1 = zeroPadValue(normalizedRelayerEvm, 32).toLowerCase();

    const rawLogs = await callMirrorNodeEvents(
      facilityAddress,
      'RelayerRegistered',
      ['address', 'string'],
      { ...options, topic1 }
    );

    for (const log of rawLogs) {
      if (log.topics[0]?.toLowerCase() !== RELAYER_REGISTERED_TOPIC0.toLowerCase()) continue;

      try {
        const parsed = relayerRegisteredIface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (!parsed || parsed.name !== 'RelayerRegistered') continue;

        const eventRelayer = parsed.args.relayerAddress as string;
        if (eventRelayer.toLowerCase() !== normalizedRelayerEvm.toLowerCase()) continue;

        const timestampMs = parseHederaTimestampMs(log.timestamp);

        return {
          facilityAddress,
          relayerAddress: eventRelayer,
          name: parsed.args.name as string,
          transactionHash: log.transaction_hash,
          blockNumber: log.block_number,
          transactionIndex: log.transaction_index,
          logIndex: log.log_index,
          timestamp: log.timestamp,
          timestampMs,
          timestampDate: new Date(timestampMs),
        };
      } catch (err) {
        console.warn('[getRelayerRegistrationEvent] failed to decode log', log, err);
      }
    }

    return null;
  }
  static async getKeyRotatedEventsByGateway(
    {
      facilityAddress,
      gatewayId,
    }: {
      facilityAddress: string;
      gatewayId: string;
    },
    options: Omit<CallMirrorNodeEventsOptions, 'topic1'> = {}
  ): Promise<KeyRotatedEvent[]> {
    // Indexed strings in Solidity are hashed with keccak256 in topic1
    const topic1 = id(gatewayId).toLowerCase();

    const rawLogs = await callMirrorNodeEvents(
      facilityAddress,
      'KeyRotated',
      ['string', 'address', 'address', 'bool', 'uint256'],
      { ...options, topic1 }
    );

    const out: KeyRotatedEvent[] = [];

    for (const log of rawLogs) {
      if (log.topics[0]?.toLowerCase() !== KEY_ROTATED_TOPIC0.toLowerCase()) continue;

      try {
        const parsed = keyRotatedIface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (!parsed || parsed.name !== 'KeyRotated') continue;

        const gatewayIdHash = parsed.args.gatewayId.hash as string;
        if (gatewayIdHash.toLowerCase() !== topic1) continue;

        const contractTimestamp = parsed.args.timestamp as bigint;
        const contractTimestampMs = Number(contractTimestamp) * 1000;
        const timestampMs = parseHederaTimestampMs(log.timestamp);

        out.push({
          facilityAddress,
          gatewayId,
          gatewayIdHash,
          oldKey: parsed.args.oldKey as string,
          newKey: parsed.args.newKey as string,
          isAnomalous: parsed.args.isAnomalous as boolean,
          contractTimestamp,
          contractTimestampMs,
          contractTimestampDate: new Date(contractTimestampMs),
          transactionHash: log.transaction_hash,
          blockNumber: log.block_number,
          transactionIndex: log.transaction_index,
          logIndex: log.log_index,
          timestamp: log.timestamp,
          timestampMs,
          timestampDate: new Date(timestampMs),
        });
      } catch (err) {
        console.warn('[getKeyRotatedEventsByGateway] failed to decode log', log, err);
      }
    }

    return out;
  }
}
