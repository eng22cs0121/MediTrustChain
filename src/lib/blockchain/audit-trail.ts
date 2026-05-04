'use client';

import { JsonRpcProvider, Contract } from 'ethers';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN, BatchStatus, BatchStatusLabels } from './config';
import { MEDITRUST_ABI } from './abi';

/**
 * Audit Trail Service
 * 
 * Fetches immutable on-chain batch history records for regulatory compliance.
 * All records are cryptographically secured on the Ethereum blockchain and cannot be altered.
 */

// ============ Types ============

export interface OnChainAuditEvent {
  timestamp: Date;
  blockNumber: number;
  transactionHash: string;
  location: string;
  status: BatchStatus;
  statusLabel: string;
  actor: string; // Wallet address
  actorRole: string;
  notes: string;
  supplyChainStage: SupplyChainStage;
  stageIcon: string;
  isImmutable: true; // Always true - blockchain records cannot be changed
}

export interface OnChainBatchInfo {
  batchId: number;
  batchCode: string;
  drugName: string;
  manufacturer: string;
  quantity: number;
  mfgDate: Date;
  expDate: Date;
  currentStatus: BatchStatus;
  currentStatusLabel: string;
  dataHash: string;
  isRecalled: boolean;
  createdAt: Date;
  approvedAt: Date | null;
}

export interface AuditTrailResult {
  success: boolean;
  batchInfo: OnChainBatchInfo | null;
  events: OnChainAuditEvent[];
  totalEvents: number;
  chainInfo: {
    name: string;
    chainId: number;
    blockExplorer: string;
    contractAddress: string;
  };
  error?: string;
}

// Supply chain stages for visual mapping
export type SupplyChainStage =
  | 'manufacturing'
  | 'regulatory'
  | 'distribution'
  | 'logistics'
  | 'pharmacy'
  | 'delivered'
  | 'recalled'
  | 'expired';

// ============ Helper Functions ============

/**
 * Map batch status to supply chain stage
 */
function mapStatusToStage(status: BatchStatus): SupplyChainStage {
  switch (status) {
    case BatchStatus.CREATED:
      return 'manufacturing';
    case BatchStatus.PENDING_APPROVAL:
    case BatchStatus.APPROVED:
    case BatchStatus.REJECTED:
      return 'regulatory';
    case BatchStatus.IN_TRANSIT:
      return 'logistics';
    case BatchStatus.DELIVERED:
      return 'pharmacy';
    case BatchStatus.EXPIRED:
      return 'expired';
    case BatchStatus.RECALLED:
      return 'recalled';
    default:
      return 'manufacturing';
  }
}

/**
 * Get icon for supply chain stage
 */
function getStageIcon(stage: SupplyChainStage): string {
  switch (stage) {
    case 'manufacturing': return '🏭';
    case 'regulatory': return '📋';
    case 'distribution': return '📦';
    case 'logistics': return '🚛';
    case 'pharmacy': return '🏥';
    case 'delivered': return '✅';
    case 'recalled': return '🚨';
    case 'expired': return '⚠️';
    default: return '📍';
  }
}

/**
 * Infer actor role from notes and status
 */
function inferActorRole(status: BatchStatus, notes: string): string {
  // Check notes for role hints
  const lowerNotes = notes.toLowerCase();

  if (lowerNotes.includes('regulator') || lowerNotes.includes('approved') || lowerNotes.includes('rejected') || lowerNotes.includes('recall')) {
    return 'Regulator';
  }

  // Infer from status
  switch (status) {
    case BatchStatus.CREATED:
      return 'Manufacturer';
    case BatchStatus.PENDING_APPROVAL:
      return 'Manufacturer';
    case BatchStatus.APPROVED:
    case BatchStatus.REJECTED:
    case BatchStatus.RECALLED:
      return 'Regulator';
    case BatchStatus.IN_TRANSIT:
      return 'Logistics';
    case BatchStatus.DELIVERED:
    case BatchStatus.EXPIRED:
      return 'Pharmacy';
    default:
      return 'Supply Chain';
  }
}

/**
 * Truncate Ethereum address for display
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============ Main Audit Trail Function ============

/**
 * Fetch complete audit trail for a batch from blockchain
 * 
 * @param batchId - Numeric batch ID on blockchain
 * @returns AuditTrailResult with batch info and immutable event history
 */
