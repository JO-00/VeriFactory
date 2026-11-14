// ============== RelayerModals.tsx ==============

import React, { useState } from 'react';
import { shortAddr } from './../facillity_dashboard_mocks';
import { ModalShell, Field, ModalFooter, inputCls } from './../../Components/Modals';

export const RotateKeyModal: React.FC<{
  gateways: string[];
  emergency: boolean;
  onClose: () => void;
  onSubmit: (gatewayId: string, newKey: string) => Promise<void>;
}> = ({ gateways, emergency, onClose, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Rotate gateway key" onClose={onClose}>
      {emergency && (
        <div className="text-[0.72rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 mb-3">
          Key rotations aren't accepted in emergencies.
        </div>
      )}
      <Field label="Gateway">
        <select value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className={inputCls}>
          {gateways.length === 0 && <option value="">No gateways</option>}
          {gateways.map((g) => (
            <option key={g} value={g}>{shortAddr(g)}</option>
          ))}
        </select>
      </Field>
      <Field label="New key">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="0x…"
          className={inputCls + ' font-mono'}
        />
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try { await onSubmit(gatewayId, newKey); } finally { setLoading(false); }
        }}
        submitLabel="Rotate"
        loading={loading}
        disabled={emergency || !gatewayId || !newKey}
      />
    </ModalShell>
  );
};