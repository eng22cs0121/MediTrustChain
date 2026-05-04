'use client';

import { useCallback } from 'react';
import { useBlockchain } from './provider';
import { BatchStatus, UserRole, BatchStatusLabels } from './config';
import { keccak256, toUtf8Bytes } from 'ethers';

// Types for contract interactions - V2 with separated Core/State
export interface BlockchainBatchCore {
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

export interface BlockchainBatchState {
  status: BatchStatus;
  approvedAt: bigint;
  approvalHash: string;
  currentHolder: string;
  lastLocation: string;
  isRecalled: boolean;
  lastUpdated: bigint;
}

// Combined batch for easier consumption - flattens Core + State
export interface BlockchainBatch {
  id: bigint;
  batchCode: string;
  manufacturer: string;
  drugName: string;
  quantity: bigint;
  mfgDate: bigint;
  expDate: bigint;
  status: BatchStatus;
  createdAt: bigint;
  approvedAt: bigint;
  approvalHash: string;
  dataHash: string;
  isRecalled: boolean;
  // New V2 fields from BatchState
  currentHolder: string;
  lastLocation: string;
  lastUpdated: bigint;
}

export interface BlockchainBatchHistory {
  timestamp: bigint;
  location: string;
  status: BatchStatus;
  updatedBy: string;
  notes: string;
}

export interface BlockchainUser {
  walletAddress: string;
  role: UserRole;
  organizationName: string;
  isActive: boolean;
  registeredAt: bigint;
}

  export interface CreateBatchParams {
    batchCode: string;
    drugName: string;
    quantity: number;
    mfgDate: Date;
    expDate: Date;
    dataHash?: string;
    drugTemplateId: number; // NEW
  }

  export interface TransactionResult {
    success: boolean;
    hash?: string;
    error?: string;
    data?: { batchId?: string; templateId?: string;[key: string]: unknown };
  }

  export function useContract() {
    // ... setup and generateDataHash, isReady, registerUser remain the same
    const { contract, wallet, isConfigured } = useBlockchain();

    const generateDataHash = useCallback((data: {
      batchCode?: string;
      batchId?: string;
      drugName: string;
      quantity?: number;
      qty?: number;
      mfgDate: number;
      expDate: number;
      manufacturer?: string;
    }): string => {
      const deterministicData = {
        batchCode: data.batchCode || data.batchId,
        drugName: data.drugName,
        quantity: data.quantity || data.qty,
        mfgDate: data.mfgDate,
        expDate: data.expDate,
        manufacturer: data.manufacturer || ''
      };

      const jsonString = JSON.stringify(deterministicData);
      return keccak256(toUtf8Bytes(jsonString));
    }, []);

    const isReady = useCallback((): boolean => {
      return isConfigured && wallet.isConnected && wallet.isCorrectChain && contract !== null;
    }, [isConfigured, wallet.isConnected, wallet.isCorrectChain, contract]);

    const registerUser = useCallback(async (
      role: UserRole,
      organizationName: string
    ): Promise<TransactionResult> => {
      if (!contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      try {
        const tx = await contract.registerUser(role, organizationName);
        const receipt = await tx.wait();
        return { success: true, hash: receipt.hash };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        return { success: false, error: errorMessage };
      }
    }, [contract]);

    // Regulator approves a drug template
    const approveDrugTemplate = useCallback(async (
      drugCode: string,
      drugName: string,
      composition: string,
      strength: string
    ): Promise<TransactionResult> => {
      if (!contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      try {
        const tx = await contract.approveDrugTemplate(drugCode, drugName, composition, strength);
        const receipt = await tx.wait();

        // Extract template ID from event
        let templateId: string | undefined;
        let compositionHash: string | undefined;
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name === 'DrugTemplateCreated') {
              templateId = parsed.args.templateId.toString();
              compositionHash = parsed.args.compositionHash;
              break;
            }
          } catch {
            // Ignore parse errors
          }
        }

        return { success: true, hash: receipt.hash, data: { templateId, compositionHash } };
      } catch (err: unknown) {
        let errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        if (errorMessage.includes('Only approved regulators')) {
            errorMessage = '🚫 Your wallet is not an approved regulator.';
        } else if (errorMessage.includes('already exists')) {
            errorMessage = '🚫 Drug code already exists on the blockchain.';
        }
        return { success: false, error: errorMessage };
      }
    }, [contract]);

