'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner, Contract, formatEther } from 'ethers';
import { MEDITRUST_ABI } from './abi';
import { CONTRACT_ADDRESS, SUPPORTED_CHAINS, DEFAULT_CHAIN, isBlockchainConfigured } from './config';

// Types
interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

interface BlockchainContextType {
  wallet: WalletState;
  contract: Contract | null;
  signer: JsonRpcSigner | null;
  provider: BrowserProvider | null;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chainKey: keyof typeof SUPPORTED_CHAINS) => Promise<void>;
}

const initialWalletState: WalletState = {
  isConnected: false,
  address: null,
  balance: null,
  chainId: null,
  isCorrectChain: false,
};

const BlockchainContext = createContext<BlockchainContextType | null>(null);

export function BlockchainProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isConfigured = isBlockchainConfigured();
  const targetChainId = SUPPORTED_CHAINS[DEFAULT_CHAIN].id;

  // Check if MetaMask is installed
  const getEthereum = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }, []);

  // Update wallet state
  const updateWalletState = useCallback(async (browserProvider: BrowserProvider) => {
    try {
      const signerInstance = await browserProvider.getSigner();
      const address = await signerInstance.getAddress();
      const balanceWei = await browserProvider.getBalance(address);
      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);
      
      setSigner(signerInstance);
      setProvider(browserProvider);
      
      setWallet({
        isConnected: true,
        address,
        balance: formatEther(balanceWei),
        chainId,
        isCorrectChain: chainId === targetChainId,
      });

      // Initialize contract if configured and on correct chain
      if (isConfigured && chainId === targetChainId) {
        const contractInstance = new Contract(CONTRACT_ADDRESS, MEDITRUST_ABI, signerInstance);
        setContract(contractInstance);
      } else {
        setContract(null);
      }
    } catch (err) {
      console.error('Error updating wallet state:', err);
      throw err;
    }
  }, [isConfigured, targetChainId]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    const ethereum = getEthereum();
    
    if (!ethereum) {
      setError('Please install MetaMask to use blockchain features');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request account access
      await ethereum.request({ method: 'eth_requestAccounts' });
      
      const browserProvider = new BrowserProvider(ethereum);
      await updateWalletState(browserProvider);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getEthereum, updateWalletState]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWallet(initialWalletState);
    setContract(null);
    setSigner(null);
    setProvider(null);
    setError(null);
  }, []);

  // Switch to a different chain
  const switchChain = useCallback(async (chainKey: keyof typeof SUPPORTED_CHAINS) => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setError('MetaMask not found');
      return;
    }

    const chainConfig = SUPPORTED_CHAINS[chainKey];
    const chainIdHex = `0x${chainConfig.id.toString(16)}`;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: chainConfig.name,
              rpcUrls: [chainConfig.rpcUrl],
              blockExplorerUrls: [chainConfig.blockExplorer],
              nativeCurrency: chainConfig.currency,
            }],
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
          setError('Failed to add network to MetaMask');
        }
      } else {
        console.error('Error switching chain:', switchError);
        setError('Failed to switch network');
      }
    }
  }, [getEthereum]);

  // Listen for account and chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAccountsChanged = async (accounts: any) => {
      const accountsArray = accounts as string[];
      if (accountsArray.length === 0) {
        disconnectWallet();
      } else if (wallet.isConnected) {
        const browserProvider = new BrowserProvider(ethereum);
        await updateWalletState(browserProvider);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChainChanged = async (_chainId: any) => {
      if (wallet.isConnected) {
        const browserProvider = new BrowserProvider(ethereum);
        await updateWalletState(browserProvider);
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [getEthereum, wallet.isConnected, disconnectWallet, updateWalletState]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const ethereum = getEthereum();
      if (!ethereum) return;

      try {
        const accounts = (await ethereum.request({ method: 'eth_accounts' })) as string[];
        if (accounts && accounts.length > 0) {
          const browserProvider = new BrowserProvider(ethereum);
          await updateWalletState(browserProvider);
        }
      } catch (err) {
        console.error('Error checking existing connection:', err);
      }
    };

    checkConnection();
  }, [getEthereum, updateWalletState]);

  return (
    <BlockchainContext.Provider
      value={{
        wallet,
        contract,
        signer,
        provider,
        isLoading,
        error,
        isConfigured,
        connectWallet,
        disconnectWallet,
        switchChain,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain() {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
