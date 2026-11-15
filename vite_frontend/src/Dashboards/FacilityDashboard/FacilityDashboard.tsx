// ============== FacilityDashboard.tsx ==============

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAllGateways,
  getAllRelayers,
  getGatewayStatus,
  getFacilityAddedEvent,
  getPublicURI,
  isInEmergency,
  getGatewaysForRelayer,
  getFacilityDaoMembers,
  getFacilitySignedContracts,
} from './../facillity_dashboard_mocks';
import type { CadencePolicy, FacilityAddedEvent, SignedContract, StakedMember } from './../../types';
import { SignContractModal } from './../../Components/SignContractsModal';
import { FactoryWriteContract } from '../../HashGraphUtils/Contracts/Factory/FactoryWrite';
import { UserFacilityRole } from './../../types';
import type { ModalPage } from './../dashboard_types';
import { useWallet } from './../../Common/WalletProvider';
import { EntityModal } from './RelayerGateways';
import { resolveEvmAddress, getAllContracts } from '../../Functionalities/getFacilityInfo';
import { SignContractsPanel } from './SignContractsPanel';
import { DeleteFacilityDangerZone } from './../../Components/DeleteFacilityDangerZone';
import {
  FacilityHeader,
  StatusStrip,
  FacilityInfoSection,
  RelayerToolsSection,
  AdminToolsSection,
  GatewaysGrid,
  RelayersGrid,
  URIPreviewModal,
} from './FacilityDashboardSection';
import { FacilityGlanceBar } from './FacilityGlanceBar';
import { useFacilityToolHandlers } from './useFacilityToolHandlers';
import {
  DAOMembersCard,
  DAOMembersModal,
} from './../../Components/DAOMemberCard';

type SelectedEntity =
  | { kind: 'gateway'; address: string; id?: string }
  | { kind: 'relayer'; address: string }
  | null;

interface FacilityDashboardProps {
  facilityAddress: string;
  role: UserFacilityRole;
  onClose?: () => void;
}

export const FACILITY_DASHBOARD_STORAGE_KEY = 'lastFacilityAddress';

