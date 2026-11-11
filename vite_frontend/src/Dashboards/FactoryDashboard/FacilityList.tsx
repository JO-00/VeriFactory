import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { FacilityData } from '../../types';
import { PreviewModal, LandingPagePreviewModal, InspectorPopup, SuccessModal, FacilityDocsPopup } from './helpers';
import type { AuthenticationResult, FacilityEntryProps } from '../dashboard_types';
import { theme, FACILITY_META } from '../dashboard_constants';
import { getFacilityInspector, get_signed_contracts, getFacilityMeta, authenticateFacility, getFacilityURI, getFacilityDocs } from '../../Functionalities/getFacilityInfo';
import { handleAddFacility } from '../../Functionalities/ModifyFacility';


const FacilityEntry: React.FC<FacilityEntryProps> = ({
  facility,
  onPreview,
  onAuthenticate,
  onPreviewLandingPage,
}) => {
  const [showInspector, setShowInspector] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const docsWrapperRef = useRef<HTMLDivElement>(null);

  const signedCount = facility.contracts.filter((c) => c.signed).length;
  const meta = getFacilityMeta(facility.address);
  const landingURI = getFacilityURI(facility.address);
  const hasURI = !!landingURI;
  const facilityDocs = getFacilityDocs(facility.address);
  const allSigned = signedCount === facility.contracts.length;

  useEffect(() => {
    if (!showInspector) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowInspector(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInspector]);

  useEffect(() => {
    if (!showDocs) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (docsWrapperRef.current && !docsWrapperRef.current.contains(e.target as Node)) setShowDocs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDocs]);

  const handlePreviewLandingPage = () => {
    if (!landingURI) {
      console.warn(`No landing page URI for ${facility.address}`);
      return;
    }
    onPreviewLandingPage(facility.address, landingURI);
  };

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
            {showDocs && <FacilityDocsPopup docs={facilityDocs} onPreview={onPreview} />}
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
                hasURI ? 'text-accent cursor-pointer hover:underline' : 'text-ink-muted cursor-default'
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
          Contracts: <span className="text-ink font-medium">{signedCount}/{facility.contracts.length}</span> signed
        </span>
        {allSigned && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7ee] text-success before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">
            Complete
          </span>
        )}
        <div className="flex gap-1">
          {facility.contracts.map((contract) => (
            <button
              key={contract.ContractIPFS_CID}
              onClick={() => onPreview(contract.ContractIPFS_CID)}
              title={contract.signed ? 'Signed — click to preview' : 'Not signed — click to preview'}
              className="w-3.5 h-3.5 rounded-full border border-black/30 cursor-pointer p-0 transition-transform hover:scale-125"
              style={{ background: contract.signed ? theme.green : theme.red }}
            />
          ))}
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


// ============== FACILITY LIST ==============

type View =
  | { kind: 'list' }
  | { kind: 'success'; result: AuthenticationResult };

const FacilityList: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [previewCID, setPreviewCID] = useState<string | null>(null);
  const [previewLanding, setPreviewLanding] = useState<{ uri: string; facilityAddress: string } | null>(null);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [authLoading, setAuthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const addresses = Object.keys(FACILITY_META);
    const data: FacilityData[] = addresses.map((address) => ({
      address,
      contracts: get_signed_contracts(address),
      inspector: getFacilityInspector(address),
    }));
    setFacilities(data);
  }, []);

  const handleAuthenticate = async (facilityAddress: string) => {
    setAuthLoading(true);
    try {
      const result = await authenticateFacility(facilityAddress);
      setView({ kind: 'success', result });
    } finally {
      setAuthLoading(false);
    }
  };

  const filteredFacilities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => {
      const meta = getFacilityMeta(f.address);
      if (!meta) return false;
      return (
        meta.name.toLowerCase().includes(q) ||
        meta.sectorType.toLowerCase().includes(q)
      );
    });
  }, [facilities, searchQuery]);

  const totalFacilities = facilities.length;
  const totalContracts = facilities.reduce((sum, f) => sum + f.contracts.length, 0);
  const totalSigned = facilities.reduce(
    (sum, f) => sum + f.contracts.filter((c) => c.signed).length,
    0,
  );
  const fullySigned = facilities.filter(
    (f) => f.contracts.length > 0 && f.contracts.every((c) => c.signed),
  ).length;

  // ----- SUCCESS MODAL VIEW -----
  if (view.kind === 'success') {
    return (
      <div className="bg-bg min-h-full p-4 text-ink">
        <div style={{ filter: 'blur(1px)', opacity: 0.6 }}>
          {facilities.map((facility) => (
            <FacilityEntry
              key={facility.address}
              facility={facility}
              onPreview={(cid) => setPreviewCID(cid)}
              onAuthenticate={() => {}}
              onPreviewLandingPage={() => {}}
            />
          ))}
        </div>
        <SuccessModal result={view.result} onContinue={() => setView({ kind: 'list' })} />
      </div>
    );
  }

  // ----- LIST VIEW -----
  return (
    <div className="text-ink">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.01em]">Facilities</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Registered facilities and their contract authentication status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted pointer-events-none">
              🔎
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or category…"
              className="w-full pl-8 pr-8 py-1.5 bg-surface border border-border-strong rounded-[5px] text-base text-ink outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                title="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 border-none bg-transparent text-ink-muted cursor-pointer text-sm px-1"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleAddFacility}
            className="border border-accent bg-accent text-white rounded-[5px] px-3 py-[7px] cursor-pointer text-base font-medium hover:bg-accent-hover"
          >
            + Add Facility
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Facilities</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">{totalFacilities}</div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Fully Transparent Facilities</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">{fullySigned}</div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Contracts signed</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {totalSigned}<span className="text-ink-faint text-lg">/{totalContracts}</span>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Showing</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">{filteredFacilities.length}</div>
        </div>
      </div>

      {authLoading && (
        <div className="mb-2 text-sm text-ink-muted">Authenticating…</div>
      )}

      {filteredFacilities.length === 0 ? (
        <div className="bg-surface border border-border rounded-md px-4 py-8 text-center text-sm text-ink-muted">
          No facilities match “{searchQuery}”.
        </div>
      ) : (
        filteredFacilities.map((facility) => (
          <FacilityEntry
            key={facility.address}
            facility={facility}
            onPreview={(cid) => setPreviewCID(cid)}
            onAuthenticate={handleAuthenticate}
            onPreviewLandingPage={(facilityAddress, uri) =>
              setPreviewLanding({ facilityAddress, uri })
            }
          />
        ))
      )}

      {previewCID && <PreviewModal cid={previewCID} onClose={() => setPreviewCID(null)} />}
      {previewLanding && (
        <LandingPagePreviewModal
          uri={previewLanding.uri}
          facilityAddress={previewLanding.facilityAddress}
          onClose={() => setPreviewLanding(null)}
        />
      )}
    </div>
  );
};

export default FacilityList;