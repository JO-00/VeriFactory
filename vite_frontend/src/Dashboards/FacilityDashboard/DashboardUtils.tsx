import type {EventListProps} from "./../dashboard_types"
import { shortAddr, formatTimestamp } from "../facillity_dashboard_mocks";


export const EventList: React.FC<EventListProps> = ({ assigned, reassigned, rotations }) => {
  if (assigned.length === 0 && reassigned.length === 0 && rotations.length === 0) {
    return <div className="text-sm text-ink-muted">No events.</div>;
  }

  return (
    <div className="space-y-1.5">
      {assigned.map((e, i) => (
        <div key={`a-${i}`} className="bg-surface-muted border border-border rounded-[5px] px-3 py-2 text-xs">
          <div className="font-semibold text-ink">GatewayAssignedToRelayer</div>
          <div className="font-mono text-ink-muted break-all mt-0.5">
            {shortAddr(e.gatewayId)} → {shortAddr(e.relayerAddress)}
          </div>
        </div>
      ))}
      {reassigned.map((e, i) => (
        <div key={`r-${i}`} className="bg-surface-muted border border-border rounded-[5px] px-3 py-2 text-xs">
          <div className="font-semibold text-ink">GatewayReassigned</div>
          <div className="font-mono text-ink-muted break-all mt-0.5">
            {shortAddr(e.gatewayId)}: {shortAddr(e.oldRelayer)} → {shortAddr(e.newRelayer)}
          </div>
        </div>
      ))}
      {rotations.map((e, i) => (
        <div
          key={`k-${i}`}
          className={`border rounded-[5px] px-3 py-2 text-xs ${
            e.isAnomalous
              ? 'bg-[#fdecec] border-[#f2a3a3]'
              : 'bg-surface-muted border-border'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-ink">
              KeyRotated {e.isAnomalous && <span className="text-[#a12626]">· anomalous</span>}
            </div>
            <div className="text-[0.65rem] text-ink-muted">
              {formatTimestamp(e.timestamp as number)}
            </div>
          </div>
          <div className="font-mono text-ink-muted break-all mt-0.5">
            {shortAddr(e.gatewayId)}: {shortAddr(e.oldKey)} → {shortAddr(e.newKey)}
          </div>
        </div>
      ))}
    </div>
  );
};
// ── Section header ──
export const SectionHeader: React.FC<{ icon?: string; title: string; count?: number }> = ({
  icon,
  title,
  count,
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

// ── Stat card ──
export const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-surface-muted border border-border rounded-[5px] px-3 py-2.5">
    <div className="text-[0.68rem] text-ink-muted">{label}</div>
    <div className="text-sm font-semibold tracking-[-0.01em] mt-0.5">{value}</div>
  </div>
);

// ── Field block (monospace value) ──
export const FieldBlock: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div>
    <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-muted mb-1">
      {label}
    </div>
    <div
      className={`bg-surface-muted border border-border rounded-[5px] px-3 py-2 text-sm break-all ${
        mono ? 'font-mono text-[0.75rem]' : ''
      }`}
    >
      {value}
    </div>
  </div>
);

// ── Status pill ──
export const StatusPill: React.FC<{
  ok: boolean;
  okText: string;
  badText: string;
  compact?: boolean;
}> = ({ ok, okText, badText, compact }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full font-medium shrink-0 ${
      compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
    } ${
      ok ? 'bg-[#e8f7ee] text-success' : 'bg-[#fdecec] text-[#a12626]'
    }`}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {ok ? okText : badText}
  </span>
);


// ── Empty hint ──
export const EmptyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm text-ink-muted italic">{children}</div>
);