export const FacilityDashboard: React.FC<FacilityDashboardProps> = ({
  facilityAddress,
  role,
  onClose,
}) => {
  const { signer, accountId, isConnected, personalSignHash } = useWallet();

  const isAdmin = role === UserFacilityRole.Admin;
  const isRelayer = role === UserFacilityRole.Relayer || isAdmin;

  // ── Persist the current facility across refreshes ──
  useEffect(() => {
    if (facilityAddress) {
      try {
        localStorage.setItem(FACILITY_DASHBOARD_STORAGE_KEY, facilityAddress);
      } catch {
        // ignore quota / private mode
      }
    }
  }, [facilityAddress]);

  // ── Loaded data ──
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [facilityMissing, setFacilityMissing] = useState(false);

  const [gateways, setGateways] = useState<string[]>([]);
  const [relayers, setRelayers] = useState<string[]>([]);
  const [facility, setFacility] = useState<FacilityAddedEvent | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [myGateways, setMyGateways] = useState<string[]>([]);
  const [cadenceCache, setCadenceCache] = useState<Record<string, CadencePolicy>>({});
  const [publicURI, setPublicURIState] = useState('');

  // ── DAO members ──
  const [daoMembers, setDaoMembers] = useState<StakedMember[]>([]);
  const [daoLoading, setDaoLoading] = useState(true);
  const [daoModalOpen, setDaoModalOpen] = useState(false);

  // ── Signed contracts ──
  const [allContracts, setAllContracts] = useState<string[]>([]);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [signModalCid, setSignModalCid] = useState<string | null>(null);

  const refreshDao = useCallback(async () => {
    setDaoLoading(true);
    try {
      const list = await getFacilityDaoMembers(facilityAddress);
      setDaoMembers(list);
    } catch (err) {
      console.error('[FacilityDashboard] DAO members load failed', err);
    } finally {
      setDaoLoading(false);
    }
  }, [facilityAddress]);

  // ── Load ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      setFacilityMissing(false);

      try {
        const fa = await getFacilityAddedEvent(facilityAddress);
        if (cancelled) return;

        if (!fa) {
          setFacility(null);
          setFacilityMissing(true);
          return;
        }

        setFacility(fa);

        const [gw, rl, em, uri, cs, sig] = await Promise.all([
          getAllGateways(facilityAddress),
          getAllRelayers(facilityAddress),
          isInEmergency(facilityAddress),
          getPublicURI(facilityAddress),
          getAllContracts(),
          getFacilitySignedContracts(facilityAddress),
        ]);
        if (cancelled) return;

        setGateways(gw);
        setRelayers(rl);
        setEmergency(em);
        setPublicURIState(uri);
        setAllContracts(cs);
        setSignedContracts(sig);

        const cadencePairs = await Promise.all(
          gw.map(async (g) => [g, await getGatewayStatus(facilityAddress, g)] as const)
        );
        if (cancelled) return;
        setCadenceCache(Object.fromEntries(cadencePairs));

        if (isRelayer && isConnected && accountId) {
          const mine = await getGatewaysForRelayer(
            facilityAddress,
            await resolveEvmAddress(accountId)
          );
          if (cancelled) return;
          setMyGateways(mine);
        } else {
          setMyGateways([]);
        }

        // DAO members — fire after main load, non-blocking
        refreshDao();
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load dashboard.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [facilityAddress, isRelayer, isConnected, accountId, refreshDao]);

  // ── UI state ──
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [page, setPage] = useState<ModalPage>({ kind: 'overview' });
  const [showURIPreview, setShowURIPreview] = useState(false);

  // ── Scroll targets ──
  const gatewaysRef = React.useRef<HTMLDivElement>(null);
  const relayersRef = React.useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openEntity = (kind: 'gateway' | 'relayer', address: string) => {
    setSelected({ kind, address });
    setPage({ kind: 'overview' });
  };
  const closeModal = () => {
    setSelected(null);
    setPage({ kind: 'overview' });
  };
  const switchToEntity = (kind: 'gateway' | 'relayer', address: string) =>
    openEntity(kind, address);

  const closeDashboard = () => {
    try {
      localStorage.removeItem(FACILITY_DASHBOARD_STORAGE_KEY);
    } catch {
      // ignore
    }
    onClose?.();
  };

  // ── Handlers + modals (custom hook) ──
  const {
    toolError,
    toolSuccess,
    resetToolFeedback,
    onPublishMeasurement,
    onDeactivate,
    onToggleEmergency,
    modals,
    openModal,
  } = useFacilityToolHandlers({
    facilityAddress,
    signer,
    emergency,
    myGateways,
    relayers,
    gateways,
    daoMembers,
    setPublicURIState,
  });

  const hasURI = !!publicURI && publicURI.trim().length > 0;

  // ── Loading ──
  if (loading) {
    return (
      <div className="text-ink max-w-5xl">
        <div className="text-sm text-ink-muted">Loading facility dashboard…</div>
      </div>
    );
  }

  // ── Hard error ──
  if (loadError) {
    return (
      <div className="text-ink max-w-5xl">
        <div className="bg-[#fdecec] border border-[#f2a3a3] rounded-md px-4 py-3 text-sm text-[#a12626]">
          {loadError}
        </div>
      </div>
    );
  }

  // ── Facility event absent ──
  if (facilityMissing || !facility) {
    return (
      <div className="text-ink max-w-5xl">
        <div className="bg-[#fff8e6] border border-[#f0d58a] rounded-md px-4 py-3 text-sm text-[#7a5b00]">
          No facility record found for{' '}
          <span className="font-mono">{facilityAddress}</span>. If this facility
          was just created, give the indexer a moment and reload.
        </div>
      </div>
    );
  }

  // ── Ready ──
  return (
    <div className="text-ink max-w-5xl">
      <FacilityHeader facility={facility} role={role} isAdmin={isAdmin} />

      <StatusStrip
        emergency={emergency}
        publicURI={publicURI}
        hasURI={hasURI}
        onPreviewURI={() => setShowURIPreview(true)}
      />

      <FacilityGlanceBar
        facility={facility}
        gatewayCount={gateways.length}
        relayerCount={relayers.length}
        onSelectGateways={() => scrollTo(gatewaysRef)}
        onSelectRelayers={() => scrollTo(relayersRef)}
        onSelectBanned={() => scrollTo(relayersRef)}
      />

      {/* DAO members — clickable card, visible to everyone */}
      <div className="mb-4 max-w-xs">
        <DAOMembersCard
          facilityAddress={facilityAddress}
          members={daoMembers}
          loading={daoLoading}
          onOpenModal={() => setDaoModalOpen(true)}
        />
      </div>

      {/* Admin: sign contracts */}
      {isAdmin && (
        <SignContractsPanel
          facilityAddress={facilityAddress}
          signer={signer}
          allContracts={allContracts}
          signedContracts={signedContracts}   // ← SignedContract[]
          onOpenSign={(cid) => setSignModalCid(cid)}
        />
      )}

      <FacilityInfoSection facility={facility} />

      {isRelayer && (
        <RelayerToolsSection
          emergency={emergency}
          myGateways={myGateways}
          toolError={toolError}
          toolSuccess={toolSuccess}
          onOpenRotate={() => {
            resetToolFeedback();
            openModal('rotate');
          }}
          onOpenBan={() => {
            resetToolFeedback();
            openModal('ban');
          }}
          onPublishMeasurement={onPublishMeasurement}
          onOpenGateway={(g) => openEntity('gateway', g)}
        />
      )}

      {isAdmin && (
        <AdminToolsSection
          toolError={toolError}
          toolSuccess={toolSuccess}
          onOpenAddDAO={() => {
            resetToolFeedback();
            openModal('registerDAO');
          }}
          onOpenRemoveDAO={() => {
            resetToolFeedback();
            openModal('removeDAO');
          }}
          onOpenRegister={() => {
            resetToolFeedback();
            openModal('registerRelayer');
          }}
          onOpenRemove={() => {
            resetToolFeedback();
            openModal('removeRelayer');
          }}
          onOpenAssign={() => {
            resetToolFeedback();
            openModal('assignGateway');
          }}
          onOpenReassign={() => {
            resetToolFeedback();
            openModal('adminReassign');
          }}
          onOpenURI={() => {
            resetToolFeedback();
            openModal('updateURI');
          }}
          onOpenPolicy={() => {
            resetToolFeedback();
            openModal('setPolicy');
          }}
          onOpenBan={() => {
            resetToolFeedback();
            openModal('ban');
          }}
          onToggleEmergency={onToggleEmergency}
          onDeactivate={onDeactivate}
        />
      )}

      <div ref={gatewaysRef} className="scroll-mt-4">
        <GatewaysGrid
          gateways={gateways}
          cadenceCache={cadenceCache}
          onSelect={(g) => openEntity('gateway', g)}
        />
      </div>

      <div ref={relayersRef} className="scroll-mt-4">
        <RelayersGrid
          relayers={relayers}
          onSelect={(r) => openEntity('relayer', r)}
        />
      </div>

      {/* ── Modals ── */}

      {selected && (
        <EntityModal
          facilityAddress={facilityAddress}
          selected={selected}
          page={page}
          setPage={setPage}
          onClose={closeModal}
          onNavigate={switchToEntity}
        />
      )}

      <DAOMembersModal
        open={daoModalOpen}
        members={daoMembers}
        onClose={() => setDaoModalOpen(false)}
      />

      {signModalCid && (
        <SignContractModal
          cid={signModalCid}
          facilityAddress={facilityAddress}
          signer={signer}
          personalSign={personalSignHash}
          onClose={() => setSignModalCid(null)}
          onSubmit={async (v, r, s) => {
            if (!signer) return;
            await FactoryWriteContract.signTangibleContract(
              signer,
              signModalCid,
              facilityAddress,
              v,
              r,
              s
            );
            const fresh = await getFacilitySignedContracts(facilityAddress);
            setSignedContracts(fresh);        // SignedContract[]
            setSignModalCid(null);
          }}
        />
      )}

      {modals}

      {hasURI && showURIPreview && (
        <URIPreviewModal
          publicURI={publicURI}
          onClose={() => setShowURIPreview(false)}
        />
      )}
      {isAdmin && (
        <DeleteFacilityDangerZone
        facilityName={facility.name}
        facilityAddress={facilityAddress}
        signer={signer}
        onDeleted={() => {
          // Treat deletion like closing the dashboard
          closeDashboard();
        }}
      />)
          }
    </div>
  );
};

export default FacilityDashboard;