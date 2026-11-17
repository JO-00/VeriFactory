// FacilityList.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PreviewModal,
  LandingPagePreviewModal,
  SuccessModal,
} from './helpers';
import type { AuthenticationResult } from '../dashboard_types';
import {
  getFacilitySignedContracts,
  getFacilityInspector,
  getFacilityMeta,
  getFacilityURI,
  getFacilityDocs,
  getAllContracts,
  FetchAllFacilities,
  FetchAllFacilityCreationEvents,
  authenticateFacility,
} from '../../Functionalities/getFacilityInfo';
import { useWallet } from '../../Common/WalletProvider';
import {
  FacilityDashboard,
  FACILITY_DASHBOARD_STORAGE_KEY,
} from '../FacilityDashboard/FacilityDashboard';
import FacilityCreationForm from './FacilityCreationForm';
import FacilityEntry from './../FacilityDashboard/FacilityEntry';
import { UserFacilityRole } from '../../types';
import type { FacilityAddedEvent } from '../../types';

// ── View state ──
type View =
  | { kind: 'list' }
  | {
      kind: 'dashboard';
      facilityAddress: string;
      role: UserFacilityRole;
      result: AuthenticationResult;
      showModal: boolean;
    };

// Shape held per facility after hydration
interface HydratedFacility {
  address: string;
  contracts: { ContractIPFS_CID: string; signed: boolean }[];
  inspector: unknown | null;
  meta: { name: string; sectorType: string; location: string } | null;
  landingURI: string | null;
  docs: string[];
  creation_event: FacilityAddedEvent | null;
}

// ── Safe localStorage helpers ──
const readStoredFacility = (): string | null => {
  try {
    return localStorage.getItem(FACILITY_DASHBOARD_STORAGE_KEY);
  } catch {
    return null;
  }
};

const clearStoredFacility = () => {
  try {
    localStorage.removeItem(FACILITY_DASHBOARD_STORAGE_KEY);
  } catch {
    // ignore (private mode / quota)
  }
};

