// ============== SignContractModal.tsx ==============

import { useState } from 'react';
import type { Signer } from '@hiero-ledger/sdk';
import { shortAddr } from './../Dashboards/facillity_dashboard_mocks';
import { ModalShell, ModalFooter } from './Modals';
import {
  keccak256,
  toUtf8Bytes,
  getBytes,
  concat,
  Signature,
  recoverAddress,
} from 'ethers';

export interface SignContractModalProps {
  cid: string;
  facilityAddress: string;
  signer: Signer | null;
  /**
   * Sends a raw personal_sign request through the WalletConnect session.
   * Injected by the caller — the modal itself doesn't own the DAppConnector.
   */
  personalSign: (messageHex: string, evmAddress: string) => Promise<string>;
  onClose: () => void;
  /** Called after the wallet produced a valid, locally-verified signature. */
  onSubmit: (v: number, r: string, s: string) => Promise<void>;
}

/**
 * Builds the exact bytes the contract hashes:
 *   keccak256(abi.encodePacked(DocumentCID, facility_contract))
 *
 * `eth_personalSign` on the wallet will then wrap this in the
 * "\x19Ethereum Signed Message:\n32" prefix — matching the contract's
 * `ethSignedHash`.
 */
const buildMessageHash = (cid: string, facilityAddress: string): Uint8Array => {
  return getBytes(
    keccak256(concat([toUtf8Bytes(cid), getBytes(facilityAddress)]))
  );
};

/** Hex-encode a Uint8Array (0x-prefixed). */
const toHex = (bytes: Uint8Array): string => {
  let out = '0x';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
};

export const SignContractModal: React.FC<SignContractModalProps> = ({
  cid,
  facilityAddress,
  signer,
  personalSign,
  onClose,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<{
    v: number;
    r: string;
    s: string;
  } | null>(null);

  const handleSign = async () => {
    setError(null);
    setSignaturePreview(null);

    if (!signer) {
      setError('Connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      // 1. Preimage — must match Solidity exactly.
      const messageHash = buildMessageHash(cid, facilityAddress);
      const messageHex = toHex(messageHash);

      // 2. Signer's EVM address (from Hedera account ID).
      const evmAddress = `0x${signer.getAccountId().toSolidityAddress()}`;

      console.log('[sign] messageHash:', messageHex);
      console.log('[sign] evmAddress :', evmAddress);

      // 3. Ask the wallet to sign with the Ethereum prefix.
      //    eth_personalSign applies "\x19Ethereum Signed Message:\n32"
      //    to the 32-byte message it's handed, exactly what the contract
      //    expects when it reconstructs `ethSignedHash`.
      const flatSig = await personalSign(messageHex, evmAddress);

      console.log('[sign] wallet signature:', flatSig);

      // 4. Parse the 65-byte signature into v / r / s.
      const { v, r, s } = Signature.from(flatSig);

      // 5. Verify locally — do NOT send if the recovered address is wrong.
      const recovered = recoverAddress(messageHash, { v, r, s });
      console.log('[sign] recovered:', recovered);

      if (recovered.toLowerCase() !== evmAddress.toLowerCase()) {
        throw new Error(
          `Signature recovers to the wrong address. Expected ${evmAddress}, got ${recovered}. The transaction was not sent.`
        );
      }

      // 6. Show preview + submit.
      setSignaturePreview({ v, r, s });
      await onSubmit(v, r, s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signing failed.';
      if (/reject|cancel|denied|user.*(reject|cancel)/i.test(msg)) {
        setError('Signature request was rejected in the wallet.');
      } else {
        setError(msg);
      }
      setSignaturePreview(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Sign contract" onClose={onClose}>
      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3 leading-relaxed">
        Clicking <strong>Sign with wallet</strong> asks your wallet to sign the
        contract CID bound to this facility. The signature is verified locally
        before the transaction is submitted — if it doesn't match your wallet
        address, nothing is sent on-chain.
      </div>

      <div className="text-[0.72rem] text-ink-muted bg-surface-muted border border-border rounded-[5px] px-3 py-2 mb-3">
        <div className="flex justify-between">
          <span>Contract CID</span>
          <span className="font-mono text-ink" title={cid}>
            {shortAddr(cid, 12, 8)}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Facility</span>
          <span className="font-mono text-ink" title={facilityAddress}>
            {shortAddr(facilityAddress, 10, 6)}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-[0.72rem] text-[#a12626] bg-[#fdecec] border border-[#f2a3a3] rounded-[5px] px-3 py-2 mb-3 break-all">
          {error}
        </div>
      )}

      {signaturePreview && (
        <div className="text-[0.7rem] text-success bg-[#e8f7ee] border border-[#b4e5c7] rounded-[5px] px-3 py-2 mb-3 font-mono break-all">
          <div>v: {signaturePreview.v}</div>
          <div>r: {shortAddr(signaturePreview.r, 10, 6)}</div>
          <div>s: {shortAddr(signaturePreview.s, 10, 6)}</div>
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onSubmit={handleSign}
        submitLabel={loading ? 'Waiting for wallet…' : 'Sign with wallet'}
        loading={loading}
        disabled={!signer}
      />
    </ModalShell>
  );
};