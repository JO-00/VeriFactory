// ============== InspectorOverview.tsx ==============

import React, { useEffect, useState } from 'react';
import { fetchIPFSBlobUrl } from './../Functionalities/IPFSHelpers';
import { FreezeVotes, shortAddr } from "./facillity_dashboard_mocks";
import { useWallet } from '../Common/WalletProvider';
import { 
  get_votes_status, 
  get_inspector_legal_contract, 
  get_inspector_facilities, 
  assign_inspectors_to_facilities,
  get_top_6_candidates,
  can_assign_inspectors
} from "./../Functionalities/committee_math";
import { authenticateFacility } from '../Functionalities/getFacilityInfo';
import type { DocumentInput, CandidateVotes, UserFacilityRole } from '../types';
import type { AuthenticationResult } from './dashboard_types';

// ------------------------------------------------------------
// Silhouette avatar
// ------------------------------------------------------------
const PersonSilhouette: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" fill={color} />
  </svg>
);

interface InspectorViewProps {
  onAuthenticated: (result: AuthenticationResult) => void;
}

const InspectorView: React.FC<InspectorViewProps> = ({ onAuthenticated }) => {
  const { signer } = useWallet();
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [assigning, setAssigning] = useState(false); 
  const [votesFrozen, setVotesFrozen] = useState(false);
  
  const [canAssign, setCanAssign] = useState(false);

  const [inspectors, setInspectors] = useState<CandidateVotes[]>([]);
  
  const EMPTY_DOCUMENT: DocumentInput = {
    cid: "",
    docType: "",
    title: "",
    uploadedAt: 0,
  };

  const [legalContract, setLegalContract] = useState<DocumentInput>(EMPTY_DOCUMENT);  
  const [inspectorFacilities, setInspectorFacilities] = useState<Record<string, string[]>>({});
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [frozen, top6, legal, assignable] = await Promise.all([
        get_votes_status(),
        get_top_6_candidates(), 
        get_inspector_legal_contract(),
        can_assign_inspectors()
      ]);

      setVotesFrozen(frozen);
      setLegalContract(legal);
      setCanAssign(assignable);

      const top5Inspectors = top6.slice(0, 5);
      setInspectors(top5Inspectors);

      const facilitiesMap: Record<string, string[]> = {};
      await Promise.all(
        top5Inspectors.map(async (c) => {
          try {
            const facilities = await get_inspector_facilities(c.wallet);
            facilitiesMap[c.wallet] = facilities;
          } catch (err) {
            console.warn(`Failed to load facilities for ${c.wallet}`, err);
            facilitiesMap[c.wallet] = [];
          }
        })
      );
      setInspectorFacilities(facilitiesMap);
      
    } catch (err) {
      console.error('[InspectorView] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFreeze = async () => {
    if (!signer) return;
    setFreezing(true);
    try {
      const success = await FreezeVotes(signer);
      if (success) await loadData();
    } finally {
      setFreezing(false);
    }
  };

  const handleAssign = async () => {
    if (!signer || !canAssign) return;
    setAssigning(true);
    try {
      const success = await assign_inspectors_to_facilities(signer);
      if (success) await loadData();
    } catch (err) {
      console.error('Failed to assign inspectors', err);
    } finally {
      setAssigning(false);
    }
  };

  const previewLegalContract = async () => {
    if (!legalContract?.cid) return;
    try {
      const blobUrl = await fetchIPFSBlobUrl(legalContract.cid);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to fetch legal contract', err);
    }
  };

  const handleAuthenticate = async (facilityAddress: string) => {
    setAuthError(null);

    // 1. If no wallet is connected, bypass the blockchain and return an Observer role instantly
    if (!signer) {
      onAuthenticated({
        facilityAddress: facilityAddress,
        role: 2 as UserFacilityRole, // 2 corresponds to Observer in your enum
        authenticated: true,
        wallet: `0xOBSERVER`,
        message: "Authenticated as Observer in read-only mode.",
      });
      setSelectedInspector(null);
      return;
    }

    // 2. If wallet is connected, do the normal check (which gracefully falls back to Observer)
    setAuthLoading(true);
    try {
      const user_account_id = await signer.getAccountId();
      const result = await authenticateFacility(facilityAddress, user_account_id);
      setSelectedInspector(null);
      onAuthenticated(result);
    } catch (err) {
      console.error('Authentication failed', err);
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-ink">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Inspector Overview</h1>
          <p className="text-sm text-ink-muted mt-0.5">Current inspectors and their assigned facilities.</p>
        </div>
        <div className="text-sm text-ink-muted">Loading inspector data…</div>
      </div>
    );
  }

  return (
    <div className="text-ink">
      {/* Read-Only Banner */}
      {!signer && (
        <div className="mb-4 bg-[#fff8e6] border border-[#f5d78e] text-[#7a5b00] px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f5d78e]" />
          You are in read-only mode. Connect a wallet to manage inspectors.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Inspector Overview</h1>
          <p className="text-sm text-ink-muted mt-0.5">Current inspectors and their assigned facilities.</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            title={!legalContract?.cid ? 'No legal contract has been set for inspectors yet.' : ''}
            className="inline-flex"
          >
            <button
              onClick={previewLegalContract}
              disabled={!legalContract?.cid}
              className={`rounded-[5px] px-3.5 py-2 text-sm font-semibold border ${
                legalContract?.cid
                  ? 'border-border-strong bg-surface text-ink hover:border-accent cursor-pointer'
                  : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
              }`}
            >
              View Legal Contract
            </button>
          </span>
          
          <button
            onClick={handleFreeze}
            disabled={votesFrozen || freezing || !signer}
            title={!signer ? 'Connect wallet to freeze' : ''}
            className={`rounded-[5px] px-3.5 py-2 text-sm font-semibold border ${
              !votesFrozen && !freezing && signer
                ? 'border-success bg-success text-white hover:brightness-110 cursor-pointer'
                : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
            }`}
          >
            {freezing ? 'Freezing…' : votesFrozen ? 'Votes Frozen' : 'Freeze Votes'}
          </button>

          <button
            onClick={handleAssign}
            disabled={assigning || !canAssign || !signer}
            title={
              !signer
                ? 'Connect wallet to assign inspectors.'
                : !votesFrozen 
                  ? 'You must freeze the votes before assigning inspectors.' 
                  : !canAssign 
                    ? 'Inspectors cannot be assigned right now (check contract conditions).' 
                    : ''
            }
            className={`rounded-[5px] px-3.5 py-2 text-sm font-semibold border ${
              !assigning && canAssign && signer
                ? 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
                : 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
            }`}
          >
            {assigning ? 'Assigning…' : 'Assign Inspectors'}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5 mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-sm text-ink-muted">Committee Status</div>
            <div className="text-lg font-semibold tracking-[-0.02em] mt-1">
              {votesFrozen ? 'Finalized (Frozen)' : 'Pending Voting'}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
            votesFrozen ? 'bg-[#e8f7ee] text-success' : 'bg-[#fff8e6] text-[#7a5b00]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {votesFrozen ? 'Frozen' : 'Active'}
          </span>
        </div>
        
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Total Inspectors</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {inspectors.length} <span className="text-ink-faint text-lg">/ 5</span>
          </div>
        </div>
      </div>

      {/* Inspectors Grid */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold mb-2">Current Inspectors</h2>
        <div className="bg-surface border border-border rounded-md px-4 py-4">
          <div className="flex flex-wrap gap-4">
            {inspectors.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedInspector(c.wallet)}
                className="flex flex-col items-center gap-1.5 group cursor-pointer hover:bg-surface-muted p-2 rounded-md transition-colors"
                title={`View facilities for ${c.wallet}`}
              >
                <div
                  className="w-14 h-14 rounded-full bg-surface-muted border-2 flex items-center justify-center overflow-hidden group-hover:border-accent transition-colors pointer-events-none"
                  style={{ borderColor: '#22c55e' }}
                >
                  <div className="w-8 h-8 pointer-events-none">
                    <PersonSilhouette color="#94a3b8" />
                  </div>
                </div>
                <div className="font-mono text-[0.7rem] text-ink-muted group-hover:text-ink pointer-events-none">
                  {c.wallet ? shortAddr(c.wallet, 6, 4) : '—'}
                </div>
              </button>
            ))}
            {inspectors.length === 0 && (
              <div className="text-sm text-ink-muted italic">No inspectors assigned yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* Inspector Details Modal */}
      {selectedInspector && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={() => setSelectedInspector(null)}>
          <div className="bg-surface border border-border rounded-md w-[80vw] max-w-2xl flex flex-col overflow-hidden text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
              <div className="text-sm font-semibold">Inspector Assignments</div>
              <button onClick={() => setSelectedInspector(null)} className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer">
                Close
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">Inspector Wallet</div>
                <div className="font-mono text-sm break-all bg-surface-muted border border-border rounded-[5px] px-3 py-2">
                  {selectedInspector}
                </div>
              </div>
              
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-2">Assigned Facilities ({inspectorFacilities[selectedInspector]?.length || 0})</div>
                {(!inspectorFacilities[selectedInspector] || inspectorFacilities[selectedInspector].length === 0) ? (
                  <div className="text-sm text-ink-muted italic">No facilities assigned to this inspector.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                    {inspectorFacilities[selectedInspector].map((facility, idx) => (
                      <button
                        key={`${facility}-${idx}`}
                        onClick={() => handleAuthenticate(facility)}
                        disabled={authLoading}
                        className={`w-full flex items-center justify-between gap-2 bg-surface-muted border border-border rounded-[5px] px-3 py-2 transition-colors text-left group hover:border-accent hover:bg-accent-soft cursor-pointer`}
                        title="Click to view this facility"
                      >
                        <span className="font-mono text-[0.75rem] text-ink break-all group-hover:text-accent" title={facility}>
                          {facility}
                        </span>
                        <span className="text-[0.65rem] text-ink-faint group-hover:text-accent whitespace-nowrap">
                          {authLoading ? 'Loading...' : 'View →'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && (
        <div className="fixed bottom-4 right-4 bg-[#fdecec] border border-[#f2a3a3] text-[#a12626] text-sm font-semibold rounded-md px-4 py-2 shadow-lg z-[2000]">
          {authError}
          <button onClick={() => setAuthError(null)} className="ml-3 font-bold text-[#7a1a1a]">×</button>
        </div>
      )}
    </div>
  );
};

export default InspectorView;