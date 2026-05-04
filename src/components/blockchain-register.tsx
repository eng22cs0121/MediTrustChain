'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { useBlockchain, useContract } from '@/lib/blockchain';
import { useCbacAuth } from '@/contexts/cbac-auth-context';
import { useToast } from '@/hooks/use-toast';

export function BlockchainRegister() {
  const { wallet, connectWallet, isLoading: isWalletLoading } = useBlockchain();
  const { registerUser, isUserRegistered } = useContract();
  const { user, organizationType } = useCbacAuth();
  const { toast } = useToast();
  
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Role to UserRole enum mapping
  // MUST match smart contract UserRole enum order!
  const getRoleEnum = (roleStr: string): number => {
    const roleMap: Record<string, number> = {
      manufacturer: 0,  // MANUFACTURER
      regulator: 1,     // REGULATOR
      distributor: 2,   // DISTRIBUTOR
      logistics: 3,     // LOGISTICS (fixed: was 4)
      pharmacy: 4,      // PHARMACY (fixed: was 3)
      patient: 5,       // PATIENT
    };
    return roleMap[roleStr] ?? 5; // Default to patient
  };

  // Check registration status when wallet connects
  useEffect(() => {
    const checkRegistration = async () => {
      if (wallet.isConnected && wallet.address) {
        setIsChecking(true);
        try {
          const registered = await isUserRegistered(wallet.address);
          setIsRegistered(registered);
        } catch (error) {
          console.error('Error checking registration:', error);
        } finally {
          setIsChecking(false);
        }
      } else {
        setIsRegistered(null);
      }
    };

    checkRegistration();
  }, [wallet.isConnected, wallet.address, isUserRegistered]);

  const handleRegister = async () => {
    if (!organizationType || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to register on blockchain.',
      });
      return;
    }

    setIsRegistering(true);
    try {
      const roleEnum = getRoleEnum(organizationType);
      const orgName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      
      const result = await registerUser(roleEnum, orgName);
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: 'You have been registered on the blockchain.',
        });
        setIsRegistered(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: result.error || 'Failed to register on blockchain.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to register on blockchain.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Not connected to wallet
  if (!wallet.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Blockchain Registration
          </CardTitle>
          <CardDescription>
            Connect your wallet to register on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet Not Connected</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                To use blockchain features, you need to connect your MetaMask wallet.
              </p>
              <Button onClick={connectWallet} disabled={isWalletLoading}>
                {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Wrong network
  if (!wallet.isCorrectChain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Blockchain Registration
          </CardTitle>
          <CardDescription>
            Switch to the correct network to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wrong Network</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">
                Please switch to Sepolia testnet in your MetaMask wallet.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Checking registration status
  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Blockchain Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already registered
  if (isRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Blockchain Registration
          </CardTitle>
          <CardDescription>
            Your blockchain registration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Registered on Blockchain</AlertTitle>
            <AlertDescription>
              <p className="text-sm">
                Your wallet address <code className="text-xs">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</code> is registered as a <strong>{organizationType}</strong> on the blockchain.
              </p>
              <p className="text-sm mt-2 text-muted-foreground">
                You can now use all blockchain features in the application.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Not registered - show registration button
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Blockchain Registration
        </CardTitle>
        <CardDescription>
          Register your wallet on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Registered</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-2">
              Your wallet address is not yet registered on the blockchain. Register to access blockchain features.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• Wallet: <code>{wallet.address?.slice(0, 10)}...{wallet.address?.slice(-8)}</code></p>
              <p>• Role: <strong className="capitalize">{organizationType}</strong></p>
              <p>• Network: Sepolia Testnet</p>
            </div>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleRegister} 
          disabled={isRegistering}
          className="w-full"
        >
          {isRegistering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering on Blockchain...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Register on Blockchain
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Note: This will require a transaction fee (gas) to be paid in ETH on Sepolia testnet.
        </p>
      </CardContent>
    </Card>
  );
}
