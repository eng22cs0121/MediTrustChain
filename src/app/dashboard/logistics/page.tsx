
"use client";

import { useState } from 'react';
import { ProtectedRoute } from "@/components/protected-route";
import { useBatches, type Batch } from '@/contexts/batches-context';
import { useToast } from '@/hooks/use-toast';
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Search, Package, MapPin, CheckCircle2, Loader2, Wallet, Link2, ExternalLink, Clock, Building } from 'lucide-react';
import { MotionDiv } from '@/components/motion-div';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBlockchain, useContract, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from '@/lib/blockchain';
import { useNotifications } from '@/contexts/notifications-context';
import { BlockchainProof } from '@/components/dashboard/blockchain-proof';
import { BlockchainRegistration } from '@/components/dashboard/blockchain-registration';
import { UserRole } from '@/lib/blockchain';
import dynamic from 'next/dynamic';

const ShipmentMap = dynamic(() => import('@/components/dashboard/shipment-map').then(m => m.ShipmentMap), { ssr: false, loading: () => <div className="h-[200px] w-full animate-pulse bg-slate-800 rounded-lg" /> });

type StatusUpdate = 'In-Transit' | 'At-Warehouse' | 'At-Pharmacy' | 'Delivered';

const STATUS_OPTIONS: { value: StatusUpdate; label: string; icon: React.ReactNode }[] = [
  { value: 'In-Transit', label: 'In Transit', icon: <Truck className="h-4 w-4" /> },
  { value: 'At-Warehouse', label: 'At Warehouse', icon: <Building className="h-4 w-4" /> },
  { value: 'At-Pharmacy', label: 'At Pharmacy', icon: <Package className="h-4 w-4" /> },
  { value: 'Delivered', label: 'Delivered', icon: <CheckCircle2 className="h-4 w-4" /> },
];