    const createBatch = useCallback(async (params: CreateBatchParams): Promise<TransactionResult> => {
      if (!contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      try {
        try {
          const signer = contract.runner as any;
          const userAddress = signer?.address || (await signer?.getAddress?.());
          if (userAddress) {
            const userInfo = await contract.users(userAddress);
            if (!userInfo[3]) {
              console.log('[createBatch] User not registered, auto-registering as Manufacturer...');
              const regTx = await contract.registerUser(UserRole.MANUFACTURER, 'Auto-registered Manufacturer');
              await regTx.wait();
              console.log('[createBatch] Auto-registration complete');
            }
          }
        } catch (regCheckErr) {
          console.log('[createBatch] Registration check failed, attempting auto-register...');
          try {
            const regTx = await contract.registerUser(UserRole.MANUFACTURER, 'Auto-registered Manufacturer');
            await regTx.wait();
            console.log('[createBatch] Auto-registration complete');
          } catch (regErr: unknown) {
            const regErrMessage = regErr instanceof Error ? regErr.message : '';
            if (!regErrMessage.includes('already registered')) {
              console.log('[createBatch] Registration error (may be already registered):', regErrMessage);
            }
          }
        }

        const mfgTimestamp = Math.floor(params.mfgDate.getTime() / 1000);
        const expTimestamp = Math.floor(params.expDate.getTime() / 1000);

        const tx = await contract.createBatch(
          params.batchCode,
          params.drugName,
          params.quantity,
          mfgTimestamp,
          expTimestamp,
          params.drugTemplateId
        );

        const receipt = await tx.wait();

        let batchId: bigint | undefined;
        let dataHash: string | undefined;
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name === 'BatchCreated') {
              batchId = parsed.args.batchId;
              dataHash = parsed.args.dataHash;
              break;
            }
          } catch {
            // Continue
          }
        }

        return { success: true, hash: receipt.hash, data: { batchId: batchId?.toString(), dataHash } };
      } catch (err: unknown) {
        let errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        if (errorMessage.includes('not found') || errorMessage.includes('inactive')) {
            errorMessage = '❌ Invalid or inactive drug template.';
        } else if (errorMessage.includes('not approved')) {
            errorMessage = '❌ Drug composition does not match the approved template on the blockchain.';
        }
        return { success: false, error: errorMessage };
      }
    }, [contract]);

  // Helper for auto-registration
  const ensureRegistered = useCallback(async (role: UserRole, roleName: string) => {
    if (!contract) return;
    try {
      // Get signer address using the provider
      const signer = contract.runner as any;
      const userAddress = signer?.address || (await signer?.getAddress?.());

      if (userAddress) {
        const userInfo = await contract.users(userAddress);
        // userInfo[3] is isActive
        if (!userInfo[3]) {
          console.log(`[AutoRegister] User not registered, auto-registering as ${roleName}...`);
          const regTx = await contract.registerUser(role, `Auto-registered ${roleName}`);
          await regTx.wait();
          console.log('[AutoRegister] Complete');
        }
      }
    } catch (err) {
      console.log('[AutoRegister] Check failed, attempting speculative registration...', err);
      try {
        const regTx = await contract.registerUser(role, `Auto-registered ${roleName}`);
        await regTx.wait();
      } catch (regErr: any) {
        if (!regErr.message?.includes('already registered')) {
          console.warn('[AutoRegister] Failed:', regErr);
        }
      }
    }
  }, [contract]);

  // Submit batch for regulatory approval
  const submitForApproval = useCallback(async (batchId: number): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.submitForApproval(batchId);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract]);

  // Approve batch (regulator only)
  const approveBatch = useCallback(async (
    batchId: number,
    approvalHash?: string
  ): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      // Generate approval hash from approval data (not batch data)
      const hash = approvalHash || keccak256(toUtf8Bytes(JSON.stringify({ batchId, timestamp: Date.now(), action: 'approve' })));
      const tx = await contract.approveBatch(batchId, hash);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      let errorMessage = err instanceof Error ? err.message : 'Transaction failed';

      // Parse specific error cases
      if (errorMessage.includes('Only approved regulators')) {
        errorMessage = '🚫 Your wallet is not an approved regulator. Please register as a regulator and get approval from the contract owner first.';
      } else if (errorMessage.includes('PENDING_APPROVAL')) {
        errorMessage = '⚠️ Batch status must be PENDING_APPROVAL. The batch may not have been submitted for approval yet.';
      } else if (errorMessage.includes('Batch does not exist')) {
        errorMessage = '❌ Batch does not exist on blockchain. Make sure the batch was created on-chain.';
      } else if (errorMessage.includes('missing revert data') || errorMessage.includes('CALL_EXCEPTION')) {
        errorMessage = '🚫 Transaction reverted. Possible reasons:\n1. You are not registered as an approved regulator\n2. Batch status is not PENDING_APPROVAL\n3. Batch does not exist on blockchain\n\nPlease ensure you are registered and approved as a regulator.';
      }

      return { success: false, error: errorMessage };
    }
  }, [contract, generateDataHash, ensureRegistered]);

  // Reject batch (regulator only)
  const rejectBatch = useCallback(async (
    batchId: number,
    reason: string
  ): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.rejectBatch(batchId, reason);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract, ensureRegistered]);

  // Update batch status
  const updateBatchStatus = useCallback(async (
    batchId: number,
    newStatus: BatchStatus,
    location: string
  ): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      // Auto-register based on the status we're moving TO
      // If moving to IN_TRANSIT (4) -> Distributor
      // If moving to AT_PHARMACY or DELIVERED (5) -> Logistics
      // If moving to SOLD (6) -> Pharmacy

      let role: UserRole | -1 = -1;
      let roleName = 'User';

      if (newStatus === BatchStatus.IN_TRANSIT) {
        role = UserRole.DISTRIBUTOR;
        roleName = 'Distributor';
      } else if (newStatus === 5 /* AT_PHARMACY / DELIVERED */) {
        role = UserRole.LOGISTICS;
        roleName = 'Logistics Provider';
      } else if (newStatus === 6 /* SOLD */) {
        role = UserRole.PHARMACY;
        roleName = 'Pharmacy';
      }

      if (role !== -1) {
        await ensureRegistered(role as UserRole, roleName);
      }

      const tx = await contract.updateBatchStatus(batchId, newStatus, location);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract, ensureRegistered]);

  // Recall batch
  const recallBatch = useCallback(async (
    batchId: number,
    reason: string
  ): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.recallBatch(batchId, reason);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract, ensureRegistered]);

  // Get batch by ID using V2 getBatchFull (returns Core + State)
  const getBatch = useCallback(async (batchId: number): Promise<BlockchainBatch | null> => {
    if (!contract) return null;

    try {
      // V2: Use getBatchFull which returns [BatchCore, BatchState]
      const [core, state] = await contract.getBatchFull(batchId);

      return {
        // From BatchCore (immutable)
        id: core.id,
        batchCode: core.batchCode,
        manufacturer: core.manufacturer,
        drugName: core.drugName,
        quantity: core.quantity,
        mfgDate: core.mfgDate,
        expDate: core.expDate,
        createdAt: core.createdAt,
        dataHash: core.dataHash,
        // From BatchState (mutable)
        status: Number(state.status) as BatchStatus,
        approvedAt: state.approvedAt,
        approvalHash: state.approvalHash,
        isRecalled: state.isRecalled,
        currentHolder: state.currentHolder,
        lastLocation: state.lastLocation,
        lastUpdated: state.lastUpdated,
      };
    } catch (err) {
      console.error('Error getting batch:', err);
      return null;
    }
  }, [contract]);

  // Get batch by code
  const getBatchByCode = useCallback(async (batchCode: string): Promise<BlockchainBatch | null> => {
    if (!contract) return null;

    try {
      const batchId = await contract.getBatchIdByCode(batchCode);
      const batch = await getBatch(Number(batchId));
      
      // Verify that the returned batch actually matches the requested code
      // This handles the case where batchId 0 is returned for a non-existent code
      if (batch && batch.batchCode === batchCode) {
        return batch;
      }
      return null;
    } catch (err) {
      console.error('Error getting batch by code:', err);
      return null;
    }
  }, [contract, getBatch]);

  // Get batch history
  const getBatchHistory = useCallback(async (batchId: number): Promise<BlockchainBatchHistory[]> => {
    if (!contract) return [];

    try {
      const history = await contract.getBatchHistory(batchId);
      return history.map((h: BlockchainBatchHistory) => ({
        timestamp: h.timestamp,
        location: h.location,
        status: Number(h.status) as BatchStatus,
        updatedBy: h.updatedBy,
        notes: h.notes,
      }));
    } catch (err) {
      console.error('Error getting batch history:', err);
      return [];
    }
  }, [contract]);

  // Verify batch authenticity
  const verifyBatchAuthenticity = useCallback(async (batchId: number): Promise<{
    isGenuine: boolean;
    status: string;
    statusLabel: string;
  } | null> => {
    if (!contract) return null;

    try {
      const [isGenuine, status] = await contract.verifyBatchAuthenticity(batchId);
      return {
        isGenuine,
        status,
        statusLabel: status,
      };
    } catch (err) {
      console.error('Error verifying batch:', err);
      return null;
    }
  }, [contract]);

  // Get user info
  const getUser = useCallback(async (address: string): Promise<BlockchainUser | null> => {
    if (!contract) return null;

    try {
      const user = await contract.users(address);
      if (!user.isActive) return null;
      return {
        walletAddress: user.walletAddress,
        role: Number(user.role) as UserRole,
        organizationName: user.organizationName,
        isActive: user.isActive,
        registeredAt: user.registeredAt,
      };
    } catch (err) {
      console.error('Error getting user:', err);
      return null;
    }
  }, [contract]);

  // Get total batches count
  const getTotalBatches = useCallback(async (): Promise<number> => {
    if (!contract) return 0;

    try {
      const total = await contract.getTotalBatches();
      return Number(total);
    } catch (err) {
      console.error('Error getting total batches:', err);
      return 0;
    }
  }, [contract]);

  // Grant regulatory approval (only contract owner can call this)
  const grantRegulatoryApproval = useCallback(async (
    regulatorAddress: string
  ): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.grantRegulatoryApproval(regulatorAddress);
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract]);

  // Check if user is registered on blockchain
  const isUserRegistered = useCallback(async (
    address?: string
  ): Promise<boolean> => {
    if (!contract) {
      console.log('[isUserRegistered] Contract not initialized');
      return false;
    }

    try {
      const userAddress = address || wallet.address;
      if (!userAddress) {
        console.log('[isUserRegistered] No wallet address available');
        return false;
      }
      console.log(`[isUserRegistered] Checking registration for: ${userAddress}`);
      const user = await contract.users(userAddress);
      // Debug: Log the raw user struct values
      console.log('[isUserRegistered] Raw user data:', {
        walletAddress: user.walletAddress,
        role: Number(user.role),
        organizationName: user.organizationName,
        isActive: user.isActive,
        registeredAt: user.registeredAt?.toString()
      });
      // A user is registered if isActive is true AND walletAddress is not zero
      const isRegistered = user.isActive === true && user.walletAddress !== '0x0000000000000000000000000000000000000000';
      console.log(`[isUserRegistered] Result: ${isRegistered}`);
      return isRegistered;
    } catch (err) {
      console.error('Error checking user registration:', err);
      return false;
    }
  }, [contract, wallet.address]);

  // Check if regulator is approved
  const isRegulatorApproved = useCallback(async (
    address?: string
  ): Promise<boolean> => {
    if (!contract) return false;

    try {
      const userAddress = address || wallet.address;
      if (!userAddress) return false;
      const isApproved = await contract.approvedRegulatorsMap(userAddress);
      return isApproved;
    } catch (err) {
      console.error('Error checking regulator approval:', err);
      return false;
    }
  }, [contract]);

  // Get contract owner address
  const getContractOwner = useCallback(async (): Promise<string | null> => {
    if (!contract) return null;

    try {
      const owner = await contract.owner();
      return owner;
    } catch (err) {
      console.error('Error getting contract owner:', err);
      return null;
    }
  }, [contract]);

  // Get list of approved regulators
  const getApprovedRegulators = useCallback(async (): Promise<string[]> => {
    if (!contract) return [];

    try {
      const regulators = await contract.getApprovedRegulators();
      return regulators;
    } catch (err) {
      console.error('Error getting approved regulators:', err);
      return [];
    }
  }, [contract]);

  // Check if contract is paused
  const isPaused = useCallback(async (): Promise<boolean> => {
    if (!contract) return false;

    try {
      const paused = await contract.paused();
      return paused;
    } catch (err) {
      console.error('Error checking pause status:', err);
      return false;
    }
  }, [contract]);

  // Pause contract (only owner can call)
  const pauseContract = useCallback(async (): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.pause();
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract]);

  // Unpause contract (only owner can call)
  const unpauseContract = useCallback(async (): Promise<TransactionResult> => {
    if (!contract) {
      return { success: false, error: 'Contract not initialized' };
    }

    try {
      const tx = await contract.unpause();
      const receipt = await tx.wait();
      return { success: true, hash: receipt.hash };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: errorMessage };
    }
  }, [contract]);

  return {
    isReady,
    registerUser,
    approveDrugTemplate, // NEW
    createBatch,
    submitForApproval,
    approveBatch,
    rejectBatch,
    updateBatchStatus,
    recallBatch,
    getBatch,
    getBatchByCode,
    getBatchHistory,
    verifyBatchAuthenticity,
    getUser,
    getTotalBatches,
    grantRegulatoryApproval,
    isUserRegistered,
    isRegulatorApproved,
    getContractOwner,
    getApprovedRegulators,
    isPaused,
    pauseContract,
    unpauseContract,
    generateDataHash,
    BatchStatus,
    BatchStatusLabels,
    UserRole,
  };
}
