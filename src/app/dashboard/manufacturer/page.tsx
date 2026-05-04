
"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, QrCode, Loader2, Link as LinkIcon, Wallet, ShieldCheck, Edit2, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { MotionDiv } from "@/components/motion-div";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { useBatches, type Batch } from "@/contexts/batches-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useBlockchain, useContract, isBlockchainConfigured, DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/blockchain";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BlockchainProof } from "@/components/dashboard/blockchain-proof";
import { ClearDataButton } from "@/components/dashboard/clear-data-button";
import { BlockchainRegistration } from "@/components/dashboard/blockchain-registration";
import { UserRole } from "@/lib/blockchain";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrugMaster } from "@/types/drug-master";

const batchSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  drugTemplateId: z.string().min(1, "Drug template must be selected"), // NEW
  mfgDate: z.date({ required_error: "Manufacturing date is required." }),
  expDate: z.date({ required_error: "Expiry date is required." }),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

type BatchFormValues = z.infer<typeof batchSchema>;

export default function ManufacturerDashboard() {
  const { batches, addBatch, updateBatchDetails } = useBatches();
  const { toast } = useToast();
  const [newlyCreatedBatch, setNewlyCreatedBatch] = useState<Batch | null>(null);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);
  const [blockchainDataHash, setBlockchainDataHash] = useState<string | null>(null);
  const [drugTemplates, setDrugTemplates] = useState<DrugMaster[]>([]); // NEW
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true); // NEW
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState("");

  // Merge newlyCreatedBatch with batches for immediate display
  // This shows the batch in the table immediately after blockchain success
  const displayBatches = React.useMemo(() => {
    if (!newlyCreatedBatch) return batches;
    // Check if the batch is already in the list (from database)
    const alreadyExists = batches.some(b => b.id === newlyCreatedBatch.id);
    if (alreadyExists) return batches;
    // Add to the beginning of the list
    return [newlyCreatedBatch, ...batches];
  }, [batches, newlyCreatedBatch]);
  const [useBlockchainSubmit, setUseBlockchainSubmit] = useState(true);
  const [isBlockchainSubmitting, setIsBlockchainSubmitting] = useState(false);
  const [isFormLocked, setIsFormLocked] = useState(false);

  // Auth context - get stakeholder info for wallet verification
  const { stakeholder, organization } = useCbacAuth();

  // Blockchain hooks
  const { wallet, connectWallet, isLoading: isWalletLoading } = useBlockchain();
  const { isReady, createBatch: createBlockchainBatch, getBatchByCode } = useContract();
  const blockchainConfigured = isBlockchainConfigured();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  // Check if connected wallet matches the assigned stakeholder wallet
  const isWalletMatched = wallet.isConnected &&
    stakeholder?.wallet_address &&
    wallet.address?.toLowerCase() === stakeholder.wallet_address.toLowerCase();

  const walletMismatchMessage = wallet.isConnected && stakeholder?.wallet_address && !isWalletMatched
    ? `Wrong wallet connected. Expected: ${stakeholder.wallet_address.slice(0, 6)}...${stakeholder.wallet_address.slice(-4)}`
    : null;

  // Fetch approved drug templates
  React.useEffect(() => {
    async function fetchTemplates() {
      setIsLoadingTemplates(true);
      try {
        const res = await fetch('/api/drug-master');
        if (res.ok) {
          const data = await res.json();
          setDrugTemplates(data.drugs || []);
        }
      } catch (err) {
        console.error('Failed to fetch drug templates:', err);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batchId: "",
      drugTemplateId: "",
      quantity: 0,
    },
  });

  function onSubmit(data: BatchFormValues) {
    // Validate expiry date is after manufacturing date
    if (data.expDate <= data.mfgDate) {
      toast({
        variant: "destructive",
        title: "Invalid Dates",
        description: "Expiry date must be after manufacturing date.",
      });
      return;
    }

    // If blockchain is enabled and ready, submit to blockchain
    if (useBlockchainSubmit && isReady()) {
      // Verify wallet matches before blockchain submission
      if (!isWalletMatched) {
        toast({
          variant: "destructive",
          title: "Wallet Mismatch",
          description: walletMismatchMessage || "Please connect the wallet assigned to your account.",
        });
        return;
      }
      handleBlockchainSubmit(data);
    } else {
      // Must use blockchain for new regulatory flow
      toast({
        variant: "destructive",
        title: "Blockchain Required",
        description: "Batch creation now requires an active blockchain connection for regulatory compliance.",
      });
    }
  }

  async function handleBlockchainSubmit(data: BatchFormValues) {
    setIsBlockchainSubmitting(true);
    setBlockchainTxHash(null);

    const selectedTemplate = drugTemplates.find(t => t.id === data.drugTemplateId);
    if (!selectedTemplate) {
      toast({ variant: "destructive", title: "Error", description: "Selected drug template not found." });
      setIsBlockchainSubmitting(false);
      return;
    }

    try {
      // 1. Verify hash matching API Call First (pre-flight check)
      console.log('🔍 Pre-flight hash verification...');
      const verifyRes = await fetch('/api/drug-master/verify-hash', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            drug_master_id: selectedTemplate.id,
            composition_hash: selectedTemplate.composition_hash
         })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.valid) {
         throw new Error(`Regulatory verification failed: ${verifyData.reason}`);
      }

      // 2. Create batch on blockchain
      console.log("🔗 Creating batch on blockchain...");
      const result = await createBlockchainBatch({
        batchCode: data.batchId,
        drugName: selectedTemplate.drug_name,
        quantity: data.quantity,
        mfgDate: data.mfgDate,
        expDate: data.expDate,
        drugTemplateId: 1 // Placeholder; full on-chain mapping via drug_code lookup can be added post-MVP
      });

      if (result.success) {
        console.log("✅ Batch created on blockchain successfully!");

        // Step 2: Extract ACTUAL batchId and dataHash from blockchain event
        let actualBatchId: number | null = null;
        let onChainDataHash: string | null = null;

        if (result.data?.batchId) {
          // BatchId and dataHash returned from event (preferred method)
          actualBatchId = Number(result.data.batchId);
          onChainDataHash = (result.data.dataHash as string) || null;
          console.log(`✅ Extracted batchId from event: ${actualBatchId}`);
          console.log(`✅ Extracted dataHash from event: ${onChainDataHash}`);
        } else {
          // Fallback: Query blockchain for batchId using batchCode (with timeout protection)
          console.log("⚠️ BatchId not in event, querying blockchain...");
          try {
            // Add timeout protection for blockchain query
            const queryPromise = getBatchByCode(data.batchId);
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("Query timeout")), 5000)
            );

            const batch = await Promise.race([queryPromise, timeoutPromise]);
            if (batch) {
              actualBatchId = Number(batch.id);
              console.log(`✅ Extracted batchId from blockchain query: ${actualBatchId}`);
            } else {
              console.warn("⚠️ Batch not found on blockchain after creation (will skip approval submission)");
            }
          } catch (queryError) {
            console.error("❌ Error querying blockchain for batchId:", queryError);
            // Continue anyway - batch was created successfully
          }
        }

        // Step 3: Batch is now automatically in PENDING_APPROVAL status (handled by smart contract)
        console.log(`✅ Batch created and automatically submitted for regulatory approval (contract handles this now)`);
        // No separate submitForApproval call needed - the contract does this in createBatch

        // SYNCHRONOUS: Save to database FIRST before showing QR
        console.log("💾 Saving batch to database (synchronous)...");
        console.log("📍 Organization ID:", organization?.id);
        
        if (!organization?.id) {
          console.warn("⚠️ Organization ID is missing! Batch will use user metadata fallback.");
        }
        
        const newBatchData: Omit<Batch, "status" | "history"> = {
          id: data.batchId,
          name: selectedTemplate.drug_name,
          mfg: format(data.mfgDate, "yyyy-MM-dd"),
          exp: format(data.expDate, "yyyy-MM-dd"),
          qty: data.quantity,
          manufacturer: organization?.name || "Unknown Manufacturer",
          organization_id: organization?.id,
          dataHash: onChainDataHash || undefined,
          blockchain_tx_hash: result.hash || undefined,
          on_chain_batch_id: actualBatchId || undefined,
          is_blockchain_synced: !!result.hash,
          drug_master_id: selectedTemplate.id, // NEW
          composition_hash: selectedTemplate.composition_hash, // NEW
          composition: selectedTemplate.composition, // NEW
          strength: selectedTemplate.strength, // NEW
        };

        // DEBUG: Log the batch data being saved
        console.log("🔍 CRITICAL DEBUG - Batch creation data:", {
          batchId: newBatchData.id,
          organization: organization,
          organization_id: organization?.id,
          organizationIsNull: organization === null,
          organizationIsUndefined: organization === undefined,
        });

        // CRITICAL: Await database save - don't proceed until saved
        let savedBatch: Batch;
        try {
          savedBatch = await addBatch(newBatchData);
          console.log("✅ Batch saved to database successfully:", savedBatch);
        } catch (dbError: any) {
          console.error("❌ Database save failed:", dbError);
          
          // Extract detailed error info
          const errorCode = dbError?.code || "UNKNOWN";
          const errorMessage = dbError?.message || "Unknown error";
          const errorDetails = dbError?.details || "";
          const errorHint = dbError?.hint || "";
          
          console.error("❌ Error details:", { errorCode, errorMessage, errorDetails, errorHint });
          
          // Check for common RLS errors
          let userFriendlyMessage = errorMessage;
          if (errorCode === "42501" || errorMessage.includes("violates row-level security")) {
            userFriendlyMessage = `RLS Policy Violation: Your stakeholder may not be properly configured. Organization ID: ${organization?.id || 'MISSING'}`;
          } else if (errorCode === "23503") {
            userFriendlyMessage = `Foreign Key Error: ${errorMessage}`;
          }
          
          toast({
            variant: "destructive",
            title: `Database Save Failed (${errorCode})`,
            description: userFriendlyMessage,
          });
          // Still show QR with blockchain-only data (batch is on blockchain)
          const blockchainOnlyBatch: Batch = {
            id: data.batchId,
            name: selectedTemplate.drug_name,
            mfg: format(data.mfgDate, "yyyy-MM-dd"),
            exp: format(data.expDate, "yyyy-MM-dd"),
            qty: data.quantity,
            manufacturer: organization?.name || "Unknown Manufacturer",
            organization_id: organization?.id,
            dataHash: onChainDataHash || undefined,
            drug_master_id: selectedTemplate.id, // NEW
            composition_hash: selectedTemplate.composition_hash, // NEW
            composition: selectedTemplate.composition, // NEW
            strength: selectedTemplate.strength, // NEW
            status: "Pending",
            history: [{
              location: organization?.name || "Unknown Manufacturer",
              timestamp: new Date().toISOString(),
              status: "Pending"
            }]
          };
          setNewlyCreatedBatch(blockchainOnlyBatch);
          setBlockchainTxHash(result.hash || null);
          setBlockchainDataHash(onChainDataHash);
          setIsFormLocked(true);
          return; // Exit early - user should retry
        }
        // SUCCESS: Both blockchain and database saved
        setNewlyCreatedBatch(savedBatch);
        setBlockchainTxHash(result.hash || null);
        setBlockchainDataHash(onChainDataHash);
        setIsFormLocked(true);

        toast({
          title: "🎉 Batch Created Successfully!",
          description: "Batch recorded on blockchain and saved to database.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Blockchain Error",
          description: result.error || "Failed to create batch on blockchain",
        });
      }
    } catch (error) {
      console.error('Blockchain error:', error);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      // CRITICAL: Always reset loading state
      console.log("🔄 Resetting loading state");
      setIsBlockchainSubmitting(false);
    }
  }

  /**
   * Generate QR code value containing batch data and on-chain hash
   * V2 CRITICAL: Include the dataHash from blockchain - this is the IMMUTABLE proof
   * Hash is generated ONLY at batch creation and NEVER regenerated
   */
  const getQrCodeValue = (batch: Batch | null) => {
    if (!batch) return "";
    const { id, name, mfg, exp, qty, manufacturer, dataHash } = batch;

    // Convert date strings to Unix timestamps (seconds) for verification compatibility
    const mfgTimestamp = Math.floor(new Date(mfg).getTime() / 1000);
    const expTimestamp = Math.floor(new Date(exp).getTime() / 1000);

    // V2 CRITICAL: Include the on-chain dataHash in QR code
    // This hash was computed by the smart contract at batch creation
    // It MUST NOT be regenerated - it's the immutable proof of authenticity
    return JSON.stringify({
      batchCode: id,            // Batch identifier
      drugName: name,           // Drug name
      quantity: qty,            // Quantity
      mfgDate: mfgTimestamp,    // Manufacturing date (Unix timestamp)
      expDate: expTimestamp,    // Expiry date (Unix timestamp)
      manufacturer: manufacturer || undefined, // Manufacturer name
      // V2: The on-chain hash is the SINGLE SOURCE OF TRUTH for verification
      // Patient scanning will compare this hash with on-chain stored hash
      dataHash: dataHash || blockchainDataHash || undefined,
    });
  }

  return (
    <ProtectedRoute allowedTypes={['manufacturer']}>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Manufacturer Dashboard</h1>
          <ClearDataButton variant="batches" />
        </div>

        {/* Blockchain Proof Section */}
        <BlockchainProof latestTxHash={blockchainTxHash} />

        {/* Note: Blockchain registration removed - using Supabase database as source of truth for roles */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Create New Batch</CardTitle>
              <CardDescription>Fill in the details to register a new drug batch on the blockchain.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Immutability Notice */}
              {isFormLocked && (
                <Alert className="mb-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <Loader2 className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">Batch Submitted</AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <p className="text-sm mb-2">This batch is now immutable after submission. Fields have been locked.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setIsFormLocked(false);
                        setNewlyCreatedBatch(null);
                        setBlockchainTxHash(null);
                      }}
                      className="mt-2"
                    >
                      Create New Batch
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Blockchain Toggle */}
              {blockchainConfigured && (
                <TooltipProvider>
                  <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-muted/50 border">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Record on Blockchain</div>
                      <div className="text-xs text-muted-foreground">
                        {wallet.isConnected
                          ? `Connected: ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
                          : "Connect wallet to enable"
                        }
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={useBlockchainSubmit && wallet.isConnected && wallet.isCorrectChain}
                            onCheckedChange={(checked) => {
                              if (!wallet.isConnected) {
                                toast({
                                  variant: "destructive",
                                  title: "Wallet Not Connected",
                                  description: "Please connect your wallet first.",
                                });
                                return;
                              }
                              setUseBlockchainSubmit(checked);
                            }}
                            disabled={!wallet.isConnected || !wallet.isCorrectChain}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{!wallet.isConnected ? "Connect wallet to record on blockchain" :
                          !wallet.isCorrectChain ? "Switch to correct network" :
                            "Toggle blockchain recording"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )}

              {/* Wallet Connection Prompt */}
              {blockchainConfigured && !wallet.isConnected && (
                <Alert className="mb-4">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Wallet Not Connected</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">Connect your wallet to record batches on the blockchain.</p>
                    <Button size="sm" onClick={connectWallet} disabled={isWalletLoading}>
                      {isWalletLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Connect Wallet
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Wrong Network Alert */}
              {wallet.isConnected && !wallet.isCorrectChain && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Wrong Network</AlertTitle>
                  <AlertDescription>
                    Please switch to {chainConfig.name} in your wallet to use blockchain features.
                  </AlertDescription>
                </Alert>
              )}

              {/* Wallet Mismatch Alert */}
              {walletMismatchMessage && (
                <Alert variant="destructive" className="mb-4">
                  <Wallet className="h-4 w-4" />
                  <AlertTitle>Wallet Mismatch</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm">{walletMismatchMessage}</p>
                    <p className="text-xs mt-1 opacity-70">
                      Connected: {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., BCH-005" {...field} disabled={isFormLocked} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="drugTemplateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approved Drug Template</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFormLocked || isLoadingTemplates}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingTemplates ? "Loading templates..." : "Select an approved drug template"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {drugTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.drug_name} ({template.strength}) - {template.drug_code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.value && (
                          <div className="mt-2 p-3 bg-muted/30 rounded border text-xs text-muted-foreground flex items-start gap-2">
                             <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                             <div>
                               <p className="font-medium text-foreground mb-1">Regulatory Assured Composition</p>
                               <p className="truncate max-w-[300px]" title={drugTemplates.find(t => t.id === field.value)?.composition}>
                                  {drugTemplates.find(t => t.id === field.value)?.composition}
                               </p>
                             </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mfgDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Manufacturing Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isFormLocked}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isFormLocked}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 10000" {...field} disabled={isFormLocked} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isBlockchainSubmitting || isFormLocked}>
                    {isBlockchainSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating on Blockchain...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {useBlockchainSubmit && isReady() ? "Add Batch to Blockchain" : "Add Batch"}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Registered Batches</CardTitle>
              <CardDescription>A list of all drug batches you have created.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.id}</TableCell>
                      <TableCell>{batch.name}</TableCell>
                      <TableCell>{batch.exp}</TableCell>
                      <TableCell>{batch.qty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={
                            batch.status === 'Approved' ? 'default' :
                              batch.status === 'Pending' ? 'secondary' : batch.status === 'Rejected' ? 'destructive' : 'destructive'
                          }>
                            {batch.status === 'Pending' ? '🟡 Pending Approval' : batch.status}
                          </Badge>

                          {batch.status === 'Pending' && (
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2 mt-1" onClick={() => {
                              setEditingBatch(batch);
                              setEditQty(batch.qty.toString());
                              setIsEditing(true);
                            }}>
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit Qty
                            </Button>
                          )}
                          
                          {(batch.status === 'Approved' || batch.status === 'Pending') && (
                            <Link href={`/dashboard/manufacturer/print-qr/${batch.id}`}>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 mt-1">
                                <Printer className="h-3 w-3 mr-1" />
                                Print QR
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!newlyCreatedBatch} onOpenChange={(open) => !open && setNewlyCreatedBatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batch Created Successfully</DialogTitle>
              <DialogDescription>
                The following QR code has been generated for Batch ID: {newlyCreatedBatch?.id}.
                This should be printed on the product packaging.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-md">
                <QRCodeSVG value={getQrCodeValue(newlyCreatedBatch)} size={200} />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p><strong>Batch ID:</strong> {newlyCreatedBatch?.id}</p>
                <p><strong>Drug:</strong> {newlyCreatedBatch?.name}</p>
                <p><strong>Expires:</strong> {newlyCreatedBatch?.exp}</p>
              </div>
              {blockchainTxHash && (
                <div className="w-full p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium mb-1">
                    <LinkIcon className="h-4 w-4" />
                    Recorded on Blockchain
                  </div>
                  <a
                    href={`${chainConfig.blockExplorer}/tx/${blockchainTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    View Transaction: {blockchainTxHash.slice(0, 20)}...{blockchainTxHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Batch Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Batch Quantity</DialogTitle>
              <DialogDescription>
                Update the quantity for this pending batch. Note: This will not affect any blockchain records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <FormLabel>Batch ID</FormLabel>
                <Input value={editingBatch?.id || ""} disabled />
              </div>
              <div className="space-y-2">
                <FormLabel>Quantity</FormLabel>
                <Input 
                  type="number" 
                  value={editQty} 
                  onChange={(e) => setEditQty(e.target.value)} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (editingBatch && editQty) {
                  const qty = parseInt(editQty);
                  if (qty > 0) {
                    await updateBatchDetails(editingBatch.id, { qty });
                    setIsEditing(false);
                    toast({ title: "Batch Updated", description: "Batch details updated successfully." });
                  }
                }
              }}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </MotionDiv>
    </ProtectedRoute >
  );
}
