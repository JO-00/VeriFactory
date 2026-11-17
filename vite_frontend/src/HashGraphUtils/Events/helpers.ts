import { id, getAddress, zeroPadValue } from 'ethers';
import { ContractId } from '@hiero-ledger/sdk';

/** Normalize "0.0.x" or "0x..." to a checksummed EVM address. */
export function toEvmAddress(targetAddress: string): string {
  if (targetAddress.startsWith('0x')) return getAddress(targetAddress);
  const contractId = ContractId.fromString(targetAddress);
  const raw = contractId.toEvmAddress();
  return getAddress(raw.startsWith('0x') ? raw : `0x${raw}`);
}

/** Format ms-since-epoch as Hedera timestamp `seconds.nanoseconds`. */
export function toHederaTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const nanos = (ms % 1000) * 1_000_000;
  return `${seconds}.${String(nanos).padStart(9, '0')}`;
}

/** Parse Hedera "seconds.nanoseconds" string into Unix ms. */
export function parseHederaTimestampMs(hederaTimestamp: string): number {
  const [secStr, nanoStr = '0'] = hederaTimestamp.split('.');
  const seconds = Number(secStr);
  const millis = Math.floor(Number(nanoStr.padEnd(9, '0')) / 1_000_000);
  return seconds * 1000 + millis;
}

/** Encode an address ("0.0.x" or "0x...") as a 32-byte indexed log topic. */
export function encodeAddressTopic(address: string): string {
  return zeroPadValue(toEvmAddress(address), 32).toLowerCase();
}

/** Encode a dynamic string as a keccak256 indexed log topic. */
export function encodeStringTopic(value: string): string {
  return id(value).toLowerCase();
}