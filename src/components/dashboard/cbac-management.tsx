"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Save, RefreshCw, Settings, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getOrganizationSummaries,
  getOrganizationStakeholders,
  getStakeholderPermissions,
  upsertCBACPermissions,
  deleteCBACPermissions,
  getRoleTemplates,
  updateRoleTemplate,
} from "@/lib/cbac/service";
import type {
  OrganizationSummary,
  CBACPermission,
  OrganizationRoleTemplate,
  StakeholderRole,
} from "@/types/cbac";

interface StakeholderWithPermissions {
  id: string;
  full_name: string;
  email: string;
  role: StakeholderRole;
  organization_id: string;
  is_active: boolean;
  cbac_permissions?: CBACPermission[];
  permissions?: CBACPermission | null;
}

// Permission configuration
const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  can_create_batches: { label: "Create Batches", description: "Create new pharmaceutical batches" },
  can_approve_batches: { label: "Approve Batches", description: "Approve batches for distribution" },
  can_reject_batches: { label: "Reject Batches", description: "Reject non-compliant batches" },
  can_recall_batches: { label: "Recall Batches", description: "Initiate batch recalls" },
  can_update_status: { label: "Update Status", description: "Update batch status in supply chain" },
  can_view_all_batches: { label: "View All Batches", description: "View all organization batches" },
  can_view_analytics: { label: "View Analytics", description: "Access analytics dashboard" },
  can_export_data: { label: "Export Data", description: "Export data to files" },
  can_manage_stakeholders: { label: "Manage Stakeholders", description: "Manage org stakeholders" },
};

const ROLE_BADGES: Record<StakeholderRole, { color: string; emoji: string }> = {
  manufacturer: { color: "bg-blue-100 text-blue-800", emoji: "🏭" },
  distributor: { color: "bg-green-100 text-green-800", emoji: "🚚" },
  logistics: { color: "bg-yellow-100 text-yellow-800", emoji: "📦" },
  pharmacy: { color: "bg-purple-100 text-purple-800", emoji: "💊" },
  regulator: { color: "bg-red-100 text-red-800", emoji: "⚖️" },
};

