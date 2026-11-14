// ============== SignContractsPanel.tsx ==============

import React, { useEffect, useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import { shortAddr } from './../facillity_dashboard_mocks';

export interface SignContractsPanelProps {
  facilityAddress: string;
  signer: Signer | null;
  /** All contracts the facility should sign. */
  allContracts: string[];
  /** Contracts already signed. */
  signedContracts: string[];
  /** Called with the modal-open callback so parent handles its own modal wrapper. */
  onOpenSign: (cid: string) => void;
}

export const SignContractsPanel: React.FC<SignContractsPanelProps> = ({
  facilityAddress,
  signer,
  allContracts,
  signedContracts,
  onOpenSign,
}) => {
  const signedSet = new Set(signedContracts.map((c) => c.toLowerCase()));
  const pending = allContracts.filter((c) => !signedSet.has(c.toLowerCase()));
  const done = allContracts.filter((c) => signedSet.has(c.toLowerCase()));

  const [showDone, setShowDone] = useState(false);

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
    <section className="mt-4 bg-surface border border-border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Sign contracts</h2>
        <span className="text-[0.7rem] text-ink-muted">
          {done.length}/{allContracts.length} signed
        </span>
      </div>

      {/* Progress summary */}
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

      {/* Pending list */}
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
              <span
                className="font-mono text-[0.72rem] break-all"
                title={cid}
              >
                {shortAddr(cid, 12, 8)}
              </span>
              <button
                onClick={() => onOpenSign(cid)}
                disabled={!signer}
                title={!signer ? 'Connect your wallet first' : 'Sign this contract'}
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

      {/* Collapsible already-signed list */}
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
              {done.map((cid) => (
                <div
                  key={cid}
                  className="flex items-center justify-between gap-2 bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-2"
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};