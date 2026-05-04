/**
 * CREDENTIAL-BASED ACCESS CONTROL (CBAC) LIBRARY
 * Admin functions for managing organization credentials
 * 
 * NOTE: This module is DEPRECATED. Use stakeholders.ts instead.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Organization,
  OrganizationRegistrationRequest,
  DEFAULT_PERMISSIONS,
} from '@/types/cbac';

interface CredentialPermissions {
  [key: string]: boolean | undefined;
}

type CredentialRole = 'manufacturer' | 'distributor' | 'regulator' | 'pharmacy' | 'logistics';

interface OrganizationCredential {
  id: string;
  organization_id: string;
  email: string;
  wallet_address: string;
  role: CredentialRole;
  status: string;
  issued_at: string;
  expires_at: string;
}

interface CredentialIssuanceRequest {
  organization_id: string;
  email: string;
  password: string;
  wallet_address: string;
  role: CredentialRole;
  permissions?: CredentialPermissions;
}

interface CredentialVerificationResult {
  valid: boolean;
  error?: string;
  organization?: Organization;
  credential?: OrganizationCredential;
}

/**
 * Register a new organization (Admin only)
 * Organizations are parent entities - NO email, NO password, NO wallet
 */
export async function registerOrganization(
  request: OrganizationRegistrationRequest
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
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

    if (!adminUser || !adminUser.can_manage_organizations) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Check if registration number already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('registration_number', request.registration_number)
      .single();

    if (existingOrg) {
      return { success: false, error: 'Registration number already exists' };
    }

    // Create organization (NO email, NO password, NO wallet)
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: request.name,
        organization_type: request.organization_type,
        registration_number: request.registration_number,
        phone: request.phone,
        address: request.address,
        country: request.country,
        created_by: user.id,
        verification_documents: request.verification_documents || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, organization: organization as Organization };
  } catch (error) {
    console.error('Error registering organization:', error);
    return { success: false, error: 'Failed to register organization' };
  }
}

/**
 * Issue credentials to an organization (Admin only)
 * Creates a Supabase Auth user and links it to the credential
 */
export async function issueCredential(
  request: CredentialIssuanceRequest
): Promise<{ success: boolean; credential?: OrganizationCredential; error?: string }> {
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

    if (!adminUser || !adminUser.can_issue_credentials) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Validate required fields
    if (!request.email || !request.password || !request.wallet_address || !request.role) {
      return { success: false, error: 'Missing required fields: email, password, wallet_address, and role are required' };
    }

    // Validate wallet address format (Ethereum address)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(request.wallet_address)) {
      return { success: false, error: 'Invalid wallet address format. Must be a valid Ethereum address (0x followed by 40 hex characters)' };
    }

    // Verify organization exists
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', request.organization_id)
      .single();

    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    // Check if email is already in use
    const { data: existingEmail } = await supabase
      .from('organization_credentials')
      .select('id')
      .eq('email', request.email)
      .single();

    if (existingEmail) {
      return { success: false, error: 'Email address is already in use by another credential' };
    }

    // Check if wallet address is already in use
    const { data: existingWallet } = await supabase
      .from('organization_credentials')
      .select('id')
      .eq('wallet_address', request.wallet_address.toLowerCase())
      .eq('status', 'active')
      .single();

    if (existingWallet) {
      return { success: false, error: 'Wallet address is already in use by another active credential' };
    }

    // Get default permissions based on role if not provided
    const permissions = request.permissions || getDefaultPermissions(request.role);

    // Generate credential hash
    const { data: credentialHashData, error: hashError } = await supabase
      .rpc('generate_credential_hash', {
        org_id: request.organization_id,
        issued_by_id: user.id,
      });

    if (hashError) {
      return { success: false, error: 'Failed to generate credential hash' };
    }

    // NOTE: This function is deprecated - use createStakeholder() instead
    // Credentials are no longer used - stakeholders replace credentials
    return { success: false, error: 'This function is deprecated. Use createStakeholder() from stakeholders.ts instead.' };
  } catch (error: any) {
    console.error('Error issuing credential:', error);
    return { success: false, error: error.message || 'Failed to issue credential' };
  }
}

/**
 * Revoke a credential (Admin only)
 */
export async function revokeCredential(
  credentialId: string,
  reason: string
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

    if (!adminUser || !adminUser.can_revoke_credentials) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Revoke credential
    const { error } = await supabase
      .from('organization_credentials')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason: reason,
      })
      .eq('id', credentialId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error revoking credential:', error);
    return { success: false, error: 'Failed to revoke credential' };
  }
}

/**
 * Verify a credential
 */
export async function verifyCredential(
  credentialHash: string
): Promise<CredentialVerificationResult> {
  try {
    const supabase = createClient();

    // Get credential
    const { data: credential, error } = await supabase
      .from('organization_credentials')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('credential_hash', credentialHash)
      .single();

    if (error || !credential) {
      return { valid: false, error: 'Credential not found' };
    }

    // Check if credential is active
    if (credential.status !== 'active') {
      return { valid: false, error: `Credential is ${credential.status}` };
    }

    // Check if credential is expired
    const expiresAt = new Date(credential.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'Credential has expired' };
    }

    // Check if organization is active
    const org = credential.organization as unknown as Organization;
    if (!org.is_active) {
      return { valid: false, error: 'Organization is not active' };
    }

    return {
      valid: true,
      organization: org,
      credential: credential as OrganizationCredential,
    };
  } catch (error) {
    console.error('Error verifying credential:', error);
    return { valid: false, error: 'Failed to verify credential' };
  }
}

