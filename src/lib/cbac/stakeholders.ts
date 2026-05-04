/**
 * STAKEHOLDER MANAGEMENT LIBRARY
 * Admin functions for managing organization stakeholders
 * Hierarchical structure: Organizations (parent) → Stakeholders (child)
 */

import { createClient } from '@/lib/supabase/client';
import type { Stakeholder, StakeholderWithDetails, StakeholderCreationRequest, StakeholderUpdateRequest } from '@/types/cbac';
import { ensureAdminUser } from './admin-setup';

// Re-export types for convenience
export type { Stakeholder, StakeholderWithDetails, StakeholderCreationRequest, StakeholderUpdateRequest };

/**
 * Create a stakeholder for an organization (Admin only)
 * This creates both the Supabase Auth user and the stakeholder record
 * Each stakeholder has: email, password, wallet_address, and role
 * 
 * Uses a server-side API route to create auth users with service role key
 */
export async function createStakeholder(
  request: StakeholderCreationRequest
): Promise<{ success: boolean; stakeholder?: Stakeholder; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated. Please log in first.' };
    }

    // Validate wallet address format (basic check)
    if (!request.wallet_address || !request.wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    // Call the API route to create stakeholder (runs on server with service role)
    const response = await fetch('/api/stakeholders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: request.organization_id,
        full_name: request.full_name,
        email: request.email,
        password: request.password,
        wallet_address: request.wallet_address,
        role: request.role,
        phone: request.phone,
        position: request.position,
        notes: request.notes,
        metadata: request.metadata
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || `Failed to create stakeholder (${response.status})`
      };
    }

    return { success: true, stakeholder: result.stakeholder };
  } catch (error: any) {
    console.error('Error creating stakeholder:', error);
    return { success: false, error: error.message || 'Failed to create stakeholder' };
  }
}

/**
 * Get all stakeholders for an organization
 * Admin can see all, stakeholders can see their own organization's stakeholders
 */
export async function getOrganizationStakeholders(
  organizationId: string
): Promise<{ success: boolean; stakeholders?: StakeholderWithDetails[]; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get stakeholders with details
    const { data: stakeholders, error } = await supabase
      .from('stakeholder_details')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, stakeholders: stakeholders as StakeholderWithDetails[] };
  } catch (error) {
    console.error('Error getting stakeholders:', error);
    return { success: false, error: 'Failed to get stakeholders' };
  }
}

/**
 * Update stakeholder information (Admin only)
 */
export async function updateStakeholder(
  stakeholderId: string,
  updates: StakeholderUpdateRequest
): Promise<{ success: boolean; stakeholder?: Stakeholder; error?: string }> {
  try {
    // Call the API route to update the stakeholder (requires service role for auth updates)
    const response = await fetch('/api/stakeholders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: stakeholderId,
        ...updates
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Fallback for simple status updates (e.g., from toggle button) if API fails or for non-auth updates
      // This keeps the toggle button fast and working even if the API route has issues
      if (Object.keys(updates).length === 1 && 'is_active' in updates) {
        const supabase = createClient();
        const { error } = await supabase
          .from('stakeholders')
          .update(updates)
          .eq('id', stakeholderId);

        if (!error) return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update stakeholder' };
    }

    return { success: true, stakeholder: result.stakeholder };
  } catch (error: any) {
    console.error('Error updating stakeholder:', error);
    return { success: false, error: error.message || 'Failed to update stakeholder' };
  }
}


/**
 * Delete/deactivate stakeholder (Admin only)
 */
export async function deactivateStakeholder(
  stakeholderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser || !adminUser.can_manage_stakeholders) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Deactivate stakeholder
    const { error } = await supabase
      .from('stakeholders')
      .update({ is_active: false })
      .eq('id', stakeholderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deactivating stakeholder:', error);
    return { success: false, error: 'Failed to deactivate stakeholder' };
  }
}

/**
 * Get stakeholder by email
 */
export async function getStakeholderByEmail(
  email: string
): Promise<{ success: boolean; stakeholder?: StakeholderWithDetails; error?: string }> {
  try {
    const supabase = createClient();

    const { data: stakeholder, error } = await supabase
      .from('stakeholder_details')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, stakeholder: stakeholder as StakeholderWithDetails };
  } catch (error) {
    console.error('Error getting stakeholder:', error);
    return { success: false, error: 'Failed to get stakeholder' };
  }
}

/**
 * Get stakeholder by wallet address
 */
export async function getStakeholderByWallet(
  walletAddress: string
): Promise<{ success: boolean; stakeholder?: StakeholderWithDetails; error?: string }> {
  try {
    const supabase = createClient();

    const { data: stakeholder, error } = await supabase
      .from('stakeholder_details')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, stakeholder: stakeholder as StakeholderWithDetails };
  } catch (error) {
    console.error('Error getting stakeholder by wallet:', error);
    return { success: false, error: 'Failed to get stakeholder' };
  }
}

/**
 * Reset stakeholder password (Admin only)
 */
export async function resetStakeholderPassword(
  stakeholderId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser || !adminUser.can_manage_stakeholders) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get stakeholder user_id
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('user_id')
      .eq('id', stakeholderId)
      .single();

    if (!stakeholder?.user_id) {
      return { success: false, error: 'Stakeholder user not found' };
    }

    // Update password using Supabase Admin API
    const { error } = await supabase.auth.admin.updateUserById(
      stakeholder.user_id,
      { password: newPassword }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

/**
 * Delete stakeholder permanently (Admin only)
 * This removes the stakeholder from the database and their auth user
 */
export async function deleteStakeholder(
  stakeholderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the API route to delete the stakeholder (requires service role)
    const response = await fetch('/api/stakeholders', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stakeholderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to delete stakeholder' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting stakeholder:', error);
    return { success: false, error: error.message || 'Failed to delete stakeholder' };
  }
}
