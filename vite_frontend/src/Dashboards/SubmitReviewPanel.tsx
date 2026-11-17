// ============== SubmitReviewPanel.tsx ==============

import React, { useState } from 'react';
import { useWallet } from './../Common/WalletProvider';
import {
  buildReviewMessage,
  upsertReview,
  type ReviewItem,
} from './../Functionalities/reputationApi';

export interface SubmitReviewPanelProps {
  facilityAddress: string;
  onSubmitted?: (review: ReviewItem) => void;
}

export const SubmitReviewPanel: React.FC<SubmitReviewPanelProps> = ({
  facilityAddress,
  onSubmitted,
}) => {
  const { signer, accountId, personalSignHash, evmAddress, isConnected } =
    useWallet();

  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = isConnected && !!signer && !!evmAddress && !busy;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!signer || !evmAddress) {
      setError('Connect a wallet first.');
      return;
    }
    if (!Number.isInteger(stars) || stars < 0 || stars > 5) {
      setError('Stars must be an integer between 0 and 5.');
      return;
    }
    if (!review.trim()) {
      setError('Write a short review.');
      return;
    }

    setBusy(true);
    try {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const message = buildReviewMessage(facilityAddress, stars, review, timestamp);

      // NOTE: personalSignHash signs with the Hedera "\x19Hedera Signed Message:"
      // envelope. Backend verifier.go must be changed to hederaTextHash() to match.
      // If you later switch to standard EIP-191, replace this call accordingly.
      const signature = await personalSignHash(message, evmAddress);

      const result = await upsertReview(facilityAddress, {
        user_evm_address: evmAddress.toLowerCase(),
        stars,
        review,
        signature,
        timestamp,
      });

      setSuccess('Review submitted.');
      setReview('');
      onSubmitted?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-md px-4 py-3.5 space-y-3">
      <div>
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
          Leave a review
        </div>
        <div className="text-[0.72rem] text-ink-muted mt-0.5">
          Reviews are signed with your connected wallet.
        </div>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            title={`${n} star${n === 1 ? '' : 's'}`}
            className={`text-xl leading-none px-0.5 cursor-pointer transition-colors ${
              n <= stars ? 'text-[#e0a400]' : 'text-ink-faint'
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-[0.72rem] font-mono text-ink-muted">
          {stars}/5
        </span>
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="What's your experience with this facility?"
        rows={3}
        className="w-full bg-surface-muted border border-border-strong rounded-[5px] px-3 py-2 text-sm text-ink outline-none focus:border-accent resize-y"
      />

      {error && (
        <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-[#1f6b36] bg-[#eefaf1] border border-[#b7e0c1] rounded-[5px] px-3 py-2">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-[0.68rem] font-mono text-ink-faint truncate">
          {isConnected ? `as ${accountId}` : 'wallet not connected'}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-[5px] px-3 py-1.5 text-sm font-semibold border ${
            canSubmit
              ? 'border-accent bg-accent text-white hover:bg-accent-hover cursor-pointer'
              : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
          }`}
        >
          {busy ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
};