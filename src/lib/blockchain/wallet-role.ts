"use client";

import { useEffect, useState, useCallback } from 'react';
import { useBlockchain } from './provider';
import { UserRole } from './config';

/**
 * Wallet role information from on-chain
 */
export interface WalletRoleInfo {
    walletAddress: string;
    role: UserRole | null;
    organizationName: string;
    isRegistered: boolean;
    isActive: boolean;
    registeredAt: Date | null;
}

/**
 * Role verification result
 */
export interface RoleVerificationResult {
    isVerified: boolean;
    hasRequiredRole: boolean;
    walletInfo: WalletRoleInfo | null;
    error: string | null;
}

/**
 * Role labels for display
 */
export const RoleLabels: Record<UserRole, string> = {
    [UserRole.MANUFACTURER]: 'Manufacturer',
    [UserRole.REGULATOR]: 'Regulator',
    [UserRole.DISTRIBUTOR]: 'Distributor',
    [UserRole.LOGISTICS]: 'Logistics',
    [UserRole.PHARMACY]: 'Pharmacy',
    [UserRole.PATIENT]: 'Patient',
};

/**
 * Hook for verifying wallet role on-chain
 * 
 * This hook:
 * 1. Connects to the blockchain
 * 2. Queries the user's role from the smart contract
 * 3. Validates if the role matches the required role for the dashboard
 * 4. Blocks UI actions if there's a mismatch
 * 
 * @param requiredRole - The role required to access this dashboard
 * @returns Role verification result
 * 
 * @example
 * ```tsx
 * // In Manufacturer Dashboard
 * const { isVerified, hasRequiredRole, walletInfo, error } = useWalletRole(UserRole.MANUFACTURER);
 * 
 * if (!isVerified) {
 *   return <WalletConnectionPrompt />;
 * }
 * 
 * if (!hasRequiredRole) {
 *   return <AccessDenied requiredRole="Manufacturer" actualRole={walletInfo?.role} />;
 * }
 * ```
 */
export function useWalletRole(requiredRole?: UserRole): RoleVerificationResult & {
    isLoading: boolean;
    refetch: () => Promise<void>;
} {
    const { wallet, contract, isConfigured } = useBlockchain();
    const [isLoading, setIsLoading] = useState(false);
    const [walletInfo, setWalletInfo] = useState<WalletRoleInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchRole = useCallback(async () => {
        if (!wallet.isConnected || !wallet.address || !contract) {
            setWalletInfo(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Query user from contract's public mapping
            const user = await contract.users(wallet.address);

            const isRegistered = user.isActive === true;

            if (isRegistered) {
                setWalletInfo({
                    walletAddress: wallet.address,
                    role: Number(user.role) as UserRole,
                    organizationName: user.organizationName,
                    isRegistered: true,
                    isActive: user.isActive,
                    registeredAt: new Date(Number(user.registeredAt) * 1000),
                });
            } else {
                setWalletInfo({
                    walletAddress: wallet.address,
                    role: null,
                    organizationName: '',
                    isRegistered: false,
                    isActive: false,
                    registeredAt: null,
                });
            }
        } catch (err) {
            console.error('Failed to fetch wallet role:', err);
            setError(err instanceof Error ? err.message : 'Failed to verify wallet role');
            setWalletInfo(null);
        } finally {
            setIsLoading(false);
        }
    }, [wallet.isConnected, wallet.address, contract]);

    useEffect(() => {
        fetchRole();
    }, [fetchRole]);

    // Compute verification status
    const isVerified = wallet.isConnected && walletInfo !== null && walletInfo.isRegistered;
    const hasRequiredRole = requiredRole !== undefined
        ? (isVerified && walletInfo?.role === requiredRole)
        : isVerified;

    return {
        isVerified,
        hasRequiredRole,
        walletInfo,
        error: !isConfigured ? 'Blockchain not configured' : error,
        isLoading,
        refetch: fetchRole,
    };
}

/**
 * Map frontend role strings to UserRole enum
 */
export function mapRoleToUserRole(role: string): UserRole | null {
    const roleMap: Record<string, UserRole> = {
        'manufacturer': UserRole.MANUFACTURER,
        'regulator': UserRole.REGULATOR,
        'distributor': UserRole.DISTRIBUTOR,
        'logistics': UserRole.LOGISTICS,
        'pharmacy': UserRole.PHARMACY,
        'patient': UserRole.PATIENT,
    };
    return roleMap[role.toLowerCase()] ?? null;
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole | null): string {
    if (role === null) return 'Not Registered';
    return RoleLabels[role] ?? 'Unknown';
}
