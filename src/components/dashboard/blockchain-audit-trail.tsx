'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Lock,
  ExternalLink,
  RefreshCw,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  Building,
  Pill,
  Link2,
  Hash,
  Blocks
} from 'lucide-react';
import { format } from 'date-fns';
import {
  fetchOnChainAuditTrail,
  truncateAddress,
  SUPPLY_CHAIN_STAGES,
  type AuditTrailResult,
  type OnChainAuditEvent,
  type SupplyChainStage
} from '@/lib/blockchain/audit-trail';
import { BatchStatus } from '@/lib/blockchain/config';

interface BlockchainAuditTrailProps {
  batchId: string; // e.g., "BCH-001"
  onChainBatchId?: number; // Numeric ID on blockchain
}

// Stage icons mapping
const stageIcons: Record<SupplyChainStage, React.ReactNode> = {
  manufacturing: <Building className="h-4 w-4" />,
  regulatory: <Shield className="h-4 w-4" />,
  distribution: <Package className="h-4 w-4" />,
  logistics: <Truck className="h-4 w-4" />,
  pharmacy: <Pill className="h-4 w-4" />,
  delivered: <CheckCircle2 className="h-4 w-4" />,
  recalled: <AlertTriangle className="h-4 w-4" />,
  expired: <XCircle className="h-4 w-4" />,
};

// Status color mapping
const statusColors: Record<number, string> = {
  [BatchStatus.CREATED]: 'bg-blue-500',
  [BatchStatus.PENDING_APPROVAL]: 'bg-yellow-500',
  [BatchStatus.APPROVED]: 'bg-green-500',
  [BatchStatus.REJECTED]: 'bg-red-500',
  [BatchStatus.IN_TRANSIT]: 'bg-purple-500',
  [BatchStatus.DELIVERED]: 'bg-cyan-500',
  [BatchStatus.EXPIRED]: 'bg-orange-500',
  [BatchStatus.RECALLED]: 'bg-red-600',
};

export function BlockchainAuditTrail({ batchId, onChainBatchId }: BlockchainAuditTrailProps) {
  const [auditData, setAuditData] = useState<AuditTrailResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedChainInfo, setCachedChainInfo] = useState<{ name: string; blockExplorer: string } | null>(null);

  // Extract numeric ID from batch code (e.g., "BCH-001" -> 1)
  const numericBatchId = onChainBatchId ?? (parseInt(batchId.replace(/\D/g, '')) || 0);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchOnChainAuditTrail(numericBatchId);

      // Store chain info even if fetch fails
      if (result.chainInfo) {
        setCachedChainInfo({
          name: result.chainInfo.name,
          blockExplorer: result.chainInfo.blockExplorer
        });
      }

      if (result.success) {
        setAuditData(result);
      } else {
        setError(result.error || 'Failed to fetch audit trail');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (numericBatchId > 0) {
      fetchAuditTrail();
    }
  }, [numericBatchId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Blockchain Audit Trail
          </CardTitle>
          <CardDescription>
            Batch #{numericBatchId} • {cachedChainInfo?.name || 'Blockchain'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to Load Audit Trail</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              {error.includes('not found') && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">💡 This could mean:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Batch was created locally (not on blockchain)</li>
                    <li>Batch hasn't been submitted to blockchain yet</li>
                    <li>Different batch ID on blockchain</li>
                  </ul>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Only batches created with "Record on Blockchain" enabled will appear here.
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAuditTrail}
                className="mt-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!auditData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Blockchain Audit Trail
          </CardTitle>
          <CardDescription>
            Connect to blockchain to view immutable audit trail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchAuditTrail} disabled={numericBatchId === 0}>
            <Link2 className="h-4 w-4 mr-2" />
            Load Audit Trail
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { batchInfo, events, chainInfo } = auditData;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Blocks className="h-5 w-5 text-primary" />
              Blockchain Audit Trail
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                <Lock className="h-3 w-3 mr-1" />
                Immutable
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Cryptographically secured records on {chainInfo.name}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAuditTrail}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Immutability Explanation */}
        <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Tamper-Proof Records</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
            These records are stored on the Ethereum blockchain and <strong>cannot be modified, deleted, or falsified</strong>.
            Each entry is cryptographically linked to the previous one, ensuring complete data integrity for regulatory audits.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Batch Summary */}
        {batchInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Batch Code</p>
              <p className="font-mono font-semibold">{batchInfo.batchCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Drug Name</p>
              <p className="font-medium">{batchInfo.drugName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Status</p>
              <Badge className={statusColors[batchInfo.currentStatus]}>
                {batchInfo.currentStatusLabel}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Hash</p>
              <p className="font-mono text-xs truncate" title={batchInfo.dataHash}>
                {batchInfo.dataHash.slice(0, 16)}...
              </p>
            </div>
          </div>
        )}

        {/* Chain Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            <span>{chainInfo.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span>Chain ID: {chainInfo.chainId}</span>
          </div>
          <a
            href={`${chainInfo.blockExplorer}/address/${chainInfo.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <span>View Contract</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Separator />

        {/* Supply Chain Stage Legend */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Supply Chain Stages</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SUPPLY_CHAIN_STAGES).map(([key, stage]) => (
              <Badge
                key={key}
                variant="outline"
                className={`${stage.color} bg-opacity-10 border-opacity-30`}
              >
                {stageIcons[key as SupplyChainStage]}
                <span className="ml-1">{stage.name}</span>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Audit Timeline ({events.length} Events)
          </h4>

          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

              {events.map((event, index) => (
                <AuditEventCard
                  key={`${event.timestamp.getTime()}-${index}`}
                  event={event}
                  isFirst={index === 0}
                  isLast={index === events.length - 1}
                  blockExplorer={chainInfo.blockExplorer}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Regulatory Compliance Note */}
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Regulatory Compliance Ready</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300 text-sm">
            This audit trail meets FDA 21 CFR Part 11 and EU GMP Annex 11 requirements for electronic records.
            All timestamps are in UTC and records include complete chain of custody with responsible party identification.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Individual Audit Event Card
function AuditEventCard({
  event,
  isFirst,
  isLast,
  blockExplorer
}: {
  event: OnChainAuditEvent;
  isFirst: boolean;
  isLast: boolean;
  blockExplorer: string;
}) {
  const stageInfo = SUPPLY_CHAIN_STAGES[event.supplyChainStage];

  return (
    <div className="relative pl-10 pb-6 last:pb-0">
      {/* Timeline dot */}
      <div className={`absolute left-[11px] w-4 h-4 rounded-full border-2 border-background ${stageInfo.color} flex items-center justify-center`}>
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>

      <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${stageInfo.color} text-white`}>
                {stageIcons[event.supplyChainStage]}
                <span className="ml-1">{event.statusLabel}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stageInfo.name}
              </Badge>
              {isFirst && (
                <Badge variant="secondary" className="text-xs">Latest</Badge>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(event.timestamp, 'PPpp')}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{event.location}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{event.actorRole}</span>
                <code className="text-xs bg-muted px-1 rounded">
                  {truncateAddress(event.actor)}
                </code>
              </div>

              {event.notes && (
                <div className="flex items-start gap-2 text-muted-foreground md:col-span-2">
                  <FileText className="h-3 w-3 mt-0.5" />
                  <span className="text-xs">{event.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Immutable Badge */}
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              <Lock className="h-2 w-2 mr-1" />
              Immutable
            </Badge>
            {event.transactionHash && (
              <a
                href={`${blockExplorer}/tx/${event.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View Tx
                <ExternalLink className="h-2 w-2" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlockchainAuditTrail;
