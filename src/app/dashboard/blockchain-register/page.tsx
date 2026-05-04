'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { BlockchainRegister } from '@/components/blockchain-register';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BlockchainRegistrationPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Blockchain Registration
            </h1>
            <p className="text-muted-foreground">
              Register your account on the blockchain to access advanced features
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p><strong>Why register on blockchain?</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Create immutable batch records</li>
                  <li>Approve or reject batches (Regulators)</li>
                  <li>Update supply chain status on-chain</li>
                  <li>Enable patient verification</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Note:</strong> You'll need some Sepolia testnet ETH to pay for gas fees. 
                  Get free testnet ETH from a <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sepolia faucet</a>.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Registration Component */}
          <BlockchainRegister />

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
              <CardDescription>
                Steps to register on the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li className="pl-2">
                  <strong>Connect Wallet:</strong> Click "Connect Wallet" and approve the connection in MetaMask
                </li>
                <li className="pl-2">
                  <strong>Switch Network:</strong> Ensure you're on Sepolia testnet (network will auto-prompt if needed)
                </li>
                <li className="pl-2">
                  <strong>Register:</strong> Click "Register on Blockchain" and approve the transaction
                </li>
                <li className="pl-2">
                  <strong>Confirm:</strong> Wait for transaction confirmation (~15 seconds)
                </li>
                <li className="pl-2">
                  <strong>Done!</strong> You can now use all blockchain features in the app
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
