"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useContract, UserRole } from "@/lib/blockchain";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BlockchainRegistrationProps {
  role: UserRole;
  roleName: string;
  onRegistrationComplete?: () => void;
}

export function BlockchainRegistration({ role, roleName, onRegistrationComplete }: BlockchainRegistrationProps) {
  const { toast } = useToast();
  const { registerUser, isReady, isUserRegistered } = useContract();
  const [organizationName, setOrganizationName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // Check if user is already registered on mount and when wallet/contract changes
  // This properly handles new contract deployments by resetting state
  useEffect(() => {
    async function checkStatus() {
      if (isReady()) {
        setIsCheckingRegistration(true);
        try {
          const registered = await isUserRegistered();
          // Always update the state based on actual blockchain status
          // This ensures new contract deployments reset the registration status
          setIsRegistered(registered);
          console.log(`[BlockchainRegistration] Registration check result: ${registered}`);
        } catch (error) {
          console.error("Error checking registration status:", error);
          // On error, assume not registered to be safe
          setIsRegistered(false);
        } finally {
          setIsCheckingRegistration(false);
        }
      } else {
        // Contract not ready - reset state
        setIsCheckingRegistration(false);
        setIsRegistered(false);
      }
    }
    checkStatus();
  }, [isReady, isUserRegistered]);

  const handleRegister = async () => {
    if (!organizationName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your organization name.",
      });
      return;
    }

    if (!isReady()) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Please connect your wallet first.",
      });
      return;
    }

    setIsRegistering(true);

    try {
      const result = await registerUser(role, organizationName);

      if (result.success) {
        toast({
          title: "Registration Successful!",
          description: `You have been registered as ${roleName}: ${organizationName}`,
        });
        setIsRegistered(true);
        onRegistrationComplete?.();
      } else {
        // Check if already registered
        if (result.error?.includes("already registered")) {
          toast({
            title: "Already Registered",
            description: "This wallet is already registered on the blockchain.",
          });
          setIsRegistered(true);
        } else {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: result.error || "Failed to register on blockchain.",
          });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isCheckingRegistration) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Checking registration status...</span>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          ✅ You are registered on the blockchain as <strong>{roleName}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Blockchain Registration Required
        </CardTitle>
        <CardDescription>
          Register your organization on the blockchain to perform {roleName.toLowerCase()} operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name</Label>
          <Input
            id="orgName"
            placeholder={`Enter your ${roleName.toLowerCase()} organization name`}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={isRegistering}
          />
          <p className="text-sm text-muted-foreground">
            This will be recorded permanently on the blockchain
          </p>
        </div>

        <Button
          onClick={handleRegister}
          disabled={isRegistering || !organizationName.trim()}
          className="w-full"
        >
          {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register on Blockchain
        </Button>
      </CardContent>
    </Card>
  );
}
