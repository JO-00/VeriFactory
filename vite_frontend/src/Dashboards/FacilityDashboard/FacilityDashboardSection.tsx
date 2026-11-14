// ============== FacilityDashboardSections.tsx ==============

import React from 'react';
import { shortAddr, formatCadence } from './../facillity_dashboard_mocks';
import type { FacilityAddedEvent } from './../facillity_dashboard_mocks';
import type { CadencePolicy } from './../../types';
import { UserFacilityRole } from './../../types';
import { ToolCard, StatCard } from './../../Components/ui';
import { PublishMeasurementInline } from './PublishMeasurementsInline';

// ── Section header ──
export const SectionHeader: React.FC<{ icon?: string; title: string; count?: number }> = ({
  icon, title, count,
}) => (
  <h3 className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted mb-2">
    {icon && <span className="text-[0.8rem]">{icon}</span>}
    <span>{title}</span>
    {typeof count === 'number' && (
      <span className="ml-1 px-1.5 py-0 rounded-full text-[0.65rem] font-medium bg-surface-muted border border-border text-ink-muted">
        {count}
      </span>
    )}
  </h3>
);

// ── Header ──
export const FacilityHeader: React.FC<{
  facility: FacilityAddedEvent;
  role: UserFacilityRole;
  isAdmin: boolean;
}> = ({ facility, role, isAdmin }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 flex-wrap">
      <h1 className="text-xl font-semibold tracking-[-0.01em]">{facility.name}</h1>
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          isAdmin
            ? 'bg-[#efe9ff] text-[#6d28d9]'
            : role === UserFacilityRole.Relayer
            ? 'bg-accent-soft text-accent'
            : 'bg-surface-muted text-ink-muted'
        }`}
      >
        {isAdmin ? '👑 Admin' : role === UserFacilityRole.Relayer ? '🛠 Relayer' : '👁 Observer'}
      </span>
    </div>
    <p className="text-sm text-ink-muted mt-0.5">
      {facility.sectorType} · {facility.location}
    </p>
    <div className="font-mono text-[0.72rem] text-ink-muted mt-1 break-all">
      {facility.facilityAddress}
    </div>
  </div>
);

// ── Status strip ──
export const StatusStrip: React.FC<{
  emergency: boolean;
  publicURI: string;
  hasURI: boolean;
  onPreviewURI: () => void;
}> = ({ emergency, publicURI, hasURI, onPreviewURI }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
    <div
      className={`rounded-md border px-4 py-3 ${
        emergency ? 'bg-[#fdecec] border-[#f2a3a3]' : 'bg-[#e8f7ee] border-[#b4e5c7]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${emergency ? 'bg-[#a12626]' : 'bg-success'}`}
        />
        <span
          className={`text-sm font-semibold ${
            emergency ? 'text-[#a12626]' : 'text-success'
          }`}
        >
          {emergency ? 'EMERGENCY' : 'Operating normally'}
        </span>
      </div>
      {emergency && (
        <div className="text-[0.72rem] text-[#7a1a1a] mt-1.5">
          Key rotations aren't accepted in emergencies.
        </div>
      )}
    </div>
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted">
            Public URI
          </div>
          {hasURI ? (
            <button
              onClick={onPreviewURI}
              className="text-sm text-accent hover:underline cursor-pointer break-all text-left"
              title={publicURI}
            >
              {publicURI}
            </button>
          ) : (
            <div className="text-sm text-ink-muted italic">No public URI</div>
          )}
        </div>
        {hasURI && (
          <button
            onClick={onPreviewURI}
            className="shrink-0 rounded-[5px] border border-border-strong bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── Facility info ──
export const FacilityInfoSection: React.FC<{ facility: FacilityAddedEvent }> = ({ facility }) => (
  <section className="mb-6">
    <SectionHeader icon="🏢" title="Facility info" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard label="Name" value={facility.name} />
      <StatCard label="Sector" value={facility.sectorType} />
      <StatCard label="Location" value={facility.location} />
      <StatCard
        label="Active"
        value={
          facility.isActive ? (
            <span className="text-success">Yes</span>
          ) : (
            <span className="text-[#a12626]">No</span>
          )
        }
      />
    </div>
  </section>
);

// ── Relayer tools ──
export const RelayerToolsSection: React.FC<{
  emergency: boolean;
  myGateways: string[];
  toolError: string | null;
  toolSuccess: string | null;
  onOpenRotate: () => void;
  onOpenBan: () => void;
  onPublishMeasurement: (gatewayId: string, cid: string) => Promise<void>;
  onOpenGateway: (gateway: string) => void;
}> = ({
  emergency,
  myGateways,
  toolError,
  toolSuccess,
  onOpenRotate,
  onOpenBan,
  onPublishMeasurement,
  onOpenGateway,
}) => (
  <section className="mb-6">
    <SectionHeader icon="🛠" title="Relayer tools" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ToolCard
        title="Rotate gateway key"
        description="Replace the current key of one of your gateways."
      >
        <button
          disabled={emergency}
          onClick={onOpenRotate}
          className={`w-full rounded-[5px] px-3 py-1.5 text-xs font-semibold border ${
            emergency
              ? 'border-border-strong bg-surface-muted text-ink-faint cursor-not-allowed'
              : 'border-accent bg-accent text-white hover:brightness-110 cursor-pointer'
          }`}
        >
          Rotate key
        </button>
        {emergency && (
          <div className="text-[0.7rem] text-[#a12626] mt-2">
            Key rotations aren't accepted in emergencies.
          </div>
        )}
      </ToolCard>

      <ToolCard
        title="Ban gateway"
        description="Permanently ban one of your gateways from publishing."
      >
        <button
          onClick={onOpenBan}
          className="w-full rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] px-3 py-1.5 text-xs font-semibold hover:brightness-95 cursor-pointer"
        >
          Ban…
        </button>
      </ToolCard>

      <ToolCard
        title="Publish measurement"
        description="Submit a signed measurement CID for one of your gateways."
      >
        <PublishMeasurementInline
          gateways={myGateways}
          onSubmit={onPublishMeasurement}
        />
      </ToolCard>

      <ToolCard title="My gateways">
        {myGateways.length === 0 ? (
          <div className="text-xs text-ink-muted italic">None.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {myGateways.map((g) => (
              <button
                key={g}
                onClick={() => onOpenGateway(g)}
                title={g}
                className="font-mono text-[0.72rem] px-2 py-1 rounded-[5px] border border-border-strong bg-surface-muted text-ink hover:border-accent hover:bg-accent-soft hover:text-accent cursor-pointer"
              >
                {shortAddr(g)}
              </button>
            ))}
          </div>
        )}
      </ToolCard>
    </div>

    {(toolError || toolSuccess) && (
      <div className="mt-3 text-xs">
        {toolError && <span className="text-[#a12626] font-medium">{toolError}</span>}
        {toolSuccess && <span className="text-success font-medium">{toolSuccess}</span>}
      </div>
    )}
  </section>
);

// ── Admin tools ──
export const AdminToolsSection: React.FC<{
  toolError: string | null;
  toolSuccess: string | null;
  onOpenAddDAO: () => void;        
  onOpenRemoveDAO: () => void; 
  onOpenRegister: () => void;
  onOpenRemove: () => void;
  onOpenAssign: () => void;
  onOpenReassign: () => void;
  onOpenURI: () => void;
  onOpenPolicy: () => void;
  onOpenBan: () => void;
  onToggleEmergency: () => void;
  onDeactivate: () => void;
}> = ({
  toolError,
  toolSuccess,
  onOpenAddDAO,
  onOpenRemoveDAO,
  onOpenRegister,
  onOpenRemove,
  onOpenAssign,
  onOpenReassign,
  onOpenURI,
  onOpenPolicy,
  onOpenBan,
  onToggleEmergency,
  onDeactivate,
}) => (
  <section className="mb-6">
    <SectionHeader icon="👑" title="Admin tools" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ToolCard title="Register DAO Member" description="Add a new relayer to this facility.">
        <button
          onClick={onOpenAddDAO}
          className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
        >
          Register…
        </button>
      </ToolCard>
      <ToolCard title="Remove DAO Member" description="Add a new relayer to this facility.">
        <button
          onClick={onOpenRemoveDAO}
          className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
        >
          Register…
        </button>
      </ToolCard>
      <ToolCard title="Register relayer" description="Add a new relayer to this facility.">
        <button
          onClick={onOpenRegister}
          className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
        >
          Register…
        </button>
      </ToolCard>

      <ToolCard title="Remove relayer" description="Remove a relayer from this facility.">
        <button
          onClick={onOpenRemove}
          className="w-full rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Remove…
        </button>
      </ToolCard>

      <ToolCard title="Assign new gateway" description="Attach a new gateway to a relayer.">
        <button
          onClick={onOpenAssign}
          className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
        >
          Assign…
        </button>
      </ToolCard>

      <ToolCard title="Reassign gateway" description="Move any gateway to a different relayer.">
        <button
          onClick={onOpenReassign}
          className="w-full rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Reassign…
        </button>
      </ToolCard>

      <ToolCard title="Set new page URI" description="Update or set a new URI for your page.">
        <button
          onClick={onOpenURI}
          className="w-full rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Enter new URI
        </button>
      </ToolCard>

      <ToolCard title="Set gateway policy" description="Configure measurement cadence for a gateway.">
        <button
          onClick={onOpenPolicy}
          className="w-full rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Set policy…
        </button>
      </ToolCard>

      <ToolCard title="Ban any gateway" description="Ban a gateway regardless of relayer.">
        <button
          onClick={onOpenBan}
          className="w-full rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] px-3 py-1.5 text-xs font-semibold hover:brightness-95 cursor-pointer"
        >
          Ban…
        </button>
      </ToolCard>
    </div>

    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={onToggleEmergency}
        className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
      >
        Toggle emergency
      </button>
      <button
        onClick={onDeactivate}
        className="rounded-[5px] border border-[#f2a3a3] bg-[#fdecec] text-[#a12626] px-3 py-1.5 text-xs font-semibold hover:brightness-95 cursor-pointer"
      >
        Deactivate facility
      </button>
    </div>

    {(toolError || toolSuccess) && (
      <div className="mt-3 text-xs">
        {toolError && <span className="text-[#a12626] font-medium">{toolError}</span>}
        {toolSuccess && <span className="text-success font-medium">{toolSuccess}</span>}
      </div>
    )}
  </section>
);

// ── Gateways grid ──
export const GatewaysGrid: React.FC<{
  gateways: string[];
  cadenceCache: Record<string, CadencePolicy>;
  onSelect: (gateway: string) => void;
}> = ({ gateways, cadenceCache, onSelect }) => (
  <section className="mb-6">
    <SectionHeader icon="🌐" title="Gateways" count={gateways.length} />
    {gateways.length === 0 ? (
      <div className="text-sm text-ink-muted italic">No gateways.</div>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        {gateways.map((gw) => {
          const policy = cadenceCache[gw] ?? { expectedInterval: 0, gracePeriod: 0 };
          return (
            <button
              key={gw}
              onClick={() => onSelect(gw)}
              title={gw}
              className="text-left bg-surface border border-border rounded-md px-3 py-2.5 hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer group"
            >
              <div className="font-mono text-[0.75rem] text-ink break-all group-hover:text-accent">
                {shortAddr(gw)}
              </div>
              <div className="text-[10px] text-ink-muted mt-1">
                every {formatCadence(policy.expectedInterval.toNumber())}
              </div>
            </button>
          );
        })}
      </div>
    )}
  </section>
);

// ── Relayers grid ──
export const RelayersGrid: React.FC<{
  relayers: string[];
  onSelect: (relayer: string) => void;
}> = ({ relayers, onSelect }) => (
  <section>
    <SectionHeader icon="🔗" title="Relayers" count={relayers.length} />
    {relayers.length === 0 ? (
      <div className="text-sm text-ink-muted italic">No relayers.</div>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        {relayers.map((r) => (
          <button
            key={r}
            onClick={() => onSelect(r)}
            title={r}
            className="text-left bg-surface border border-border rounded-md px-3 py-2.5 hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer group"
          >
            <div className="font-mono text-[0.75rem] text-ink break-all group-hover:text-accent">
              {shortAddr(r)}
            </div>
          </button>
        ))}
      </div>
    )}
  </section>
);

// ── URI preview ──
export const URIPreviewModal: React.FC<{
  publicURI: string;
  onClose: () => void;
}> = ({ publicURI, onClose }) => (
  <div
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
    onClick={onClose}
  >
    <div
      className="bg-surface border border-border rounded-md w-[85vw] h-[85vh] flex flex-col overflow-hidden text-ink"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
        <a
          href={publicURI}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:underline break-all"
        >
          {publicURI}
        </a>
        <button
          onClick={onClose}
          className="shrink-0 rounded-[5px] border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
        >
          Close
        </button>
      </div>
      <iframe
        src={publicURI}
        title="Facility public URI"
        className="flex-1 w-full border-none bg-white"
      />
    </div>
  </div>
);
