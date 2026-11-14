// ============== FacilityGlanceBar.tsx ==============
import React from 'react';
import { getSectorMeta } from './../../Functionalities/sectorMeta';
import {
  parseEventTimestamp,
  formatRelativeTime,
  formatAbsoluteTime,
} from './../../Functionalities/FacilityFormat';
import type { FacilityAddedEvent } from './../../types';

interface GlanceProps {
  facility: FacilityAddedEvent;
  gatewayCount: number;
  relayerCount: number;
  onSelectGateways?: () => void;
  onSelectRelayers?: () => void;
  onSelectBanned?: () => void;
}

const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: 'danger';
  onClick?: () => void;
}> = ({ label, value, tone, onClick }) => {
  const valueClass = `text-sm font-semibold ${
    tone === 'danger' ? 'text-[#a12626]' : 'text-ink'
  }`;

  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${valueClass} text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 rounded`}
        >
          {value}
        </button>
      ) : (
        <span className={valueClass}>{value}</span>
      )}
    </div>
  );
};

export const FacilityGlanceBar: React.FC<GlanceProps> = ({
  facility,
  gatewayCount,
  relayerCount,
  bannedCount,
  onSelectGateways,
  onSelectRelayers,
  onSelectBanned,
}) => {
  const sector = getSectorMeta(facility.sectorType);
  const addedAt = parseEventTimestamp(facility.timestamp);

  return (
    <section className="mb-4 border border-[#e6e6ea] rounded-md bg-[#fafafb] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Stat
          label="Sector"
          value={
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{sector.icon}</span>
              <span>{facility.sectorType}</span>
            </span>
          }
        />
        <Stat label="Gateways" value={gatewayCount} onClick={onSelectGateways} />
        <Stat label="Relayers" value={relayerCount} onClick={onSelectRelayers} />
        {bannedCount > 0 && (
          <Stat
            label="Banned"
            value={bannedCount}
            tone="danger"
            onClick={onSelectBanned}
          />
        )}
        <Stat label="Status" value={facility.isActive ? 'Active' : 'Inactive'} />
        {addedAt && (
          <Stat
            label="Registered"
            value={
              <span title={formatAbsoluteTime(addedAt)}>
                {formatRelativeTime(addedAt)}
              </span>
            }
          />
        )}
      </div>
    </section>
  );
};