export function CBACManagement() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [stakeholders, setStakeholders] = useState<StakeholderWithPermissions[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<OrganizationRoleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"stakeholders" | "templates">("stakeholders");

  // Permission editing state
  const [editingPermissions, setEditingPermissions] = useState<Record<string, Partial<CBACPermission>>>({});

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const orgs = await getOrganizationSummaries();
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load organizations",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId, toast]);

  // Load stakeholders for selected organization
  const loadStakeholders = useCallback(async () => {
    if (!selectedOrgId) return;

    setIsLoading(true);
    try {
      const data = await getOrganizationStakeholders(selectedOrgId);

      // Load permissions for each stakeholder
      const stakeholdersWithPerms = await Promise.all(
        data.map(async (s: any) => {
          const permissions = await getStakeholderPermissions(s.id);
          return {
            ...s,
            permissions,
          };
        })
      );

      setStakeholders(stakeholdersWithPerms);

      // Initialize editing state
      const editState: Record<string, Partial<CBACPermission>> = {};
      stakeholdersWithPerms.forEach((s) => {
        if (s.permissions) {
          editState[s.id] = { ...s.permissions };
        }
      });
      setEditingPermissions(editState);
    } catch (error) {
      console.error("Error loading stakeholders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId]);

  // Load role templates
  const loadTemplates = useCallback(async () => {
    try {
      const templates = await getRoleTemplates(selectedOrgId || undefined);
      setRoleTemplates(templates);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      loadStakeholders();
      loadTemplates();
    }
  }, [selectedOrgId, loadStakeholders, loadTemplates]);

  // Handle permission toggle for a stakeholder
  const handlePermissionToggle = (
    stakeholderId: string,
    permissionKey: keyof CBACPermission,
    value: boolean
  ) => {
    setEditingPermissions((prev) => ({
      ...prev,
      [stakeholderId]: {
        ...prev[stakeholderId],
        [permissionKey]: value,
      },
    }));
  };

  // Save permissions for a stakeholder
  const savePermissions = async (stakeholderId: string) => {
    const stakeholder = stakeholders.find((s) => s.id === stakeholderId);
    if (!stakeholder) return;

    setIsSaving(stakeholderId);
    try {
      const perms = editingPermissions[stakeholderId] || {};
      const result = await upsertCBACPermissions({
        stakeholder_id: stakeholderId,
        organization_id: selectedOrgId,
        can_create_batches: perms.can_create_batches,
        can_approve_batches: perms.can_approve_batches,
        can_reject_batches: perms.can_reject_batches,
        can_recall_batches: perms.can_recall_batches,
        can_update_status: perms.can_update_status,
        can_view_all_batches: perms.can_view_all_batches,
        can_view_analytics: perms.can_view_analytics,
        can_export_data: perms.can_export_data,
        can_manage_stakeholders: perms.can_manage_stakeholders,
      });

      if (result.success) {
        toast({
          title: "Permissions Saved",
          description: `Updated permissions for ${stakeholder.full_name}`,
        });
        await loadStakeholders();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save permissions",
      });
    } finally {
      setIsSaving(null);
    }
  };

  // Reset permissions to role template
  const resetToTemplate = async (stakeholderId: string) => {
    const stakeholder = stakeholders.find((s) => s.id === stakeholderId);
    if (!stakeholder) return;

    setIsSaving(stakeholderId);
    try {
      const result = await deleteCBACPermissions(stakeholderId, selectedOrgId);
      if (result.success) {
        toast({
          title: "Permissions Reset",
          description: `${stakeholder.full_name} now uses default ${stakeholder.role} permissions`,
        });
        await loadStakeholders();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset permissions",
      });
    } finally {
      setIsSaving(null);
    }
  };

  // Get selected organization
  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          CBAC Permissions Management
        </CardTitle>
        <CardDescription>
          Manage Claims-Based Access Control permissions for stakeholders in each organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="org-select" className="text-sm mb-2 block">
              Select Organization
            </Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger id="org-select" className="w-full">
                <SelectValue placeholder="Select an organization..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{org.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {org.stakeholder_count} users
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOrganizations();
              loadStakeholders();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Organization Stats */}
        {selectedOrg && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{selectedOrg.stakeholder_count}</div>
              <div className="text-xs text-muted-foreground">Stakeholders</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{selectedOrg.batch_count}</div>
              <div className="text-xs text-muted-foreground">Batches</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{selectedOrg.active_anomalies}</div>
              <div className="text-xs text-muted-foreground">Active Anomalies</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{selectedOrg.active_roles?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Active Roles</div>
            </div>
          </div>
        )}

        {/* Tabs for Stakeholders vs Templates */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stakeholders" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stakeholder Permissions
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Role Templates
            </TabsTrigger>
          </TabsList>

          {/* Stakeholder Permissions Tab */}
          <TabsContent value="stakeholders" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : stakeholders.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No stakeholders in this organization yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stakeholders.map((stakeholder) => {
                  const perms = editingPermissions[stakeholder.id] || stakeholder.permissions || {};
                  const roleBadge = ROLE_BADGES[stakeholder.role];
                  const hasCustom = stakeholder.permissions?.id && !stakeholder.permissions.id.startsWith("template-");

                  return (
                    <Card key={stakeholder.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${roleBadge.color}`}
                            >
                              {roleBadge.emoji}
                            </div>
                            <div>
                              <CardTitle className="text-base">{stakeholder.full_name}</CardTitle>
                              <CardDescription className="text-xs">{stakeholder.email}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={hasCustom ? "default" : "secondary"}>
                              {hasCustom ? "Custom" : "Template"}
                            </Badge>
                            <Badge className={roleBadge.color}>{stakeholder.role}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => {
                            const value = (perms as any)[key] ?? false;
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex-1">
                                  <Label htmlFor={`${stakeholder.id}-${key}`} className="text-sm cursor-pointer">
                                    {label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                                <Switch
                                  id={`${stakeholder.id}-${key}`}
                                  checked={value}
                                  onCheckedChange={(checked) =>
                                    handlePermissionToggle(stakeholder.id, key as keyof CBACPermission, checked)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          {hasCustom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetToTemplate(stakeholder.id)}
                              disabled={isSaving === stakeholder.id}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reset to Template
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => savePermissions(stakeholder.id)}
                            disabled={isSaving === stakeholder.id}
                          >
                            {isSaving === stakeholder.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Save Permissions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Role Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Default Role Templates</CardTitle>
                <CardDescription>
                  These are the default permissions for each role. Stakeholders inherit these unless custom permissions are set.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Create</TableHead>
                      <TableHead className="text-center">Approve</TableHead>
                      <TableHead className="text-center">Reject</TableHead>
                      <TableHead className="text-center">Recall</TableHead>
                      <TableHead className="text-center">Update</TableHead>
                      <TableHead className="text-center">View All</TableHead>
                      <TableHead className="text-center">Analytics</TableHead>
                      <TableHead className="text-center">Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleTemplates
                      .filter((t) => t.organization_id === null) // Show global templates
                      .map((template) => {
                        const roleBadge = ROLE_BADGES[template.role_name as StakeholderRole];
                        return (
                          <TableRow key={template.id}>
                            <TableCell>
                              <Badge className={roleBadge?.color || ""}>
                                {roleBadge?.emoji} {template.role_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_create_batches ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_approve_batches ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_reject_batches ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_recall_batches ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_update_status ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_view_all_batches ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_view_analytics ? "✅" : "❌"}
                            </TableCell>
                            <TableCell className="text-center">
                              {template.can_export_data ? "✅" : "❌"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
