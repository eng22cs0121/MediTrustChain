/**
 * ACCESS CONTROL UTILITIES
 * Ensures organization-level data isolation and role-based access control
 * Uses stakeholder-based authentication (hierarchical: Organizations → Stakeholders)
 */

import { createClient } from '@/lib/supabase/client';
import type { OrganizationType, StakeholderRole } from '@/types/cbac';

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  organizationId?: string;
  role?: StakeholderRole;
}

/**
 * Validates if the current user has access to a specific organization
 * Implements organization-level data isolation
 */
export async function validateOrganizationAccess(
  targetOrganizationId: string
): Promise<AccessControlResult> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    // Check if user is admin (admins have access to all organizations)
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminUser) {
      return { allowed: true, organizationId: targetOrganizationId };
    }

    // Get user's organization_id
    const userOrganizationId = user.user_metadata?.organization_id;

    if (!userOrganizationId) {
      return { allowed: false, reason: 'User has no organization assigned' };
    }

    // Stakeholders can only access their own organization
    if (userOrganizationId !== targetOrganizationId) {
      return {
        allowed: false,
        reason: `Access denied: User belongs to organization ${userOrganizationId}, not ${targetOrganizationId}`,
        organizationId: userOrganizationId,
      };
    }

    return {
      allowed: true,
      organizationId: userOrganizationId,
    };
  } catch (error) {
    console.error('Error validating organization access:', error);
    return { allowed: false, reason: 'Error validating access' };
  }
}

/**
 * Validates if the current user has the required role for an action
 * Implements role-based access control using stakeholder roles
 */
export async function validateRoleAccess(
  requiredRole: StakeholderRole | OrganizationType
): Promise<AccessControlResult> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    // Check if user is admin (admins have access to all roles)
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminUser) {
      return { allowed: true };
    }

    // Get user's role from metadata (set during login)
    let userRole = user.user_metadata?.role as StakeholderRole | undefined;

    // If not in metadata, fetch from stakeholder record
    if (!userRole) {
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (stakeholder) {
        userRole = stakeholder.role;
      }
    }

    if (!userRole) {
      return { allowed: false, reason: 'User has no role assigned' };
    }

    if (userRole !== requiredRole) {
      return {
        allowed: false,
        reason: `Access denied: User role is '${userRole}', but '${requiredRole}' is required`,
        role: userRole,
      };
    }

    return {
      allowed: true,
      role: userRole,
      organizationId: user.user_metadata?.organization_id,
    };
  } catch (error) {
    console.error('Error validating role access:', error);
    return { allowed: false, reason: 'Error validating access' };
  }
}

/**
 * Validates both organization and role access
 * Implements secure access enforcement
 */
export async function validateAccess(
  targetOrganizationId: string,
  requiredRole?: StakeholderRole | OrganizationType
): Promise<AccessControlResult> {
  // First validate organization access
  const orgCheck = await validateOrganizationAccess(targetOrganizationId);
  if (!orgCheck.allowed) {
    return orgCheck;
  }

  // If role is required, validate role access
  if (requiredRole) {
    const roleCheck = await validateRoleAccess(requiredRole);
    if (!roleCheck.allowed) {
      return roleCheck;
    }
  }

  return {
    allowed: true,
    organizationId: orgCheck.organizationId,
    role: requiredRole as StakeholderRole | undefined,
  };
}

/**
 * Gets the current user's organization ID and role
 * For implicit identity binding
 * OPTIMIZED: Returns quickly from user metadata to prevent hanging
 */
export async function getUserIdentity(): Promise<{
  organizationId?: string;
  role?: StakeholderRole;
  isAdmin: boolean;
  email?: string;
  walletAddress?: string;
}> {
  try {
    const supabase = createClient();

    // Fast path: Get user from session (cached)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('getUserIdentity: No user found');
      return { isAdmin: false };
    }

    // FAST PATH: First try to get all data from user metadata
    // This was set during login and is the fastest source
    const organizationId = user.user_metadata?.organization_id;
    const role = user.user_metadata?.role as StakeholderRole | undefined;
    const walletAddress = user.user_metadata?.wallet_address as string | undefined;

    // If we have the essential data in metadata, return immediately without DB calls
    if (organizationId && role) {
      console.log('getUserIdentity: Fast path - using cached metadata');
      return {
        organizationId,
        role,
        isAdmin: false,
        email: user.email,
        walletAddress,
      };
    }

    // SLOW PATH: Need to check database
    console.log('getUserIdentity: Slow path - checking database');

    // Check if admin (with timeout)
    try {
      const adminPromise = supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Admin check timeout')), 3000)
      );

      const { data: adminUser } = await Promise.race([adminPromise, timeoutPromise]) as any;

      if (adminUser) {
        return {
          isAdmin: true,
          email: user.email,
        };
      }
    } catch (adminError) {
      console.warn('Admin check failed or timed out:', adminError);
      // Continue - not an admin
    }

    // If we have partial data from metadata, return that
    if (organizationId || role) {
      return {
        organizationId,
        role,
        isAdmin: false,
        email: user.email,
        walletAddress,
      };
    }

    // Last resort: fetch from stakeholder record (with timeout)
    try {
      const stakeholderPromise = supabase
        .from('stakeholders')
        .select('organization_id, role, wallet_address')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stakeholder fetch timeout')), 3000)
      );

      const { data: stakeholder } = await Promise.race([stakeholderPromise, timeoutPromise]) as any;

      if (stakeholder) {
        return {
          organizationId: stakeholder.organization_id,
          role: stakeholder.role,
          isAdmin: false,
          email: user.email,
          walletAddress: stakeholder.wallet_address,
        };
      }
    } catch (stakeholderError) {
      console.warn('Stakeholder fetch failed or timed out:', stakeholderError);
    }

    // Return whatever we have
    return {
      organizationId,
      role,
      isAdmin: false,
      email: user.email,
      walletAddress,
    };
  } catch (error) {
    console.error('Error getting user identity:', error);
    return { isAdmin: false };
  }
}
