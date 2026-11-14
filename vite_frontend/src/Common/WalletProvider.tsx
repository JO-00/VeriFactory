import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId
} from '@hashgraph/hedera-wallet-connect';
import { LedgerId, Signer } from '@hiero-ledger/sdk';

const WALLETCONNECT_PROJECT_ID: string | undefined = import.meta.env.VITE_PROJECT_ID;

const metadata = {
  name: 'React Topic App',
  description: 'Hedera Consensus Service Demo',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  icons: ['https://www.hashpack.app/img/logo.png'],
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
      initPromise = null; // allow retry if init fails
      throw err;
    });
  }
  return initPromise;
}

interface WalletContextValue {
  signer: Signer | null;
  accountId: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [accountId, setAccountId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const syncSignerState = () => {
    const activeSigner = dAppConnector.signers[0] ?? null;
    if (activeSigner) {
      setSigner(activeSigner);
      setAccountId(activeSigner.getAccountId().toString());
      setIsConnected(true);
    } else {
      setSigner(null);
      setAccountId('');
      setIsConnected(false);
    }
  };

  useEffect(() => {
    getInitializedConnector()
      .then(() => {
        syncSignerState();
      })
      .catch((err) => console.error('DAppConnector init failed:', err));
  }, []);

  const connect = async () => {
    try {
      await getInitializedConnector();
      await dAppConnector.openModal();
      syncSignerState();
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
      setIsConnected(false);
    }
  };

  return (
    <WalletContext.Provider value={{ signer, accountId, isConnected, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}