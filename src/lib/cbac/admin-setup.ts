/**
 * Admin Setup Helper
 * Automatically creates admin user if one doesn't exist (first user only)
 */

import { createClient } from '@/lib/supabase/client';

export interface AdminSetupResult {
  success: boolean;
  isAdmin: boolean;
  adminUser?: any;
  error?: string;
  needsSetup?: boolean;
}

/**
 * Check if current user is admin, and auto-create if needed (first user only)
 */
export async function ensureAdminUser(): Promise<AdminSetupResult> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, isAdmin: false, error: 'Not authenticated' };
    }

    // Check if admin user exists
    const { data: adminUser, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single();

    // If admin user exists and is active
    if (adminUser && adminUser.is_active && adminUser.can_manage_stakeholders) {
      return { success: true, isAdmin: true, adminUser };
    }

    // If admin user exists but is inactive or missing permissions
    if (adminUser) {
      return {
        success: false,
        isAdmin: false,
        needsSetup: true,
        error: `Admin user exists but is inactive or missing permissions. is_active=${adminUser.is_active}, can_manage_stakeholders=${adminUser.can_manage_stakeholders}`,
        adminUser,
      };
    }

    // Admin user doesn't exist - check if this is the first user
    // (no other admin users exist)
    const { data: existingAdmins, error: countError } = await supabase
      .from('admin_users')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking existing admins:', countError);
    }

    const isFirstUser = !existingAdmins || (existingAdmins as any).length === 0;

    if (isFirstUser) {
      // Auto-create admin user for first user
      const { data: newAdmin, error: createError } = await supabase
        .from('admin_users')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || 'System Administrator',
          is_active: true,
          can_manage_organizations: true,
          can_manage_stakeholders: true,
        })
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          isAdmin: false,
          needsSetup: true,
          error: `Failed to auto-create admin user: ${createError.message}. Please create manually.`,
        };
      }

      return { success: true, isAdmin: true, adminUser: newAdmin };
    }

    // Not first user and not admin - needs manual setup
    return {
      success: false,
      isAdmin: false,
      needsSetup: true,
      error: `User ${user.email || user.id} is not an admin. Please contact an existing admin to grant access, or run the admin setup SQL.`,
    };
  } catch (error: any) {
    console.error('Error ensuring admin user:', error);
    return {
      success: false,
      isAdmin: false,
      needsSetup: true,
      error: error?.message || 'Failed to check admin status',
    };
  }
}

/**
 * Manually create admin user (for setup)
 */
export async function createAdminUserManually(
  userId: string,
  email: string,
  fullName: string = 'System Administrator'
): Promise<AdminSetupResult> {
  try {
    const supabase = createClient();

    const { data: adminUser, error: createError } = await supabase
      .from('admin_users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        is_active: true,
        can_manage_organizations: true,
        can_manage_stakeholders: true,
      })
      .select()
      .single();

    if (createError) {
      // If user already exists, try to update
      if (createError.code === '23505') {
        const { data: updatedAdmin, error: updateError } = await supabase
          .from('admin_users')
          .update({
            is_active: true,
            can_manage_organizations: true,
            can_manage_stakeholders: true,
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            isAdmin: false,
            error: `Failed to update admin user: ${updateError.message}`,
          };
        }

        return { success: true, isAdmin: true, adminUser: updatedAdmin };
      }

      return {
        success: false,
        isAdmin: false,
        error: `Failed to create admin user: ${createError.message}`,
      };
    }

    return { success: true, isAdmin: true, adminUser };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      isAdmin: false,
      error: error?.message || 'Failed to create admin user',
    };
  }
}
