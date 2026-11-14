// ============== DAOMembersCard.tsx ==============

import React, { useEffect, useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import { UserFacilityRole, type StakedMember } from './../types';
import { shortAddr, removeDaoMember} from './../Dashboards/facillity_dashboard_mocks';
import {
  
} from './../Dashboards/facillity_dashboard_mocks';

const ROLE_LABEL: Record<UserFacilityRole, string> = {
  [UserFacilityRole.Admin]: 'Admin',
  [UserFacilityRole.Relayer]: 'Relayer',
  [UserFacilityRole.Observer]: 'Observer',
};

const ROLE_PILL: Record<UserFacilityRole, string> = {
  [UserFacilityRole.Admin]: 'bg-[#efe9ff] text-[#6d28d9]',
  [UserFacilityRole.Relayer]: 'bg-accent-soft text-accent',
  [UserFacilityRole.Observer]: 'bg-surface-muted text-ink-muted',
};

// ────────────────────────────────────────────────────────────
// Clickable card + members modal (visible to every role)
// ────────────────────────────────────────────────────────────

export const DAOMembersCard: React.FC<{
  facilityAddress: string;
  members: StakedMember[];
  loading: boolean;
  onOpenModal: () => void;
}> = ({ members, loading, onOpenModal }) => (
  <button
    onClick={onOpenModal}
    disabled={loading}
    title="View DAO members"
    className="bg-surface border border-border rounded-md px-4 py-3.5 text-left hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer w-full"
  >
    <div className="text-sm text-ink-muted">DAO members</div>
    <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5 flex items-center gap-2">
      {loading ? '…' : members.length}
      <span className="text-ink-faint text-sm font-normal">/3</span>
    </div>
  </button>
);

// ────────────────────────────────────────────────────────────
// Modal — short list on left, full address + role on right
// ────────────────────────────────────────────────────────────

export const DAOMembersModal: React.FC<{
  open: boolean;
  members: StakedMember[];
  roles: Record<string, UserFacilityRole>;
  onClose: () => void;
}> = ({ open, members, onClose }) => {
    console.log(members)
  const [selected, setSelected] = useState<StakedMember | null>(
    members[0] ?? null
  );

  useEffect(() => {
    if (open) setSelected(members[0] ?? null);
  }, [open, members]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-md w-[70vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div className="text-sm font-semibold">DAO members ({members.length}/3)</div>
          <button
            onClick={onClose}
            className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 grid grid-cols-[12rem_1fr] overflow-hidden">
          {/* Left: short list */}
          <div className="border-r border-border overflow-auto">
            {members.length === 0 ? (
              <div className="px-4 py-6 text-sm text-ink-muted italic text-center">
                No staked members.
              </div>
            ) : (
              members.map((m) => {
                const active = selected === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelected(m)}
                    className={`w-full text-left font-mono text-[0.75rem] px-3 py-2 border-b border-border transition-colors cursor-pointer ${
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'hover:bg-surface-muted'
                    }`}
                  >
                    {shortAddr(m)}
                  </button>
                );
              })
            )}
          </div>

          {/* Right: full detail */}
          <div className="overflow-auto p-4">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">
                    Address
                  </div>
                  <div className="font-mono text-sm break-all bg-surface-muted border border-border rounded-[5px] px-3 py-2">
                    {selected.wallet}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-ink-muted italic">
                Select a member to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Admin controls — stake / remove, 3-cap, empty banner
// ────────────────────────────────────────────────────────────

export const DAOMembersAdminBlock: React.FC<{
  facilityAddress: string;
  signer: Signer | null;
  members: StakedMember[];
  onChanged: () => void;
}> = ({ facilityAddress, signer, members, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const atCap = members.length >= 3;
  const isEmpty = members.length === 0;

  

  const handleRemove = async (member: string) => {
    setError(null);
    setSuccess(null);
    if (!signer) return setError('Connect your wallet first.');
    setBusy(true);
    try {
      await removeDaoMember(signer , facilityAddress, member);
      setSuccess(`Removed ${shortAddr(member)}`);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Remove failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 bg-surface border border-border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Stake DAO members</h2>
        <span className="text-[0.7rem] text-ink-muted">{members.length}/3 seats</span>
      </div>

      {isEmpty && (
        <div className="text-xs text-[#7a5b00] bg-[#fff8e6] border border-[#f0d58a] rounded-[5px] px-3 py-2 mb-3">
          You have no staked members. In order to be able to vote on inspectors from the
          list of candidates, you need to stake DAO members.
        </div>
      )}

      {atCap && (
        <div className="text-xs text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3">
          You've reached the 3-seat cap. Remove a member to stake a new one.
        </div>
      )}


      {/* Current members with remove */}
      {members.length > 0 && (
        <div className="space-y-1.5">
         {members.map((m) => (
            <div
                key={m.wallet}
                className="flex items-center justify-between gap-2 bg-surface-muted border border-border rounded-[5px] px-3 py-2"
            >
                <span className="font-mono text-[0.72rem] break-all">
                {shortAddr(m.wallet)}
                </span>
                <button
                onClick={() => handleRemove(m.wallet)}
                disabled={busy}
                className="shrink-0 rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] px-2 py-0.5 text-[11px] font-semibold hover:brightness-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Remove
                </button>
            </div>
            ))}
        </div>
      )}

      {(error || success) && (
        <div className="mt-3 text-xs">
          {error && <span className="text-[#a12626] font-medium">{error}</span>}
          {success && <span className="text-success font-medium">{success}</span>}
        </div>
      )}
    </section>
  );
};