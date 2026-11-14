// ============== PublishMeasurementInline.tsx ==============

import React, { useState } from 'react';
import { shortAddr } from './../facillity_dashboard_mocks';
import { inputCls } from './../../Components/Modals';

export const PublishMeasurementInline: React.FC<{
  gateways: string[];
  onSubmit: (gatewayId: string, cid: string) => Promise<void>;
}> = ({ gateways, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [cid, setCid] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2">
      <select value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className={inputCls}>
        {gateways.length === 0 && <option value="">No gateways</option>}
        {gateways.map((g) => (
          <option key={g} value={g}>{shortAddr(g)}</option>
        ))}
      </select>
      <input
        value={cid}
        onChange={(e) => setCid(e.target.value)}
        placeholder="Document CID"
        className={inputCls + ' font-mono'}
      />
      <button
        onClick={async () => {
          setLoading(true);
          try { await onSubmit(gatewayId, cid); setCid(''); }
          finally { setLoading(false); }
        }}
        disabled={loading || !gatewayId || !cid}
        className="w-full rounded-[5px] border border-accent bg-accent text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Publishing…' : 'Publish'}
      </button>
    </div>
  );
};