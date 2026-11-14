// ============== AdminModals.tsx ==============

import { useState } from 'react';
import { ModalShell, Field, ModalFooter, inputCls } from '../../Components/Modals';
import { shortAddr } from '../facillity_dashboard_mocks';

// ============================================================
// Reassign gateway
// ============================================================
export const ReassignGatewayModal: React.FC<{
  gateways: string[];
  relayers: string[];
  onClose: () => void;
  onSubmit: (gatewayId: string, newRelayer: string) => Promise<void>;
}> = ({ gateways, relayers, onClose, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [newRelayer, setNewRelayer] = useState(relayers[0] ?? '');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Reassign gateway" onClose={onClose}>
      <Field label="Gateway">
        <select value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className={inputCls}>
          {gateways.length === 0 && <option value="">No gateways</option>}
          {gateways.map((g) => (
            <option key={g} value={g}>{shortAddr(g)}</option>
          ))}
        </select>
      </Field>
      <Field label="New relayer">
        <select value={newRelayer} onChange={(e) => setNewRelayer(e.target.value)} className={inputCls}>
          {relayers.length === 0 && <option value="">No relayers</option>}
          {relayers.map((r) => (
            <option key={r} value={r}>{shortAddr(r)}</option>
          ))}
        </select>
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(gatewayId, newRelayer);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Reassign"
        loading={loading}
        disabled={!gatewayId || !newRelayer}
      />
    </ModalShell>
  );
};

// ============================================================
// Update public URI
// ============================================================
export const UpdateURIModal: React.FC<{
  currentURI: string;
  onClose: () => void;
  onSubmit: (uri: string) => Promise<void>;
}> = ({ currentURI, onClose, onSubmit }) => {
  const [uri, setUri] = useState(currentURI);
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Update public URI" onClose={onClose}>
      <Field label="Facility page URI">
        <input
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="https://…"
          className={inputCls + ' font-mono'}
        />
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(uri);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Save URI"
        loading={loading}
        disabled={!uri.trim()}
      />
    </ModalShell>
  );
};

// ============================================================
// Assign new gateway
// ============================================================
export const AssignGatewayModal: React.FC<{
  relayers: string[];
  onClose: () => void;
  onSubmit: (gatewayId: string, gatewayKey: string, relayer: string) => Promise<void>;
}> = ({ relayers, onClose, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState('');
  const [key, setKey] = useState('');
  const [relayer, setRelayer] = useState(relayers[0] ?? '');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Assign new gateway" onClose={onClose}>
      <Field label="Gateway ID">
        <input
          value={gatewayId}
          onChange={(e) => setGatewayId(e.target.value)}
          placeholder="gateway id"
          className={inputCls + ' font-mono'}
        />
      </Field>
      <Field label="Gateway key (address)">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="0x…"
          className={inputCls + ' font-mono'}
        />
      </Field>
      <Field label="Relayer">
        <select value={relayer} onChange={(e) => setRelayer(e.target.value)} className={inputCls}>
          {relayers.length === 0 && <option value="">No relayers</option>}
          {relayers.map((r) => (
            <option key={r} value={r}>{shortAddr(r)}</option>
          ))}
        </select>
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(gatewayId, key, relayer);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Assign"
        loading={loading}
        disabled={!gatewayId.trim() || !key.trim() || !relayer}
      />
    </ModalShell>
  );
};

// ============================================================
// Set gateway policy
// ============================================================
export const SetGatewayPolicyModal: React.FC<{
  gateways: string[];
  onClose: () => void;
  onSubmit: (gatewayId: string, expectedInterval: number, gracePeriod: number) => Promise<void>;
}> = ({ gateways, onClose, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [expected, setExpected] = useState('');
  const [grace, setGrace] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Set gateway policy" onClose={onClose}>
      <Field label="Gateway">
        <select value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className={inputCls}>
          {gateways.length === 0 && <option value="">No gateways</option>}
          {gateways.map((g) => (
            <option key={g} value={g}>{shortAddr(g)}</option>
          ))}
        </select>
      </Field>
      <Field label="Expected interval (seconds)">
        <input
          type="number"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="3600"
          className={inputCls}
        />
      </Field>
      <Field label="Grace period (seconds)">
        <input
          type="number"
          value={grace}
          onChange={(e) => setGrace(e.target.value)}
          placeholder="300"
          className={inputCls}
        />
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(gatewayId, Number(expected), Number(grace));
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Set policy"
        loading={loading}
        disabled={
          !gatewayId || !expected || expected === '0' || grace === '' || Number(grace) < 0
        }
      />
    </ModalShell>
  );
};

// ============================================================
// Ban gateway
// ============================================================
export const BanGatewayModal: React.FC<{
  gateways: string[];
  onClose: () => void;
  onSubmit: (gatewayId: string) => Promise<void>;
}> = ({ gateways, onClose, onSubmit }) => {
  const [gatewayId, setGatewayId] = useState(gateways[0] ?? '');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Ban gateway" onClose={onClose}>
      <Field label="Gateway">
        <select value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} className={inputCls}>
          {gateways.length === 0 && <option value="">No gateways</option>}
          {gateways.map((g) => (
            <option key={g} value={g}>{shortAddr(g)}</option>
          ))}
        </select>
      </Field>
      <div className="text-[0.72rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 mb-3">
        Banning a gateway prevents it from publishing measurements. This cannot be
        undone here.
      </div>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(gatewayId);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Ban gateway"
        loading={loading}
        disabled={!gatewayId}
        destructive
      />
    </ModalShell>
  );
};

// ============================================================
// Rotate key
// ============================================================
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
          try {
            await onSubmit(gatewayId, newKey);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Rotate"
        loading={loading}
        disabled={emergency || !gatewayId || !newKey}
      />
    </ModalShell>
  );
};

// ============================================================
// Register relayer
// ============================================================
export const RegisterRelayerModal: React.FC<{
  onClose: () => void;
  onSubmit: (relayerAddress: string) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Register relayer" onClose={onClose}>
      <Field label="Relayer address">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="0x…"
          className={inputCls + ' font-mono'}
        />
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(addr);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Register"
        loading={loading}
        disabled={!addr.trim()}
      />
    </ModalShell>
  );
};

// ============================================================
// Remove relayer
// ============================================================
export const RemoveRelayerModal: React.FC<{
  relayers: string[];
  onClose: () => void;
  onSubmit: (relayerAddress: string) => Promise<void>;
}> = ({ relayers, onClose, onSubmit }) => {
  const [addr, setAddr] = useState(relayers[0] ?? '');
  const [loading, setLoading] = useState(false);

  return (
    <ModalShell title="Remove relayer" onClose={onClose}>
      <Field label="Relayer">
        <select value={addr} onChange={(e) => setAddr(e.target.value)} className={inputCls}>
          {relayers.length === 0 && <option value="">No relayers</option>}
          {relayers.map((r) => (
            <option key={r} value={r}>{shortAddr(r)}</option>
          ))}
        </select>
      </Field>
      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(addr);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Remove"
        loading={loading}
        disabled={!addr}
        destructive
      />
    </ModalShell>
  );
};