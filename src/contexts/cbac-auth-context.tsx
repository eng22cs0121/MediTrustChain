/**
 * STAKEHOLDER-BASED AUTHENTICATION CONTEXT
 * Manages authentication for stakeholders (hierarchical: Organizations → Stakeholders)
 * Each stakeholder has email, password, wallet, and role
 */

"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { OrganizationType, Organization, Stakeholder } from "@/types/cbac";

interface CbacAuthContextType {
  user: User | null;
  session: Session | null;
  organizationType: OrganizationType | null;
  organization: Organization | null;
  stakeholder: Stakeholder | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginStakeholder: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isMounted: boolean;
}

const CbacAuthContext = createContext<CbacAuthContextType | undefined>(undefined);

export function CbacAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);

    // Check active sessions with timeout to prevent hanging
    const checkSession = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any } } | null;

        if (result && 'data' in result && result.data.session?.user) {
          const session = result.data.session;
          setUser(session.user);
          setSession(session);
          setIsAuthenticated(true);

          // Check if admin
          const userIsAdmin = session.user.user_metadata?.is_admin === true;
          setIsAdmin(userIsAdmin);

          if (!userIsAdmin) {
            // Load stakeholder and organization data
            await loadStakeholderData();
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        setIsAuthenticated(true);

        const userIsAdmin = session.user.user_metadata?.is_admin === true;
        setIsAdmin(userIsAdmin);

        if (!userIsAdmin) {
          await loadStakeholderData();
        }
      } else {
        resetState();
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadStakeholderData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get stakeholder and organization info
      const { data, error } = await supabase
        .from('stakeholders')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        console.error("Error loading stakeholder data:", error);
        return;
      }

      const org = data.organization as any;
      setOrganization(org);
      // IMPORTANT: Use stakeholder's ROLE for access control, not organization type
      // This allows distributors, regulators, etc. to work even if they belong to a manufacturer org
      setOrganizationType(data.role as OrganizationType);
      setStakeholder(data as Stakeholder);
    } catch (error) {
      console.error("Error loading stakeholder data:", error);
    }
  };

  const resetState = () => {
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setOrganization(null);
    setOrganizationType(null);
    setStakeholder(null);
  };

  /**
   * Login for stakeholders
   * Stakeholders have email, password, wallet, and role directly
   */
  const loginStakeholder = async (email: string, password: string) => {
    try {
      // FIRST: Check if stakeholder record exists using RPC function (bypasses RLS)
      const { data: stakeholderResult, error: stakeholderError } = await supabase
        .rpc('get_stakeholder_by_email_for_login', { p_email: email.toLowerCase() });

      if (stakeholderError) {
        console.error('Error checking stakeholder:', stakeholderError);
        throw new Error('Error verifying account. Please try again.');
      }

      // The function returns an array, check if we got results
      const stakeholderData = Array.isArray(stakeholderResult) ? stakeholderResult[0] : stakeholderResult;

      if (!stakeholderData) {
        throw new Error('Stakeholder account not found. Please contact your administrator.');
      }

      if (!stakeholderData.is_active) {
        throw new Error('Stakeholder account is inactive. Please contact your administrator.');
      }

      // Verify organization is active
      if (!stakeholderData.org_is_active) {
        throw new Error('Organization is not active');
      }

      // THEN: Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to authenticate user');
      }

      // Build organization object for state
      const org = {
        id: stakeholderData.organization_id,
        name: stakeholderData.organization_name,
        organization_type: stakeholderData.organization_type,
        is_active: stakeholderData.org_is_active,
      };

      // Set state immediately
      setUser(authData.user);
      setSession(authData.session);
      setIsAuthenticated(true);
      setOrganization(org as Organization);
      // IMPORTANT: Use stakeholder's ROLE for access control, not organization type
      setOrganizationType(stakeholderData.role as OrganizationType);
      setStakeholder(stakeholderData as unknown as Stakeholder);

      // Update user metadata (fire and forget - don't block navigation)
      supabase.auth.updateUser({
        data: {
          organization_type: stakeholderData.organization_type,
          organization_id: stakeholderData.organization_id,
          organization_name: stakeholderData.organization_name,
          role: stakeholderData.role,
          is_stakeholder: true,
          stakeholder_id: stakeholderData.id,
          wallet_address: stakeholderData.wallet_address,
        },
      }).catch(err => console.warn('Failed to update user metadata:', err));

      // Redirect to organization dashboard based on stakeholder role
      router.push(`/dashboard/${stakeholderData.role}`);
    } catch (error: any) {
      console.error("Stakeholder login error:", error);
      throw error;
    }
  };

  /**
   * Login for admin users
   */
  const loginAdmin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Verify user is admin
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', data.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (adminError || !adminUser) {
          await supabase.auth.signOut();
          throw new Error('Not an admin user');
        }

        // Update user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            is_admin: true,
          },
        });

        if (updateError) {
          console.error("Error updating user metadata:", updateError);
        }

        setUser(data.user);
        setSession(data.session);
        setIsAuthenticated(true);
        setIsAdmin(true);

        router.push('/dashboard/admin');
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    console.log("CbacAuthContext: Executing logout...");
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log("Supabase signOut completed");
    } catch (error: any) {
      console.error("Logout error:", error?.message);
    } finally {
      // ALWAYS reset state and force hard redirect
      resetState();
      console.log("State reset. Redirecting to /login...");
      // Use absolute URL to ensure it works across different host setups if necessary
      // but usually /login is fine. Let's stick to absolute relative.
      window.location.href = window.location.origin + "/login";
    }
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      organizationType,
      organization,
      stakeholder,
      isAdmin,
      isAuthenticated,
      isLoading,
      loginStakeholder,
      loginAdmin,
      logout,
      isMounted,
    }),
    [user, session, organizationType, organization, stakeholder, isAdmin, isAuthenticated, isLoading, isMounted, logout]
  );

  return <CbacAuthContext.Provider value={value}>{children}</CbacAuthContext.Provider>;
}

export function useCbacAuth() {
  const context = useContext(CbacAuthContext);
  if (context === undefined) {
    throw new Error("useCbacAuth must be used within a CbacAuthProvider");
  }
  return context;
}

// Export types for use in components
export type { OrganizationType };
