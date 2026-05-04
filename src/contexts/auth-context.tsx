
"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { logLogin, logLogout, logRoleSwitch } from "@/lib/audit/logger";

export type UserRole = "manufacturer" | "distributor" | "pharmacy" | "regulator" | "patient" | "logistics" | "admin";

export const ALL_ROLES: UserRole[] = ["manufacturer", "distributor", "logistics", "pharmacy", "regulator", "patient", "admin"];

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  switchRole: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  isMounted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    
    // Check active sessions and sets the user
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Fetch user role from user_metadata or profile table
          const userRole = session.user.user_metadata?.role as UserRole;
          if (userRole) {
            setRoleState(userRole);
          } else {
            // Fallback: fetch from profiles table if needed
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role) {
              setRoleState(profile.role);
            }
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
        setIsAuthenticated(true);
        
        const userRole = session.user.user_metadata?.role as UserRole;
        if (userRole) {
          setRoleState(userRole);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setRoleState(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const switchRole = async () => {
    // Disable role switching in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Role switching is disabled in production for security reasons.");
    }
    
    try {
      const currentRole = role;
      const userId = user?.id;
      const userEmail = user?.email;
      
      // Log the role switch attempt
      if (userId && userEmail && currentRole) {
        await logRoleSwitch(userId, userEmail, currentRole, 'switching');
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setRoleState(null);
      router.push("/login");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to switch role. Please try again.";
      console.error("Error switching role:", errorMessage);
      throw new Error(errorMessage);
    }
  };

  const login = async (email: string, password: string, selectedRole: UserRole) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Get the user's role from metadata or profiles table
        let userRole = data.user.user_metadata?.role as UserRole | undefined;
        if (!userRole) {
          // Fallback: fetch from profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          if (profileError) {
            throw profileError;
          }
          userRole = profile?.role as UserRole | undefined;
        }

        // Role validation: must match selected role
        if (userRole && userRole !== selectedRole) {
          // Log out the user before throwing error
          await supabase.auth.signOut();
          const error = new Error(`Role mismatch: You are registered as '${userRole}'. Please select '${userRole}' to login.`);
          (error as any).actualRole = userRole; // Attach actual role to error
          throw error;
        }

        setUser(data.user);
        setIsAuthenticated(true);
        setRoleState(userRole ?? selectedRole);
        
        // Log successful login
        await logLogin(data.user.id, email, userRole ?? selectedRole, true);
        
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Log failed login attempt
      await logLogin('unknown', email, selectedRole, false);
      
      throw error;
    }
  };

  const signup = async (email: string, password: string, selectedRole: UserRole, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile entry
        try {
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: selectedRole,
              full_name: fullName,
              email: email,
            });
        } catch (profileError: any) {
          console.error("Error creating profile:", profileError);
          // Profile might be auto-created by trigger, continue anyway
        }
        
        setUser(data.user);
        setIsAuthenticated(true);
        setRoleState(selectedRole);
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const userId = user?.id;
      const userEmail = user?.email;
      const userRole = role;
      
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setRoleState(null);
      
      // Log successful logout
      if (userId && userEmail && userRole) {
        await logLogout(userId, userEmail, userRole);
      }
      
      router.push("/login");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to logout. Please try again.";
      console.error("Logout error:", errorMessage);
      // Force logout even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      setRoleState(null);
      router.push("/login");
      throw new Error(errorMessage);
    }
  };

  const value = useMemo(
    () => ({ 
      user, 
      role, 
      switchRole, 
      isAuthenticated, 
      isLoading,
      login, 
      signup,
      logout, 
      isMounted 
    }),
    [user, role, isAuthenticated, isLoading, isMounted]
  );
    
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
