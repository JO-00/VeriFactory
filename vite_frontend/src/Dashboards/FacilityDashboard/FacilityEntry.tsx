// FacilityEntry.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FacilityDocsPopup } from './../FactoryDashboard/helpers';
import type { FacilityEntryProps } from '../dashboard_types';
import { theme } from '../dashboard_constants';
import { formatTimestamp } from './../facillity_dashboard_mocks';
import type { FacilityAddedEvent } from '../../types';
type FacilityEntryViewProps = FacilityEntryProps & {
  meta: { name: string; sectorType: string; location: string } | null;
  landingURI: string | null;
  docs: string[];
  creation_event: FacilityAddedEvent;
};

// ------------------------------------------------------------
// Mini Modal for Creation Event Details
// ------------------------------------------------------------
const CreationEventModal: React.FC<{
  event: FacilityAddedEvent;
  onClose: () => void;
}> = ({ event, onClose }) => {
  const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${event.transactionHash}`;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-md w-[80vw] max-w-lg flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
          <div className="text-sm font-semibold">Facility Creation Event</div>
          <button
            onClick={onClose}
            className="rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1.5 text-[0.75rem]">
            <div className="text-ink-muted">Added By</div>
            <div className="font-mono break-all">{event.addedBy}</div>

            <div className="text-ink-muted">Transaction</div>
            <div className="font-mono break-all">{event.transactionHash}</div>

            <div className="text-ink-muted">Timestamp</div>
            <div>{formatTimestamp(Number(event.timestamp))}</div>

            <div className="text-ink-muted">Block Number</div>
            <div className="font-mono">{event.blockNumber}</div>
            <div className="text-ink-muted">Is Active</div>
            <div>{event.isActive ? 'Yes' : 'No'}</div>
        </div>

  <div className="pt-3 border-t border-border mt-2">
    <a
      href={`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${event.transactionHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex justify-center items-center gap-2 rounded-[5px] border border-accent bg-accent text-white px-4 py-2 text-xs font-semibold hover:brightness-110 transition-colors"
    >
      <span>View Raw JSON on Mirror Node</span>
      <span>↗</span>
    </a>
  </div>
</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Facility Entry Component
// ------------------------------------------------------------
const FacilityEntry: React.FC<FacilityEntryViewProps> = ({
  facility,
  creation_event,
  onPreview,
  onAuthenticate,
  totalContracts,
  meta,
  landingURI,
  docs,
}) => {
  const [showInspector, setShowInspector] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [favourite, setFavourite] = useState(false);

  const inspectorRef = useRef<HTMLDivElement>(null);
  const docsWrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside: magnifying glass popup
  useEffect(() => {
    if (!showInspector) return;
    const handle = (e: MouseEvent) => {
      if (inspectorRef.current && !inspectorRef.current.contains(e.target as Node))
        setShowInspector(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showInspector]);

  // Click-outside: docs
  useEffect(() => {
    if (!showDocs) return;
    const handle = (e: MouseEvent) => {
      if (docsWrapperRef.current && !docsWrapperRef.current.contains(e.target as Node))
        setShowDocs(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDocs]);

    // Filter out only the ones that are signed and map them to their CIDs
  const signedContracts = facility.contracts.filter((c) => c.signed);
  const signedSet = useMemo(
    () => new Set(signedContracts.map((c) => c.ContractIPFS_CID)),
    [signedContracts]
  );
  const signedCount = signedContracts.length;
  const totalCount = totalContracts.length;
  const hasURI = !!landingURI;
  const allSigned = totalCount > 0 && signedCount === totalCount;

  // Shared styles for the dark blue underlined links
  const linkClasses = hasURI
    ? 'text-blue-900 underline hover:text-blue-700 transition-colors cursor-pointer'
    : 'text-ink cursor-default';

  return (
    <div className="bg-surface border border-border rounded-md p-4 mb-3 text-ink relative">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3 mb-2.5 pb-2.5 border-b border-border">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {/* Docs button */}
          <div ref={docsWrapperRef} className="relative shrink-0">
            <button
              onClick={() => setShowDocs((v) => !v)}
              title="View facility documents"
              className={`border rounded-[5px] cursor-pointer text-[0.9rem] px-1.5 py-0.5 leading-none ${
                showDocs
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border-strong bg-surface-muted text-ink hover:border-accent'
              }`}
            >
              📄
            </button>
            {showDocs && <FacilityDocsPopup docs={docs} onPreview={onPreview} />}
          </div>

          <div className="min-w-0 flex-1">
            {/* Name (conditional link) */}
            {hasURI ? (
              <a
                href={landingURI!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.95rem] font-semibold block text-blue-900 underline hover:text-blue-700 transition-colors cursor-pointer"
              >
                {meta?.name ?? 'Unknown Facility'}
              </a>
            ) : (
              <div className="text-[0.95rem] font-semibold text-ink cursor-default">
                {meta?.name ?? 'Unknown Facility'}
              </div>
            )}

            {/* Sector · Location (conditional link) */}
            {hasURI ? (
              <a
                href={landingURI!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.78rem] mt-0.5 block text-blue-900 underline hover:text-blue-700 transition-colors cursor-pointer"
              >
                {meta?.sectorType ?? '—'} · {meta?.location ?? '—'}
              </a>
            ) : (
              <div className="text-[0.78rem] mt-0.5 text-ink-muted cursor-default">
                {meta?.sectorType ?? '—'} · {meta?.location ?? '—'}
              </div>
            )}

            {/* Address (conditional link) */}
            {hasURI ? (
              <a
                href={landingURI!}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.72rem] break-all mt-1 block text-blue-900 underline hover:text-blue-700 transition-colors cursor-pointer"
              >
                {facility.address}
              </a>
            ) : (
              <div className="font-mono text-[0.72rem] break-all mt-1 text-ink-muted cursor-default">
                {facility.address}
              </div>
            )}
          </div>
        </div>

        <div ref={inspectorRef} className="relative shrink-0 mr-6">
          <button
            onClick={() => setShowInspector((v) => !v)}
            title="Preview Landing Page URL"
            className={`border rounded-[5px] cursor-pointer text-[1.05rem] px-2 py-0.5 ${
              showInspector
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border-strong bg-surface-muted text-ink hover:border-accent'
            }`}
          >
            🔍
          </button>
          
          {/* Magnifying Glass Popup — Only Landing Page */}
          {showInspector && (
            <div className="absolute top-full right-0 mt-2 bg-surface-alt border border-border-strong rounded-md shadow-xl p-3 min-w-[240px] z-50 text-ink">
              <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">
                Landing Page
              </div>
              {hasURI ? (
                <a
                  href={landingURI!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-600 underline hover:text-orange-700 break-all text-left block transition-colors"
                >
                  {landingURI}
                </a>
              ) : (
                <div className="text-xs text-ink-muted italic">No public URI</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contracts summary */}
      <div className="flex items-center gap-2">
        <span className="text-[0.8rem] text-ink-muted">
          Contracts:{' '}
          <span className="text-ink font-medium">
            {signedCount}/{totalCount}
          </span>{' '}
          signed
        </span>

        {allSigned && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7ee] text-success before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">
            Complete
          </span>
        )}

        <div className="flex gap-1 ml-2">
          {totalContracts.map((cid) => {
            const isSigned = signedSet.has(cid);
            return (
              <button
                key={cid}
                onClick={() => onPreview(cid)}
                title={isSigned ? 'Signed — click to preview' : 'Not signed — click to preview'}
                className="w-3.5 h-3.5 rounded-full border border-black/30 cursor-pointer p-0 transition-transform hover:scale-125"
                style={{ background: isSigned ? theme.green : theme.red }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-border">
        <button
          onClick={() => setShowEventModal(true)}
          className="inline-flex items-center gap-1.5 rounded-[5px] border border-border-strong bg-surface-muted px-2.5 py-1 text-[0.7rem] font-semibold text-ink-muted hover:border-accent hover:text-ink transition-colors cursor-pointer"
          title="View raw creation event data"
        >
          <span>📅</span> Creation Event
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFavourite((v) => !v)}
            title={favourite ? 'Remove from favourites' : 'Add to favourites'}
            className="border-none bg-transparent cursor-pointer text-[1.2rem] px-1.5 py-0.5 transition-transform hover:scale-110"
            style={{ color: favourite ? theme.star : theme.starDim }}
          >
            {favourite ? '★' : '☆'}
          </button>

          <button
            onClick={() => onAuthenticate(facility.address)}
            className="border border-accent bg-accent text-white rounded-[5px] px-3.5 py-1.5 cursor-pointer text-[0.8rem] font-semibold hover:bg-accent-hover"
          >
            Authenticate
          </button>
        </div>
      </div>

      {/* Creation Event Modal */}
      {showEventModal && (
        <CreationEventModal
          event={creation_event}
          onClose={() => setShowEventModal(false)}
        />
      )}
    </div>
  );
};

export default FacilityEntry;