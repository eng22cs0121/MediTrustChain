"use client";

import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, Loader2, Wallet, CheckCircle2, AlertCircle, Copy, ExternalLink, Eye, Edit, Ban, Check, Trash2 } from "lucide-react";
import { MotionDiv } from "@/components/motion-div";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBlockchain, useContract, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { BlockchainProof } from "@/components/dashboard/blockchain-proof";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fetchAuditLogs, fetchUserStats, type AuditLogEntry } from "@/lib/supabase/audit";
import { Activity, History, Users, Settings, Database, Filter, Search as SearchIcon, Download, Building2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationType } from "@/types/cbac";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CBACManagement } from "@/components/dashboard/cbac-management";

type RegisteredRegulator = {
  address: string;
  organization: string;
  isApproved: boolean;
  registeredAt?: string;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [regulatorAddress, setRegulatorAddress] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);
  const [approvedRegulators, setApprovedRegulators] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [contractOwner, setContractOwner] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [userRole, setUserRole] = useState<number>(1); // Default to REGULATOR
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [logFilter, setLogFilter] = useState("all");

  // Organization form states
  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCountry, setOrgCountry] = useState("");
  const [lastCreationTime, setLastCreationTime] = useState<number>(0);

  // Stakeholder form states
  const [stakeholderUsername, setStakeholderUsername] = useState("");
  const [stakeholderEmail, setStakeholderEmail] = useState("");
  const [stakeholderPassword, setStakeholderPassword] = useState("");
  const [stakeholderOrgId, setStakeholderOrgId] = useState("");
  const [stakeholderRole, setStakeholderRole] = useState<OrganizationType>("manufacturer");
  const [stakeholderWallet, setStakeholderWallet] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [organizationStakeholders, setOrganizationStakeholders] = useState<Record<string, any[]>>({});
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [loadingStakeholders, setLoadingStakeholders] = useState<Record<string, boolean>>({});

  // Edit stakeholder dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<any>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editWallet, setEditWallet] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRole, setEditRole] = useState<OrganizationType>("manufacturer");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStakeholder, setDeletingStakeholder] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Blockchain hooks
  const { wallet, connectWallet, isLoading: isWalletLoading } = useBlockchain();
  const {
    isReady,
    registerUser,
    grantRegulatoryApproval,
    getContractOwner,
    getApprovedRegulators,
    getUser,
    isRegulatorApproved,
    isPaused: checkIsPaused,
    pauseContract,
    unpauseContract,
    getTotalBatches: fetchTotalBatches
  } = useContract();
  const blockchainConfigured = isBlockchainConfigured();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  // Check if connected wallet is the owner
  useEffect(() => {
    const checkOwnership = async () => {
      if (isReady() && wallet.isConnected) {
        try {
          const owner = await getContractOwner();
          if (owner) {
            setContractOwner(owner);
            const isOwnerCheck = owner.toLowerCase() === wallet.address?.toLowerCase();
            setIsOwner(isOwnerCheck);

            // Debug logging
            console.log("=== OWNER CHECK DEBUG ===");
            console.log("Contract Owner Address:", owner);
            console.log("Connected Wallet Address:", wallet.address);
            console.log("Normalized Contract Owner:", owner.toLowerCase());
            console.log("Normalized Wallet:", wallet.address?.toLowerCase());
            console.log("Is Owner?", isOwnerCheck);
            console.log("========================");
          }
        } catch (error) {
          console.error("Error checking ownership:", error);
        }
      }
    };
    checkOwnership();
  }, [isReady, wallet.isConnected, wallet.address, getContractOwner]);

  // Fetch approved regulators, pause status, and stats
  useEffect(() => {
    const fetchData = async () => {
      if (isReady()) {
        try {
          const regulators = await getApprovedRegulators();
          setApprovedRegulators(regulators);

          const paused = await checkIsPaused();
          setIsPaused(paused);

          const batches = await fetchTotalBatches();
          setTotalBatches(batches);

          // Fetch user stats
          const stats = await fetchUserStats();
          setUserStats(stats);
        } catch (error) {
          console.error("Error fetching contract data:", error);
        }
      }
    };
    fetchData();
  }, [isReady, getApprovedRegulators, checkIsPaused, fetchTotalBatches, blockchainTxHash]);

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setIsLogsLoading(true);
    try {
      const { logs } = await fetchAuditLogs(50);
      setAuditLogs(logs);
    } catch (error) {
      // Audit logs table optional - silently ignore
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();

    // Subscribe to real-time audit logs
    const supabase = createClient();
    const channel = supabase
      .channel('public:audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        setAuditLogs(current => [payload.new as AuditLogEntry, ...current].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAuditLogs]);

  // Load organizations for stakeholder creation
  const loadOrganizations = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, organization_type')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setOrganizations(data);
    } else if (error) {
      console.error('Error loading organizations:', error);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // Refresh organizations when switching to organizations tab
  useEffect(() => {
    if (activeTab === 'organizations') {
      loadOrganizations();
    }
  }, [activeTab, loadOrganizations]);

  // Load stakeholders for an organization
  const loadStakeholdersForOrg = useCallback(async (orgId: string) => {
    setLoadingStakeholders(prev => ({ ...prev, [orgId]: true }));
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stakeholder_details')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrganizationStakeholders(prev => ({ ...prev, [orgId]: data }));
    }
    setLoadingStakeholders(prev => ({ ...prev, [orgId]: false }));
  }, []);

  // Load stakeholders when organization is expanded
  useEffect(() => {
    if (expandedOrgId && !organizationStakeholders[expandedOrgId]) {
      loadStakeholdersForOrg(expandedOrgId);
    }
  }, [expandedOrgId, loadStakeholdersForOrg, organizationStakeholders]);

  const handleGrantApproval = async () => {
    if (!regulatorAddress.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a regulator wallet address." });
      return;
    }

    // Basic address validation
    if (!regulatorAddress.startsWith("0x") || regulatorAddress.length !== 42) {
      toast({ variant: "destructive", title: "Error", description: "Invalid Ethereum address format." });
      return;
    }

    setIsSubmitting(true);
    setBlockchainTxHash(null);

    try {
      // Step 1: Check if user is registered on blockchain
      console.log("🔍 Checking if address is registered as regulator...");
      const user = await getUser(regulatorAddress);

      if (!user) {
        toast({
          variant: "destructive",
          title: "❌ Registration Required",
          description: "This address is not registered on the blockchain. User must register as a regulator first.",
        });
        setIsSubmitting(false);
        return;
      }

      if (user.role !== 1) { // UserRole.REGULATOR = 1
        toast({
          variant: "destructive",
          title: "❌ Invalid Role",
          description: `This address is registered as ${['Manufacturer', 'Regulator', 'Distributor', 'Logistics', 'Pharmacy', 'Patient'][user.role]}, not as a Regulator.`,
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Check if already approved
      const alreadyApproved = await isRegulatorApproved(regulatorAddress);
      if (alreadyApproved) {
        toast({
          title: "ℹ️ Already Approved",
          description: `${regulatorAddress.slice(0, 6)}...${regulatorAddress.slice(-4)} is already an approved regulator.`,
        });
        setIsSubmitting(false);
        return;
      }

      // Step 3: Grant approval
      console.log("🔗 Granting regulatory approval on blockchain...");
      const result = await grantRegulatoryApproval(regulatorAddress);

      if (result.success) {
        setBlockchainTxHash(result.hash || null);
        toast({
          title: "✅ Approval Granted",
          description: `Regulatory approval granted to ${regulatorAddress.slice(0, 6)}...${regulatorAddress.slice(-4)}`,
        });
        setRegulatorAddress("");
      } else {
        toast({
          variant: "destructive",
          title: "❌ Approval Failed",
          description: result.error || "Failed to grant approval on blockchain.",
        });
      }
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to grant regulatory approval.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterUser = async () => {
    if (!regulatorAddress.trim() || !organizationName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter both address and organization name." });
      return;
    }

    if (!regulatorAddress.startsWith("0x") || regulatorAddress.length !== 42) {
      toast({ variant: "destructive", title: "Error", description: "Invalid Ethereum address format." });
      return;
    }

    setIsSubmitting(true);

    try {
      // Note: This requires the user to switch to that wallet or use a different method
      toast({
        title: "⚠️ Action Required",
        description: "The regulator must call registerUser() from their own wallet. This function can only be called by the wallet owner.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseContract = async () => {
    if (!isOwner) return;
    setIsSubmitting(true);
    try {
      const result = await pauseContract();
      if (result.success && result.hash) {
        setBlockchainTxHash(result.hash);
        setIsPaused(true);
        toast({
          title: "⏸️ Contract Paused",
          description: "All contract operations are now paused (emergency mode).",
        });
      } else {
        throw new Error(result.error || "Failed to pause contract");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to pause contract.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpauseContract = async () => {
    if (!isOwner) return;
    setIsSubmitting(true);
    try {
      const result = await unpauseContract();
      if (result.success && result.hash) {
        setBlockchainTxHash(result.hash);
        setIsPaused(false);
        toast({
          title: "▶️ Contract Unpaused",
          description: "Contract operations have been resumed.",
        });
      } else {
        throw new Error(result.error || "Failed to unpause contract");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unpause contract.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields (NO email required)
    if (!orgName.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // Get current admin user ID for created_by
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('Admin user not found');

      // Generate registration number (generic prefix since no type)
      const registrationNumber = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create organization record (NO email, NO password, NO wallet, NO type)
      // Using 'manufacturer' as default type (required by DB schema)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          organization_type: 'manufacturer', // Default type - organizations are just containers
          registration_number: registrationNumber,
          phone: orgPhone || null,
          address: orgAddress || null,
          country: orgCountry || null,
          created_by: adminUser.id,
          is_active: true
        })
        .select('id')
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Failed to create organization record');

      toast({
        title: "✅ Organization Created!",
        description: `${orgName} registered with ID: ${registrationNumber}. You can now add stakeholders with email, password, and wallet.`,
      });

      // Reset form
      setOrgName("");
      setOrgPhone("");
      setOrgAddress("");
      setOrgCountry("");

      // Reload organizations list
      await loadOrganizations();

      // Expand the newly created organization
      if (orgData?.id) {
        setExpandedOrgId(orgData.id);
        // Load stakeholders for the new organization
        await loadStakeholdersForOrg(orgData.id);
      }

    } catch (error: any) {
      console.error("Error creating organization:", error);

      // Better error message extraction for different error types
      let errorMessage = "Failed to create organization";

      if (error?.message) {
        errorMessage = error.message;
        // Handle rate limit specifically
        if (error.message.includes("1 seconds") || error.message.includes("rate limit")) {
          errorMessage = "Please wait a moment before creating another organization (rate limit)";
        }
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'object' && Object.keys(error).length > 0) {
        errorMessage = JSON.stringify(error);
      }

      toast({
        title: "❌ Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!stakeholderUsername.trim() || !stakeholderEmail.trim() || !stakeholderPassword.trim() || !stakeholderOrgId || !stakeholderWallet.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stakeholderEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Validate password strength
    if (stakeholderPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    // Validate wallet address format
    if (!stakeholderWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Ethereum wallet address (0x followed by 40 hex characters)",
        variant: "destructive"
      });
      return;
    }

    // Validate organization is selected
    if (!stakeholderOrgId) {
      toast({
        title: "Organization Required",
        description: "Please select an organization from the dropdown",
        variant: "destructive"
      });
      return;
    }

    // Rate limit check - Supabase requires 1 second between signups
    const now = Date.now();
    const timeSinceLastCreation = now - lastCreationTime;
    if (timeSinceLastCreation < 2000) { // 2 seconds to be safe
      toast({
        title: "Please Wait",
        description: `Please wait ${Math.ceil((2000 - timeSinceLastCreation) / 1000)} second(s) before creating another user`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setLastCreationTime(now);

    try {
      // Use the createStakeholder function from the stakeholders library
      const { createStakeholder } = await import('@/lib/cbac/stakeholders');

      const result = await createStakeholder({
        organization_id: stakeholderOrgId,
        full_name: stakeholderUsername,
        email: stakeholderEmail,
        password: stakeholderPassword,
        wallet_address: stakeholderWallet,
        role: stakeholderRole,
      });

      if (!result.success || !result.stakeholder) {
        // Show detailed error message with actionable guidance
        const errorMsg = result.error || 'Failed to create stakeholder';

        console.error('Stakeholder creation failed:', {
          error: errorMsg,
          result: result
        });

        // Check if it's an admin setup error
        if (errorMsg.includes('ADMIN SETUP REQUIRED') || errorMsg.includes('admin_users')) {
          toast({
            title: "🔧 Admin Setup Required",
            description: "Your account needs admin privileges. Check the console for SQL setup instructions, or see FIX_ALL_ERRORS.md",
            variant: "destructive",
            duration: 10000,
          });

          // Also show in alert
          throw new Error(
            "Admin setup required. Please check the browser console for SQL instructions to set up your admin account, or see FIX_ALL_ERRORS.md file in the project root."
          );
        }

        // For other errors, show the error message
        toast({
          title: "❌ Creation Failed",
          description: errorMsg.length > 200 ? errorMsg.substring(0, 200) + '...' : errorMsg,
          variant: "destructive",
          duration: 8000,
        });

        throw new Error(errorMsg);
      }

      toast({
        title: "✅ Stakeholder Created!",
        description: `${stakeholderUsername} added successfully with email, password, and wallet address`,
      });

      // Reset form
      setStakeholderUsername("");
      setStakeholderEmail("");
      setStakeholderPassword("");
      setStakeholderOrgId("");
      setStakeholderRole("manufacturer");
      setStakeholderWallet("");

      // Reload organizations list and stakeholders for the organization
      await loadOrganizations();
      if (stakeholderOrgId) {
        await loadStakeholdersForOrg(stakeholderOrgId);
        // Expand the organization to show the new stakeholder
        setExpandedOrgId(stakeholderOrgId);
      }

    } catch (error: any) {
      console.error("Error creating stakeholder:", error);

      // Better error message extraction
      let errorMessage = "Failed to create stakeholder";
      if (error?.message) {
        errorMessage = error.message;
        if (error.message.includes("1 seconds") || error.message.includes("rate limit")) {
          errorMessage = "Please wait a moment before creating another user (rate limit)";
        }
      }

      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterRegulator = async () => {
    if (!organizationName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter organization name." });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await registerUser(userRole, organizationName);
      if (result.success && result.hash) {
        setBlockchainTxHash(result.hash);
        toast({
          title: "✅ User Registered",
          description: `Registered as regulator: ${organizationName}`,
        });
        setOrganizationName("");
      } else {
        throw new Error(result.error || "Failed to register user");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register user. You may already be registered.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Address copied to clipboard." });
  };

  // Open edit dialog with stakeholder data
  // Open edit dialog with stakeholder data
  const openEditDialog = (stakeholder: any) => {
    setEditingStakeholder(stakeholder);
    setEditFullName(stakeholder.full_name || "");
    setEditEmail(stakeholder.email || "");
    setEditWallet(stakeholder.wallet_address || "");
    setEditPassword(""); // Password is never loaded back
    setEditPhone(stakeholder.phone || "");
    setEditPosition(stakeholder.position || stakeholder.stakeholder_position || "");
    setEditNotes(stakeholder.notes || "");
    setEditRole(stakeholder.role || "manufacturer");
    setEditDialogOpen(true);
  };

  // Save stakeholder edits
  const handleSaveEdit = async () => {
    if (!editingStakeholder) return;

    // Basic validation
    if (!editEmail.includes('@')) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    if (editWallet && !editWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({ variant: "destructive", title: "Invalid Wallet", description: "Please enter a valid Ethereum wallet address." });
      return;
    }

    setIsEditSubmitting(true);
    try {
      const { updateStakeholder } = await import("@/lib/cbac/stakeholders");
      const result = await updateStakeholder(editingStakeholder.id, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        wallet_address: editWallet.trim(),
        role: editRole,
        password: editPassword || undefined, // Only send if not empty
        phone: editPhone.trim() || undefined,
        position: editPosition.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Stakeholder Updated",
          description: `${editFullName} has been updated successfully`,
        });
        setEditDialogOpen(false);
        // Reload stakeholders for the organization
        if (editingStakeholder.organization_id) {
          await loadStakeholdersForOrg(editingStakeholder.organization_id);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update stakeholder",
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (stakeholder: any) => {
    setDeletingStakeholder(stakeholder);
    setDeleteDialogOpen(true);
  };

  // Confirm delete stakeholder
  const handleConfirmDelete = async () => {
    if (!deletingStakeholder) return;

    setIsDeleting(true);
    try {
      const { deleteStakeholder } = await import("@/lib/cbac/stakeholders");
      const result = await deleteStakeholder(deletingStakeholder.id);

      if (result.success) {
        toast({
          title: "Stakeholder Deleted",
          description: `${deletingStakeholder.full_name || deletingStakeholder.email} has been permanently deleted`,
        });
        setDeleteDialogOpen(false);
        // Reload stakeholders for the organization
        if (deletingStakeholder.organization_id) {
          await loadStakeholdersForOrg(deletingStakeholder.organization_id);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete stakeholder",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedRoute allowedTypes={['admin']}>
      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Control Tower
            </h1>
            <p className="text-muted-foreground mt-1">System-wide monitoring, security auditing, and contract governance</p>
          </div>

          <div className="flex items-center gap-2">
            {blockchainConfigured ? (
              wallet.isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Blockchain Synchronized
                </Badge>
              ) : (
                <Button onClick={connectWallet} variant="outline" size="sm" disabled={isWalletLoading}>
                  {isWalletLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Connect Wallet
                </Button>
              )
            ) : (
              <Badge variant="secondary">Database Only Mode</Badge>
            )}
          </div>
        </div>

        {/* Blockchain Proof */}
        <BlockchainProof latestTxHash={blockchainTxHash} />

        <Tabs defaultValue="overview" className="w-full space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations & Stakeholders
            </TabsTrigger>
            <TabsTrigger value="cbac" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              CBAC Permissions
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Network
            </TabsTrigger>
            <TabsTrigger value="contract" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Contract
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Contract Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground whitespace-nowrap">Total Network Batches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalBatches}</div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                    <Database className="h-3 w-3" />
                    <span>On-chain verified</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Certified Regulators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{approvedRegulators.length}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <Shield className="h-3 w-3" />
                    <span>Authorized entities</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Network Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{userStats?.total || '...'}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Users className="h-3 w-3" />
                    <span>Registered organizations</span>
                  </div>
                </CardContent>
              </Card>

              <Card className={isPaused ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={isPaused ? "bg-red-500" : "bg-green-500"}>
                    {isPaused ? "⚠️ PAUSED" : "✓ ACTIVE"}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-2">
                    {isPaused ? "All transactions halted" : "Security protocols normal"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Emergency Controls (Only if Owner) */}
            {blockchainConfigured && wallet.isConnected && isOwner && (
              <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5" />
                    Protocol Emergency Override
                  </CardTitle>
                  <CardDescription>
                    Pause or resume the entire blockchain consensus mechanism. Use only in case of detected smart contract vulnerability or extreme network instability.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button
                    variant="destructive"
                    onClick={handlePauseContract}
                    disabled={isPaused || isSubmitting}
                    className="font-bold"
                  >
                    {isSubmitting && activeTab === "overview" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    ⏸ PAUSE ALL OPERATIONS
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnpauseContract}
                    disabled={!isPaused || isSubmitting}
                    className="border-green-600 text-green-600 hover:bg-green-50 font-bold"
                  >
                    {isSubmitting && activeTab === "overview" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    ▶ RESUME OPERATIONS
                  </Button>
                  <div className="text-xs text-red-600 italic mt-2 w-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Confirmed as Contract Owner: {wallet.address}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Security Events</CardTitle>
                  <CardDescription>Last 5 system-wide audit entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {auditLogs.slice(0, 5).map((log, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0 last:pb-0">
                        <div className={`p-1.5 rounded ${log.result === 'success' ? 'bg-green-100 text-green-600' :
                          log.result === 'failure' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                          {log.result === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{log.event_type}</p>
                          <p className="text-xs text-muted-foreground">{log.user_email} • {format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize font-mono">{log.user_role}</Badge>
                      </div>
                    ))}
                    <Button variant="link" className="w-full text-xs" onClick={() => setActiveTab("audit")}>
                      View complete audit history
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Composition</CardTitle>
                  <CardDescription>Verified entities by role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userStats && Object.entries(userStats).filter(([k]) => k !== 'total').map(([role, count]: [string, any]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 capitalize">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role}s</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ width: `${(count / userStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-sm w-4">{count}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
                      <Shield className="h-4 w-4" />
                      All nodes are verified via decentralized identity
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Create Organization Card */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Create Organization
                  </CardTitle>
                  <CardDescription>
                    Create a logical organization container
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOrganization} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        placeholder="e.g., Pfizer Manufacturing"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgAddress">Address (Optional)</Label>
                      <Input
                        id="orgAddress"
                        placeholder="123 Main St, City, State"
                        value={orgAddress}
                        onChange={(e) => setOrgAddress(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgCountry">Country (Optional)</Label>
                      <Input
                        id="orgCountry"
                        placeholder="United States"
                        value={orgCountry}
                        onChange={(e) => setOrgCountry(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgPhone">Contact Info (Optional)</Label>
                      <Input
                        id="orgPhone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={orgPhone}
                        onChange={(e) => setOrgPhone(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Create Organization
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Organizations List with Stakeholders */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organizations & Stakeholders
                  </CardTitle>
                  <CardDescription>
                    Manage organizations and their stakeholders in a hierarchical structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {organizations.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No organizations yet. Create your first organization to get started.
                      </p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full" value={expandedOrgId || undefined} onValueChange={setExpandedOrgId}>
                      {organizations.map((org) => (
                        <AccordionItem key={org.id} value={org.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                  <div className="font-semibold">{org.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {organizationStakeholders[org.id]?.length || 0} stakeholder(s)
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {/* Create Stakeholder Form for this Organization */}
                              <Card className="border-dashed">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Add Stakeholder to {org.name}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setStakeholderOrgId(org.id);
                                    handleCreateStakeholder(e);
                                  }} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label htmlFor={`role-${org.id}`} className="text-xs">Role *</Label>
                                        <Select value={stakeholderRole} onValueChange={(value) => setStakeholderRole(value as OrganizationType)}>
                                          <SelectTrigger className="h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="manufacturer">🏭 Manufacturer</SelectItem>
                                            <SelectItem value="distributor">🚚 Distributor</SelectItem>
                                            <SelectItem value="logistics">📦 Logistics</SelectItem>
                                            <SelectItem value="pharmacy">💊 Pharmacy</SelectItem>
                                            <SelectItem value="regulator">⚖️ Regulator</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor={`username-${org.id}`} className="text-xs">Stakeholder Name *</Label>
                                        <Input
                                          id={`username-${org.id}`}
                                          placeholder="John Smith"
                                          value={stakeholderUsername}
                                          onChange={(e) => setStakeholderUsername(e.target.value)}
                                          disabled={isSubmitting}
                                          className="h-9"
                                          required
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`email-${org.id}`} className="text-xs">Email *</Label>
                                      <Input
                                        id={`email-${org.id}`}
                                        type="email"
                                        placeholder="john.smith@company.com"
                                        value={stakeholderEmail}
                                        onChange={(e) => setStakeholderEmail(e.target.value)}
                                        disabled={isSubmitting}
                                        className="h-9"
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`wallet-${org.id}`} className="text-xs flex items-center gap-1">
                                        <Wallet className="h-3 w-3" />
                                        Wallet Address *
                                      </Label>
                                      <Input
                                        id={`wallet-${org.id}`}
                                        placeholder="0x..."
                                        value={stakeholderWallet}
                                        onChange={(e) => setStakeholderWallet(e.target.value)}
                                        disabled={isSubmitting}
                                        className="h-9 font-mono text-xs"
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`password-${org.id}`} className="text-xs">Password *</Label>
                                      <Input
                                        id={`password-${org.id}`}
                                        type="password"
                                        placeholder="Secure password"
                                        value={stakeholderPassword}
                                        onChange={(e) => setStakeholderPassword(e.target.value)}
                                        disabled={isSubmitting}
                                        className="h-9"
                                        required
                                      />
                                    </div>
                                    <Button
                                      type="submit"
                                      className="w-full"
                                      disabled={isSubmitting}
                                      size="sm"
                                    >
                                      {isSubmitting ? (
                                        <>
                                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                          Creating...
                                        </>
                                      ) : (
                                        <>
                                          <UserPlus className="mr-2 h-3 w-3" />
                                          Add Stakeholder
                                        </>
                                      )}
                                    </Button>
                                  </form>
                                </CardContent>
                              </Card>

                              {/* Stakeholders List */}
                              {loadingStakeholders[org.id] ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : organizationStakeholders[org.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">Stakeholders ({organizationStakeholders[org.id].length})</Label>
                                  <div className="space-y-2">
                                    {organizationStakeholders[org.id].map((stakeholder: any) => (
                                      <div key={stakeholder.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm flex items-center gap-2">
                                            {stakeholder.full_name || stakeholder.email}
                                            {stakeholder.role && (
                                              <Badge variant="outline" className="text-xs capitalize">
                                                {stakeholder.role}
                                              </Badge>
                                            )}
                                            <Badge variant={stakeholder.is_active ? "default" : "secondary"} className="text-xs">
                                              {stakeholder.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                            <span>{stakeholder.email}</span>
                                            {stakeholder.wallet_address && (
                                              <span className="font-mono text-[10px]">
                                                {stakeholder.wallet_address.slice(0, 6)}...{stakeholder.wallet_address.slice(-4)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => {
                                              // View stakeholder details
                                              toast({
                                                title: "Stakeholder Details",
                                                description: (
                                                  <div className="space-y-1 text-sm">
                                                    <p><strong>Name:</strong> {stakeholder.full_name || 'N/A'}</p>
                                                    <p><strong>Email:</strong> {stakeholder.email}</p>
                                                    <p><strong>Role:</strong> {stakeholder.role || 'N/A'}</p>
                                                    <p><strong>Wallet:</strong> {stakeholder.wallet_address || 'N/A'}</p>
                                                    <p><strong>Status:</strong> {stakeholder.is_active ? 'Active' : 'Inactive'}</p>
                                                  </div>
                                                ),
                                              });
                                            }}
                                            title="View Details"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => openEditDialog(stakeholder)}
                                            title="Edit Stakeholder"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant={stakeholder.is_active ? "destructive" : "default"}
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={async () => {
                                              try {
                                                const { updateStakeholder } = await import('@/lib/cbac/stakeholders');
                                                const result = await updateStakeholder(stakeholder.id, {
                                                  is_active: !stakeholder.is_active
                                                });
                                                if (result.success) {
                                                  toast({
                                                    title: stakeholder.is_active ? "Stakeholder Disabled" : "Stakeholder Enabled",
                                                    description: `${stakeholder.full_name || stakeholder.email} has been ${stakeholder.is_active ? 'disabled' : 'enabled'}`,
                                                  });
                                                  await loadStakeholdersForOrg(org.id);
                                                } else {
                                                  throw new Error(result.error);
                                                }
                                              } catch (error: any) {
                                                toast({
                                                  variant: "destructive",
                                                  title: "Error",
                                                  description: error.message || "Failed to update stakeholder status",
                                                });
                                              }
                                            }}
                                            title={stakeholder.is_active ? "Disable Stakeholder" : "Enable Stakeholder"}
                                          >
                                            {stakeholder.is_active ? (
                                              <>
                                                <Ban className="h-3 w-3 mr-1" />
                                                Disable
                                              </>
                                            ) : (
                                              <>
                                                <Check className="h-3 w-3 mr-1" />
                                                Enable
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => openDeleteDialog(stakeholder)}
                                            title="Delete Stakeholder"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                                  <p className="text-xs text-muted-foreground">
                                    No stakeholders yet. Add one using the form above.
                                  </p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Create Stakeholder Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create New Stakeholder
                  </CardTitle>
                  <CardDescription>
                    Add users with credentials to an existing organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStakeholder} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stakeholderOrg" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Select Organization *
                      </Label>
                      <Select value={stakeholderOrgId} onValueChange={setStakeholderOrgId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose organization..." />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.length === 0 ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No organizations available. Create one first.
                            </div>
                          ) : (
                            organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {organizations.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Go to Organizations tab to create an organization first
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakeholderRole">Role *</Label>
                      <Select value={stakeholderRole} onValueChange={(value) => setStakeholderRole(value as OrganizationType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manufacturer">🏭 Manufacturer</SelectItem>
                          <SelectItem value="distributor">🚚 Distributor</SelectItem>
                          <SelectItem value="logistics">📦 Logistics</SelectItem>
                          <SelectItem value="pharmacy">💊 Pharmacy</SelectItem>
                          <SelectItem value="regulator">⚖️ Regulator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakeholderUsername">Stakeholder Name *</Label>
                      <Input
                        id="stakeholderUsername"
                        placeholder="e.g., John Smith"
                        value={stakeholderUsername}
                        onChange={(e) => setStakeholderUsername(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakeholderEmail">Email Address *</Label>
                      <Input
                        id="stakeholderEmail"
                        type="email"
                        placeholder="john.smith@company.com"
                        value={stakeholderEmail}
                        onChange={(e) => setStakeholderEmail(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakeholderWallet" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Wallet Address *
                      </Label>
                      <Input
                        id="stakeholderWallet"
                        placeholder="0x..."
                        value={stakeholderWallet}
                        onChange={(e) => setStakeholderWallet(e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Stakeholder's Ethereum wallet for blockchain operations
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stakeholderPassword">Password *</Label>
                      <Input
                        id="stakeholderPassword"
                        type="password"
                        placeholder="Secure password"
                        value={stakeholderPassword}
                        onChange={(e) => setStakeholderPassword(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Share this credential securely with the stakeholder
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting || organizations.length === 0}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Stakeholder...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Create Stakeholder with Credentials
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Stakeholder Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Automatic Credential Assignment</AlertTitle>
                    <AlertDescription>
                      Stakeholders are automatically assigned their organization's CBAC credentials and can access the system immediately.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Select Organization</p>
                        <p className="text-sm text-muted-foreground">
                          Choose the organization from the dropdown (created in Organizations tab)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Select Role & Enter Details</p>
                        <p className="text-sm text-muted-foreground">
                          Choose role, enter username, email, wallet address, and password
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                        <span className="text-xs font-bold text-primary">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Credentials Auto-Assigned</p>
                        <p className="text-sm text-muted-foreground">
                          System links stakeholder to organization's credentials
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                        <span className="text-xs font-bold text-primary">4</span>
                      </div>
                      <div>
                        <p className="font-medium">Ready to Login</p>
                        <p className="text-sm text-muted-foreground">
                          Stakeholder can login at /login with email and password
                        </p>
                      </div>
                    </div>
                  </div>

                  {organizations.length === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Organizations Found</AlertTitle>
                      <AlertDescription>
                        Please create an organization first in the Organizations tab before adding stakeholders.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CBAC Permissions Management Tab */}
          <TabsContent value="cbac" className="space-y-6">
            <CBACManagement />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Security Audit History</CardTitle>
                  <CardDescription>Real-time feed of all critical system actions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={isLogsLoading}>
                    <Activity className={`h-4 w-4 mr-2 ${isLogsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter by User, Batch ID, or Transaction..." className="pl-8" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="batch">Batch Actions</SelectItem>
                      <SelectItem value="blockchain">Blockchain TXs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLogsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">Streaming audit data...</p>
                          </TableCell>
                        </TableRow>
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            No logs found in the current period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {log.event_type}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.user_email || 'System'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {log.user_role || 'system'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className={`h-1.5 w-1.5 rounded-full ${log.result === 'success' ? 'bg-green-500' :
                                  log.result === 'failure' ? 'bg-red-500' : 'bg-yellow-500'
                                  }`} />
                                <span className="text-xs capitalize">{log.result}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Register as Regulator Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Regulator Onboarding
                  </CardTitle>
                  <CardDescription>
                    Manually register an organization as a regulator in the system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Details</Label>
                    <Input
                      id="organizationName"
                      placeholder="e.g., FDA Global, World Health Authority"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRegisterRegulator}
                    disabled={isSubmitting || !isReady()}
                    variant="default"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><Shield className="mr-2 h-4 w-4" />Register Regulator Node</>
                    )}
                  </Button>
                  <Alert className="bg-blue-50/50 border-blue-100 flex items-start gap-4">
                    <Activity className="h-4 w-4 text-blue-600 mt-1" />
                    <AlertDescription className="text-xs text-blue-800 leading-relaxed">
                      Note: Registration only initializes the node. An Admin (Contract Owner) must still grant regulatory approval to authorize batch verification privileges.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SearchIcon className="h-5 w-5" />
                    Organization Directory
                  </CardTitle>
                  <CardDescription>Search and manage network participants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search organization by name or address..." className="pl-8" />
                  </div>
                  <div className="flex flex-col gap-2 py-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Quick Filters</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="cursor-pointer hover:bg-muted font-normal">All</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal">Manufacturers</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal">Logistics</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted font-normal">Pharmacies</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-center py-6 text-muted-foreground italic border-2 border-dashed rounded-lg">
                    Enhanced organization management view coming in next update.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Grant Regulatory Approval Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Shield className="h-5 w-5" />
                    Grant Permission
                  </CardTitle>
                  <CardDescription>Authorize a regulator wallet to approve batches</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="regulatorAddress">Wallet Address (0x...)</Label>
                    <Input
                      id="regulatorAddress"
                      placeholder="0x..."
                      value={regulatorAddress}
                      onChange={(e) => setRegulatorAddress(e.target.value)}
                      disabled={isSubmitting || !isOwner}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleGrantApproval}
                    disabled={isSubmitting || !isReady() || !isOwner}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Authorize Regulator
                  </Button>
                  {!isOwner && wallet.isConnected && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Privileged operation: Contract Owner only
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Approved Regulators List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Whitelisted Regulators</CardTitle>
                      <CardDescription>{approvedRegulators.length} entities with active signing authority</CardDescription>
                    </div>
                    <Shield className="h-8 w-8 text-green-500/20" />
                  </div>
                </CardHeader>
                <CardContent>
                  {approvedRegulators.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {approvedRegulators.map((address, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 group transition-all hover:border-primary/50"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <Activity className="h-3 w-3 text-green-500" />
                              <span>{address.slice(0, 10)}...{address.slice(-8)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(address)} className="h-7 w-7 p-0">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={`${chainConfig.blockExplorer}/address/${address}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/5">
                      <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-20" />
                      <p className="text-sm text-muted-foreground">The whitelist is currently empty</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Governance Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className={isOwner ? "bg-green-50/50 border-green-100" : "bg-orange-50/50 border-orange-100"}>
                    <AlertTitle className="flex items-center gap-2">
                      {isOwner ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-orange-600" />}
                      {isOwner ? "Owner Session Active" : "Non-Owner Session"}
                    </AlertTitle>
                    <AlertDescription className="mt-2 space-y-3">
                      <div className="flex items-center justify-between bg-white dark:bg-black/20 p-2 rounded border text-xs font-mono">
                        <span className="text-muted-foreground mr-2">Session:</span>
                        <span className="truncate">{wallet.address}</span>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-black/20 p-2 rounded border text-xs font-mono">
                        <span className="text-muted-foreground mr-2">Network Owner:</span>
                        <span className="truncate">{contractOwner || 'Resolving...'}</span>
                      </div>
                      {!isOwner && (
                        <p className="text-[10px] text-orange-600 italic">
                          ⚠️ Administrative functions are locked. Switch to the owner wallet to manage permissions.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Protocol Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span>Contract Address:</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span>{process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(0, 8)}...</span>
                      <a href={`${chainConfig.blockExplorer}/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>Consensus Engine:</span>
                    </div>
                    <Badge variant="outline">{chainConfig.name}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Stakeholder Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Stakeholder</DialogTitle>
              <DialogDescription>
                Make changes to the stakeholder profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
                <Select value={editRole} onValueChange={(value) => setEditRole(value as OrganizationType)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="regulator">Regulator</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-wallet" className="text-right">
                  Wallet Address
                </Label>
                <Input
                  id="edit-wallet"
                  value={editWallet}
                  onChange={(e) => setEditWallet(e.target.value)}
                  className="col-span-3 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Password
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Reset password (leave blank to keep current)"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">Leave blank to keep current password</p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-position" className="text-right">
                  Position
                </Label>
                <Input
                  id="edit-position"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="col-span-3"
                  placeholder="Manager, Supervisor, etc."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">
                  Notes
                </Label>
                <Input
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isEditSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isEditSubmitting}>
                {isEditSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the stakeholder
                <span className="font-semibold text-foreground"> {deletingStakeholder?.full_name || deletingStakeholder?.email} </span>
                and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Stakeholder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MotionDiv>
    </ProtectedRoute>
  );
}