const FacilityList: React.FC = () => {
  const { signer, isConnected } = useWallet();

  const [hydrated, setHydrated] = useState<HydratedFacility[]>([]);
  const [totalExpected, setTotalExpected] = useState<number | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [totalContracts, setTotalContracts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [previewCID, setPreviewCID] = useState<string | null>(null);
  const [previewLanding, setPreviewLanding] = useState<{
    uri: string;
    facilityAddress: string;
  } | null>(null);

  // ── Restore-from-storage bootstrap ──
  const [storedAddress] = useState<string | null>(readStoredFacility);
  const [bootstrapping, setBootstrapping] = useState<boolean>(
    () => storedAddress !== null
  );
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [view, setView] = useState<View>({ kind: 'list' });
  const [authLoading, setAuthLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadSeqRef = useRef(0);

  // ── Reusable progressive load ──
  const reloadFacilities = useCallback(async (background = false) => {
    const seq = ++loadSeqRef.current;

    if (!background) {
      setLoading(true);
      setHydrated([]);
      setTotalExpected(null);
    }
    setLoadError(null);

    try {
      const [contracts, allMeta, allEvents] = await Promise.all([
        getAllContracts().catch((err) => {
          console.warn('[FacilityList] getAllContracts failed:', err);
          return [] as string[];
        }),
        FetchAllFacilities(),
        FetchAllFacilityCreationEvents().catch((err) => {
          console.warn('[FacilityList] FetchAllFacilityCreationEvents failed:', err);
          return [] as FacilityAddedEvent[];
        }),
      ]);

      if (seq !== loadSeqRef.current) return;

      setTotalContracts(contracts);
      const addresses = Object.keys(allMeta || {});
      setTotalExpected(addresses.length);

      if (addresses.length === 0) {
        setLoading(false);
        return;
      }

      const eventsByAddress = (allEvents || []).reduce<Record<string, FacilityAddedEvent>>(
        (acc, event) => {
          if (event?.facilityAddress) {
            acc[event.facilityAddress.toLowerCase()] = event;
          }
          return acc;
        },
        {}
      );

      const nextList: HydratedFacility[] = [];

      for (const address of addresses) {
        if (seq !== loadSeqRef.current) return;
        setActiveAddress(address);

        try {
          const [signed, inspector, meta, landingURI, docs] = await Promise.all([
            getFacilitySignedContracts(address).catch(() => []),
            getFacilityInspector(address),
            getFacilityMeta(address).catch(() => allMeta[address] ?? null),
            getFacilityURI(address).catch(() => null),
            getFacilityDocs(address).catch(() => []),
          ]);
          if (seq !== loadSeqRef.current) return;

          const signedCids = new Set(signed.map((sc) => sc.DocumentCID));
          const mappedContracts = contracts.map((cid) => ({
            ContractIPFS_CID: cid,
            signed: signedCids.has(cid),
          }));

          const item: HydratedFacility = {
            address,
            contracts: mappedContracts,
            inspector,
            meta: meta as any,
            landingURI,
            docs: docs as string[],
            creation_event: eventsByAddress[address.toLowerCase()] ?? null,
          };

          nextList.push(item);

          if (!background) {
            setHydrated((prev) => [...prev, item]);
          }
        } catch (err) {
          console.error(`Failed to load facility ${address}:`, err);
        }
      }

      if (seq !== loadSeqRef.current) return;
      if (background) {
        setHydrated(nextList);
      }
      setActiveAddress(null);
    } catch (err: any) {
      console.error('CRITICAL ERROR in reloadFacilities:', err);
      if (seq === loadSeqRef.current) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load facilities.'
        );
      }
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
        setActiveAddress(null);
      }
    }
  }, []);

  // ── Load on mount ──
  useEffect(() => {
    reloadFacilities();
    return () => {
      loadSeqRef.current++;
    };
  }, [reloadFacilities]);

  // ── Bootstrap: silently re-authenticate against the stored facility ──
  useEffect(() => {
    if (!storedAddress) {
      setBootstrapping(false);
      return;
    }

    // No wallet connected: still open the stored facility as an observer.
    if (!isConnected || !signer) {
      setView({
        kind: 'dashboard',
        facilityAddress: storedAddress,
        role: UserFacilityRole.Observer,
        result: {
          facilityAddress: storedAddress,
          authenticated: false,
          role: UserFacilityRole.Observer,
          message: 'Wallet not connected — viewing as observer.',
        },
        showModal: false,
      });
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const user_address = await signer.getAccountId();
        const result = await authenticateFacility(storedAddress, user_address);
        if (cancelled) return;

        if (result.authenticated) {
          setView({
            kind: 'dashboard',
            facilityAddress: result.facilityAddress,
            role: result.role,
            result,
            showModal: false,
          });
        } else {
          // Authenticated call ran but user has no role → still show as observer.
          setView({
            kind: 'dashboard',
            facilityAddress: storedAddress,
            role: UserFacilityRole.Observer,
            result: {
              facilityAddress: storedAddress,
              authenticated: false,
              role: UserFacilityRole.Observer,
              message: result.message ?? 'Viewing as observer.',
            },
            showModal: false,
          });
          setBootstrapError(result.message ?? 'Viewing as observer.');
        }
      } catch (err) {
        if (cancelled) return;
        // Auth threw (network / RPC / wallet prompt) → don't hang, show observer.
        const message =
          err instanceof Error ? err.message : 'Could not restore dashboard.';
        setView({
          kind: 'dashboard',
          facilityAddress: storedAddress,
          role: UserFacilityRole.Observer,
          result: {
            facilityAddress: storedAddress,
            authenticated: false,
            role: UserFacilityRole.Observer,
            message,
          },
          showModal: false,
        });
        setBootstrapError(message);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storedAddress, isConnected, signer]);

  // ── Authenticate → dispatch to dashboard by role ──
  const handleAuthenticate = useCallback(
  async (facilityAddress: string) => {
    setSubmitError(null);

      // No wallet: enter the facility as an observer instead of blocking.
      if (!isConnected || !signer) {
        setView({
          kind: 'dashboard',
          facilityAddress,
          role: UserFacilityRole.Observer,
          result: {
            facilityAddress,
            authenticated: false,
            role: UserFacilityRole.Observer,
            message: 'Wallet not connected — viewing as observer.',
          },
          showModal: false,
        });
        return;
      }

      setAuthLoading(true);
      try {
        const user_address = await signer.getAccountId();
        const result = await authenticateFacility(facilityAddress, user_address);

        if (result.authenticated) {
          setView({
            kind: 'dashboard',
            facilityAddress: result.facilityAddress,
            role: result.role,
            result,
            showModal: true,
          });
        } else {
          // Auth ran but user has no role → still let them view as observer.
          setView({
            kind: 'dashboard',
            facilityAddress,
            role: UserFacilityRole.Observer,
            result: {
              facilityAddress,
              authenticated: false,
              role: UserFacilityRole.Observer,
              message: result.message ?? 'Viewing as observer.',
            },
            showModal: false,
          });
          setSubmitError(result.message ?? 'Viewing as observer.');
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Authentication failed.'
        );
      } finally {
        setAuthLoading(false);
      }
    },
    [isConnected, signer]
  );

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hydrated;
    return hydrated.filter((h) => {
      const m = h.meta;
      if (!m) return false;
      return (
        m.name.toLowerCase().includes(q) ||
        m.sectorType.toLowerCase().includes(q)
      );
    });
  }, [hydrated, searchQuery]);

  const totalFacilities = hydrated.length;
  const fullySigned = hydrated.filter(
    (h) => h.contracts.length > 0 && h.contracts.every((c) => c.signed)
  ).length;

  const goBackToList = useCallback(() => {
    clearStoredFacility();
    setView({ kind: 'list' });
    setBootstrapError(null);
  }, []);

  // ── After successful create: close form, reload, retry if needed ──
  const handleFacilityCreated = useCallback(async () => {
    setShowForm(false);

    await reloadFacilities(false);

    setTimeout(() => {
      reloadFacilities(true);
    }, 3000);
  }, [reloadFacilities]);

  // ── Render branches ──

  if (bootstrapping) {
    return (
      <div className="text-ink">
        <div className="text-sm text-ink-muted">Restoring dashboard…</div>
        {bootstrapError && (
          <div className="mt-2 text-sm text-red-600">{bootstrapError}</div>
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="text-ink">
        <div className="mb-3">
          <button
            onClick={() => setShowForm(false)}
            className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            ← Back to facilities
          </button>
        </div>
        <FacilityCreationForm onCreated={handleFacilityCreated} />
      </div>
    );
  }

  if (view.kind === 'dashboard') {
    return (
      <div className="text-ink relative">
        <div className="mb-3">
          <button
            onClick={goBackToList}
            className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            ← Back to facilities
          </button>
        </div>

        <FacilityDashboard
          facilityAddress={view.facilityAddress}
          role={view.role}
          onClose={goBackToList}
        />

        {view.showModal && (
          <SuccessModal
            result={view.result}
            onContinue={() => setView({ ...view, showModal: false })}
          />
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="text-ink">
      {bootstrapError && (
        <div className="mb-3 bg-[#fff8e6] border border-[#f0d58a] rounded-md px-4 py-2 text-sm text-[#7a5b00]">
          {bootstrapError}
        </div>
      )}

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
            onClick={() => setShowForm(true)}
            className="border border-accent bg-accent text-white rounded-[5px] px-3 py-[7px] cursor-pointer text-base font-medium hover:bg-accent-hover"
          >
            + Add Facility
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Facilities</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {totalFacilities}
            {totalExpected !== null && loading && (
              <span className="text-ink-faint text-lg">/{totalExpected}</span>
            )}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Fully Transparent Facilities</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {fullySigned}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">All Contracts</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {totalContracts.length}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md px-4 py-3.5">
          <div className="text-sm text-ink-muted">Showing</div>
          <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">
            {filtered.length}
          </div>
        </div>
      </div>

      {loading && (
        <div className="mb-2 text-xs font-mono text-ink-muted">
          {totalExpected === null
            ? 'Loading facilities…'
            : `Loaded ${hydrated.length} / ${totalExpected}${
                activeAddress ? ` (fetching ${activeAddress.slice(0, 10)}…)` : ''
              }`}
        </div>
      )}
      {loadError && <div className="mb-2 text-sm text-red-600">{loadError}</div>}
      {authLoading && (
        <div className="mb-2 text-sm text-ink-muted">Authenticating…</div>
      )}
      {submitError && <div className="mb-2 text-sm text-red-600">{submitError}</div>}

      {!loading && !loadError && filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-md px-4 py-8 text-center text-sm text-ink-muted">
          {searchQuery
            ? `No facilities match “${searchQuery}”.`
            : 'No facilities yet.'}
        </div>
      ) : (
        <>
          {filtered.map((h) => (
            <FacilityEntry
              key={h.address}
              facility={h}
              creation_event={h.creation_event}
              meta={h.meta}
              landingURI={h.landingURI}
              docs={h.docs}
              totalContracts={totalContracts}
              onPreview={(cid) => setPreviewCID(cid)}
              onAuthenticate={handleAuthenticate}
              onPreviewLandingPage={(facilityAddress, uri) =>
                setPreviewLanding({ facilityAddress, uri })
              }
            />
          ))}

          {loading && activeAddress && (
            <div className="bg-surface border border-border rounded-md px-4 py-4 mb-3 animate-pulse">
              <div className="h-4 bg-surface-muted rounded w-1/4 mb-2" />
              <div className="font-mono text-xs text-ink-faint">
                {activeAddress}
              </div>
            </div>
          )}
        </>
      )}

      {previewCID && (
        <PreviewModal cid={previewCID} onClose={() => setPreviewCID(null)} />
      )}
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