export async function fetchOnChainAuditTrail(batchId: number): Promise<AuditTrailResult> {
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const baseResult: AuditTrailResult = {
    success: false,
    batchInfo: null,
    events: [],
    totalEvents: 0,
    chainInfo: {
      name: chainConfig.name,
      chainId: chainConfig.id,
      blockExplorer: chainConfig.blockExplorer,
      contractAddress: contractAddress || '',
    },
  };

  if (!contractAddress) {
    return { ...baseResult, error: 'Contract address not configured' };
  }

  try {
    // Create read-only provider
    const provider = new JsonRpcProvider(chainConfig.rpcUrl);
    const contract = new Contract(contractAddress, MEDITRUST_ABI, provider);

    // Fetch batch data
    let batchData;
    try {
      batchData = await contract.getBatch(batchId);
    } catch (err) {
      return { ...baseResult, error: `Batch #${batchId} not found on blockchain` };
    }

    // Parse batch info
    const batchInfo: OnChainBatchInfo = {
      batchId: Number(batchData.id),
      batchCode: batchData.batchCode,
      drugName: batchData.drugName,
      manufacturer: batchData.manufacturer,
      quantity: Number(batchData.quantity),
      mfgDate: new Date(Number(batchData.mfgDate) * 1000),
      expDate: new Date(Number(batchData.expDate) * 1000),
      currentStatus: Number(batchData.status) as BatchStatus,
      currentStatusLabel: BatchStatusLabels[Number(batchData.status) as BatchStatus],
      dataHash: batchData.dataHash,
      isRecalled: batchData.isRecalled,
      createdAt: new Date(Number(batchData.createdAt) * 1000),
      approvedAt: Number(batchData.approvedAt) > 0 ? new Date(Number(batchData.approvedAt) * 1000) : null,
    };

    // Fetch batch history
    const historyData = await contract.getBatchHistory(batchId);

    // Transform history to audit events
    const events: OnChainAuditEvent[] = historyData.map((h: {
      timestamp: bigint;
      location: string;
      status: number;
      updatedBy: string;
      notes: string;
    }, index: number) => {
      const status = Number(h.status) as BatchStatus;
      const stage = mapStatusToStage(status);

      return {
        timestamp: new Date(Number(h.timestamp) * 1000),
        blockNumber: 0, // Would need event logs for actual block number
        transactionHash: '', // Would need event logs for actual tx hash
        location: h.location || 'Unknown',
        status,
        statusLabel: BatchStatusLabels[status],
        actor: h.updatedBy,
        actorRole: inferActorRole(status, h.notes),
        notes: h.notes || '',
        supplyChainStage: stage,
        stageIcon: getStageIcon(stage),
        isImmutable: true,
      };
    });

    return {
      success: true,
      batchInfo,
      events,
      totalEvents: events.length,
      chainInfo: baseResult.chainInfo,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit trail';
    return { ...baseResult, error: errorMessage };
  }
}

/**
 * Fetch blockchain events (logs) for more detailed audit trail
 * This provides transaction hashes and block numbers
 */
export async function fetchBatchEventLogs(batchId: number): Promise<{
  created?: { txHash: string; blockNumber: number; timestamp: number };
  approved?: { txHash: string; blockNumber: number; timestamp: number };
  statusUpdates: { txHash: string; blockNumber: number; status: string; location: string }[];
  recalled?: { txHash: string; blockNumber: number; reason: string };
}> {
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const result: {
    created?: { txHash: string; blockNumber: number; timestamp: number };
    approved?: { txHash: string; blockNumber: number; timestamp: number };
    statusUpdates: { txHash: string; blockNumber: number; status: string; location: string }[];
    recalled?: { txHash: string; blockNumber: number; reason: string };
  } = {
    statusUpdates: [],
  };

  if (!contractAddress) return result;

  try {
    const provider = new JsonRpcProvider(chainConfig.rpcUrl);
    const contract = new Contract(contractAddress, MEDITRUST_ABI, provider);

    // Query BatchCreated events
    const createdFilter = contract.filters.BatchCreated(batchId);
    const createdEvents = await contract.queryFilter(createdFilter);
    if (createdEvents.length > 0) {
      const event = createdEvents[0];
      const block = await event.getBlock();
      result.created = {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp || 0,
      };
    }

    // Query BatchApproved events
    const approvedFilter = contract.filters.BatchApproved(batchId);
    const approvedEvents = await contract.queryFilter(approvedFilter);
    if (approvedEvents.length > 0) {
      const event = approvedEvents[0];
      const block = await event.getBlock();
      result.approved = {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block?.timestamp || 0,
      };
    }

    // Query BatchStatusUpdated events
    const statusFilter = contract.filters.BatchStatusUpdated(batchId);
    const statusEvents = await contract.queryFilter(statusFilter);
    for (const event of statusEvents) {
      const parsed = contract.interface.parseLog({ topics: [...event.topics], data: event.data });
      if (parsed) {
        result.statusUpdates.push({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          status: BatchStatusLabels[Number(parsed.args.newStatus) as BatchStatus],
          location: parsed.args.location,
        });
      }
    }

    // Query BatchRecalled events
    const recalledFilter = contract.filters.BatchRecalled(batchId);
    const recalledEvents = await contract.queryFilter(recalledFilter);
    if (recalledEvents.length > 0) {
      const event = recalledEvents[0];
      const parsed = contract.interface.parseLog({ topics: [...event.topics], data: event.data });
      result.recalled = {
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        reason: parsed?.args.reason || '',
      };
    }

  } catch (error) {
    console.error('Error fetching event logs:', error);
  }

  return result;
}

// ============ Supply Chain Stage Descriptions ============

export const SUPPLY_CHAIN_STAGES: Record<SupplyChainStage, {
  name: string;
  description: string;
  color: string;
}> = {
  manufacturing: {
    name: 'Manufacturing',
    description: 'Drug batch created at manufacturing facility',
    color: 'bg-blue-500',
  },
  regulatory: {
    name: 'Regulatory Review',
    description: 'Batch under review by regulatory authority',
    color: 'bg-purple-500',
  },
  distribution: {
    name: 'Distribution',
    description: 'Batch at distribution center',
    color: 'bg-indigo-500',
  },
  logistics: {
    name: 'In Transit',
    description: 'Batch being transported through supply chain',
    color: 'bg-yellow-500',
  },
  pharmacy: {
    name: 'At Pharmacy',
    description: 'Batch received at pharmacy location',
    color: 'bg-cyan-500',
  },
  delivered: {
    name: 'Delivered',
    description: 'Batch successfully delivered to destination',
    color: 'bg-green-500',
  },
  recalled: {
    name: 'Recalled',
    description: 'Batch recalled due to safety concerns',
    color: 'bg-red-500',
  },
  expired: {
    name: 'Expired',
    description: 'Batch has passed expiration date',
    color: 'bg-gray-500',
  },
};
