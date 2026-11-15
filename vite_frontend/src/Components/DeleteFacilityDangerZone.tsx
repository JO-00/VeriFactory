// ============== DeleteFacilityDangerZone.tsx ==============

import React, { useMemo, useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import { ModalShell } from './Modals';
import { FactoryWriteContract } from '../HashGraphUtils/Contracts/Factory/FactoryWrite';

const PHRASES = [
  'I assert that my actions are irrevocable',
  'I understand this cannot be undone',
  'I accept FULL responsibility for this deletion',
  'I confirm i have read the warning above',
  'I will NOT ask for this facility to be restored',
  'I acknowledge the consequences of my choice',
];

export interface DeleteFacilityDangerZoneProps {
  facilityName: string;
  facilityAddress: string;
  signer: Signer | null;
  onDeleted?: () => void;
}

export const DeleteFacilityDangerZone: React.FC<DeleteFacilityDangerZoneProps> = ({
  facilityName,
  facilityAddress,
  signer,
  onDeleted,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Danger zone trigger — centered, wide, bloody red */}
      <section className="mt-10 mb-6">
        <div className="max-w-md mx-auto text-center">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full rounded-md border-2 border-[#8b0000] bg-[#8b0000] text-white px-6 py-4 text-base font-bold tracking-wide uppercase hover:bg-[#a50000] hover:border-[#a50000] transition-colors cursor-pointer shadow-lg"
          >
            Delete this facility
          </button>
          <div className="text-[0.68rem] text-ink-muted italic mt-2">
            Irreversible. Read the confirmation carefully.
          </div>
        </div>
      </section>

      {modalOpen && (
        <DeleteFacilityConfirmModal
          facilityName={facilityName}
          facilityAddress={facilityAddress}
          signer={signer}
          onClose={() => setModalOpen(false)}
          onDeleted={() => {
            setModalOpen(false);
            onDeleted?.();
          }}
        />
      )}
    </>
  );
};

// ────────────────────────────────────────────────────────────
// Confirmation modal
// ────────────────────────────────────────────────────────────
const DeleteFacilityConfirmModal: React.FC<{
  facilityName: string;
  facilityAddress: string;
  signer: Signer | null;
  onClose: () => void;
  onDeleted: () => void;
}> = ({ facilityName, facilityAddress, signer, onClose, onDeleted }) => {
  const [nameInput, setNameInput] = useState('');
  const [phraseInput, setPhraseInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick a random phrase — memoized so it stays stable during this modal session
  const requiredPhrase = useMemo(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
    []
  );

  const nameMatches = nameInput === facilityName;
  const phraseMatches = phraseInput === requiredPhrase;
  const canSubmit = nameMatches && phraseMatches && !submitting;

  const handleDelete = async () => {
    setError(null);
    if (!signer) {
      setError('Connect your wallet first.');
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await FactoryWriteContract.deleteFacility(signer, facilityAddress);
      onDeleted();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete facility.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Delete facility" onClose={submitting ? () => {} : onClose}>
      {/* Warning header */}
      <div className="bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-4 py-3 mb-4">
        <div className="text-[#8b0000] font-bold text-sm mb-1">
          ⚠️ This action is permanent and cannot be undone
        </div>
        <div className="text-[0.72rem] text-[#7a1a1a] leading-relaxed">
          Deleting this facility removes it from the factory's tracking.
          <strong> Signed contracts and registered members will no longer be visible</strong>
          {' '}through this facility. You are signing a one-way door.
        </div>
      </div>

      {/* Step 1 — type the facility name */}
      <div className="mb-4">
        <label className="block text-[0.72rem] font-semibold text-ink-muted mb-1">
          Step 1 — type the facility name exactly
        </label>
        <div className="text-[0.7rem] text-ink-muted mb-2 font-mono bg-surface-muted border border-border rounded-[5px] px-2 py-1">
          {facilityName}
        </div>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Type the name above"
          disabled={submitting}
          className={`w-full bg-bg border rounded-[5px] px-3 py-1.5 text-sm outline-none ${
            nameInput && !nameMatches
              ? 'border-[#f2a3a3] focus:border-[#a12626]'
              : 'border-border-strong focus:border-accent'
          }`}
        />
        {nameInput && !nameMatches && (
          <div className="text-[0.68rem] text-[#a12626] mt-1">
            Name does not match. Copy it exactly, including case.
          </div>
        )}
      </div>

      {/* Step 2 — type the random phrase */}
      <div className="mb-4">
        <label className="block text-[0.72rem] font-semibold text-ink-muted mb-1">
          Step 2 — type this phrase exactly
        </label>
        <div className="text-[0.72rem] italic text-ink bg-[#fff8e6] border border-[#f0d58a] rounded-[5px] px-3 py-2 mb-2 font-mono">
          "{requiredPhrase}"
        </div>
        <input
          value={phraseInput}
          onChange={(e) => setPhraseInput(e.target.value)}
          placeholder="Type the phrase above"
          disabled={submitting}
          className={`w-full bg-bg border rounded-[5px] px-3 py-1.5 text-sm outline-none ${
            phraseInput && !phraseMatches
              ? 'border-[#f2a3a3] focus:border-[#a12626]'
              : 'border-border-strong focus:border-accent'
          }`}
        />
        {phraseInput && !phraseMatches && (
          <div className="text-[0.68rem] text-[#a12626] mt-1">
            Phrase does not match. Copy it exactly.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 text-[0.72rem] text-[#a12626] mb-3">
          {error}
        </div>
      )}

      {/* Confirmation button */}
      <button
        onClick={handleDelete}
        disabled={!canSubmit}
        className={`w-full rounded-[5px] px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors mb-3 ${
          canSubmit
            ? 'bg-[#8b0000] hover:bg-[#a50000] text-white border-2 border-[#8b0000] cursor-pointer'
            : 'bg-surface-muted text-ink-faint border-2 border-border-strong cursor-not-allowed'
        }`}
      >
        {submitting ? 'Deleting…' : 'Delete facility'}
      </button>

      {/* Footnote */}
      <div className="text-[0.68rem] text-ink-muted italic leading-relaxed border-t border-border pt-3">
        Your facility address is{' '}
        <span className="font-mono not-italic text-ink break-all">
          {facilityAddress}
        </span>
        . It can never be deleted from the chain. What happens is that the
        factory <strong>no longer tracks this facility</strong> — its signed
        contracts, DAO members, gateways and relayers stop being visible here.
        The underlying data stays on-chain forever.
      </div>
    </ModalShell>
  );
};