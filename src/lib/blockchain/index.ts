// Blockchain module exports
export { BlockchainProvider, useBlockchain } from './provider';
export { useContract } from './hooks';
export {
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN,
  CONTRACT_ADDRESS,
  isBlockchainConfigured,
  getChainConfig,
  BatchStatus,
  BatchStatusLabels,
  UserRole,
  UserRoleLabels,
} from './config';
export { MEDITRUST_ABI } from './abi';
export {
  verifyBatchOnBlockchain,
  computeBatchHash,
  parseQRCodeData,
  formatTimestamp,
  isBatchExpired,
  getStatusLabel,
} from './verification';
export {
  fetchOnChainAuditTrail,
  fetchBatchEventLogs,
  truncateAddress,
  SUPPLY_CHAIN_STAGES,
} from './audit-trail';
export type {
  BlockchainBatch,
  BlockchainBatchHistory,
  BlockchainUser,
  CreateBatchParams,
  TransactionResult,
} from './hooks';
export type {
  BatchVerificationInput,
  OnChainBatchData,
  VerificationResult,
} from './verification';
export type {
  OnChainAuditEvent,
  OnChainBatchInfo,
  AuditTrailResult,
  SupplyChainStage,
} from './audit-trail';

// Event-driven architecture
export { useContractEvents, queryEvents } from './event-listener';
export type {
  BatchCreatedEvent,
  BatchApprovedEvent,
  BatchRejectedEvent,
  BatchStatusUpdatedEvent,
  BatchTransferredEvent,
  BatchRecalledEvent,
  BatchSubmittedForApprovalEvent,
  BatchShippedEvent,
  BatchDeliveredToPharmacyEvent,
  BatchSoldEvent,
  EventCallbacks,
} from './event-listener';

// Wallet role verification
export { useWalletRole, mapRoleToUserRole, getRoleName, RoleLabels } from './wallet-role';
export type { WalletRoleInfo, RoleVerificationResult } from './wallet-role';
