
"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Truck, Loader2, Wallet, Link2, ExternalLink } from "lucide-react";
import { MotionDiv } from "@/components/motion-div";
import { useBatches, type Batch } from "@/contexts/batches-context";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { BatchDetails } from "@/components/dashboard/batch-details";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBlockchain, useContract, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { BlockchainProof } from "@/components/dashboard/blockchain-proof";
import { BlockchainRegistration } from "@/components/dashboard/blockchain-registration";
import { UserRole } from "@/lib/blockchain";

type VerificationResult = {
  status: "Genuine" | "Fake" | "Blocked";
  batch?: Batch;
};

export default function DistributorDashboard() {
  const { batches, updateBatchLocation } = useBatches();
  const { toast } = useToast();
  const [batchId, setBatchId] = useState("");
  const [location, setLocation] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isBlockchainSubmitting, setIsBlockchainSubmitting] = useState(false);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);
  
  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoLat, setDemoLat] = useState("");
  const [demoLng, setDemoLng] = useState("");

  // Blockchain hooks
  const { wallet, connectWallet, isLoading: isWalletLoading } = useBlockchain();
  const { isReady, updateBatchStatus: updateStatusOnChain, getBatchByCode } = useContract();
  const blockchainConfigured = isBlockchainConfigured();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  // Auth context - get stakeholder info for wallet verification
  const { stakeholder } = useCbacAuth();

  // Check if connected wallet matches the assigned stakeholder wallet
  const isWalletMatched = wallet.isConnected &&
    stakeholder?.wallet_address &&
    wallet.address?.toLowerCase() === stakeholder.wallet_address.toLowerCase();

  const walletMismatchMessage = wallet.isConnected && stakeholder?.wallet_address && !isWalletMatched
    ? `Wrong wallet connected. Expected: ${stakeholder.wallet_address.slice(0, 6)}...${stakeholder.wallet_address.slice(-4)}`
    : null;

  const approvedBatches = batches.filter(b => b.status === "Approved" || b.status === 'In-Transit');
  const lastLocation = (batch: Batch) => {
    if (batch.history && batch.history.length > 0) {
      return batch.history[batch.history.length - 1].location;
    }
    return "N/A";
  }

  const handleVerify = () => {
    const trimmedBatchId = batchId.trim();
    if (!trimmedBatchId) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a Batch ID." });
      return;
    }
    const batch = batches.find(b => b.id.toLowerCase() === trimmedBatchId.toLowerCase());
    if (batch) {
      if (batch.status === 'Approved' || batch.status === 'In-Transit') {
        setVerificationResult({ status: "Genuine", batch });
      } else {
        setVerificationResult({ status: "Blocked", batch });
      }
    } else {
      setVerificationResult({ status: "Fake" });
    }
    // Clear previous location input
    setLocation('');
  };

  const handleUpdateStatus = async () => {
    if (!verificationResult || verificationResult.status !== 'Genuine' || !verificationResult.batch) {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify a genuine batch before updating status.",
      });
      return;
    }
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please enter a new location.",
      });
      return;
    }
    if (trimmedLocation.length < 3) {
      toast({
        variant: "destructive",
        title: "Invalid Location",
        description: "Location must be at least 3 characters long.",
      });
      return;
    }

    setIsBlockchainSubmitting(true);
    setBlockchainTxHash(null);

    try {
      // Update on blockchain if available
      if (blockchainConfigured && isReady()) {
        // Verify wallet matches before blockchain submission
        if (!isWalletMatched) {
          toast({
            variant: "destructive",
            title: "Wallet Mismatch",
            description: walletMismatchMessage || "Please connect the wallet assigned to your account.",
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        console.log("🔗 Updating shipment status on blockchain...");

        // Step 1: Get actual batch from blockchain
        const blockchainBatch = await getBatchByCode(verificationResult.batch.id);
        if (!blockchainBatch) {
          toast({
            variant: "destructive",
            title: "Blockchain Error",
            description: "Failed to retrieve batch from blockchain. Please try again."
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        const currentStatus = blockchainBatch.status;
        console.log(`📊 Current blockchain status: ${currentStatus}`);

        // Step 2: Determine what transition to make
        // Valid transitions: APPROVED(2) → IN_TRANSIT(4), IN_TRANSIT(4) → DELIVERED(5)
        let targetStatus: number;
        let shouldUpdateBlockchain = true;

        if (currentStatus === 2) { // APPROVED
          // Distributor starting transit - transition to IN_TRANSIT
          targetStatus = 4; // IN_TRANSIT
          console.log("📦 Transitioning from APPROVED to IN_TRANSIT");
        } else if (currentStatus === 4) { // IN_TRANSIT
          // Already in transit - can only go to DELIVERED, not update again to IN_TRANSIT
          // For location updates during transit, we'll only update locally
          console.log("⚠️ Batch already IN_TRANSIT. Location update will be stored locally only.");
          shouldUpdateBlockchain = false;
          targetStatus = 4;
        } else if (currentStatus === 5) { // DELIVERED
          console.log("✅ Batch already DELIVERED. No blockchain update needed.");
          shouldUpdateBlockchain = false;
          targetStatus = 5;
        } else {
          const statusNames = ['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED', 'EXPIRED', 'RECALLED'];
          toast({
            variant: "destructive",
            title: "Invalid Batch Status",
            description: `Batch is ${statusNames[currentStatus]}. Distributor can only update APPROVED batches.`
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        // Step 3: Update blockchain if needed
        let txHash: string | undefined = undefined;
        if (shouldUpdateBlockchain) {
          const batchIdNum = Number(blockchainBatch.id);
          const result = await updateStatusOnChain(batchIdNum, targetStatus, trimmedLocation);

          if (result.success) {
            txHash = result.hash || undefined;
            setBlockchainTxHash(txHash || null);
            console.log("✅ Blockchain update successful:", txHash);
          } else {
            console.warn("⚠️ Blockchain error:", result.error);
            toast({
              variant: "destructive",
              title: "Blockchain Update Failed",
              description: result.error || "Failed to update shipment status on blockchain. Please try again."
            });
            setIsBlockchainSubmitting(false);
            return;
          }
        }

        let coords: { latitude?: number; longitude?: number } = {};
        if (isDemoMode && demoLat && demoLng) {
          coords = { latitude: parseFloat(demoLat), longitude: parseFloat(demoLng) };
          console.log("📍 [DEMO MODE] Distributor GPS:", coords);
        } else if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          } catch(e) {}
        }

        // Step 4: Always update locally
        const updatedBatch = await updateBatchLocation(verificationResult.batch.id, trimmedLocation, txHash, coords.latitude, coords.longitude);
        toast({
          title: "Success",
          description: shouldUpdateBlockchain
            ? `Batch ${verificationResult.batch.id} location updated to ${trimmedLocation}. Recorded on blockchain.`
            : `Batch ${verificationResult.batch.id} location updated to ${trimmedLocation} (local update).`
        });

        // Keep the verification result so user can see the updated details
        if (updatedBatch) {
          setVerificationResult(prev => prev ? { ...prev, batch: updatedBatch } : null);
        }
        setLocation(""); // Clear location for next update
      } else {
        // Fallback: Update locally if blockchain not configured
        let coords: { latitude?: number; longitude?: number } = {};
        if (isDemoMode && demoLat && demoLng) {
          coords = { latitude: parseFloat(demoLat), longitude: parseFloat(demoLng) };
        } else if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          } catch(e) {}
        }

        const updatedBatch = await updateBatchLocation(verificationResult.batch.id, trimmedLocation, undefined, coords.latitude, coords.longitude);
        toast({
          title: "Success",
          description: `Batch ${verificationResult.batch.id} location updated to ${trimmedLocation}.`
        });

        // Keep the verification result so user can see the updated details
        if (updatedBatch) {
          setVerificationResult(prev => prev ? { ...prev, batch: updatedBatch } : null);
        }
        setLocation(""); // Clear location for next update
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update shipment status."
      });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  }


  return (
    <ProtectedRoute allowedTypes={['distributor']}>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold font-headline">Distributor Dashboard</h1>

        {/* Blockchain Proof Section */}
        <BlockchainProof latestTxHash={blockchainTxHash} />

        {/* Note: Blockchain registration removed - using Supabase database as source of truth for roles */}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Verify & Update Shipment</CardTitle>
              <CardDescription>Scan or enter a Batch ID to verify and update its status in the supply chain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="batchId" className="text-sm font-medium">Batch ID</label>
                <Input id="batchId" placeholder="e.g., BCH-001" value={batchId} onChange={e => setBatchId(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleVerify}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify Authenticity
              </Button>

              {/* Wallet Connection Alert */}
              {blockchainConfigured && !wallet.isConnected && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Connect Wallet for Blockchain Recording</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm mb-2">Connect your wallet to record shipment updates on blockchain.</p>
                    <Button size="sm" onClick={connectWallet} disabled={isWalletLoading}>
                      {isWalletLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Connect Wallet
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Wallet Mismatch Alert */}
              {walletMismatchMessage && (
                <Alert variant="destructive" className="mt-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Wallet Mismatch</AlertTitle>
                  <AlertDescription>
                    {walletMismatchMessage}
                  </AlertDescription>
                </Alert>
              )}

              {verificationResult?.batch && (
                <MotionDiv
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t mt-4"
                >
                  <BatchDetails batch={verificationResult.batch} />

                  {/* Blockchain Recording Info */}
                  {blockchainConfigured && wallet.isConnected && (
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                      <Link2 className="h-4 w-4" />
                      <AlertTitle>Blockchain Recording Enabled</AlertTitle>
                      <AlertDescription className="text-sm">
                        Updates will be recorded on {chainConfig.name} blockchain.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Transaction Hash Display */}
                  {blockchainTxHash && (
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                      <Link2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-900 dark:text-green-100">✅ Shipment Updated on Blockchain</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p className="text-green-800 dark:text-green-200 text-sm">Transaction successfully recorded.</p>
                        <a
                          href={`${chainConfig.blockExplorer}/tx/${blockchainTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          View on Etherscan <ExternalLink className="h-3 w-3" />
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="location" className="text-sm font-medium">New Location</label>
                      <Input
                        id="location"
                        placeholder="e.g., Central Warehouse, Chicago"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        disabled={isBlockchainSubmitting}
                      />
                    </div>

                    {/* DEMO MODE OVERRIDE */}
                    <div className="p-4 bg-muted/30 border border-dashed rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-bold text-primary flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Presentation Demo Mode
                          </label>
                          <p className="text-xs text-muted-foreground">Override GPS instead of using laptop location</p>
                        </div>
                        <Button 
                          type="button" 
                          variant={isDemoMode ? "default" : "secondary"} 
                          size="sm"
                          onClick={() => setIsDemoMode(!isDemoMode)}
                        >
                          {isDemoMode ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      
                      {isDemoMode && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Latitude</label>
                            <Input 
                              placeholder="e.g. 19.0760" 
                              value={demoLat}
                              onChange={(e) => setDemoLat(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Longitude</label>
                            <Input 
                              placeholder="e.g. 72.8777" 
                              value={demoLng}
                              onChange={(e) => setDemoLng(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleUpdateStatus}
                    disabled={isBlockchainSubmitting}
                  >
                    {isBlockchainSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Update Shipment Status
                      </>
                    )}
                  </Button>
                </MotionDiv>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Batches for Distribution</CardTitle>
              <CardDescription>These batches are approved and may be in transit.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Current Location</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedBatches.length > 0 ? approvedBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell>{batch.name}</TableCell>
                      <TableCell>{lastLocation(batch)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={
                          batch.status === 'In-Transit' ? 'secondary' :
                            batch.status === 'Delivered' ? 'outline' : 'default'
                        }>{batch.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No batches ready for distribution.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </MotionDiv>
    </ProtectedRoute>
  );
}