export default function LogisticsDashboard() {
  const { batches, updateBatchLocation, updateBatchStatus } = useBatches();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [mapSession, setMapSession] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoLat, setDemoLat] = useState("");
  const [demoLng, setDemoLng] = useState("");
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<StatusUpdate>('In-Transit');
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

  // Filter batches by status
  const approvedBatches = batches.filter(b => b.status === 'Approved');
  const inTransitBatches = batches.filter(b => b.status === 'In-Transit');
  const deliveredBatches = batches.filter(b => b.status === 'Delivered');

  const filteredBatches = (batchList: Batch[]) =>
    batchList.filter(
      (b) =>
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const openUpdateDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setNewLocation('');
    setNewStatus(batch.status === 'Approved' ? 'In-Transit' : 'Delivered');
    setBlockchainTxHash(null);
    setMapSession(Date.now()); // Force clean mount for Leaflet
    setIsUpdateDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedBatch || !newLocation.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a location.',
      });
      return;
    }

    setIsBlockchainSubmitting(true);

    try {
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

        console.log("🔗 Updating batch status on blockchain...");

        // Acquire GPS Coordinates (Demo Mode Override or Native)
        let coords: { latitude: number; longitude: number } | undefined = undefined;
        try {
          if (isDemoMode) {
            if (!demoLat || !demoLng) {
              toast({ variant: 'destructive', title: 'Demo Error', description: 'Please enter Latitude and Longitude.' });
              setIsBlockchainSubmitting(false);
              return;
            }
            coords = { latitude: parseFloat(demoLat), longitude: parseFloat(demoLng) };
            console.log("📍 [DEMO MODE] Override GPS:", coords);
          } else if (navigator.geolocation) {
             const position = await new Promise<GeolocationPosition>((resolve, reject) => {
               navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
             });
             coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
             console.log("📍 GPS Acquired:", coords);
          }
        } catch(e) {
          console.warn("⚠️ GPS Denied or Timeout, proceeding without precise location.");
        }

        // Step 1: Get actual batch from blockchain
        const blockchainBatch = await getBatchByCode(selectedBatch.id);
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
        console.log(`📊 Current blockchain status: ${currentStatus}, Requested: ${newStatus}`);

        // Step 2: Determine valid blockchain transition based on current status
        // Smart contract valid transitions:
        // APPROVED(2) → IN_TRANSIT(4)
        // IN_TRANSIT(4) → DELIVERED(5)
        let targetStatus: number;
        let shouldUpdateBlockchain = true;
        let infoMessage = '';

        if (currentStatus === 2) { // APPROVED
          // Can only go to IN_TRANSIT
          if (newStatus === 'At-Pharmacy' || newStatus === 'Delivered') {
            // User wants to deliver, but we need to go through IN_TRANSIT first
            infoMessage = 'Batch will first be marked In-Transit. Update again to mark as Delivered.';
          }
          targetStatus = 4; // IN_TRANSIT
          console.log("📦 Transitioning from APPROVED to IN_TRANSIT");
        } else if (currentStatus === 4) { // IN_TRANSIT
          // Can go to DELIVERED, or stay as IN_TRANSIT (location only)
          if (newStatus === 'At-Pharmacy' || newStatus === 'Delivered') {
            targetStatus = 5; // DELIVERED
            console.log("📦 Transitioning from IN_TRANSIT to DELIVERED");
          } else {
            // Just updating location while in transit - local only
            console.log("⚠️ Batch already IN_TRANSIT. Location update stored locally.");
            shouldUpdateBlockchain = false;
            targetStatus = 4;
          }
        } else if (currentStatus === 5) { // DELIVERED
          console.log("✅ Batch already DELIVERED on blockchain.");
          shouldUpdateBlockchain = false;
          targetStatus = 5;
        } else {
          const statusNames = ['CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED', 'EXPIRED', 'RECALLED'];
          toast({
            variant: 'destructive',
            title: 'Invalid Batch Status',
            description: `Batch is ${statusNames[currentStatus]}. Logistics can only update APPROVED or IN_TRANSIT batches.`,
          });
          setIsBlockchainSubmitting(false);
          return;
        }

        // Step 3: Update blockchain if needed
        let txHash: string | undefined = undefined;
        if (shouldUpdateBlockchain) {
          const batchIdNum = Number(blockchainBatch.id);
          const result = await updateStatusOnChain(batchIdNum, targetStatus, newLocation);

          if (result.success) {
            txHash = result.hash || undefined;
            setBlockchainTxHash(txHash || null);
            console.log("✅ Blockchain status update successful:", txHash);
          } else {
            console.warn("⚠️ Blockchain error:", result.error);
            toast({
              variant: 'destructive',
              title: 'Blockchain Update Failed',
              description: result.error || 'Failed to update batch status on blockchain. Please try again.',
            });
            setIsBlockchainSubmitting(false);
            return;
          }
        }

        // Step 4: Update local state 
        const localStatus = targetStatus === 5 ? 'Delivered' : 'In-Transit';
        await updateBatchStatus(selectedBatch.id, localStatus, newLocation, undefined, txHash, coords?.latitude, coords?.longitude);

        if (localStatus === 'Delivered') {
          addNotification({
            title: "📦 Batch Delivered",
            description: `Batch ${selectedBatch.id} (${selectedBatch.name}) has been delivered to ${newLocation}.${shouldUpdateBlockchain ? ' Recorded on blockchain.' : ''}`
          });
        }

        toast({
          title: 'Status Updated',
          description: infoMessage || `Batch ${selectedBatch.id} is now ${localStatus} at ${newLocation}.${shouldUpdateBlockchain ? ' Recorded on blockchain.' : ''}`,
        });

        // Keep dialog open briefly to show success
        setTimeout(() => {
          setIsUpdateDialogOpen(false);
          setSelectedBatch(null);
        }, 800);
      } else {
        // Fallback: Update locally if blockchain not configured
        let coordsFallback: { latitude: number; longitude: number } | undefined = undefined;
        try {
          if (isDemoMode) {
            coordsFallback = { latitude: parseFloat(demoLat), longitude: parseFloat(demoLng) };
          } else if (navigator.geolocation) {
             const position = await new Promise<GeolocationPosition>((resolve, reject) => {
               navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
             });
             coordsFallback = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          }
        } catch(e) {}

        const localStatus = (newStatus === 'Delivered' || newStatus === 'At-Pharmacy') ? 'Delivered' : 'In-Transit';
        await updateBatchStatus(selectedBatch.id, localStatus, newLocation, undefined, undefined, coordsFallback?.latitude, coordsFallback?.longitude);

        if (localStatus === 'Delivered') {
          addNotification({
            title: "📦 Batch Delivered",
            description: `Batch ${selectedBatch.id} (${selectedBatch.name}) has been delivered to ${newLocation}.`
          });
        }

        toast({
          title: 'Status Updated',
          description: `Batch ${selectedBatch.id} is now ${newStatus} at ${newLocation}.`,
        });

        setTimeout(() => {
          setIsUpdateDialogOpen(false);
          setSelectedBatch(null);
        }, 500);
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status.',
      });
    } finally {
      setIsBlockchainSubmitting(false);
    }
  };

  const lastLocation = (batch: Batch) => {
    if (batch.history && batch.history.length > 0) {
      return batch.history[batch.history.length - 1].location;
    }
    return "Manufacturing Facility";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'In-Transit': return 'secondary';
      case 'Delivered': return 'outline';
      default: return 'secondary';
    }
  };

  const BatchTable = ({ batchList, showDelivered = false }: { batchList: Batch[]; showDelivered?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Batch ID</TableHead>
          <TableHead>Drug Name</TableHead>
          <TableHead>Current Location</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Status</TableHead>
          {!showDelivered && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {batchList.length > 0 ? (
          batchList.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-mono font-medium">{batch.id}</TableCell>
              <TableCell>{batch.name}</TableCell>
              <TableCell className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {lastLocation(batch)}
              </TableCell>
              <TableCell>{batch.manufacturer || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(batch.status)}>{batch.status}</Badge>
              </TableCell>
              {!showDelivered && (
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openUpdateDialog(batch)}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showDelivered ? 5 : 6} className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              No batches found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <ProtectedRoute allowedTypes={['logistics']}>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Logistics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track and update batch locations in the supply chain</p>
          </div>

          <div className="flex items-center gap-2">
            {blockchainConfigured ? (
              wallet.isConnected ? (
                <Badge className="bg-green-500 flex items-center gap-1">
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

        {/* Note: Blockchain registration removed - using Supabase database as source of truth for roles */}

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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready for Shipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{approvedBatches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{inTransitBatches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{deliveredBatches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{approvedBatches.length + inTransitBatches.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Batch ID or Drug Name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ready" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ready ({approvedBatches.length})
            </TabsTrigger>
            <TabsTrigger value="transit" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              In Transit ({inTransitBatches.length})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Delivered ({deliveredBatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ready">
            <Card>
              <CardHeader>
                <CardTitle>Ready for Shipment</CardTitle>
                <CardDescription>Approved batches waiting to begin transit.</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchTable batchList={filteredBatches(approvedBatches)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transit">
            <Card>
              <CardHeader>
                <CardTitle>In-Transit Shipments</CardTitle>
                <CardDescription>Batches currently moving through the supply chain.</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchTable batchList={filteredBatches(inTransitBatches)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivered">
            <Card>
              <CardHeader>
                <CardTitle>Delivered Batches</CardTitle>
                <CardDescription>Batches that have reached their destination.</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchTable batchList={filteredBatches(deliveredBatches)} showDelivered />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Update Shipment Status
              </DialogTitle>
              <DialogDescription>
                Update status for batch <strong>{selectedBatch?.id}</strong> ({selectedBatch?.name})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Display GPS Tracking Map */}
              {selectedBatch && (
                <div className="h-[200px] w-full rounded-lg overflow-hidden border border-border shadow-inner">
                  <ShipmentMap key={mapSession} batch={selectedBatch} />
                </div>
              )}
              {blockchainConfigured && wallet.isConnected && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Blockchain Recording</AlertTitle>
                  <AlertDescription>This update will be recorded on {chainConfig.name} blockchain.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as StatusUpdate)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  placeholder="e.g., Mumbai Distribution Center"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
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

              {blockchainTxHash && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Transaction Submitted</AlertTitle>
                  <AlertDescription>
                    <a
                      href={`${chainConfig.blockExplorer}/tx/${blockchainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {blockchainTxHash.slice(0, 20)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isBlockchainSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} disabled={isBlockchainSubmitting || !newLocation.trim()}>
                {isBlockchainSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MotionDiv>
    </ProtectedRoute>
  );
}
