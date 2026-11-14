// ============== AdminModals.tsx ==============

import { useState } from 'react';
import { ModalShell, Field, ModalFooter, inputCls } from '../../Components/Modals';
import { shortAddr } from '../facillity_dashboard_mocks';
import type { StakedMember } from '../../types';

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

// Add DAO member — takes a member address
// ============== AddDAOMemberModal ==============

export const AddDAOMemberModal: React.FC<{
  currentDAOMembers?: StakedMember[];
  onClose: () => void;
  onSubmit: (memberAddress: string, fee: string) => Promise<void>;
}> = ({ currentDAOMembers = [], onClose, onSubmit }) => {
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  const seatCount = currentDAOMembers.length;
  const isFirstSeat = seatCount === 0;
  const atCap = seatCount >= 3;

  // tinybar string the write contract will attach as msg.value
  const feeString = isFirstSeat ? '25000000' : '100000000';
  const feeHbar = isFirstSeat ? 0.25 : 1;

  // Detect duplicates (case-insensitive, address strings)
  const trimmed = addr.trim();
  const alreadyMember =
    trimmed.length > 0 &&
    currentDAOMembers.some(
      (m) => m.wallet.toLowerCase() === trimmed.toLowerCase()
    );

  const canSubmit = !atCap && trimmed.length > 0 && !alreadyMember;

  return (
    <ModalShell title="Stake a DAO member" onClose={onClose}>
      {/* Explainer */}
      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3 leading-relaxed">
        Staking a DAO member adds a wallet to the <strong>global DAO</strong>. DAO
        members vote on inspectors every 4 weeks. Once staked, the wallet is
        committed to this facility until you remove it.
      </div>

      {/* Cap / fee summary */}
      {atCap ? (
        <div className="text-[0.72rem] text-ink-muted bg-[#fff8e6] border border-[#f0d58a] rounded-[5px] px-3 py-2 mb-3">
          You already have <strong>3/3 DAO seats</strong>. You must remove a member
          before you can stake a new one — each facility can have at most 3.
        </div>
      ) : (
        <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3">
          <div className="flex justify-between">
            <span>Current seats</span>
            <span className="font-medium text-ink">{seatCount}/3</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>
              Required fee{' '}
              <span className="italic">
                ({isFirstSeat ? 'first seat' : 'additional seat'})
              </span>
            </span>
            <span className="font-medium text-ink">{feeHbar} HBAR</span>
          </div>
        </div>
      )}

      {/* Address input */}
      <Field label="Member wallet address">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="0x…"
          disabled={atCap}
          className={
            inputCls +
            ' font-mono disabled:cursor-not-allowed disabled:opacity-60'
          }
        />
      </Field>

      {/* Already-member warning */}
      {alreadyMember && (
        <div className="text-[0.72rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 mb-3">
          <strong>Can't add this member.</strong>{' '}
          <span className="font-mono">{shortAddr(trimmed)}</span> is already a
          staked DAO member of this facility.
        </div>
      )}

      {/* Payment confirmation (only when valid) */}
      {!atCap && trimmed && !alreadyMember && (
        <div className="text-[0.72rem] text-[#7a5b00] bg-[#fff8e6] border border-[#f0d58a] rounded-[5px] px-3 py-2 mb-3">
          You will be charged <strong>{feeHbar} HBAR</strong> to stake{' '}
          <span className="font-mono">{shortAddr(trimmed)}</span>. Excess
          payment is refunded automatically by the contract.
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onSubmit={async () => {
          setLoading(true);
          try {
            await onSubmit(trimmed, feeString);
          } finally {
            setLoading(false);
          }
        }}
        submitLabel={
          atCap
            ? 'Seat cap reached'
            : alreadyMember
            ? 'Already a member'
            : `Stake for ${feeHbar} HBAR`
        }
        loading={loading}
        disabled={!canSubmit}
      />
    </ModalShell>
  );
};

// ============== RemoveDAOMemberModal ==============

export const RemoveDAOMemberModal: React.FC<{
  members: StakedMember[];
  onClose: () => void;
  onSubmit: (memberAddress: string) => Promise<void>;
}> = ({ members, onClose, onSubmit }) => {
  const [addr, setAddr] = useState(members[0]?.wallet ?? '');
  const [loading, setLoading] = useState(false);

  const selected = members.find((m) => m.wallet === addr);

  return (
    <ModalShell title="Remove DAO member" onClose={onClose}>
      {/* What this action does */}
      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3 leading-relaxed">
        Removing a DAO member <strong>frees one facility seat</strong> and removes
        the wallet from the global DAO. The stake you originally paid is{' '}
        <strong>refunded in full</strong> to you (the facility admin) — not to the
        member wallet.
      </div>

      <Field label="Member to remove">
        <select
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          className={inputCls}
        >
          {members.length === 0 && <option value="">No DAO members</option>}
          {members.map((m) => (
            <option key={m.wallet} value={m.wallet}>
              {shortAddr(m.wallet)}
            </option>
          ))}
        </select>
      </Field>

      {/* Live refund preview — shows as soon as a member is selected */}
      {selected && (
        <div className="text-[0.72rem] text-success bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-2 mb-3">
          <div className="flex justify-between">
            <span>Refund on removal</span>
            <span className="font-semibold">
              {formatStake(Number(selected.amount))}
            </span>
          </div>
          <div className="text-[0.68rem] text-ink-muted mt-1 italic">
            Paid to you when the transaction succeeds.
          </div>
        </div>
      )}

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
        submitLabel={
          selected
            ? `Remove & refund ${formatStake(Number(selected.amount))}`
            : 'Remove'
        }
        loading={loading}
        disabled={!addr}
        destructive
      />
    </ModalShell>
  );
};