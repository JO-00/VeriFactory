import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
} from '@hashgraph/hedera-wallet-connect';
import { LedgerId, Signer } from '@hiero-ledger/sdk';
import { resolveEvmAddress } from '../Functionalities/getFacilityInfo';
import { proto } from '@hiero-ledger/proto';
import {
  concat,
  getBytes,
  hexlify,
  keccak256,
  recoverAddress,
  toUtf8Bytes,
} from 'ethers';

const WALLETCONNECT_PROJECT_ID: string | undefined =
  import.meta.env.VITE_PROJECT_ID;

const origin =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://verifactory.vercel.app';

const metadata = {
  name: 'Verifactory',
  description: 'Hedera Consensus Service Verification Demo',
  url: origin,
  icons: [`${origin}/icon.svg`], // Use /icon.png if you placed a PNG in public/
};

const dAppConnector = new DAppConnector(
  metadata,
  LedgerId.TESTNET,
  WALLETCONNECT_PROJECT_ID ?? '',
  Object.values(HederaJsonRpcMethod),
  [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
  [HederaChainId.Testnet]
);

let initPromise: Promise<void> | null = null;

function getInitializedConnector() {
  if (!initPromise) {
    if (!WALLETCONNECT_PROJECT_ID) {
      return Promise.reject(new Error('Missing VITE_PROJECT_ID in .env'));
    }
    initPromise = dAppConnector.init({ logger: 'error' }).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

interface WalletContextValue {
  signer: Signer | null;
  accountId: string;
  evmAddress: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  personalSignHash: (
    messageHashHex: string,
    expectedEvmAddress?: string
  ) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [evmAddress, setEvmAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const syncSignerState = async () => {
    const activeSigner = dAppConnector.signers[0] ?? null;
    if (activeSigner) {
      const idStr = activeSigner.getAccountId().toString();
      setSigner(activeSigner);
      setAccountId(idStr);
      setIsConnected(true);
      try {
        const alias = await resolveEvmAddress(idStr);
        setEvmAddress(alias);
      } catch {
        setEvmAddress('');
      }
    } else {
      setSigner(null);
      setAccountId('');
      setEvmAddress('');
      setIsConnected(false);
    }
  };

  useEffect(() => {
    getInitializedConnector()
      .then(() => syncSignerState())
      .catch((err) => console.error('DAppConnector init failed:', err));
  }, []);

  const connect = async () => {
    try {
      await getInitializedConnector();
      await dAppConnector.openModal();
      await syncSignerState();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const disconnect = async () => {
    try {
      await dAppConnector.disconnectAll();
    } finally {
      setSigner(null);
      setAccountId('');
      setEvmAddress('');
      setIsConnected(false);
    }
  };

  const personalSignHash = async (
    messageHashHex: string,
    expectedEvmAddress?: string
  ): Promise<string> => {
    if (!signer || !accountId) {
      throw new Error('Wallet is not connected.');
    }

    await getInitializedConnector();

    const result = await dAppConnector.signMessage({
      signerAccountId: `hedera:testnet:${accountId}`,
      message: messageHashHex,
    });

    const sigMapBase64 =
      typeof result === 'string' ? result : (result as any).signatureMap;

    const sigMapBytes = Uint8Array.from(atob(sigMapBase64), (c) =>
      c.charCodeAt(0)
    );
    const sigMap = proto.SignatureMap.decode(sigMapBytes);
    const pair = sigMap.sigPair?.[0];

    const raw64 = pair?.ECDSASecp256k1 || pair?.ed25519;
    if (!raw64 || raw64.length !== 64) {
      throw new Error(
        `Expected a 64-byte ECDSA signature from HashPack, got ${raw64?.length ?? 0} bytes.`
      );
    }

    const r = hexlify(raw64.slice(0, 32));
    const s = hexlify(raw64.slice(32, 64));

    if (!expectedEvmAddress) {
      return `${r}${s.slice(2)}1b`;
    }

    const digest = keccak256(
      concat([
        toUtf8Bytes(`\x19Hedera Signed Message:\n${messageHashHex.length}`),
        toUtf8Bytes(messageHashHex),
      ])
    );

    for (const v of [27, 28]) {
      const candidate = recoverAddress(digest, { v, r, s });
      if (candidate.toLowerCase() === expectedEvmAddress.toLowerCase()) {
        return `${r}${s.slice(2)}${v.toString(16)}`;
      }
    }

    const rawDigest = keccak256(
      concat([
        toUtf8Bytes('\x19Hedera Signed Message:\n32'),
        getBytes(messageHashHex),
      ])
    );
    for (const v of [27, 28]) {
      const candidate = recoverAddress(rawDigest, { v, r, s });
      if (candidate.toLowerCase() === expectedEvmAddress.toLowerCase()) {
        return `${r}${s.slice(2)}${v.toString(16)}`;
      }
    }

    throw new Error(
      'Could not recover matching EVM address from HashPack signature.'
    );
  };

  return (
    <WalletContext.Provider
      value={{
        signer,
        accountId,
        evmAddress,
        isConnected,
        connect,
        disconnect,
        personalSignHash,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}