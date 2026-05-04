
"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShoppingCart, CheckCircle, XCircle, AlertTriangle, Search, Loader2, Wallet, Link2, ExternalLink } from "lucide-react";
import { MotionDiv } from "@/components/motion-div";
import { useBatches, type Batch } from "@/contexts/batches-context";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BatchDetails } from "@/components/dashboard/batch-details";
import { useBlockchain, useContract, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { BlockchainProof } from "@/components/dashboard/blockchain-proof";
import { BlockchainRegistration } from "@/components/dashboard/blockchain-registration";
import { UserRole } from "@/lib/blockchain";

type VerificationResult = {
  status: 'Verified' | 'NotForSale' | 'NotFound' | 'Expired';
  batch?: Batch;
}

export default function PharmacyDashboard() {
  const { batches, updateBatchStatus } = useBatches();
  const { toast } = useToast();
  const [batchId, setBatchId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBlockchainSubmitting, setIsBlockchainSubmitting] = useState(false);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);

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


  // V2: Pharmacy sees batches that are At-Pharmacy or already Sold
  const filteredBatches = batches.filter(b =>
    (b.status === 'In-Transit' || b.status === 'At-Pharmacy' || b.status === 'Sold') &&
    (b.id.toLowerCase().includes(searchTerm.toLowerCase()) || b.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const arrivingBatches = filteredBatches.filter(b => b.status === 'In-Transit');
  const atPharmacyBatches = filteredBatches.filter(b => b.status === 'At-Pharmacy');
  const soldBatches = filteredBatches.filter(b => b.status === 'Sold');

  const lastLocation = (batch: Batch) => {
    if (batch.history && batch.history.length > 0) {
      return batch.history[batch.history.length - 1].location;
    }
    return "N/A";
  }

  const handleVerify = () => {
    const trimmedBatchId = batchId.trim();
    if (!trimmedBatchId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a Batch ID.' });
      return;
    }
    const batch = batches.find(b => b.id.toLowerCase() === trimmedBatchId.toLowerCase());
    if (batch) {
      if (new Date(batch.exp) < new Date()) {
        setVerificationResult({ status: 'Expired', batch });
      } else if (batch.status === 'Sold') {
        // V2: Prevent double sale - batch already sold
        setVerificationResult({ status: 'NotForSale', batch });
        toast({
          variant: 'destructive',
          title: 'Already Sold',
          description: 'This batch has already been sold. Cannot sell again.'
        });
      } else if (batch.status === 'At-Pharmacy') {
        // V2: Batch is at pharmacy and ready for sale
        setVerificationResult({ status: 'Verified', batch });
      } else if (batch.status === 'Approved' || batch.status === 'In-Transit') {
        setVerificationResult({ status: 'Verified', batch });
      } else {
        setVerificationResult({ status: 'NotForSale', batch });
      }
    } else {
      setVerificationResult({ status: 'NotFound' });
    }
  };

  const handleRecordSale = async () => {
    if (verificationResult?.status !== 'Verified' || !verificationResult.batch) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please verify a valid batch before recording a sale.' });
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

        console.log("🔗 Recording sale on blockchain...");

        // Step 1: Get actual batch from blockchain
        const blockchainBatch = await getBatchByCode(verificationResult.batch.id);
        if (!blockchainBatch) {
          toast({
            variant: 'destructive',
            title: 'Blockchain Error',
            description: 'Failed to retrieve batch from blockchain. Please try again.',
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        const currentStatus = blockchainBatch.status;
        console.log(`📊 Current blockchain status: ${currentStatus}`);

        // Step 2: Determine if blockchain update is needed
        // Valid transition: IN_TRANSIT(4) → DELIVERED(5)
        let shouldUpdateBlockchain = true;

        // V2 Status codes:
        // 4 = IN_TRANSIT
        // 5 = AT_PHARMACY
        // 6 = SOLD (terminal)
        if (currentStatus === 5) { // AT_PHARMACY
          // Can transition to SOLD
          console.log("📦 Transitioning from AT_PHARMACY to SOLD");
        } else if (currentStatus === 6) { // SOLD
          // Already sold - prevent double sale!
          toast({
            variant: "destructive",
            title: "Already Sold",
            description: "This batch has already been sold. Cannot sell again."
          });
          setIsBlockchainSubmitting(false);
          return;
        } else if (currentStatus === 4) { // IN_TRANSIT
          // Batch hasn't arrived at pharmacy yet
          toast({
            variant: "destructive",
            title: "Batch Not Received",
            description: "This batch is still in transit. Wait for logistics to deliver."
          });
          setIsBlockchainSubmitting(false);
          return;
        } else if (currentStatus === 2) { // APPROVED
          // Batch hasn't started transit yet
          toast({
            variant: "destructive",
            title: "Batch Not Shipped",
            description: "This batch hasn't been shipped yet. Contact distributor."
          });
          setIsBlockchainSubmitting(false);
          return;
        } else {
          const statusNames = ['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'AT_PHARMACY', 'SOLD', 'EXPIRED', 'RECALLED'];
          toast({
            variant: 'destructive',
            title: 'Invalid Batch Status',
            description: `Batch is ${statusNames[currentStatus] || 'UNKNOWN'}. Cannot dispense.`,
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        // Step 3: Update blockchain if needed
        let txHash: string | undefined = undefined;
        if (shouldUpdateBlockchain) {
          // V2: Transition to SOLD (status 6)
          const batchIdNum = Number(blockchainBatch.id);
          const result = await updateStatusOnChain(batchIdNum, 6, "Pharmacy - Sold to Patient");

          if (result.success) {
            txHash = result.hash || undefined;
            setBlockchainTxHash(txHash || null);
            console.log("✅ Blockchain update successful:", txHash);
          } else {
            console.warn("⚠️ Blockchain error:", result.error);
            toast({
              variant: "destructive",
              title: "Blockchain Update Failed",
              description: result.error || "Failed to record sale on blockchain. Please try again."
            });
            setIsBlockchainSubmitting(false);
            return;
          }
        }

        // V2: Update local status to Sold
        await updateBatchStatus(verificationResult.batch.id, 'Sold', "Pharmacy - Sold to Patient", undefined, txHash);
        toast({
          title: '✅ Sale Recorded',
          description: `Batch ${verificationResult.batch.id} has been marked as SOLD.${shouldUpdateBlockchain ? ' Recorded on blockchain.' : ''}`
        });
        setVerificationResult(null);
        setBatchId('');
      } else {
        // V2: Update locally if blockchain not configured
        await updateBatchStatus(verificationResult.batch.id, 'Sold', "Pharmacy - Sold to Patient");
        toast({
          title: '✅ Sale Recorded',
          description: `Batch ${verificationResult.batch.id} has been marked as SOLD.`
        });
        setVerificationResult(null);
        setBatchId('');
      }
    } catch (error: any) {
      console.error("Dispense error:", error);
      toast({
        variant: "destructive",
        title: "Record Failed",
        description: error.message || "Failed to record sale."
      });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  };

  const VerificationResultDisplay = () => {
    if (!verificationResult) return null;

    let icon, title, description;
    let variant: "default" | "destructive" = "default";
    switch (verificationResult.status) {
      case 'Verified':
        icon = <CheckCircle className="h-5 w-5 text-green-500" />;
        title = "Batch Verified";
        description = `Batch ${verificationResult.batch?.id} is genuine and ready for sale.`;
        variant = "default";
        break;
      case 'NotForSale':
        icon = <AlertTriangle className="h-5 w-5 text-orange-500" />;
        title = "Batch Not Ready for Sale";
        description = `This batch has a status of "${verificationResult.batch?.status}" and cannot be sold.`;
        variant = "destructive";
        break;
      case 'NotFound':
        icon = <XCircle className="h-5 w-5 text-red-500" />;
        title = "Batch Not Found";
        description = "This batch ID may be counterfeit or does not exist.";
        variant = "destructive";
        break;
      case 'Expired':
        icon = <XCircle className="h-5 w-5 text-red-500" />;
        title = "Batch Expired";
        description = `This batch expired on ${verificationResult.batch?.exp}. Do not sell.`;
        variant = "destructive";
        break;
    }

    return (
      <Alert variant={variant} className="mt-4">
        <div className="flex items-center gap-2">
          {icon}
          <AlertTitle>{title}</AlertTitle>
        </div>
        <AlertDescription className="pl-7">{description}</AlertDescription>
      </Alert>
    );
  };

  return (
    <ProtectedRoute allowedTypes={['pharmacy']}>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold font-headline">Pharmacy Dashboard</h1>

        {/* Blockchain Proof Section */}
        <BlockchainProof latestTxHash={blockchainTxHash} />

        {/* Note: Blockchain registration removed - using Supabase database as source of truth for roles */}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Verify & Sell Drug</CardTitle>
              <CardDescription>Scan or enter Batch ID to check for authenticity and expiry before dispensing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Wallet Connection Alert */}
              {blockchainConfigured && !wallet.isConnected && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Connect Wallet for Blockchain Recording</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm mb-2">Connect your wallet to record dispensing on blockchain.</p>
                    <Button size="sm" onClick={connectWallet} disabled={isWalletLoading}>
                      {isWalletLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Connect Wallet
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Blockchain Recording Info - Only if wallet matched */}
              {blockchainConfigured && wallet.isConnected && isWalletMatched && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Blockchain Recording Enabled</AlertTitle>
                  <AlertDescription className="text-sm">
                    Sales will be recorded on {chainConfig.name} blockchain.
                  </AlertDescription>
                </Alert>
              )}

              {/* Wallet Mismatch Alert */}
              {walletMismatchMessage && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Wallet Mismatch</AlertTitle>
                  <AlertDescription>
                    {walletMismatchMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Transaction Hash Display */}
              {blockchainTxHash && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <Link2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900 dark:text-green-100">✅ Sale Recorded on Blockchain</AlertTitle>
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

              <div className="space-y-2">
                <label htmlFor="batchId" className="text-sm font-medium">Batch ID</label>
                <Input
                  id="batchId"
                  placeholder="Scan or enter Batch ID"
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  disabled={isBlockchainSubmitting}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={isBlockchainSubmitting}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Check Authenticity & Expiry
              </Button>

              <VerificationResultDisplay />

              {verificationResult?.status === 'Verified' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleRecordSale}
                  disabled={isBlockchainSubmitting}
                >
                  {isBlockchainSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Record Sale
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Incoming & Delivered Stock</CardTitle>
              <CardDescription>Log of all batches in-transit or delivered to this pharmacy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by Batch ID or Drug Name..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <h3 className="text-lg font-semibold mb-2">In-Transit (Arriving)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead className="text-right">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrivingBatches.length > 0 ? arrivingBatches.map((batch) => (
                    <TableRow key={batch.id} onClick={() => setSelectedBatch(batch)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell>{batch.name}</TableCell>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell className="text-right">{lastLocation(batch)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No batches currently in transit.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <h3 className="text-lg font-semibold mt-6 mb-2 text-green-600 dark:text-green-400">Ready for Sale (Shelf)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atPharmacyBatches.length > 0 ? atPharmacyBatches.map((batch) => (
                    <TableRow key={batch.id} onClick={() => setSelectedBatch(batch)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell>{batch.name}</TableCell>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell className="text-right">
                         <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setBatchId(batch.id); handleVerify(); }}>
                           Verification Ready
                         </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No stock currently on shelf.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <h3 className="text-lg font-semibold mt-6 mb-2 opacity-70">Recently Sold</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soldBatches.length > 0 ? soldBatches.map((batch: Batch) => (
                    <TableRow key={batch.id} onClick={() => setSelectedBatch(batch)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell>{batch.name}</TableCell>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-muted text-muted-foreground">{batch.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No batches sold yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Batch Details: {selectedBatch?.id}</DialogTitle>
            </DialogHeader>
            {selectedBatch && <BatchDetails batch={selectedBatch} />}
          </DialogContent>
        </Dialog>
      </MotionDiv>
    </ProtectedRoute>
  );
}
