"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Shield, Network, FileCheck } from "lucide-react";
import { CONTRACT_ADDRESS, DEFAULT_CHAIN, SUPPORTED_CHAINS, isBlockchainConfigured } from "@/lib/blockchain";
import { truncateAddress } from "@/lib/blockchain/audit-trail";

interface BlockchainProofProps {
  latestTxHash?: string | null;
  className?: string;
}

export function BlockchainProof({ latestTxHash, className }: BlockchainProofProps) {
  const blockchainConfigured = isBlockchainConfigured();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  if (!blockchainConfigured) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Blockchain Proof</CardTitle>
        </div>
        <CardDescription>
          Immutable verification powered by Ethereum
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Network */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="h-4 w-4" />
            <span className="font-medium">Network:</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {chainConfig.name}
          </Badge>
        </div>

        {/* Contract Address */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck className="h-4 w-4" />
            <span className="font-medium">Contract:</span>
          </div>
          <a
            href={`${chainConfig.blockExplorer}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-mono text-primary hover:underline"
          >
            {truncateAddress(CONTRACT_ADDRESS)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Latest Transaction Hash (if available) */}
        {latestTxHash && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">Latest Tx:</span>
            </div>
            <a
              href={`${chainConfig.blockExplorer}/tx/${latestTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-mono text-primary hover:underline"
            >
              {truncateAddress(latestTxHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Trust Badge */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 text-green-500" />
            <span>All records are cryptographically secured and immutable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
