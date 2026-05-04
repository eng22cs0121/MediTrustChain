'use client';

import { useState } from 'react';
import { Wallet, LogOut, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useBlockchain, SUPPORTED_CHAINS, DEFAULT_CHAIN, isBlockchainConfigured } from '@/lib/blockchain';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WalletConnect() {
  const {
    wallet,
    isLoading,
    error,
    isConfigured,
    connectWallet,
    disconnectWallet,
    switchChain,
  } = useBlockchain();
  
  const [showChainMenu, setShowChainMenu] = useState(false);
  
  const targetChain = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  // If blockchain is not configured, show setup notice
  if (!isConfigured) {
    return (
      <Alert variant="default" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Blockchain not configured. Deploy contract and set NEXT_PUBLIC_CONTRACT_ADDRESS.
        </AlertDescription>
      </Alert>
    );
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get current chain name
  const getCurrentChainName = () => {
    if (!wallet.chainId) return 'Unknown';
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === wallet.chainId);
    return chain?.name || `Chain ${wallet.chainId}`;
  };

  // Not connected state
  if (!wallet.isConnected) {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <Button
          onClick={connectWallet}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Connect Wallet
        </Button>
      </div>
    );
  }

  // Connected state
  return (
    <div className="flex items-center gap-2">
      {/* Chain status badge */}
      {!wallet.isCorrectChain && (
        <Button
          onClick={() => switchChain(DEFAULT_CHAIN)}
          variant="destructive"
          size="sm"
          className="gap-1 text-xs"
        >
          <AlertCircle className="h-3 w-3" />
          Switch to {targetChain.name}
        </Button>
      )}
      
      {wallet.isCorrectChain && (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {getCurrentChainName()}
        </Badge>
      )}

      {/* Wallet dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Wallet className="h-4 w-4" />
            {formatAddress(wallet.address!)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5 text-sm">
            <div className="text-muted-foreground text-xs">Address</div>
            <div className="font-mono text-xs truncate">{wallet.address}</div>
          </div>
          
          <div className="px-2 py-1.5 text-sm">
            <div className="text-muted-foreground text-xs">Balance</div>
            <div className="font-mono">
              {parseFloat(wallet.balance || '0').toFixed(4)} {targetChain.currency.symbol}
            </div>
          </div>
          
          <div className="px-2 py-1.5 text-sm">
            <div className="text-muted-foreground text-xs">Network</div>
            <div className="flex items-center gap-1">
              {wallet.isCorrectChain ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              {getCurrentChainName()}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Network switcher */}
          <DropdownMenuLabel className="text-xs">Switch Network</DropdownMenuLabel>
          {Object.entries(SUPPORTED_CHAINS).map(([key, chain]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => switchChain(key as keyof typeof SUPPORTED_CHAINS)}
              className="gap-2"
            >
              {wallet.chainId === chain.id && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
              {chain.name}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* View on explorer */}
          {wallet.address && (
            <DropdownMenuItem asChild>
              <a
                href={`${targetChain.blockExplorer}/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                View on Explorer
              </a>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={disconnectWallet} className="gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
