"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { MotionDiv } from "@/components/motion-div";
import { createClient } from "@/lib/supabase/client";

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Organization form
  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCountry, setOrgCountry] = useState("");

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      // Generate registration number (using generic prefix since no type)
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

    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create organization",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ProtectedRoute allowedTypes={['admin']}>
      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Organization Management
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage supply chain organizations</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Organization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create New Organization
              </CardTitle>
              <CardDescription>
                Create a logical organization container (no credentials required)
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
                  <Label htmlFor="orgPhone">Phone (Optional)</Label>
                  <Input
                    id="orgPhone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    disabled={isSubmitting}
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Organization...
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

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Organization creation process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Enter Organization Details</p>
                    <p className="text-sm text-muted-foreground">
                      Provide organization name (required). Address, country, and contact info are optional.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Organization Created</p>
                    <p className="text-sm text-muted-foreground">
                      Organization container is ready. Add stakeholders with roles, email, password, and wallet next.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Important:</strong> Organizations are created WITHOUT email/password/wallet. 
                  Add stakeholders to organizations - each stakeholder has their own email, password, wallet, and role.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MotionDiv>
    </ProtectedRoute>
  );
}
