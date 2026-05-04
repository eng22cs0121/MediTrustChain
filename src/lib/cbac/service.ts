/**
 * CBAC (Claims-Based Access Control) Service
 * Handles multi-tenant permissions and organization isolation
 */

import { createClient } from '@/lib/supabase/client';
import type {
  CBACPermission,
  CBACPermissionRequest,
  OrganizationRoleTemplate,
  OrganizationSummary,
  TenantContext,
  StakeholderRole,
} from '@/types/cbac';

const supabase = createClient();

// =====================================================
// TENANT CONTEXT
// =====================================================

/**
 * Get the current user's tenant context
 * Returns organization info, role, and permissions
 */
export async function getTenantContext(): Promise<TenantContext> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      organization_id: null,
      organization_name: null,
      stakeholder_id: null,
      role: null,
      permissions: null,
      is_admin: false,
    };
  }

  // Check if user is admin
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('id, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminData) {
    return {
      organization_id: null,
      organization_name: null,
      stakeholder_id: null,
      role: null,
      permissions: null,
      is_admin: true,
    };
  }

  // Get stakeholder info
  const { data: stakeholder } = await supabase
    .from('stakeholders')
    .select(`
      id,
      organization_id,
      role,
      organizations (
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!stakeholder) {
    return {
      organization_id: null,
      organization_name: null,
      stakeholder_id: null,
      role: null,
      permissions: null,
      is_admin: false,
    };
  }

  // Get CBAC permissions (or fall back to role template)
  const permissions = await getStakeholderPermissions(stakeholder.id);

  return {
    organization_id: stakeholder.organization_id,
    organization_name: (stakeholder.organizations as any)?.name || null,
    stakeholder_id: stakeholder.id,
    role: stakeholder.role as StakeholderRole,
    permissions,
    is_admin: false,
  };
}

// =====================================================
// CBAC PERMISSIONS
// =====================================================

/**
 * Get permissions for a stakeholder
 * First checks cbac_permissions table, then falls back to role templates
 */
export async function getStakeholderPermissions(
  stakeholderId: string
): Promise<CBACPermission | null> {
  // Try to get custom CBAC permissions
  const { data: customPerms } = await supabase
    .from('cbac_permissions')
    .select('*')
    .eq('stakeholder_id', stakeholderId)
    .maybeSingle();

  if (customPerms) {
    return customPerms as CBACPermission;
  }

  // Fall back to role template
  const { data: stakeholder } = await supabase
    .from('stakeholders')
    .select('organization_id, role')
    .eq('id', stakeholderId)
    .maybeSingle();

  if (!stakeholder) return null;

  // Get org-specific template first, then global
  const { data: template } = await supabase
    .from('organization_role_templates')
    .select('*')
    .eq('role_name', stakeholder.role)
    .or(`organization_id.eq.${stakeholder.organization_id},organization_id.is.null`)
    .order('organization_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!template) return null;

  // Convert template to CBACPermission format
  return {
    id: `template-${template.id}`,
    stakeholder_id: stakeholderId,
    organization_id: stakeholder.organization_id,
    can_create_batches: template.can_create_batches,
    can_approve_batches: template.can_approve_batches,
    can_reject_batches: template.can_reject_batches,
    can_recall_batches: template.can_recall_batches,
    can_update_status: template.can_update_status,
    can_view_all_batches: template.can_view_all_batches,
    can_view_analytics: template.can_view_analytics,
    can_export_data: template.can_export_data,
    can_manage_stakeholders: template.can_manage_stakeholders,
    created_at: template.created_at,
    updated_at: template.updated_at,
  } as CBACPermission;
}

/**
 * Create or update CBAC permissions for a stakeholder
 */
export async function upsertCBACPermissions(
  request: CBACPermissionRequest
): Promise<{ success: boolean; error?: string; data?: CBACPermission }> {
  const { data, error } = await supabase
    .from('cbac_permissions')
    .upsert(
      {
        stakeholder_id: request.stakeholder_id,
        organization_id: request.organization_id,
        can_create_batches: request.can_create_batches ?? false,
        can_approve_batches: request.can_approve_batches ?? false,
        can_reject_batches: request.can_reject_batches ?? false,
        can_recall_batches: request.can_recall_batches ?? false,
        can_update_status: request.can_update_status ?? false,
        can_view_all_batches: request.can_view_all_batches ?? true,
        can_view_analytics: request.can_view_analytics ?? true,
        can_export_data: request.can_export_data ?? false,
        can_manage_stakeholders: request.can_manage_stakeholders ?? false,
        custom_permissions: request.custom_permissions ?? {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'stakeholder_id,organization_id',
      }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as CBACPermission };
}

/**
 * Delete CBAC permissions (reverts to role template)
 */
export async function deleteCBACPermissions(
  stakeholderId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('cbac_permissions')
    .delete()
    .eq('stakeholder_id', stakeholderId)
    .eq('organization_id', organizationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// ORGANIZATION MANAGEMENT (Admin only)
// =====================================================

/**
 * Get all organizations with summary stats
 */
export async function getOrganizationSummaries(): Promise<OrganizationSummary[]> {
  const { data, error } = await supabase
    .from('organization_summary')
    .select('*');

  if (error) {
    console.error('Error fetching organization summaries:', error);
    return [];
  }

  return data as OrganizationSummary[];
}

/**
 * Get stakeholders for an organization with their permissions
 */
export async function getOrganizationStakeholders(organizationId: string) {
  const { data, error } = await supabase
    .from('stakeholders')
    .select(`
      *,
      cbac_permissions (*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (error) {
    console.error('Error fetching organization stakeholders:', error);
    return [];
  }

  return data;
}

// =====================================================
// ROLE TEMPLATES (Admin only)
// =====================================================

/**
 * Get role templates for an organization (or global)
 */
export async function getRoleTemplates(
  organizationId?: string
): Promise<OrganizationRoleTemplate[]> {
  let query = supabase
    .from('organization_role_templates')
    .select('*');

  if (organizationId) {
    query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
  } else {
    query = query.is('organization_id', null);
  }

  const { data, error } = await query.order('role_name', { ascending: true });

  if (error) {
    console.error('Error fetching role templates:', error);
    return [];
  }

  return data as OrganizationRoleTemplate[];
}

/**
 * Update a role template
 */
export async function updateRoleTemplate(
  templateId: string,
  updates: Partial<OrganizationRoleTemplate>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('organization_role_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create org-specific role template (overrides global)
 */
export async function createOrgRoleTemplate(
  organizationId: string,
  roleName: StakeholderRole,
  permissions: Partial<OrganizationRoleTemplate>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('organization_role_templates')
    .insert({
      organization_id: organizationId,
      role_name: roleName,
      can_create_batches: permissions.can_create_batches ?? false,
      can_approve_batches: permissions.can_approve_batches ?? false,
      can_reject_batches: permissions.can_reject_batches ?? false,
      can_recall_batches: permissions.can_recall_batches ?? false,
      can_update_status: permissions.can_update_status ?? false,
      can_view_all_batches: permissions.can_view_all_batches ?? true,
      can_view_analytics: permissions.can_view_analytics ?? true,
      can_export_data: permissions.can_export_data ?? false,
      can_manage_stakeholders: permissions.can_manage_stakeholders ?? false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// PERMISSION CHECKS
// =====================================================

/**
 * Check if current user can perform an action on a batch
 */
export async function canPerformBatchAction(
  action: 'create' | 'approve' | 'reject' | 'recall' | 'update_status' | 'view' | 'export'
): Promise<boolean> {
  const context = await getTenantContext();

  // Admin can do everything
  if (context.is_admin) return true;

  // No permissions = no access
  if (!context.permissions) return false;

  switch (action) {
    case 'create':
      return context.permissions.can_create_batches;
    case 'approve':
      return context.permissions.can_approve_batches;
    case 'reject':
      return context.permissions.can_reject_batches;
    case 'recall':
      return context.permissions.can_recall_batches;
    case 'update_status':
      return context.permissions.can_update_status;
    case 'view':
      return context.permissions.can_view_all_batches;
    case 'export':
      return context.permissions.can_export_data;
    default:
      return false;
  }
}

/**
 * Check if current user belongs to a specific organization
 */
export async function isInOrganization(organizationId: string): Promise<boolean> {
  const context = await getTenantContext();

  // Admin has access to all organizations
  if (context.is_admin) return true;

  return context.organization_id === organizationId;
}

/**
 * Get current user's organization ID (or null for admin)
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const context = await getTenantContext();
  return context.organization_id;
}