/**
 * Get all organizations (Admin only)
 */
export async function getAllOrganizations(): Promise<{
  success: boolean;
  organizations?: Organization[];
  error?: string;
}> {
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

    if (!adminUser) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, organizations: organizations as Organization[] };
  } catch (error) {
    console.error('Error getting organizations:', error);
    return { success: false, error: 'Failed to get organizations' };
  }
}

/**
 * Get organization credentials (Admin only)
 */
export async function getOrganizationCredentials(
  organizationId: string
): Promise<{
  success: boolean;
  credentials?: OrganizationCredential[];
  error?: string;
}> {
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

    if (!adminUser) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get credentials
    const { data: credentials, error } = await supabase
      .from('organization_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .order('issued_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, credentials: credentials as OrganizationCredential[] };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return { success: false, error: 'Failed to get credentials' };
  }
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: CredentialRole): CredentialPermissions {
  const defaults: Record<CredentialRole, CredentialPermissions> = {
    manufacturer: {
      can_create_batches: true,
      can_read_batches: true,
      can_update_batches: true,
      can_ship_batches: true,
      can_view_analytics: true,
      can_export_data: true,
    },
    distributor: {
      can_read_batches: true,
      can_receive_batches: true,
      can_ship_batches: true,
      can_distribute_batches: true,
      can_view_analytics: true,
    },
    logistics: {
      can_read_batches: true,
      can_receive_batches: true,
      can_ship_batches: true,
      can_view_analytics: false,
    },
    pharmacy: {
      can_read_batches: true,
      can_receive_batches: true,
      can_dispense_batches: true,
      can_view_analytics: false,
    },
    regulator: {
      can_read_batches: true,
      can_approve_batches: true,
      can_reject_batches: true,
      can_recall_batches: true,
      can_view_analytics: true,
      can_export_data: true,
    },
  };

  return defaults[role];
}

/**
 * Update organization (Admin only)
 */
export async function updateOrganization(
  organizationId: string,
  updates: Partial<Organization>
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
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

    if (!adminUser || !adminUser.can_manage_organizations) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, organization: organization as Organization };
  } catch (error) {
    console.error('Error updating organization:', error);
    return { success: false, error: 'Failed to update organization' };
  }
}

/**
 * Deactivate/Activate organization (Admin only)
 */
export async function toggleOrganizationStatus(
  organizationId: string,
  isActive: boolean
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

    if (!adminUser || !adminUser.can_manage_organizations) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update organization status
    const { error } = await supabase
      .from('organizations')
      .update({ is_active: isActive })
      .eq('id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling organization status:', error);
    return { success: false, error: 'Failed to update organization status' };
  }
}

/**
 * Update credential (extend expiry, change role, etc.) (Admin only)
 */
export async function updateCredential(
  credentialId: string,
  updates: {
    expires_at?: string;
    role?: CredentialRole;
    permissions?: CredentialPermissions;
  }
): Promise<{ success: boolean; credential?: OrganizationCredential; error?: string }> {
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

    if (!adminUser || !adminUser.can_issue_credentials) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Build update object
    const updateData: any = {};
    if (updates.expires_at) updateData.expires_at = updates.expires_at;
    if (updates.role) updateData.role = updates.role;
    if (updates.permissions) updateData.permissions = updates.permissions;

    // Update credential
    const { data: credential, error } = await supabase
      .from('organization_credentials')
      .update(updateData)
      .eq('id', credentialId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, credential: credential as OrganizationCredential };
  } catch (error) {
    console.error('Error updating credential:', error);
    return { success: false, error: 'Failed to update credential' };
  }
}

/**
 * Reset credential password (Admin only)
 */
export async function resetCredentialPassword(
  credentialId: string,
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

    if (!adminUser || !adminUser.can_manage_organizations) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get credential user_id
    const { data: credential } = await supabase
      .from('organization_credentials')
      .select('user_id')
      .eq('id', credentialId)
      .single();

    if (!credential?.user_id) {
      return { success: false, error: 'Credential user not found' };
    }

    // NOTE: This function is deprecated - use resetStakeholderPassword() instead
    // Credentials are no longer used - stakeholders replace credentials
    return { success: false, error: 'This function is deprecated. Use resetStakeholderPassword() from stakeholders.ts instead.' };
  } catch (error) {
    console.error('Error resetting credential password:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

/**
 * Bulk revoke credentials (Admin only)
 */
export async function bulkRevokeCredentials(
  credentialIds: string[],
  reason: string
): Promise<{ success: boolean; error?: string; revokedCount?: number }> {
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

    if (!adminUser || !adminUser.can_revoke_credentials) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Bulk revoke credentials
    const { error, count } = await supabase
      .from('organization_credentials')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason: reason,
      })
      .in('id', credentialIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, revokedCount: count || credentialIds.length };
  } catch (error) {
    console.error('Error bulk revoking credentials:', error);
    return { success: false, error: 'Failed to bulk revoke credentials' };
  }
}

/**
 * Bulk extend credential expiry (Admin only)
 */
export async function bulkExtendCredentialExpiry(
  credentialIds: string[],
  newExpiryDate: string
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
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

    if (!adminUser || !adminUser.can_issue_credentials) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Bulk update expiry
    const { error, count } = await supabase
      .from('organization_credentials')
      .update({ expires_at: newExpiryDate })
      .in('id', credentialIds)
      .eq('status', 'active'); // Only extend active credentials

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, updatedCount: count || credentialIds.length };
  } catch (error) {
    console.error('Error bulk extending expiry:', error);
    return { success: false, error: 'Failed to bulk extend expiry' };
  }
}
