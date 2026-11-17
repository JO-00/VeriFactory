import { EventFragment, Interface, LogDescription } from 'ethers';
import type { BaseEventMetadata, EventQueryOptions, RawLog } from './types';
import {
  parseHederaTimestampMs,
  toEvmAddress,
  toHederaTimestamp,
} from './helpers';

const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';
const MAX_WINDOW_MS = 7 * 86_400_000 - 60_000; // 6d 23h 59m (under Hedera's 7d cap)

export async function fetchRawLogs(
  targetAddress: string,
  topic0: string,
  options: EventQueryOptions = {}
): Promise<RawLog[]> {
  const isEvmInput = targetAddress.startsWith('0x');
  const evmAddress = toEvmAddress(targetAddress).toLowerCase();
  const pageSize = Math.min(options.pageSize ?? 100, 100);

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
      if (options.topic1) params.set('topic1', options.topic1);
      if (options.topic2) params.set('topic2', options.topic2);
      if (options.topic3) params.set('topic3', options.topic3);
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
    if (!json.links?.next) break;
    nextUrl = json.links.next;
  }

  if (!isEvmInput) return all;
  return all.filter((log) => log.address?.toLowerCase() === evmAddress);
}

/**
 * Define a typed event fetcher once from a Solidity event signature.
 * Automatically handles topic0, pagination, decoding, and log metadata.
 */
export function createEventFetcher<TEvent>(
  eventAbi: string,
  mapArgs: (args: LogDescription['args'], meta: BaseEventMetadata) => TEvent
) {
  const fragment = EventFragment.from(eventAbi);
  const iface = new Interface([fragment]);
  const eventName = fragment.name;
  const topic0 = fragment.topicHash.toLowerCase();

  return async function query(
    targetAddress: string,
    options: EventQueryOptions = {}
  ): Promise<TEvent[]> {
    const rawLogs = await fetchRawLogs(targetAddress, topic0, options);
    const results: TEvent[] = [];

    for (const log of rawLogs) {
      if (log.topics[0]?.toLowerCase() !== topic0) continue;

      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed || parsed.name !== eventName) continue;

        const timestampMs = parseHederaTimestampMs(log.timestamp);
        const meta: BaseEventMetadata = {
          transactionHash: log.transaction_hash,
          blockNumber: log.block_number,
          transactionIndex: log.transaction_index,
          logIndex: log.log_index,
          timestamp: log.timestamp,
          timestampMs,
          timestampDate: new Date(timestampMs),
        };

        results.push(mapArgs(parsed.args, meta));
      } catch (err) {
        console.warn(`[${eventName}] failed to decode log`, log, err);
      }
    }

    return results;
  };
}