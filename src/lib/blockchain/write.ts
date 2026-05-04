/**
 * Blockchain write operations
 * Functions to update batch status on-chain
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, isBlockchainConfigured } from './config';
import { MEDITRUST_ABI } from './abi';

// Helper function to get contract instance
function getContract(signerOrProvider: ethers.Signer | ethers.Provider): ethers.Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured');
  }
  return new ethers.Contract(CONTRACT_ADDRESS, MEDITRUST_ABI, signerOrProvider);
}

// Helper function to get provider
function getProvider(): ethers.JsonRpcProvider | null {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) return null;
  return new ethers.JsonRpcProvider(rpcUrl);
}

export interface BatchUpdateData {
  batchId: number;
  newStatus: number;
  location?: string;
  notes?: string;
}

export interface CreateBatchData {
  batchId: string;
  drugName: string;
  quantity: number;
  manufacturingDate: number; // Unix timestamp
  expiryDate: number; // Unix timestamp
  ipfsHash: string;
}

/**
 * Create a new batch on the blockchain
 */
export async function createBatchOnChain(
  data: CreateBatchData,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);

  const tx = await contract.createBatch(
    data.batchId,
    data.drugName,
    data.quantity,
    data.manufacturingDate,
    data.expiryDate,
    data.ipfsHash
  );

  return tx;
}

/**
 * Submit batch for regulatory approval
 */
export async function submitForApproval(
  batchId: number,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.submitForApproval(batchId);
  return tx;
}

/**
 * Approve batch (Regulator only)
 */
export async function approveBatch(
  batchId: number,
  documentHash: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.approveBatch(batchId, documentHash);
  return tx;
}

/**
 * Reject batch (Regulator only)
 */
export async function rejectBatch(
  batchId: number,
  reason: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.rejectBatch(batchId, reason);
  return tx;
}

/**
 * Update batch status (generic)
 */
export async function updateBatchStatus(
  batchId: number,
  newStatus: number,
  location: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.updateBatchStatus(batchId, newStatus, location);
  return tx;
}

/**
 * Mark batch as in-transit
 */
export async function markInTransit(
  batchId: number,
  location: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  return updateBatchStatus(batchId, 4, location, signer); // Status 4 = IN_TRANSIT
}

/**
 * Mark batch as received at pharmacy
 */
export async function markAtPharmacy(
  batchId: number,
  location: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  return updateBatchStatus(batchId, 5, location, signer); // Status 5 = DELIVERED
}

/**
 * Mark batch as dispensed to patient
 */
export async function markDispensed(
  batchId: number,
  location: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  return updateBatchStatus(batchId, 5, location, signer); // Status 5 = DELIVERED
}

/**
 * Recall batch (Regulator only)
 */
export async function recallBatch(
  batchId: number,
  reason: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.recallBatch(batchId, reason);
  return tx;
}

/**
 * Register user on blockchain
 */
export async function registerUser(
  role: number,
  name: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.registerUser(role, name);
  return tx;
}

/**
 * Wait for transaction confirmation and return receipt
 */
export async function waitForTransaction(
  tx: ethers.ContractTransactionResponse
): Promise<ethers.ContractTransactionReceipt | null> {
  console.log(`Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
  return receipt;
}

/**
 * Helper to get signer from wallet
 */
export async function getSigner(): Promise<ethers.Signer | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

/**
 * Estimate gas for transaction
 */
export async function estimateGas(
  methodName: string,
  args: any[],
  signer: ethers.Signer
): Promise<bigint> {
  const contract = getContract(signer);
  return contract[methodName].estimateGas(...args);
}
