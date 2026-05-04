"use client";

import { useEffect, useCallback, useRef } from 'react';
import { Contract, ethers } from 'ethers';
import { useBlockchain } from './provider';
import { CONTRACT_ADDRESS, isBlockchainConfigured } from './config';
import { MEDITRUST_ABI } from './abi';

/**
 * Event types emitted by MediTrustChainV2 smart contract
 */
export interface BatchCreatedEvent {
    batchId: bigint;
    batchCode: string;
    manufacturer: string;
    drugName: string;
    quantity: bigint;
    dataHash: string;
}

export interface BatchApprovedEvent {
    batchId: bigint;
    regulator: string;
    approvedAt: bigint;
}

export interface BatchRejectedEvent {
    batchId: bigint;
    regulator: string;
    reason: string;
}

export interface BatchStatusUpdatedEvent {
    batchId: bigint;
    newStatus: number;
    updatedBy: string;
    location: string;
}

export interface BatchTransferredEvent {
    batchId: bigint;
    fromHolder: string;
    toHolder: string;
    location: string;
}

export interface BatchRecalledEvent {
    batchId: bigint;
    recalledBy: string;
    reason: string;
}

export interface BatchSubmittedForApprovalEvent {
    batchId: bigint;
    manufacturer: string;
    submittedAt: bigint;
}

export interface BatchShippedEvent {
    batchId: bigint;
    distributor: string;
    fromLocation: string;
    toLocation: string;
    shippedAt: bigint;
}

export interface BatchDeliveredToPharmacyEvent {
    batchId: bigint;
    logistics: string;
    pharmacyLocation: string;
    deliveredAt: bigint;
}

export interface BatchSoldEvent {
    batchId: bigint;
    pharmacy: string;
    location: string;
    soldAt: bigint;
}

/**
 * Event listener callbacks
 */
export interface EventCallbacks {
    onBatchCreated?: (event: BatchCreatedEvent) => void;
    onBatchApproved?: (event: BatchApprovedEvent) => void;
    onBatchRejected?: (event: BatchRejectedEvent) => void;
    onBatchStatusUpdated?: (event: BatchStatusUpdatedEvent) => void;
    onBatchTransferred?: (event: BatchTransferredEvent) => void;
    onBatchRecalled?: (event: BatchRecalledEvent) => void;
    onBatchSubmittedForApproval?: (event: BatchSubmittedForApprovalEvent) => void;
    onBatchShipped?: (event: BatchShippedEvent) => void;
    onBatchDeliveredToPharmacy?: (event: BatchDeliveredToPharmacyEvent) => void;
    onBatchSold?: (event: BatchSoldEvent) => void;
}

/**
 * Hook for listening to blockchain events
 * 
 * This enables event-driven architecture where the frontend
 * listens to contract events instead of polling state.
 * 
 * @example
 * ```tsx
 * useContractEvents({
 *   onBatchCreated: (event) => {
 *     console.log('New batch created:', event.batchId);
 *     // Refresh batch list
 *   },
 *   onBatchApproved: (event) => {
 *     toast.success(`Batch ${event.batchId} approved!`);
 *   },
 *   onBatchSold: (event) => {
 *     // Update analytics
 *   }
 * });
 * ```
 */
export function useContractEvents(callbacks: EventCallbacks) {
    const { wallet, provider } = useBlockchain();
    const contractRef = useRef<Contract | null>(null);
    const callbacksRef = useRef(callbacks);

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const setupListeners = useCallback(async () => {
        if (!isBlockchainConfigured() || !wallet.isConnected || !provider) {
            return;
        }

        try {
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                MEDITRUST_ABI,
                provider
            );

            contractRef.current = contract;

            // Listen to BatchCreated events
            contract.on('BatchCreated', (batchId, batchCode, manufacturer, drugName, quantity, dataHash) => {
                callbacksRef.current.onBatchCreated?.({
                    batchId, batchCode, manufacturer, drugName, quantity, dataHash
                });
            });

            // Listen to BatchApproved events
            contract.on('BatchApproved', (batchId, regulator, approvedAt) => {
                callbacksRef.current.onBatchApproved?.({ batchId, regulator, approvedAt });
            });

            // Listen to BatchRejected events
            contract.on('BatchRejected', (batchId, regulator, reason) => {
                callbacksRef.current.onBatchRejected?.({ batchId, regulator, reason });
            });

            // Listen to BatchStatusUpdated events
            contract.on('BatchStatusUpdated', (batchId, newStatus, updatedBy, location) => {
                callbacksRef.current.onBatchStatusUpdated?.({ batchId, newStatus, updatedBy, location });
            });

            // Listen to BatchTransferred events
            contract.on('BatchTransferred', (batchId, fromHolder, toHolder, location) => {
                callbacksRef.current.onBatchTransferred?.({ batchId, fromHolder, toHolder, location });
            });

            // Listen to BatchRecalled events
            contract.on('BatchRecalled', (batchId, recalledBy, reason) => {
                callbacksRef.current.onBatchRecalled?.({ batchId, recalledBy, reason });
            });

            // Listen to BatchSubmittedForApproval events
            contract.on('BatchSubmittedForApproval', (batchId, manufacturer, submittedAt) => {
                callbacksRef.current.onBatchSubmittedForApproval?.({ batchId, manufacturer, submittedAt });
            });

            // Listen to BatchShipped events
            contract.on('BatchShipped', (batchId, distributor, fromLocation, toLocation, shippedAt) => {
                callbacksRef.current.onBatchShipped?.({ batchId, distributor, fromLocation, toLocation, shippedAt });
            });

            // Listen to BatchDeliveredToPharmacy events
            contract.on('BatchDeliveredToPharmacy', (batchId, logistics, pharmacyLocation, deliveredAt) => {
                callbacksRef.current.onBatchDeliveredToPharmacy?.({ batchId, logistics, pharmacyLocation, deliveredAt });
            });

            // Listen to BatchSold events
            contract.on('BatchSold', (batchId, pharmacy, location, soldAt) => {
                callbacksRef.current.onBatchSold?.({ batchId, pharmacy, location, soldAt });
            });

            console.log('🔔 Event listeners attached to contract');
        } catch (error) {
            console.error('Failed to setup event listeners:', error);
        }
    }, [wallet.isConnected, provider]);

    const cleanupListeners = useCallback(() => {
        if (contractRef.current) {
            contractRef.current.removeAllListeners();
            contractRef.current = null;
            console.log('🔕 Event listeners removed');
        }
    }, []);

    useEffect(() => {
        setupListeners();
        return cleanupListeners;
    }, [setupListeners, cleanupListeners]);

    return {
        isListening: contractRef.current !== null
    };
}

/**
 * Query historical events from the blockchain
 * 
 * @param eventName - Name of the event to query
 * @param fromBlock - Starting block number (default: last 1000 blocks)
 * @returns Array of event logs
 */
export async function queryEvents(
    provider: ethers.Provider,
    eventName: string,
    fromBlock?: number
): Promise<ethers.Log[]> {
    if (!isBlockchainConfigured()) {
        return [];
    }

    try {
        const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            MEDITRUST_ABI,
            provider
        );

        const currentBlock = await provider.getBlockNumber();
        const startBlock = fromBlock ?? Math.max(0, currentBlock - 1000);

        const filter = contract.filters[eventName]?.();
        if (!filter) {
            console.warn(`Event ${eventName} not found in contract`);
            return [];
        }

        const events = await contract.queryFilter(filter, startBlock, currentBlock);
        return events;
    } catch (error) {
        console.error(`Failed to query ${eventName} events:`, error);
        return [];
    }
}
