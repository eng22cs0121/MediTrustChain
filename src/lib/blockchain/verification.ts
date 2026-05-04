'use client';

/**
 * Blockchain Verification Service for MediTrustChain
 * Handles patient-side drug authenticity verification with hash comparison
 * V2: Supports read-only verification without MetaMask for patients
 */

import { keccak256, toUtf8Bytes, JsonRpcProvider, Contract } from 'ethers';
import { BatchStatus, BatchStatusLabels, isBlockchainConfigured, CONTRACT_ADDRESS, SUPPORTED_CHAINS, DEFAULT_CHAIN } from './config';
import { MEDITRUST_ABI } from './abi';

/**
 * Get a read-only contract instance using public RPC
 * This allows patients to verify batches without MetaMask
 */
export function getReadOnlyContract(): Contract | null {
  if (!isBlockchainConfigured()) {
    return null;
  }

  try {
    const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];
    const provider = new JsonRpcProvider(chainConfig.rpcUrl);
    return new Contract(CONTRACT_ADDRESS, MEDITRUST_ABI, provider);
  } catch (error) {
    console.error('Failed to create read-only contract:', error);
    return null;
  }
}

// Types for verification
export interface BatchVerificationInput {
  batchCode: string;
  drugName: string;
  quantity: number;
  mfgDate: number; // Unix timestamp
  expDate: number; // Unix timestamp
  manufacturer: string;
}

// V2: Separated core and state data from on-chain
export interface OnChainBatchCore {
  id: bigint;
  batchCode: string;
  manufacturer: string;
  drugName: string;
  quantity: bigint;
  mfgDate: bigint;
  expDate: bigint;
  createdAt: bigint;
  dataHash: string;
}

export interface OnChainBatchState {
  status: number;
  approvedAt: bigint;
  approvalHash: string;
  currentHolder: string;
  lastLocation: string;
  isRecalled: boolean;
  lastUpdated: bigint;
}

// Combined on-chain batch data for verification
export interface OnChainBatchData {
  id: bigint;
  batchCode: string;
  manufacturer: string;
  drugName: string;
  quantity: bigint;
  mfgDate: bigint;
  expDate: bigint;
  status: number;
  createdAt: bigint;
  approvedAt: bigint;
  approvalHash: string;
  dataHash: string;
  isRecalled: boolean;
  // V2 state fields
  currentHolder: string;
  lastLocation: string;
  lastUpdated: bigint;
}

export interface VerificationResult {
  isAuthentic: boolean;
  status: 'GENUINE' | 'TAMPERED' | 'NOT_FOUND' | 'NOT_APPROVED' | 'EXPIRED' | 'RECALLED' | 'BLOCKCHAIN_ERROR' | 'NOT_CONFIGURED';
  message: string;
  details: {
    batchId?: string;
    drugName?: string;
    manufacturer?: string;
    expiryDate?: string;
    batchStatus?: string;
    onChainHash?: string;
    computedHash?: string;
    hashMatch?: boolean;
    blockchainVerified?: boolean;
    contractVerification?: {
      isGenuine: boolean;
      status: string;
    };
  };
  logs: string[];
}

/**
 * Compute SHA-256/Keccak256 hash from batch data
 * This must match the hash computation done when the batch was created
 * CRITICAL: Key order must match exactly with generateDataHash in hooks.ts
 */
export function computeBatchHash(data: BatchVerificationInput): string {
  // Create deterministic JSON string with SAME KEY ORDER as hooks.ts
  // Order: batchCode, drugName, quantity, mfgDate, expDate
  const hashInput = {
    batchCode: data.batchCode,
    drugName: data.drugName,
    quantity: data.quantity,
    mfgDate: data.mfgDate,
    expDate: data.expDate,
    manufacturer: data.manufacturer || '',
  };

  const jsonString = JSON.stringify(hashInput);
  const hash = keccak256(toUtf8Bytes(jsonString));

  return hash;
}

/**
 * Parse QR code data and extract batch information
 * V2: Now includes dataHash from the on-chain creation
 */
