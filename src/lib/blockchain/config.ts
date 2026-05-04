// Blockchain Configuration for MediTrustChain
// Supports Ethereum Sepolia and Polygon Amoy testnets

export const SUPPORTED_CHAINS = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.etherscan.io',
    currency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  polygonAmoy: {
    id: 80002,
    name: 'Polygon Amoy',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    currency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  localhost: {
    id: 31337,
    name: 'Localhost (Hardhat)',
    rpcUrl: process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || 'http://127.0.0.1:8545',
    blockExplorer: 'http://localhost:8545',
    currency: {
      name: 'Hardhat ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
} as const;

// Default chain - can be changed via environment variable
export const DEFAULT_CHAIN = (process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'sepolia') as keyof typeof SUPPORTED_CHAINS;

// Contract address - set after deployment
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Check if blockchain is configured
export const isBlockchainConfigured = (): boolean => {
  const isConfigured = Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x') && CONTRACT_ADDRESS.length === 42);

  if (!isConfigured && typeof window !== 'undefined') {
    console.warn('⚠️ Blockchain not configured: CONTRACT_ADDRESS missing or invalid');
  }

  return isConfigured;
};

// Get current chain config
export const getChainConfig = (chainKey?: keyof typeof SUPPORTED_CHAINS) => {
  return SUPPORTED_CHAINS[chainKey || DEFAULT_CHAIN];
};

// User roles enum matching the smart contract
// CRITICAL: Order must match MediTrustChainV2.sol UserRole enum exactly!
export enum UserRole {
  MANUFACTURER = 0,
  REGULATOR = 1,
  DISTRIBUTOR = 2,
  LOGISTICS = 3,    // Fixed: was 4
  PHARMACY = 4,     // Fixed: was 3
  PATIENT = 5,
}

/**
 * Batch status enum matching the smart contract V2 STRICT STATE MACHINE
 * Flow: CREATED → PENDING_APPROVAL → APPROVED → IN_TRANSIT → AT_PHARMACY → SOLD
 * ❌ No skipping states
 * ❌ No updates after SOLD or RECALLED
 */
export enum BatchStatus {
  CREATED = 0,           // Manufacturer creates batch
  PENDING_APPROVAL = 1,  // Submitted for regulatory approval
  APPROVED = 2,          // Regulator approved
  REJECTED = 3,          // Regulator rejected (TERMINAL)
  IN_TRANSIT = 4,        // Distributor shipped
  AT_PHARMACY = 5,       // Logistics delivered to pharmacy
  SOLD = 6,              // Pharmacy sold after verification (TERMINAL)
  EXPIRED = 7,           // Batch expired (TERMINAL)
  RECALLED = 8,          // Regulator recalled (TERMINAL)
  DELIVERED = 9,         // Delivery confirmed
}

// Status labels for display
export const BatchStatusLabels: Record<BatchStatus, string> = {
  [BatchStatus.CREATED]: 'Created',
  [BatchStatus.PENDING_APPROVAL]: 'Pending Approval',
  [BatchStatus.APPROVED]: 'Approved',
  [BatchStatus.REJECTED]: 'Rejected',
  [BatchStatus.IN_TRANSIT]: 'In Transit',
  [BatchStatus.AT_PHARMACY]: 'At Pharmacy',
  [BatchStatus.SOLD]: 'Sold',
  [BatchStatus.EXPIRED]: 'Expired',
  [BatchStatus.RECALLED]: 'Recalled',
  [BatchStatus.DELIVERED]: 'Delivered',
};

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.MANUFACTURER]: 'Manufacturer',
  [UserRole.REGULATOR]: 'Regulator',
  [UserRole.DISTRIBUTOR]: 'Distributor',
  [UserRole.PHARMACY]: 'Pharmacy',
  [UserRole.LOGISTICS]: 'Logistics',
  [UserRole.PATIENT]: 'Patient',
};
