// ============== SignContractModal.tsx ==============

import { useState, useEffect } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import {
  keccak256,
  toUtf8Bytes,
  getBytes,
  concat,
  Signature,
} from 'ethers';
import { shortAddr } from './../Dashboards/facillity_dashboard_mocks';
import { ModalShell } from './Modals';
import { resolveEvmAddress } from '../Functionalities/getFacilityInfo';
import { fetchIPFSBlobUrl, isImageCID } from './../Functionalities/IPFSHelpers';

interface SignContractModalProps {
  cid: string;
  facilityAddress: string;
  signer: Signer | null;
  personalSign: (messageHex: string, evmAddress?: string) => Promise<string>;
  onClose: () => void;
  onSubmit: (v: number, r: string, s: string) => Promise<void>;
}

/**
 * Preimage — matches Solidity:
 *   keccak256(abi.encodePacked(DocumentCID, facility_contract))
 * The wallet's personal_sign wraps this in the EIP-191 / Hedera prefix.
 */
const buildMessageHash = (cid: string, facilityAddress: string): Uint8Array =>
  getBytes(keccak256(concat([toUtf8Bytes(cid), getBytes(facilityAddress)])));

const toHex = (bytes: Uint8Array): string => {
  let out = '0x';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
};

// ────────────────────────────────────────────────────────────
// IPFS document preview
// ────────────────────────────────────────────────────────────
const IPFSPreview: React.FC<{ cid: string }> = ({ cid }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = isImageCID(cid);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = await fetchIPFSBlobUrl(cid);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setBlobUrl(url);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [cid]);

  return (
    <div className="mb-3">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">
        Contract document
      </div>
      <div className="border border-border rounded-[5px] bg-surface-muted overflow-hidden">
        {loading && (
          <div className="px-3 py-6 text-center text-xs text-ink-muted">
            Loading IPFS document…
          </div>
        )}
        {error && (
          <div className="px-3 py-3 text-xs text-[#a12626] bg-[#fdecec] break-all">
            {error}
          </div>
        )}
        {!loading && !error && blobUrl && (
          isImage ? (
            <img
              src={blobUrl}
              alt={cid}
              className="block max-w-full max-h-[280px] mx-auto"
            />
          ) : (
            <iframe
              src={blobUrl}
              title={cid}
              className="w-full h-[300px] border-none bg-white"
            />
          )
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Signature field with copy
// ────────────────────────────────────────────────────────────
const SignatureField: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <div>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-[0.7rem] break-all bg-surface rounded-[4px] px-2 py-1 text-ink">
          {value}
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-[4px] border border-border-strong bg-surface px-1.5 py-0.5 text-[0.65rem] text-ink-muted hover:border-accent hover:text-ink cursor-pointer"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main modal
// ────────────────────────────────────────────────────────────
export const SignContractModal: React.FC<SignContractModalProps> = ({
  cid,
  facilityAddress,
  signer,
  personalSign,
  onClose,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<{
    v: number;
    r: string;
    s: string;
  } | null>(null);

  const handleSign = async () => {
    setError(null);
    setSignature(null);

    if (!signer) {
      setError('Connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      const messageHash = buildMessageHash(cid, facilityAddress);
      const messageHex = toHex(messageHash);
      const evmAddress = await resolveEvmAddress(signer.getAccountId().toString());

      const flatSig = await personalSign(messageHex, evmAddress);

      const { v, r, s } = Signature.from(flatSig);

      setSignature({ v, r, s });

      // Fire immediately — same as the working version.
      await onSubmit(v, r, s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signing failed.';
      if (/reject|cancel|denied|user.*(reject|cancel)/i.test(msg)) {
        setError('Signature request was rejected in the wallet.');
      } else {
        setError(msg);
      }
      console.error('[sign] failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Sign contract" onClose={loading ? () => {} : onClose}>
      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3 leading-relaxed">
        Clicking <strong>Sign with wallet</strong> asks your wallet to sign the
        contract CID bound to this facility, then the signature is submitted to
        the contract on-chain.
      </div>

      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3">
        <div className="flex justify-between gap-3">
          <span>Contract CID</span>
          <span className="font-mono text-ink break-all" title={cid}>
            {shortAddr(cid, 12, 8)}
          </span>
        </div>
        <div className="flex justify-between gap-3 mt-1">
          <span>Facility</span>
          <span className="font-mono text-ink break-all" title={facilityAddress}>
            {shortAddr(facilityAddress, 10, 6)}
          </span>
        </div>
      </div>

      {/* IPFS document preview */}
      <IPFSPreview cid={cid} />

      {/* Error */}
      {error && (
        <div className="text-[0.72rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 mb-3 break-all">
          {error}
        </div>
      )}

      {/* Signature preview — appears once parsed, stays visible while onSubmit runs */}
      {signature && (
        <div className="text-[0.72rem] bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-3 mb-3 space-y-2">
          <div className="text-success font-semibold text-[0.7rem] uppercase tracking-wide mb-1">
            Signature
          </div>
          <SignatureField label="v" value={String(signature.v)} />
          <SignatureField label="r" value={signature.r} />
          <SignatureField label="s" value={signature.s} />
        </div>
      )}

      {/* Footer — single-stage, same as the working version */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={loading ? () => {} : onClose}
          className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSign}
          disabled={loading || !signer}
          className="rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting…' : 'Sign with wallet'}
        </button>
      </div>
    </ModalShell>
  );
};