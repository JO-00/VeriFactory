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

export interface EventQueryOptions {
  /** Override the lookback window in days (default 7, clamped to <7d). */
  lookbackDays?: number;
  /** Explicit lower bound (ms since epoch). Takes precedence over lookbackDays (clamped to <7d from now). */
  fromMs?: number;
  /** Max logs per page (Hedera caps at 100). */
  pageSize?: number;
  /** Optional 32-byte hex topic filters for indexed parameters. */
  topic1?: string;
  topic2?: string;
  topic3?: string;
}

export interface BaseEventMetadata {
  transactionHash: string;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp: string;
  timestampMs: number;
  timestampDate: Date;
}
export interface DAOMemberStakeInfo {
  memberAddress: string;
  stake: number; // in tinybars
  transactionHash: string;
  blockNumber: number;
  transactionIndex: number;
  timestamp: string;
  timestampMs: number;
  timestampDate: Date;
}