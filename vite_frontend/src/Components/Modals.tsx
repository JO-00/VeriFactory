import { useState } from "react";
import { shortAddr } from "../Dashboards/facillity_dashboard_mocks";

export const ModalShell: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ title, children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
    onClick={onClose}
  >
    <div
      className="bg-surface border border-border rounded-md w-full max-w-md p-4 text-ink"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-xs text-ink-muted mb-1">{label}</label>
    {children}
  </div>
);

export const inputCls =
  'w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm';

export const ModalFooter: React.FC<{
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  loading: boolean;
  disabled?: boolean;
  destructive?: boolean;
}> = ({ onClose, onSubmit, submitLabel, loading, disabled, destructive }) => (
  <div className="flex justify-end gap-2 mt-4">
    <button
      onClick={onClose}
      className="rounded-[5px] border border-border-strong bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
    >
      Cancel
    </button>
    <button
      onClick={onSubmit}
      disabled={loading || disabled}
      className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        destructive
          ? 'border-[#f2a3a3] bg-[#fdecec] text-[#a12626] hover:brightness-95'
          : 'border-accent bg-accent text-white hover:brightness-110'
      }`}
    >
      {loading ? 'Working…' : submitLabel}
    </button>
  </div>
);


export const PublishMeasurementInline: React.FC<{
  gateways: string[];
  onSubmit: (gatewayId: string, cid: string) => Promise<void>;
}> = ({ gateways, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [cid, setCid] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2">
      <select
        value={gatewayId}
        onChange={(e) => setGatewayId(e.target.value)}
        className='w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm'
      >
        {gateways.length === 0 && <option value="">No gateways</option>}
        {gateways.map((g) => (
          <option key={g} value={g}>
            {shortAddr(g)}
          </option>
        ))}
      </select>
      <input
        value={cid}
        onChange={(e) => setCid(e.target.value)}
        placeholder="Document CID"
        className={'w-full bg-bg border border-border-strong rounded-[5px] px-3 py-1.5 text-sm font-mono'}
      />
      <button
        onClick={async () => {
          setLoading(true);
          try {
            await onSubmit(gatewayId, cid);
            setCid('');
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading || !gatewayId || !cid}
        className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Publishing…' : 'Publish'}
      </button>
    </div>
  );
};