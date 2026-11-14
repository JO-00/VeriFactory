// ============== FacilityDashboard.tsx ==============

import React, { useEffect, useState } from 'react';
import {
  getAllGateways,
  getAllRelayers,
  getAllBannedGateways,
  getGatewayStatus,
  getFacilityAddedEvent,
  getPublicURI,
  isInEmergency,
  getGatewaysForRelayer,
} from './../facillity_dashboard_mocks';
import type { CadencePolicy, FacilityAddedEvent } from './../../types';
import { UserFacilityRole } from './../../types';
import type { ModalPage } from './../dashboard_types';
import { useWallet } from './../../Common/WalletProvider';
import { EntityModal } from './RelayerGateways';
import { resolveEvmAddress } from '../../Functionalities/getFacilityInfo';
import {
  FacilityHeader,
  StatusStrip,
  FacilityInfoSection,
  RelayerToolsSection,
  AdminToolsSection,
  GatewaysGrid,
  BannedGatewaysSection,
  RelayersGrid,
  URIPreviewModal,
} from './FacilityDashboardSection';
import { FacilityGlanceBar } from './FacilityGlanceBar';
import { useFacilityToolHandlers } from './useFacilityToolHandlers';

type SelectedEntity =
  | { kind: 'gateway'; address: string }
  | { kind: 'relayer'; address: string }
  | null;

interface FacilityDashboardProps {
  facilityAddress: string;
  role: UserFacilityRole;
}

const FacilityDashboard: React.FC<FacilityDashboardProps> = ({
  facilityAddress,
  role,
}) => {
  const { signer, accountId, isConnected } = useWallet();

  const isAdmin = role === UserFacilityRole.Admin;
  const isRelayer = role === UserFacilityRole.Relayer || isAdmin;

  // ── Loaded data ──
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [facilityMissing, setFacilityMissing] = useState(false);

  const [gateways, setGateways] = useState<string[]>([]);
  const [relayers, setRelayers] = useState<string[]>([]);
  const [bannedGateways, setBannedGateways] = useState<string[]>([]);
  const [facility, setFacility] = useState<FacilityAddedEvent | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [myGateways, setMyGateways] = useState<string[]>([]);
  const [cadenceCache, setCadenceCache] = useState<Record<string, CadencePolicy>>({});
  const [publicURI, setPublicURIState] = useState('');

  // ── Load ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      setFacilityMissing(false);

      try {
        // 1. Facility event gates everything else — fetch first.
        const fa = await getFacilityAddedEvent(facilityAddress);
        if (cancelled) return;

        if (!fa) {
          setFacility(null);
          setFacilityMissing(true);
          return; // skip the entire RPC fan-out
        }

        setFacility(fa);

        // 2. Now fan out.
        const [gw, rl, banned, em, uri] = await Promise.all([
          getAllGateways(facilityAddress),
          getAllRelayers(facilityAddress),
          getAllBannedGateways(facilityAddress),
          isInEmergency(facilityAddress),
          getPublicURI(facilityAddress),
        ]);
        if (cancelled) return;

        setGateways(gw);
        setRelayers(rl);
        setBannedGateways(banned);
        setEmergency(em);
        setPublicURIState(uri);

        const cadencePairs = await Promise.all(
          gw.map(async (g) => [g, await getGatewayStatus(g, facilityAddress)] as const)
        );
        if (cancelled) return;
        setCadenceCache(Object.fromEntries(cadencePairs));

        if (isRelayer && isConnected && accountId) {
          const mine = await getGatewaysForRelayer(
            await resolveEvmAddress(accountId),
            facilityAddress
          );
          if (cancelled) return;
          setMyGateways(mine);
        } else {
          setMyGateways([]);
        }
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
  }, [facilityAddress, isRelayer, isConnected, accountId]);

  // ── UI state ──
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [page, setPage] = useState<ModalPage>({ kind: 'overview' });
  const [showURIPreview, setShowURIPreview] = useState(false);

  // ── Scroll targets for glance-bar stats ──
  const gatewaysRef = React.useRef<HTMLDivElement>(null);
  const bannedRef = React.useRef<HTMLDivElement>(null);
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
        bannedCount={bannedGateways.length}
        onSelectGateways={() => scrollTo(gatewaysRef)}
        onSelectRelayers={() => scrollTo(relayersRef)}
        onSelectBanned={() => scrollTo(bannedRef)}
      />

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

      <div ref={bannedRef} className="scroll-mt-4">
        <BannedGatewaysSection
          bannedGateways={bannedGateways}
          onSelect={(g) => openEntity('gateway', g)}
        />
      </div>

      <div ref={relayersRef} className="scroll-mt-4">
        <RelayersGrid
          relayers={relayers}
          onSelect={(r) => openEntity('relayer', r)}
        />
      </div>

      {/* Entity modal */}
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

      {/* Tool modals (rendered by the hook) */}
      {modals}

      {hasURI && showURIPreview && (
        <URIPreviewModal
          publicURI={publicURI}
          onClose={() => setShowURIPreview(false)}
        />
      )}
    </div>
  );
};

export default FacilityDashboard;