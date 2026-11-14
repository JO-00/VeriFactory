// ============== facilityFormat.ts ==============

/** Cadence/Flow timestamps often arrive as stringified float seconds. */
export function parseEventTimestamp(raw: string): Date | null {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);

  if (abs < 60) return 'just now';
  if (abs < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (abs < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  if (abs < 86400 * 30) return `${Math.round(diffSec / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Shorten 0x…  addresses / hashes for compact display. */
export function shortenHex(hex: string, head = 6, tail = 4): string {
  if (!hex.startsWith('0x') || hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head + 2)}…${hex.slice(-tail)}`;
}

/** Replace with your actual explorer base URL. */
const EXPLORER_TX_BASE = 'https://evm.flowscan.io/tx/';      // adjust
const EXPLORER_ADDR_BASE = 'https://evm.flowscan.io/address/'; // adjust

export const explorerTxUrl = (hash: string) => `${EXPLORER_TX_BASE}${hash}`;
export const explorerAddressUrl = (addr: string) => `${EXPLORER_ADDR_BASE}${addr}`;