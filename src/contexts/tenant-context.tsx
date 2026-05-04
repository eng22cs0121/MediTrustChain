"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getTenantContext } from "@/lib/cbac/service";
import type { TenantContext, CBACPermission, StakeholderRole } from "@/types/cbac";
import { createClient } from "@/lib/supabase/client";

interface TenantContextValue extends TenantContext {
  isLoading: boolean;
  refresh: () => Promise<void>;
  // Permission helper methods
  canCreateBatches: boolean;
  canApproveBatches: boolean;
  canRejectBatches: boolean;
  canRecallBatches: boolean;
  canUpdateStatus: boolean;
  canViewAllBatches: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageStakeholders: boolean;
}

const TenantContextReact = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<TenantContext>({
    organization_id: null,
    organization_name: null,
    stakeholder_id: null,
    role: null,
    permissions: null,
    is_admin: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    try {
      const ctx = await getTenantContext();
      setContext(ctx);
    } catch (error) {
      console.error("Error loading tenant context:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadContext();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadContext]);

  // Helper to safely check permissions
  const hasPermission = (
    key: keyof Omit<CBACPermission, "id" | "stakeholder_id" | "organization_id" | "custom_permissions" | "created_at" | "updated_at" | "created_by">
  ): boolean => {
    // Admin has all permissions
    if (context.is_admin) return true;
    // Check CBAC permission
    return context.permissions?.[key] === true;
  };

  const value: TenantContextValue = {
    ...context,
    isLoading,
    refresh: loadContext,
    // Computed permission helpers
    canCreateBatches: hasPermission("can_create_batches"),
    canApproveBatches: hasPermission("can_approve_batches"),
    canRejectBatches: hasPermission("can_reject_batches"),
    canRecallBatches: hasPermission("can_recall_batches"),
    canUpdateStatus: hasPermission("can_update_status"),
    canViewAllBatches: hasPermission("can_view_all_batches"),
    canViewAnalytics: hasPermission("can_view_analytics"),
    canExportData: hasPermission("can_export_data"),
    canManageStakeholders: hasPermission("can_manage_stakeholders"),
  };

  return (
    <TenantContextReact.Provider value={value}>
      {children}
    </TenantContextReact.Provider>
  );
}

/**
 * Hook to access the current tenant context
 * Returns organization info, role, and permissions
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContextReact);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(
  permission: keyof Omit<CBACPermission, "id" | "stakeholder_id" | "organization_id" | "custom_permissions" | "created_at" | "updated_at" | "created_by">
): boolean {
  const { is_admin, permissions } = useTenant();
  if (is_admin) return true;
  return permissions?.[permission] === true;
}

/**
 * Hook to check if user belongs to a specific organization
 */
export function useIsInOrganization(organizationId: string): boolean {
  const { is_admin, organization_id } = useTenant();
  if (is_admin) return true;
  return organization_id === organizationId;
}

/**
 * Hook to get organization-scoped query filter
 * Returns organization_id for stakeholders, null for admin (sees all)
 */
export function useOrganizationFilter(): string | null {
  const { is_admin, organization_id } = useTenant();
  if (is_admin) return null; // Admin sees all
  return organization_id;
}
