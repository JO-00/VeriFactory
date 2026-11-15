// ============== SignContractsPanel.tsx ==============

import React, { useEffect, useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import {
  keccak256,
  toUtf8Bytes,
  getBytes,
  concat,
  recoverAddress,
} from 'ethers';
import { shortAddr } from './../facillity_dashboard_mocks';
import type { SignedContract } from './../../types';
import { fetchIPFSBlobUrl, isImageCID } from './../../Functionalities/IPFSHelpers'; // adjust path

export interface SignContractsPanelProps {
  facilityAddress: string;
  signer: Signer | null;
  /** Every contract CID that should be signed. */
  allContracts: string[];
  /** The signed contracts (with v/r/s). We only use DocumentCID here. */
  signedContracts: SignedContract[];
  /** Open the sign modal for a given CID. */
  onOpenSign: (cid: string) => void;
}

// ────────────────────────────────────────────────────────────
// IPFS preview (used inside the signed-contract detail modal)
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
          setError(
            err instanceof Error ? err.message : 'Failed to load document.'
          );
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
  );
};

// ────────────────────────────────────────────────────────────
// Signature field with copy button
// ────────────────────────────────────────────────────────────
const SignatureField: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight }) => {
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
        <div
          className={`flex-1 font-mono text-[0.7rem] break-all bg-surface rounded-[4px] px-2 py-1 ${
            highlight ? 'text-success' : 'text-ink'
          }`}
        >
          {value}
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-[4px] border border-border-strong bg-surface px-1.5 py-0.5 text-[0.65rem] text-ink-muted hover:border-accent hover:text-ink cursor-pointer"
          title="Copy"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Signed-contract detail modal
// ────────────────────────────────────────────────────────────
const SignedContractDetailModal: React.FC<{
  contract: SignedContract;
  facilityAddress: string;
  onClose: () => void;
}> = ({ contract, facilityAddress, onClose }) => {
  // Recover the address from the stored v/r/s against the same digest
  // the contract uses at verification time.
  const recovered = React.useMemo(() => {
    try {
      const messageHash = keccak256(
        concat([
          toUtf8Bytes(contract.DocumentCID),
          getBytes(facilityAddress),
        ])
      );
      const messageHex = messageHash; // 0x-prefixed 32-byte hex
      const hederaDigest = keccak256(
        concat([
          toUtf8Bytes(`\x19Hedera Signed Message:\n${messageHex.length}`),
          toUtf8Bytes(messageHex),
        ])
      );
      return recoverAddress(hederaDigest, {
        v: contract.v,
        r: contract.r,
        s: contract.s,
      });
    } catch (err) {
      console.warn('[SignedContractDetailModal] recovery failed', err);
      return null;
    }
  }, [contract, facilityAddress]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-md w-[70vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div>
            <div className="text-[0.7rem] text-ink-muted uppercase tracking-wide">
              Signed contract
            </div>
            <div className="font-mono text-[0.8rem] break-all">
              {contract.DocumentCID}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {/* IPFS preview */}
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">
              Document preview
            </div>
            <IPFSPreview cid={contract.DocumentCID} />
          </div>

          {/* Signature */}
          <div className="text-[0.72rem] bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-3 space-y-2">
            <div className="text-success font-semibold text-[0.7rem] uppercase tracking-wide mb-1">
              Signature
            </div>
            <SignatureField label="v" value={String(contract.v)} />
            <SignatureField label="r" value={contract.r} />
            <SignatureField label="s" value={contract.s} />

            {recovered && (
              <div className="pt-2 border-t border-[#b4e5c7]">
                <SignatureField
                  label="Recovered address"
                  value={recovered}
                  highlight
                />
                <div className="text-[0.65rem] text-ink-muted italic mt-1">
                  Address that produced this signature.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Panel
// ────────────────────────────────────────────────────────────
export const SignContractsPanel: React.FC<SignContractsPanelProps> = ({
  facilityAddress,
  allContracts,
  signedContracts,
  onOpenSign,
  signer,
}) => {
  const [showDone, setShowDone] = useState(false);
  const [selectedSigned, setSelectedSigned] = useState<SignedContract | null>(
    null
  );

  // Derive a lowercase CID set for matching.
  const signedSet = new Set(
    signedContracts.map((sc) => sc.DocumentCID.toLowerCase())
  );

  const pending = allContracts.filter((c) => !signedSet.has(c.toLowerCase()));
  const done = allContracts.filter((c) => signedSet.has(c.toLowerCase()));

  // Map from CID → SignedContract, for the "signed" rows
  const signedByCid = new Map(
    signedContracts.map((sc) => [sc.DocumentCID.toLowerCase(), sc])
  );

  if (allContracts.length === 0) {
    return (
      <section className="mt-4 bg-surface border border-border rounded-md p-4">
        <h2 className="text-sm font-semibold mb-2">Sign contracts</h2>
        <div className="text-xs text-ink-muted italic">
          This facility has no contracts to sign.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-4 bg-surface border border-border rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Sign contracts</h2>
          <span className="text-[0.7rem] text-ink-muted">
            {done.length}/{allContracts.length} signed
          </span>
        </div>

        <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3">
          <div className="flex justify-between">
            <span>Pending</span>
            <span className="font-medium text-[#a12626]">{pending.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Signed</span>
            <span className="font-medium text-success">{done.length}</span>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="text-xs text-success bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-2 mb-3">
            All contracts are signed. Nothing pending.
          </div>
        ) : (
          <div className="space-y-1.5 mb-3">
            {pending.map((cid) => (
              <div
                key={cid}
                className="flex items-center justify-between gap-2 bg-surface-muted border border-border rounded-[5px] px-3 py-2"
              >
                <span className="font-mono text-[0.72rem] break-all" title={cid}>
                  {shortAddr(cid, 12, 8)}
                </span>
                <button
                  onClick={() => onOpenSign(cid)}
                  disabled={!signer}
                  title={
                    !signer ? 'Connect your wallet first' : 'Sign this contract'
                  }
                  className={`shrink-0 rounded-[5px] px-2.5 py-0.5 text-[11px] font-semibold border ${
                    !signer
                      ? 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
                      : 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
                  }`}
                >
                  Sign
                </button>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-[0.68rem] text-ink-muted underline hover:text-ink cursor-pointer"
            >
              {showDone ? 'Hide' : 'Show'} {done.length} signed contract
              {done.length === 1 ? '' : 's'}
            </button>
            {showDone && (
              <div className="mt-2 space-y-1.5">
                {done.map((cid) => {
                  const signed = signedByCid.get(cid.toLowerCase());
                  return (
                    <button
                      key={cid}
                      onClick={() => signed && setSelectedSigned(signed)}
                      title="View signature and IPFS document"
                      className="w-full text-left flex items-center justify-between gap-2 bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-2 hover:brightness-95 cursor-pointer"
                    >
                      <span
                        className="font-mono text-[0.72rem] break-all text-[#1f6b3f]"
                        title={cid}
                      >
                        {shortAddr(cid, 12, 8)}
                      </span>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e8f7ee] text-success">
                        Signed
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Signed-contract detail modal */}
      {selectedSigned && (
        <SignedContractDetailModal
          contract={selectedSigned}
          facilityAddress={facilityAddress}
          onClose={() => setSelectedSigned(null)}
        />
      )}
    </>
  );
};