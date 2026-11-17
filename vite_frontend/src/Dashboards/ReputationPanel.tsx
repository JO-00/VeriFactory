// ============== ReputationPanel.tsx ==============

import React, { useCallback, useEffect, useState } from 'react';
import {
  getReputation,
  listReviews,
  type FacilityReputationResponse,
  type ReviewItem,
} from './../Functionalities/reputationApi';
import { shortAddr, formatTimestamp } from './facillity_dashboard_mocks';
import { SectionHeader, EmptyHint } from './FacilityDashboard/DashboardUtils';
import { SubmitReviewPanel } from './SubmitReviewPanel';

export interface ReputationPanelProps {
  facilityAddress: string;
  canReview?: boolean;
  refreshKey?: number;
}

const Stars: React.FC<{ value: number }> = ({ value }) => {
  const filled = Math.round(value);
  return (
    <span className="text-[#e0a400] text-sm leading-none tracking-[0.05em]">
      {'★'.repeat(Math.max(0, filled))}
      <span className="text-ink-faint">{'★'.repeat(Math.max(0, 5 - filled))}</span>
    </span>
  );
};

export const ReputationPanel: React.FC<ReputationPanelProps> = ({
  facilityAddress,
  canReview = false,
  refreshKey = 0,
}) => {
  const [rep, setRep] = useState<FacilityReputationResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, page] = await Promise.all([
        getReputation(facilityAddress).catch(() => null),
        listReviews(facilityAddress, 0, 20).catch(() => null),
      ]);
      setRep(r);
      setReviews(page?.reviews ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reputation.');
    } finally {
      setLoading(false);
    }
  }, [facilityAddress]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <section className="space-y-3">
      <SectionHeader
        icon="⭐"
        title="Reputation"
        count={reviews.length > 0 ? reviews.length : undefined}
      />

      {loading && <div className="text-sm text-ink-muted">Loading reputation…</div>}
      {error && (
        <div className="text-sm text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface border border-border rounded-md px-4 py-3">
              <div className="text-[0.72rem] text-ink-muted">Average</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-semibold tracking-[-0.02em]">
                  {rep ? rep.average_stars.toFixed(2) : '—'}
                </span>
                {rep && <Stars value={rep.average_stars} />}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-md px-4 py-3">
              <div className="text-[0.72rem] text-ink-muted">Reviews</div>
              <div className="text-2xl font-semibold tracking-[-0.02em] mt-1">
                {rep ? rep.total_reviews : reviews.length}
              </div>
            </div>
          </div>

          {canReview && (
            <SubmitReviewPanel
              facilityAddress={facilityAddress}
              onSubmitted={() => load()}
            />
          )}

          {reviews.length === 0 ? (
            <EmptyHint>No reviews yet.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-surface-muted border border-border rounded-[5px] px-3 py-2.5 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Stars value={r.stars} />
                      <span className="text-[0.72rem] font-mono text-ink-muted">
                        {shortAddr(r.user_evm_address, 8, 6)}
                      </span>
                    </div>
                    <span className="text-[0.68rem] font-mono text-ink-faint">
                      {formatTimestamp(Number(r.timestamp))}
                    </span>
                  </div>
                  {r.review && (
                    <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                      {r.review}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};