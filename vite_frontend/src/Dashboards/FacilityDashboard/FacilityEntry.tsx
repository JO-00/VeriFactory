// FacilityEntry.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InspectorPopup, FacilityDocsPopup } from './../FactoryDashboard/helpers';
import type { FacilityEntryProps } from '../dashboard_types';
import { theme } from '../dashboard_constants';

type FacilityEntryViewProps = FacilityEntryProps & {
  meta: { name: string; sectorType: string; location: string } | null;
  landingURI: string | null;
  docs: string[];
};

const FacilityEntry: React.FC<FacilityEntryViewProps> = ({
  facility,
  onPreview,
  onAuthenticate,
  onPreviewLandingPage,
  totalContracts,
  meta,
  landingURI,
  docs,
}) => {
  const [showInspector, setShowInspector] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [favourite, setFavourite] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const docsWrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside: inspector
  useEffect(() => {
    if (!showInspector) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
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

  const handlePreviewLandingPage = () => {
    if (!landingURI) return;
    onPreviewLandingPage(facility.address, landingURI);
  };

  // facility.contracts is already the signed CID list
  const signedContracts = facility.contracts;
  const signedSet = useMemo(() => new Set(signedContracts), [signedContracts]);
  const signedCount = signedContracts.length;
  const totalCount = totalContracts.length;
  const hasURI = !!landingURI;
  const allSigned = totalCount > 0 && signedCount === totalCount;

  return (
    <div className="bg-surface border border-border rounded-md p-4 mb-3 text-ink relative">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3 mb-2.5 pb-2.5 border-b border-border">
        <div className="flex items-start gap-2 min-w-0 flex-1">
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
            <div
              onClick={hasURI ? handlePreviewLandingPage : undefined}
              role={hasURI ? 'button' : undefined}
              className={`text-[0.95rem] font-semibold ${
                hasURI
                  ? 'text-link underline cursor-pointer hover:text-link-hover'
                  : 'text-ink cursor-default'
              }`}
            >
              {meta?.name ?? 'Unknown Facility'}
            </div>

            <div
              onClick={hasURI ? handlePreviewLandingPage : undefined}
              role={hasURI ? 'button' : undefined}
              className={`text-[0.78rem] mt-0.5 ${
                hasURI
                  ? 'text-accent cursor-pointer hover:underline'
                  : 'text-ink-muted cursor-default'
              }`}
            >
              {meta?.sectorType ?? '—'} · {meta?.location ?? '—'}
            </div>

            <div className="font-mono text-[0.72rem] text-ink-muted break-all mt-1">
              {facility.address}
            </div>
          </div>
        </div>

        <div ref={wrapperRef} className="relative shrink-0 mr-6">
          <button
            onClick={() => setShowInspector((v) => !v)}
            title="Inspect facility"
            className={`border rounded-[5px] cursor-pointer text-[1.05rem] px-2 py-0.5 ${
              showInspector
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border-strong bg-surface-muted text-ink hover:border-accent'
            }`}
          >
            🔍
          </button>
          {showInspector && facility.inspector && (
            <InspectorPopup inspector={facility.inspector} onPreview={onPreview} />
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

        <div className="flex gap-1">
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

      {/* Bottom-right actions */}
      <div className="flex justify-end items-center gap-2 mt-3 pt-2.5 border-t border-border">
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
  );
};

export default FacilityEntry;