export function parseQRCodeData(qrCodeData: string): {
  batchId?: string;
  batchCode?: string;
  drugName?: string;
  manufacturer?: string;
  mfgDate?: string | number;
  expDate?: string | number;
  quantity?: number;
  dataHash?: string;
} | null {
  try {
    const data = JSON.parse(qrCodeData);
    
    // If somehow parsed as simple string
    if (typeof data === 'string') {
      return {
        batchId: data,
        batchCode: data
      };
    }
    
    return {
      batchId: data.batchCode || data.batchId,
      batchCode: data.batchCode || data.batchId,
      drugName: data.drugName,
      manufacturer: data.manufacturer,
      mfgDate: data.mfgDate,
      expDate: data.expDate,
      quantity: data.quantity,
      dataHash: data.dataHash,
    };
  } catch (error) {
    // If NOT JSON, assume it was manually entered as plain text
    if (typeof qrCodeData === 'string' && qrCodeData.trim() !== '') {
      return {
        batchId: qrCodeData.trim(),
        batchCode: qrCodeData.trim()
      };
    }
    console.error('Failed to parse QR code data:', error);
    return null;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if batch is expired based on on-chain expiry date
 */
export function isBatchExpired(expDate: bigint | number): boolean {
  const expiryTimestamp = Number(expDate) * 1000;
  return Date.now() > expiryTimestamp;
}

/**
 * Get human-readable status from batch status enum
 */
export function getStatusLabel(status: number): string {
  return BatchStatusLabels[status as BatchStatus] || 'Unknown';
}

/**
 * Verify batch authenticity using blockchain
 * This is the main verification function that orchestrates the entire flow
 */
export async function verifyBatchOnBlockchain(
  qrCodeData: string,
  contract: any,
  localBatches?: any[]
): Promise<VerificationResult> {
  const logs: string[] = [];
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    console.log(`🔗 ${logEntry}`);
  };

  addLog('=== BLOCKCHAIN VERIFICATION STARTED ===');

  // Check if blockchain is configured
  if (!isBlockchainConfigured()) {
    addLog('❌ Blockchain not configured - CONTRACT_ADDRESS not set');
    return {
      isAuthentic: false,
      status: 'NOT_CONFIGURED',
      message: 'Blockchain verification is not available. Contract not deployed.',
      details: {},
      logs,
    };
  }

  // Step 1: Parse QR Code
  addLog('Step 1: Parsing QR code data...');
  const qrData = parseQRCodeData(qrCodeData);

  if (!qrData || !qrData.batchCode) {
    addLog('❌ Failed to parse QR code or missing batchCode');
    return {
      isAuthentic: false,
      status: 'TAMPERED',
      message: 'Invalid QR code format. This may be a counterfeit product.',
      details: {},
      logs,
    };
  }

  addLog(`   Batch Code: ${qrData.batchCode}`);
  addLog(`   Drug Name: ${qrData.drugName || 'N/A'}`);
  addLog(`   Manufacturer: ${qrData.manufacturer || 'N/A'}`);

  // Step 2: Get contract (use provided or fall back to read-only for patients)
  let contractToUse = contract;
  if (!contract) {
    addLog('🔄 No wallet connected - using read-only RPC for patient verification');
    contractToUse = getReadOnlyContract();

    if (!contractToUse) {
      addLog('⚠️ Failed to create read-only contract - falling back to local verification');
      return verifyWithLocalData(qrData, localBatches, logs);
    }
    addLog('✅ Connected to blockchain via public RPC (read-only)');
  }

  try {
    // Step 3: Fetch batch from blockchain by code
    addLog('Step 2: Fetching batch from blockchain...');

    let batchId: bigint;
    try {
      batchId = await contractToUse.getBatchIdByCode(qrData.batchCode);
      addLog(`   Found batch ID on-chain: ${batchId.toString()}`);
    } catch (error) {
      addLog('❌ Batch not found on blockchain');
      // Fall back to local verification
      return verifyWithLocalData(qrData, localBatches, logs);
    }

    if (Number(batchId) === 0) {
      addLog('❌ Batch ID is 0 - batch does not exist on blockchain');
      return verifyWithLocalData(qrData, localBatches, logs);
    }

    // Step 4: Get full batch data from blockchain using V2's getBatchFull
    addLog('Step 3: Retrieving batch details from blockchain (V2)...');
    const [batchCore, batchState] = await contractToUse.getBatchFull(batchId);

    // Combine core and state for easier usage
    const onChainBatch: OnChainBatchData = {
      id: batchCore.id,
      batchCode: batchCore.batchCode,
      manufacturer: batchCore.manufacturer,
      drugName: batchCore.drugName,
      quantity: batchCore.quantity,
      mfgDate: batchCore.mfgDate,
      expDate: batchCore.expDate,
      createdAt: batchCore.createdAt,
      dataHash: batchCore.dataHash,
      status: Number(batchState.status),
      approvedAt: batchState.approvedAt,
      approvalHash: batchState.approvalHash,
      isRecalled: batchState.isRecalled,
      currentHolder: batchState.currentHolder,
      lastLocation: batchState.lastLocation,
      lastUpdated: batchState.lastUpdated,
    };

    addLog(`   On-chain Drug Name: ${onChainBatch.drugName}`);
    addLog(`   On-chain Manufacturer: ${onChainBatch.manufacturer}`);
    addLog(`   On-chain Quantity: ${onChainBatch.quantity.toString()}`);
    addLog(`   On-chain Status: ${getStatusLabel(onChainBatch.status)}`);
    addLog(`   On-chain Data Hash: ${onChainBatch.dataHash}`);
    addLog(`   Current Holder: ${onChainBatch.currentHolder}`);
    addLog(`   Last Location: ${onChainBatch.lastLocation}`);
    addLog(`   Is Recalled: ${onChainBatch.isRecalled}`);

    // V2: The on-chain hash is stored as part of BatchCore.
    // For verification, we compare:
    // - If QR has dataHash: compare QR hash with on-chain hash (GENUINE if they match)
    // - If QR has no dataHash (legacy): use on-chain hash for basic verification
    addLog('Step 4: Preparing hash for verification...');

    const onChainHash = onChainBatch.dataHash;
    const qrDataHash = qrData.dataHash; // V2: Hash from QR code

    addLog(`   On-chain Hash: ${onChainHash}`);
    addLog(`   QR Code Hash: ${qrDataHash || 'NOT PRESENT (legacy QR)'}`);
    addLog(`   Batch Code: ${onChainBatch.batchCode}, Drug: ${onChainBatch.drugName}, Qty: ${onChainBatch.quantity}`);

    // V2 CRITICAL: If QR code contains a dataHash, verify it matches on-chain hash
    // This is the PRIMARY anti-tampering check
    if (qrDataHash) {
      if (qrDataHash !== onChainHash) {
        addLog('❌ CRITICAL: QR code hash does NOT match on-chain hash!');
        addLog('   This product may be COUNTERFEIT or TAMPERED!');
        return {
          isAuthentic: false,
          status: 'TAMPERED',
          message: `🚨 TAMPERED: The hash on this QR code does not match blockchain records. This may be a counterfeit product!`,
          details: {
            batchId: batchId.toString(),
            drugName: onChainBatch.drugName,
            manufacturer: onChainBatch.manufacturer,
            expiryDate: formatTimestamp(onChainBatch.expDate),
            batchStatus: getStatusLabel(onChainBatch.status),
            onChainHash,
            computedHash: qrDataHash,
            hashMatch: false,
            blockchainVerified: true,
          },
          logs,
        };
      }
      addLog('✅ QR code hash matches on-chain hash - data integrity verified!');
    } else {
      addLog('   (Legacy QR without dataHash - using on-chain verification only)');
    }

    // Step 5: Call verifyBatchWithHash() function for complete verification
    // V2: Contract verifies hash + status + expiry + recall in one call
    // Use QR hash if available, otherwise use on-chain hash
    const hashToVerify = qrDataHash || onChainHash;

    addLog('Step 5: Calling verifyBatchWithHash() on smart contract...');
    addLog('   (V2 Contract will verify hash + status + expiry + recall in one call)');

    let contractVerification: { isGenuine: boolean; status: string } = { isGenuine: false, status: 'UNKNOWN' };

    try {
      // V2: Pass the hash for verification (QR hash or on-chain hash)
      const [isGenuine, status] = await contract.verifyBatchWithHash(batchId, hashToVerify);
      contractVerification = { isGenuine, status };
    } catch (error: any) {
      addLog(`   ⚠️ Contract verification with hash failed: ${error.message}`);
      addLog('   Falling back to local verification...');
      return verifyWithLocalData(qrData, localBatches, logs);
    }

    addLog(`   Contract Verification Result: ${contractVerification.isGenuine ? '✅ GENUINE' : '❌ NOT GENUINE'}`);
    addLog(`   Contract Status: ${contractVerification.status}`);
    addLog('Step 6: Contract is the single source of truth - using its decision');

    // Contract has made the final decision - trust it!
    const hashMatch = contractVerification.status !== 'TAMPERED';

    // Return based on contract's decision
    if (contractVerification.status === 'TAMPERED') {
      addLog('❌ RESULT: Contract detected TAMPERED data (hash mismatch)');
      return {
        isAuthentic: false,
        status: 'TAMPERED',
        message: `🚨 TAMPERED: The data on this product does not match blockchain records. This may be a counterfeit or modified product!`,
        details: {
          batchId: batchId.toString(),
          drugName: onChainBatch.drugName,
          manufacturer: onChainBatch.manufacturer,
          expiryDate: formatTimestamp(onChainBatch.expDate),
          batchStatus: getStatusLabel(Number(onChainBatch.status)),
          onChainHash,
          computedHash: onChainHash, // V2: No separate computed hash, using on-chain hash
          hashMatch: false,
          blockchainVerified: true,
          contractVerification,
        },
        logs,
      };
    }

    if (contractVerification.status === 'RECALLED') {
      addLog('❌ RESULT: Contract detected RECALLED batch');
      return {
        isAuthentic: false,
        status: 'RECALLED',
        message: `⚠️ RECALLED: This batch (${qrData.batchCode}) has been recalled by regulators. DO NOT USE.`,
        details: {
          batchId: batchId.toString(),
          drugName: onChainBatch.drugName,
          manufacturer: onChainBatch.manufacturer,
          expiryDate: formatTimestamp(onChainBatch.expDate),
          batchStatus: getStatusLabel(Number(onChainBatch.status)),
          onChainHash,
          computedHash: onChainHash, // V2: Using on-chain hash
          hashMatch,
          blockchainVerified: true,
          contractVerification,
        },
        logs,
      };
    }

    if (contractVerification.status === 'EXPIRED') {
      addLog('❌ RESULT: Contract detected EXPIRED batch');
      return {
        isAuthentic: false,
        status: 'EXPIRED',
        message: `⚠️ EXPIRED: This medicine expired on ${formatTimestamp(onChainBatch.expDate)}. Do not use expired medication.`,
        details: {
          batchId: batchId.toString(),
          drugName: onChainBatch.drugName,
          manufacturer: onChainBatch.manufacturer,
          expiryDate: formatTimestamp(onChainBatch.expDate),
          batchStatus: getStatusLabel(Number(onChainBatch.status)),
          onChainHash,
          computedHash: onChainHash, // V2: Using on-chain hash
          hashMatch,
          blockchainVerified: true,
          contractVerification,
        },
        logs,
      };
    }

    if (contractVerification.status === 'NOT_APPROVED') {
      addLog(`❌ RESULT: Contract detected NOT_APPROVED status`);
      return {
        isAuthentic: false,
        status: 'NOT_APPROVED',
        message: `⚠️ NOT APPROVED: This batch (${qrData.batchCode}) has not been approved by regulators.`,
        details: {
          batchId: batchId.toString(),
          drugName: onChainBatch.drugName,
          manufacturer: onChainBatch.manufacturer,
          expiryDate: formatTimestamp(onChainBatch.expDate),
          batchStatus: getStatusLabel(Number(onChainBatch.status)),
          onChainHash,
          computedHash: onChainHash, // V2: Using on-chain hash
          hashMatch,
          blockchainVerified: true,
          contractVerification,
        },
        logs,
      };
    }

    // Status is GENUINE - all checks passed!
    addLog('✅ RESULT: Batch is GENUINE (verified by smart contract)');
    addLog('=== BLOCKCHAIN VERIFICATION COMPLETED ===');

    return {
      isAuthentic: true,
      status: 'GENUINE',
      message: `✅ AUTHENTIC: ${onChainBatch.drugName} (Batch ${qrData.batchCode}) is verified genuine on the blockchain.`,
      details: {
        batchId: batchId.toString(),
        drugName: onChainBatch.drugName,
        manufacturer: onChainBatch.manufacturer,
        expiryDate: formatTimestamp(onChainBatch.expDate),
        batchStatus: getStatusLabel(Number(onChainBatch.status)),
        onChainHash,
        computedHash: onChainHash, // V2: Using on-chain hash
        hashMatch: true,
        blockchainVerified: true,
        contractVerification,
      },
      logs,
    };

  } catch (error: any) {
    addLog(`❌ Blockchain error: ${error.message}`);
    addLog('Falling back to local verification...');
    return verifyWithLocalData(qrData, localBatches, logs);
  }
}


/**
 * Fallback verification using local batch data
 * Used when blockchain is not available
 */
function verifyWithLocalData(
  qrData: ReturnType<typeof parseQRCodeData>,
  localBatches: any[] | undefined,
  logs: string[]
): VerificationResult {
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    console.log(`🔗 ${logEntry}`);
  };

  addLog('=== LOCAL VERIFICATION (Blockchain unavailable) ===');

  if (!qrData) {
    return {
      isAuthentic: false,
      status: 'TAMPERED',
      message: 'Invalid QR code format.',
      details: {},
      logs,
    };
  }

  if (!localBatches || localBatches.length === 0) {
    addLog('No local batches available for verification');
    return {
      isAuthentic: false,
      status: 'NOT_FOUND',
      message: `Batch ${qrData.batchCode} could not be verified. Please connect to blockchain for full verification.`,
      details: {
        batchId: qrData.batchCode,
      },
      logs,
    };
  }

  // Find batch in local data
  addLog(`Searching for batch ${qrData.batchCode} in ${localBatches.length} local records`);
  const batch = localBatches.find(b => b.id === qrData.batchCode);

  if (!batch) {
    addLog(`Batch ${qrData.batchCode} not found in local records`);
    addLog(`Available batch IDs: ${localBatches.map(b => b.id).join(', ')}`);
    return {
      isAuthentic: false,
      status: 'NOT_FOUND',
      message: `Batch ${qrData.batchCode} not found in system. This product may be counterfeit.`,
      details: {
        batchId: qrData.batchCode,
      },
      logs,
    };
  }

  addLog(`Found batch in local records: ${batch.name}`);
  addLog(`Current batch status: ${batch.status}`);

  // Check if batch is in a valid state for use (V2 status machine)
  const validStatuses = ['Approved', 'In-Transit', 'At-Pharmacy', 'Sold'];
  if (!validStatuses.includes(batch.status)) {
    addLog(`❌ Batch status is ${batch.status} - not approved for use`);

    if (batch.status === 'Blocked' || batch.status === 'Rejected') {
      return {
        isAuthentic: false,
        status: 'NOT_APPROVED',
        message: `⚠️ Batch ${qrData.batchCode} has been ${batch.status.toLowerCase()} by regulators. Do not use this product.`,
        details: {
          batchId: qrData.batchCode,
          drugName: batch.name,
          manufacturer: batch.manufacturer,
          batchStatus: batch.status,
          blockchainVerified: false,
        },
        logs,
      };
    }

    if (batch.status === 'Pending') {
      return {
        isAuthentic: false,
        status: 'NOT_APPROVED',
        message: `⚠️ Batch ${qrData.batchCode} is pending regulatory approval and not yet authorized for distribution.`,
        details: {
          batchId: qrData.batchCode,
          drugName: batch.name,
          manufacturer: batch.manufacturer,
          batchStatus: batch.status,
          blockchainVerified: false,
        },
        logs,
      };
    }

    // For 'Flagged' or other non-approved statuses
    return {
      isAuthentic: false,
      status: 'NOT_APPROVED',
      message: `⚠️ Batch ${qrData.batchCode} status is ${batch.status}. Please verify with your pharmacist.`,
      details: {
        batchId: qrData.batchCode,
        drugName: batch.name,
        manufacturer: batch.manufacturer,
        batchStatus: batch.status,
        blockchainVerified: false,
      },
      logs,
    };
  }

  addLog(`✅ Batch status check passed: ${batch.status}`);

  // Check expiry
  const expiryDate = new Date(batch.exp);
  if (expiryDate < new Date()) {
    return {
      isAuthentic: false,
      status: 'EXPIRED',
      message: `This medicine expired on ${expiryDate.toLocaleDateString()}.`,
      details: {
        batchId: qrData.batchCode,
        drugName: batch.name,
        manufacturer: batch.manufacturer,
        expiryDate: expiryDate.toLocaleDateString(),
        batchStatus: batch.status,
        blockchainVerified: false,
      },
      logs,
    };
  }

  // Local verification passed (but not blockchain verified)
  addLog('⚠️ Local verification passed, but blockchain verification not available');

  return {
    isAuthentic: true,
    status: 'GENUINE',
    message: `${batch.name} (Batch ${qrData.batchCode}) verified in local records. Note: Blockchain verification not available.`,
    details: {
      batchId: qrData.batchCode,
      drugName: batch.name,
      manufacturer: batch.manufacturer,
      expiryDate: expiryDate.toLocaleDateString(),
      batchStatus: batch.status,
      blockchainVerified: false,
    },
    logs,
  };
}
