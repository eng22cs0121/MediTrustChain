
"use client";

import { useState, useMemo, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Shield, ShieldCheck, ShieldX, AlertTriangle, Eye, ExternalLink, Wallet, Link2, FileWarning, Ban, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MotionDiv } from "@/components/motion-div";
import { useBatches, type Batch, type BatchHistoryEvent } from "@/contexts/batches-context";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BatchDetails } from "@/components/dashboard/batch-details";
import { useNotifications } from "@/contexts/notifications-context";
import { AnomalyDetection, BatchAIScanner } from "@/components/dashboard/anomaly-detection";
import { useBlockchain, useContract, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BlockchainProof } from "@/components/dashboard/blockchain-proof";
import { BlockchainRegistration } from "@/components/dashboard/blockchain-registration";
import { RegulatorDrugApproval } from "@/components/dashboard/regulator-drug-approval";
import { AnalyticsHub } from "@/components/dashboard/analytics-hub";
import { UserRole } from "@/lib/blockchain";

type ComplianceLog = {
  id: string;
  batchId: string;
  action: BatchHistoryEvent['status'];
  by: string;
  date: string;
  location: string;
}

export default function RegulatorDashboard() {
  const { batches, updateBatchStatus, isLoading: isBatchesLoading } = useBatches();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [recallReason, setRecallReason] = useState("");
  const [isBlockchainSubmitting, setIsBlockchainSubmitting] = useState(false);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);

  // Blockchain hooks
  const { wallet, connectWallet, isLoading: isWalletLoading } = useBlockchain();
  const {
    isReady,
    approveBatch,
    rejectBatch,
    recallBatch,
    verifyBatchAuthenticity,
    getBatchByCode,
    isRegulatorApproved,
    generateDataHash
  } = useContract();
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

  // Debug logging for batches
  useEffect(() => {
    console.log("📊 Regulator Dashboard - Batches loaded:", batches.length);
    console.log("📊 Pending batches:", batches.filter(b => b.status === "Pending").length);
    console.log("📊 All batch statuses:", batches.map(b => ({ id: b.id, status: b.status })));
  }, [batches]);

  const pendingBatches = batches.filter(b => b.status === "Pending");
  const flaggedBatches = batches.filter(b => b.status === "Flagged");
  const approvedBatches = batches.filter(b => b.status === "Approved" || b.status === "In-Transit" || b.status === "Delivered");

  const complianceLogs: ComplianceLog[] = useMemo(() => {
    return batches
      .flatMap(batch =>
        (batch.history || []).map((event, idx) => ({
          id: `${batch.id}-${event.timestamp}-${idx}`,
          batchId: batch.id,
          action: event.status,
          by: event.status === 'Pending' || event.status === 'Approved' || event.status === 'Rejected' || event.status === 'Blocked' ? 'Regulator' : 'Supply Chain',
          date: format(parseISO(event.timestamp), 'yyyy-MM-dd HH:mm'),
          location: event.location,
        }))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [batches]);

  const openApproveDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsApproveDialogOpen(true);
    setBlockchainTxHash(null);
  };

  const openViewDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsViewDialogOpen(true);
  };

  const openRejectDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
    setBlockchainTxHash(null);
  };

  const openRecallDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setRecallReason("");
    setIsRecallDialogOpen(true);
    setBlockchainTxHash(null);
  };

  const handleApproval = async () => {
    if (!selectedBatch) return;

    setIsBlockchainSubmitting(true);

    try {
      // Check expiry date first
      const expiryDate = new Date(selectedBatch.exp);
      const now = new Date();
      if (expiryDate <= now) {
        toast({
          variant: "destructive",
          title: "Cannot Approve",
          description: `Batch has expired on ${format(expiryDate, 'MMM dd, yyyy')}. Cannot approve expired batches.`
        });
        setIsApproveDialogOpen(false);
        setIsBlockchainSubmitting(false);
        return;
      }

      // Check if expiry is within 30 days and warn
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const isNearExpiry = expiryDate <= thirtyDaysFromNow;

      // Check if this is a flagged batch (AI-flagged for review)
      const isFlaggedBatch = selectedBatch.status === "Flagged";
      let blockchainApproved = false;

      // If it's a flagged batch, don't try blockchain approval
      // Just clear the flag locally (regulator has reviewed and cleared it)
      if (isFlaggedBatch) {
        console.log("📋 Clearing flagged status after regulator review...");

        // Determine what the previous status was before it was flagged
        // Look at the history to find the last non-Flagged status
        let previousStatus: string = "Approved";
        if (selectedBatch.history && selectedBatch.history.length > 0) {
          const nonFlaggedEvents = selectedBatch.history.filter(h => h.status !== "Flagged");
          if (nonFlaggedEvents.length > 0) {
            previousStatus = nonFlaggedEvents[nonFlaggedEvents.length - 1].status;
          }
        }

        // Clear the flag and restore to previous status (or set to In-Transit if uncertain)
        const restoredStatus = previousStatus === "Approved" || previousStatus === "In-Transit"
          ? previousStatus
          : "In-Transit";

        await updateBatchStatus(selectedBatch.id, restoredStatus as any, "Regulatory Review - Cleared");

        toast({
          title: "✅ Batch Cleared",
          description: `Batch ${selectedBatch.id} has been reviewed and cleared. Status restored to ${restoredStatus}.${isNearExpiry ? ` Warning: Expires ${format(expiryDate, 'MMM dd, yyyy')}.` : ''}`
        });

        addNotification({
          title: "Flagged Batch Cleared",
          description: `Batch ${selectedBatch.id} (${selectedBatch.name}) was reviewed by regulator and cleared from flagged status.${isNearExpiry ? ` Expires ${format(expiryDate, 'MMM dd, yyyy')}.` : ''}`
        });

        setIsApproveDialogOpen(false);
        setIsBlockchainSubmitting(false);
        return;
      }

      // For non-flagged batches, try blockchain operations (if available and batch is in PENDING_APPROVAL)
      if (blockchainConfigured && isReady() && selectedBatch.status === "Pending") {
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

        try {
          // Step 1: Check if regulator is approved
          console.log("🔍 Checking regulator approval status...");
          const isApproved = await isRegulatorApproved();

          if (!isApproved) {
            console.error("❌ Regulator not approved by contract owner");
            toast({
              variant: "destructive",
              title: "🚫 Not Authorized",
              description: "You must be approved by the contract owner (admin) before approving batches. Please contact the administrator.",
            });
            setIsBlockchainSubmitting(false);
            return;
          }

          console.log("✅ Regulator is approved");

          // Step 2: Get actual batchId from blockchain using batchCode
          console.log("Approving batch on blockchain...");
          const blockchainBatch = await getBatchByCode(selectedBatch.id);

          if (!blockchainBatch) {
            console.error("❌ Batch not found on blockchain:", selectedBatch.id);
            toast({
              variant: "destructive",
              title: "Blockchain Error",
              description: "Batch not found on blockchain. It may not have been created yet.",
            });
            setIsBlockchainSubmitting(false);
            return;
          }

          const batchIdNum = Number(blockchainBatch.id);
          console.log(`✅ Found batch on blockchain with ID: ${batchIdNum}`);

          // Step 3: Generate approval hash per specification
          const approvalHash = generateDataHash({
            batchId: String(batchIdNum),
            drugName: '',
            mfgDate: 0,
            expDate: 0,
          });
          console.log(`🔐 Generated approval hash: ${approvalHash.slice(0, 10)}...`);

          // Step 4: Approve batch on blockchain
          if (typeof approveBatch === 'function') {
            const result = await approveBatch(batchIdNum, approvalHash);

            if (result && result.success) {
              setBlockchainTxHash(result.hash || null);
              blockchainApproved = true;
              console.log("✅ Blockchain approval successful:", result.hash);
            } else {
              console.error("❌ Blockchain approval failed:", result?.error);
              toast({
                variant: "destructive",
                title: "Blockchain Approval Failed",
                description: result?.error || "Failed to approve batch on blockchain. Please try again."
              });
              setIsBlockchainSubmitting(false);
              return; // Don't approve locally if blockchain fails
            }
          }
        } catch (blockchainError: any) {
          console.error("Blockchain operation failed:", blockchainError.message);
          toast({
            variant: "destructive",
            title: "Blockchain Error",
            description: blockchainError.message || "Failed to communicate with blockchain."
          });
          setIsBlockchainSubmitting(false);
          return; // Don't approve locally if blockchain fails
        }
      }

      // Update locally only after blockchain succeeds (or if blockchain not configured)
      // This is now non-blocking, so we can close the UI faster
      updateBatchStatus(selectedBatch.id, "Approved", "Regulatory Authority", undefined, blockchainTxHash || undefined);

      // CLOSE DIALOG IMMEDIATELY - Don't wait for notifications or messages
      setIsApproveDialogOpen(false);
      setIsBlockchainSubmitting(false);

      const approvalMessage = isNearExpiry
        ? `Batch ${selectedBatch.id} approved. Warning: Expires on ${format(expiryDate, 'MMM dd, yyyy')} (within 30 days).`
        : `Batch ${selectedBatch.id} has been approved successfully.${blockchainApproved ? ' Recorded on blockchain.' : ''}`;

      toast({
        title: "Batch Approved",
        description: approvalMessage
      });

      addNotification({
        title: "Batch Approved",
        description: `Batch ${selectedBatch.id} (${selectedBatch.name}) has been approved by the regulator.${isNearExpiry ? ` Expires ${format(expiryDate, 'MMM dd, yyyy')}.` : ''}`
      });

      setIsApproveDialogOpen(false);
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error?.message || "An unexpected error occurred while approving the batch."
      });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  };

  const handleRejectionConfirm = () => {
    if (!selectedBatch || !rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a reason." });
      return;
    }
    setIsRejectConfirmOpen(true);
  };

  const handleRejection = async () => {
    if (!selectedBatch || !rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a reason." });
      return;
    }

    setIsRejectConfirmOpen(false);
    setIsBlockchainSubmitting(true);

    try {
      if (isReady()) {
        // Get actual batchId from blockchain using batchCode
        const blockchainBatch = await getBatchByCode(selectedBatch.id);

        if (blockchainBatch) {
          const batchIdNum = Number(blockchainBatch.id);
          console.log(`✅ Rejecting batch with ID: ${batchIdNum}`);
          const result = await rejectBatch(batchIdNum, rejectionReason);
          if (result.success) setBlockchainTxHash(result.hash || null);
        } else {
          console.warn("⚠️ Batch not found on blockchain, updating locally only");
        }
      }

      await updateBatchStatus(selectedBatch.id, "Rejected", "Regulatory Authority");
      toast({ variant: "destructive", title: "Batch Rejected", description: `Batch ${selectedBatch.id} rejected.` });
      addNotification({
        title: "Batch Rejected",
        description: `Batch ${selectedBatch.id} rejected. Reason: ${rejectionReason}`
      });
      setIsRejectDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  };

  const handleRecall = async () => {
    if (!selectedBatch || !recallReason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a reason." });
      return;
    }

    setIsBlockchainSubmitting(true);

    try {
      if (isReady()) {
        // Get actual batchId from blockchain using batchCode
        const blockchainBatch = await getBatchByCode(selectedBatch.id);

        if (blockchainBatch) {
          const batchIdNum = Number(blockchainBatch.id);
          console.log(`✅ Recalling batch with ID: ${batchIdNum}`);
          const result = await recallBatch(batchIdNum, recallReason);
          if (result.success) setBlockchainTxHash(result.hash || null);
        } else {
          console.warn("⚠️ Batch not found on blockchain, updating locally only");
        }
      }

      await updateBatchStatus(selectedBatch.id, "Recalled", "RECALL - Regulatory Authority", recallReason);
      
      // Trigger global recall broadcast
      fetch('/api/batch-recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: selectedBatch.id, reason: recallReason })
      }).catch(err => console.error("Recall broadcast failed:", err));

      toast({ variant: "destructive", title: "🚨 Batch Recalled", description: `Batch ${selectedBatch.id} recalled. Alerts sent to all stakeholders.` });
      addNotification({
        title: "🚨 URGENT: Batch Recalled",
        description: `Batch ${selectedBatch.id} recalled. Reason: ${recallReason}`
      });
      setIsRecallDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected':
      case 'Blocked': return 'destructive';
      case 'In-Transit': return 'outline';
      case 'Delivered': return 'default';
      case 'Flagged': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <ProtectedRoute allowedTypes={['regulator']}>
      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                  <Shield className="h-8 w-8" />
                  Regulator Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">Review, approve, reject, or recall pharmaceutical batches</p>
              </div>
              <Link href="/dashboard/regulator/alerts">
                <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive-subtle hover:text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                  Alert Inbox
                </Button>
              </Link>
            </div>

          <div className="flex items-center gap-2">
            {blockchainConfigured ? (
              wallet.isConnected ? (
                <Badge className="bg-success text-success-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Blockchain Connected
                </Badge>
              ) : (
                <Button onClick={connectWallet} variant="outline" size="sm" disabled={isWalletLoading}>
                  {isWalletLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Connect Wallet
                </Button>
              )
            ) : (
              <Badge variant="secondary">Local Mode</Badge>
            )}
          </div>
        </div>

        {/* Blockchain Proof Section */}
        <BlockchainProof latestTxHash={blockchainTxHash} />

        {/* Blockchain Registration - Manual for Regulators */}
        {blockchainConfigured && wallet.isConnected && wallet.isCorrectChain && (
          <BlockchainRegistration
            role={UserRole.REGULATOR}
            roleName="Regulator"
          />
        )}

        {/* Wallet Mismatch Alert */}
        {walletMismatchMessage && (
          <Alert variant="destructive">
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Mismatch</AlertTitle>
            <AlertDescription>
              {walletMismatchMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Regulator Setup Instructions */}
        {blockchainConfigured && wallet.isConnected && (
          <Alert className="bg-primary-subtle border-primary/20">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Blockchain Regulator Requirements</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">After registering above, you must:</p>
              <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                <li><strong>Get approved</strong> by the contract owner (they must call <code className="bg-muted px-1 rounded">grantRegulatoryApproval()</code> with your address)</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Your wallet: <code className="bg-muted px-1 rounded text-xs">{wallet.address}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                If you get errors about "approved regulators", contact the contract owner to approve your address in the Admin Dashboard.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{pendingBatches.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{flaggedBatches.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved & Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedBatches.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel dark:glass-panel-dark transition-all duration-300 hover:scale-[1.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{batches.length}</div>
            </CardContent>
          </Card>
        </div>

        <AnomalyDetection />

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Pending ({pendingBatches.length})
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged ({flaggedBatches.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Approved ({approvedBatches.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="drugs" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Drug Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Batches Pending Approval</CardTitle>
                <CardDescription>Review and approve or reject new batches submitted by manufacturers.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Drug Name</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Exp Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBatches.length > 0 ? pendingBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono font-medium">{batch.id}</TableCell>
                        <TableCell>{batch.name}</TableCell>
                        <TableCell>{batch.manufacturer || 'N/A'}</TableCell>
                        <TableCell>{batch.qty?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell>{batch.exp}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(batch)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="default" size="sm" onClick={() => openApproveDialog(batch)}>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openRejectDialog(batch)}>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          No batches pending approval.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flagged">
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  AI-Flagged Batches
                </CardTitle>
                <CardDescription>These batches were flagged by AI for anomalies.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Drug Name</TableHead>
                      <TableHead>Anomaly Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedBatches.length > 0 ? flaggedBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono">{batch.id}</TableCell>
                        <TableCell>{batch.name}</TableCell>
                        <TableCell className="text-red-600">{batch.anomalyReason || 'Suspicious activity'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(batch)}>Review</Button>
                          <Button variant="default" size="sm" onClick={() => openApproveDialog(batch)}>Clear</Button>
                          <Button variant="destructive" size="sm" onClick={() => openRecallDialog(batch)}>
                            <Ban className="h-4 w-4 mr-1" />
                            Recall
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">No flagged batches.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Approved & Active Batches</CardTitle>
                <CardDescription>Monitor approved batches. You can recall if issues are found.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Drug Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedBatches.length > 0 ? approvedBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono">{batch.id}</TableCell>
                        <TableCell>{batch.name}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(batch.status)}>{batch.status}</Badge></TableCell>
                        <TableCell>{batch.manufacturer || 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(batch)}>View</Button>
                          <Button variant="destructive" size="sm" onClick={() => openRecallDialog(batch)}>
                            <Ban className="h-4 w-4 mr-1" />
                            Recall
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">No approved batches.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Audit Log</CardTitle>
                <CardDescription>Recent regulatory actions and batch status changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">{log.date}</TableCell>
                          <TableCell className="font-mono">{log.batchId}</TableCell>
                          <TableCell><Badge variant={getStatusBadgeVariant(log.action)}>{log.action}</Badge></TableCell>
                          <TableCell>{log.location}</TableCell>
                          <TableCell>{log.by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drugs">
             <RegulatorDrugApproval />
          </TabsContent>
          
          <TabsContent value="analytics">
             <AnalyticsHub />
          </TabsContent>
        </Tabs>

        {/* Batch Details Side Sheet */}
        <Sheet open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setSelectedBatch(null);
        }}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] md:max-w-none overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Batch Details: {selectedBatch?.id}</SheetTitle>
            </SheetHeader>
            {selectedBatch && <BatchDetails batch={selectedBatch} />}
          </SheetContent>
        </Sheet>

        {/* Approve Side Sheet */}
        <Sheet open={isApproveDialogOpen} onOpenChange={(open) => {
          setIsApproveDialogOpen(open);
          if (!open) {
            setBlockchainTxHash(null);
            setSelectedBatch(null);
          }
        }}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] md:max-w-none overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                {selectedBatch?.status === "Flagged" ? "Clear Flagged Batch" : "Approve Batch"}
              </SheetTitle>
              <SheetDescription>
                {selectedBatch?.status === "Flagged" ? (
                  <>
                    <strong className="text-orange-600">Flagged batch:</strong> {selectedBatch?.id} ({selectedBatch?.name})
                    <br />
                    <span className="text-sm mt-2 block">
                      This batch was flagged by AI anomaly detection. Review the details and clear if legitimate.
                    </span>
                    {selectedBatch?.anomalyReason && (
                      <Alert className="mt-3 bg-warning-subtle">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Anomaly Reason</AlertTitle>
                        <AlertDescription>{selectedBatch.anomalyReason}</AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <>Approve batch <strong>{selectedBatch?.id}</strong> ({selectedBatch?.name})?</>
                )}
              </SheetDescription>
            </SheetHeader>

            {blockchainConfigured && wallet.isConnected && selectedBatch?.status !== "Flagged" && (
              <Alert className="bg-success-subtle">
                <Link2 className="h-4 w-4" />
                <AlertTitle>Blockchain Recording</AlertTitle>
                <AlertDescription>This will be recorded on {chainConfig.name} blockchain.</AlertDescription>
              </Alert>
            )}

            {selectedBatch?.status === "Flagged" && (
              <Alert className="bg-primary-subtle">
                <Shield className="h-4 w-4" />
                <AlertTitle>Review & Clear</AlertTitle>
                <AlertDescription>
                  Clearing this flag confirms you've reviewed the batch and found no issues.
                  The batch will return to its previous status. No blockchain transaction required.
                </AlertDescription>
              </Alert>
            )}

            {blockchainTxHash && (
              <Alert className="bg-success-subtle">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">✅ Batch Approved on Blockchain</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-green-800 dark:text-green-200 text-sm">Transaction successfully recorded on blockchain.</p>
                  <a
                    href={`${chainConfig.blockExplorer}/tx/${blockchainTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    View on Etherscan <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground font-mono">{blockchainTxHash}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* AI Safety Scan — always visible in the approve dialog */}
            {selectedBatch && (
              <BatchAIScanner batch={selectedBatch} />
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isBlockchainSubmitting}>Cancel</Button>
              <Button onClick={handleApproval} disabled={isBlockchainSubmitting}>
                {isBlockchainSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : selectedBatch?.status === "Flagged" ? (
                  <><Check className="h-4 w-4 mr-2" />Clear Flag</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" />Approve</>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Reject Side Sheet */}
        <Sheet open={isRejectDialogOpen} onOpenChange={(open) => {
          setIsRejectDialogOpen(open);
          if (!open) {
            setBlockchainTxHash(null);
            setRejectionReason("");
            setSelectedBatch(null);
          }
        }}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] md:max-w-none overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <ShieldX className="h-5 w-5 text-red-500" />
                Reject Batch
              </SheetTitle>
              <SheetDescription>Reject batch <strong>{selectedBatch?.id}</strong>. Provide a reason.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Rejection *</Label>
                <Textarea placeholder="Enter reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
              </div>

              {blockchainTxHash && (
                <Alert className="bg-destructive-subtle">
                  <X className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-900 dark:text-red-100">Batch Rejected on Blockchain</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-red-800 dark:text-red-200 text-sm">Transaction successfully recorded.</p>
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
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isBlockchainSubmitting}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectionConfirm} disabled={isBlockchainSubmitting || !rejectionReason.trim()}>
                {isBlockchainSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><X className="h-4 w-4 mr-2" />Reject</>}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Reject Confirmation Dialog */}
        <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Rejection
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject batch <strong>{selectedBatch?.id}</strong>?
                <br /><br />
                <strong>Reason:</strong> {rejectionReason}
                <br /><br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBlockchainSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejection} disabled={isBlockchainSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isBlockchainSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <>Confirm Rejection</>}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Recall Side Sheet */}
        <Sheet open={isRecallDialogOpen} onOpenChange={(open) => {
          setIsRecallDialogOpen(open);
          if (!open) {
            setBlockchainTxHash(null);
            setRecallReason("");
            setSelectedBatch(null);
          }
        }}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] md:max-w-none overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                🚨 Emergency Recall
              </SheetTitle>
              <SheetDescription>RECALL batch <strong>{selectedBatch?.id}</strong>. This is irreversible.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>This action will notify all parties in the supply chain.</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Reason for Recall *</Label>
                <Textarea placeholder="Enter reason (e.g., contamination)..." value={recallReason} onChange={(e) => setRecallReason(e.target.value)} rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsRecallDialogOpen(false)} disabled={isBlockchainSubmitting}>Cancel</Button>
              <Button variant="destructive" onClick={handleRecall} disabled={isBlockchainSubmitting || !recallReason.trim()}>
                {isBlockchainSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Ban className="h-4 w-4 mr-2" />Confirm Recall</>}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </MotionDiv>
    </ProtectedRoute>
  );
}
