"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  QrCode, 
  Package, 
  Calendar, 
  Factory, 
  Link2, 
  ExternalLink, 
  Clock, 
  Info, 
  Shield,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MapPin,
  Truck,
  Pill,
  Microscope,
  Upload
} from "lucide-react";
import { MotionDiv } from "@/components/motion-div";
import { Html5Qrcode } from "html5-qrcode";
import { useBlockchain, isBlockchainConfigured, SUPPORTED_CHAINS, DEFAULT_CHAIN } from "@/lib/blockchain";
import { verifyBatchOnBlockchain, type VerificationResult } from "@/lib/blockchain/verification";
import { useBatches } from "@/contexts/batches-context";
import { BatchJourney } from "@/components/dashboard/batch-journey";
import { DrugInfoCard } from "@/components/dashboard/batch-details";
import Link from "next/link";
import dynamic from 'next/dynamic';

const ShipmentMap = dynamic(() => import('@/components/dashboard/shipment-map').then(m => m.ShipmentMap), { ssr: false, loading: () => <div className="h-[400px] w-full animate-pulse bg-slate-800 rounded-lg" /> });

export default function PatientVerifyPage() {
  const { batches } = useBatches();
  const { contract } = useBlockchain();
  const [batchCode, setBatchCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isScannerRunning, setIsScannerRunning] = useState(false); // Track actual scanner state
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const blockchainConfigured = isBlockchainConfigured();
  const chainConfig = SUPPORTED_CHAINS[DEFAULT_CHAIN];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only try to stop if we know it's running
      if (scannerInstance && isScannerRunning) {
        scannerInstance.stop().catch(() => {
          // Ignore errors during cleanup - scanner may already be stopped
        });
      }
    };
  }, [scannerInstance, isScannerRunning]);

  const startScanner = async () => {
    setIsScanning(true);

    // Wait for DOM to render the qr-reader element
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const scanner = new Html5Qrcode("qr-reader");
      setScannerInstance(scanner);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleQrCodeSuccess,
        undefined
      );

      // Mark scanner as actually running
      setIsScannerRunning(true);
    } catch (err) {
      console.error("Failed to start QR scanner:", err);
      setIsScanning(false);
      setIsScannerRunning(false);
    }
  };

  const stopScanner = async () => {
    // Only try to stop if scanner is actually running
    if (scannerInstance && isScannerRunning) {
      try {
        await scannerInstance.stop();
        scannerInstance.clear();
      } catch (err) {
        // Ignore "not running" errors - scanner may have already stopped
        if (!(err instanceof Error && err.message.includes('not running'))) {
          console.error("Failed to stop scanner:", err);
        }
      }
    }
    setScannerInstance(null);
    setIsScannerRunning(false);
    setIsScanning(false);
  };

  const handleQrCodeSuccess = async (decodedText: string) => {
    await stopScanner();
    await handleVerify(decodedText);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Stop camera if running, just in case
    if (isScannerRunning) {
      await stopScanner();
    }

    setIsVerifying(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      const decodedText = await scanner.scanFile(file, true);
      scanner.clear();
      
      await handleVerify(decodedText);
    } catch (err) {
      console.error("Error scanning uploaded image:", err);
      setResult({
        isAuthentic: false,
        status: 'NOT_FOUND',
        message: 'Could not detect a QR code in the uploaded image. Please ensure the image is clear or enter the code manually.',
        details: {},
        logs: [],
      });
      setIsVerifying(false);
    }
  };

  const handleVerify = async (qrData?: string) => {
    const dataToVerify = qrData || batchCode.trim();

    if (!dataToVerify) {
      setResult({
        isAuthentic: false,
        status: 'NOT_FOUND',
        message: 'Please enter a batch code or scan a QR code.',
        details: {},
        logs: [],
      });
      return;
    }

    setIsVerifying(true);
    setResult(null);
    setVerificationLogs([]);

    try {
      const verificationResult = await verifyBatchOnBlockchain(
        dataToVerify,
        contract,
        batches
      );

      setResult(verificationResult);
      setVerificationLogs(verificationResult.logs || []);
    } catch (error: any) {
      setResult({
        isAuthentic: false,
        status: 'NOT_FOUND',
        message: error.message || 'Failed to verify batch.',
        details: {},
        logs: [],
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;

    switch (result.status) {
      case 'GENUINE':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'TAMPERED':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'EXPIRED':
        return <Clock className="h-12 w-12 text-orange-500" />;
      case 'NOT_APPROVED':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      case 'RECALLED':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'NOT_FOUND':
        return <XCircle className="h-12 w-12 text-gray-500" />;
      default:
        return <Shield className="h-12 w-12 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return 'default';

    switch (result.status) {
      case 'GENUINE': return 'default';
      case 'TAMPERED': return 'destructive';
      case 'EXPIRED': return 'destructive';
      case 'NOT_APPROVED': return 'secondary';
      case 'RECALLED': return 'destructive';
      case 'NOT_FOUND': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">MediTrustChain</span>
          </Link>
          <Button asChild variant="outline">
            <Link href="/login">Stakeholder Login</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-2xl">
                <ShieldCheck className="h-16 w-16 text-primary dark:text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold">Verify Medicine Authenticity</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Scan the QR code on your medicine package or enter the batch code to instantly verify its authenticity using blockchain technology.
            </p>
          </div>

          {/* Blockchain Status */}
          {blockchainConfigured && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <Link2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 dark:text-green-100">Blockchain Verification Active</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                All verifications are checked against the {chainConfig.name} blockchain for maximum security.
              </AlertDescription>
            </Alert>
          )}

          {/* Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Use your device camera to scan the QR code on the medicine package
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="qr-reader" className={`w-full rounded-lg overflow-hidden border-2 ${isScanning ? 'border-primary' : 'border-transparent hidden'}`} />

              {!isScanning ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={startScanner}
                    className="w-full h-14 text-sm sm:text-base"
                    disabled={isVerifying}
                  >
                    <QrCode className="mr-2 h-5 w-5" />
                    Start Camera
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 text-sm sm:text-base relative overflow-hidden"
                    disabled={isVerifying}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={stopScanner}
                  variant="outline"
                  className="w-full"
                >
                  Stop Scanner
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Enter Batch Code (e.g., BCH-001)"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  disabled={isScanning || isVerifying}
                  className="h-12 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <Button
                  onClick={() => handleVerify()}
                  className="w-full h-12 text-base"
                  disabled={isScanning || isVerifying || !batchCode.trim()}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Verify Batch
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {result && (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={result.isAuthentic ? "border-green-500 border-2" : "border-red-500 border-2"}>
                <CardHeader>
                  <div className="flex flex-col items-center text-center space-y-4">
                    {getStatusIcon()}
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        {result.isAuthentic ? "✅ Authentic Medicine" : "❌ Verification Failed"}
                      </CardTitle>
                      <Badge variant={getStatusColor()} className="text-base px-4 py-1">
                        {result.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Message */}
                  <Alert variant={result.isAuthentic ? "default" : "destructive"}>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Verification Result</AlertTitle>
                    <AlertDescription className="text-base mt-2">
                      {result.message}
                    </AlertDescription>
                  </Alert>

                  {/* Batch Details */}
                  {result.details && Object.keys(result.details).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Batch Information
                        </h3>
                        <div className="grid gap-3">
                          {result.details.drugName && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Drug Name</span>
                              <span className="font-medium">{result.details.drugName}</span>
                            </div>
                          )}
                          {result.details.batchId && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Batch ID</span>
                              <span className="font-mono font-medium">{result.details.batchId}</span>
                            </div>
                          )}
                          {result.details.manufacturer && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Factory className="h-4 w-4" />
                                Manufacturer
                              </span>
                              <span className="font-medium text-sm">{result.details.manufacturer}</span>
                            </div>
                          )}
                          {result.details.expiryDate && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Expiry Date
                              </span>
                              <span className="font-medium">{result.details.expiryDate}</span>
                            </div>
                          )}
                          {result.details.batchStatus && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Status</span>
                              <Badge variant="outline">{result.details.batchStatus}</Badge>
                            </div>
                          )}
                          {typeof result.details.blockchainVerified !== 'undefined' && (
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Shield className="h-4 w-4" />
                                Blockchain Verified
                              </span>
                              <Badge variant={result.details.blockchainVerified ? "default" : "secondary"}>
                                {result.details.blockchainVerified ? "Yes" : "No"}
                              </Badge>
                            </div>
                          )}
                          {typeof result.details.hashMatch !== 'undefined' && (
                            <div className="flex justify-between py-2">
                              <span className="text-muted-foreground">Data Integrity</span>
                              <Badge variant={result.details.hashMatch ? "default" : "destructive"}>
                                {result.details.hashMatch ? "✓ Verified" : "✗ Tampered"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Verification Logs */}
                  {verificationLogs.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => setShowLogs(!showLogs)}
                          className="w-full"
                        >
                          {showLogs ? "Hide" : "Show"} Technical Verification Details
                        </Button>
                        {showLogs && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                              {verificationLogs.join('\n')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Blockchain Explorer Link */}
                  {blockchainConfigured && result.details?.blockchainVerified && (
                    <Alert className="bg-primary/5 border-primary/20 mt-4">
                      <Link2 className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary font-semibold">Immutable Proof</AlertTitle>
                      <AlertDescription>
                        This medicine's core data is cryptographically hashed and stored on the <strong>{chainConfig.name}</strong> blockchain.
                        <a
                          href={chainConfig.blockExplorer}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 mt-2 font-medium"
                        >
                          View Transaction on Explorer
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Enhanced Safety Profile */}
                  {result.isAuthentic && (
                    <div className="mt-8 space-y-6 pt-8 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Microscope className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold">Drug Safety Profile</h3>
                      </div>

                      {/* AI Information Card */}
                      <DrugInfoCard drugName={result.details?.drugName || "Medicine"} />

                      {/* System Details (from DB) */}
                      {batches.find(b => b.id.toLowerCase() === (result.details?.batchId?.toLowerCase())) && (
                        <Card className="bg-muted/30 border-dashed">
                          <CardHeader className="py-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              Manufacturer Verified Specifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="grid grid-cols-2 gap-4 pb-4">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Composition</p>
                                <p className="text-sm font-medium">{batches.find(b => b.id.toLowerCase() === (result.details?.batchId?.toLowerCase()))?.composition || "Verified Formulation"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Dosage / Strength</p>
                                <p className="text-sm font-medium">Standard Pharmaceutical Grade</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Batch Journey */}
                      {batches.find(b => b.id.toLowerCase() === (result.details?.batchId?.toLowerCase())) && (
                        <div className="pt-4 border-t border-dashed">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Verified Audit Trail
                          </h3>
                          <BatchJourney batch={batches.find(b => b.id.toLowerCase() === (result.details?.batchId?.toLowerCase()))!} />
                          
                          <div className="pt-6 mt-6 border-t border-dashed">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-primary" />
                              Live Geospatial Route
                            </h3>
                            <ShipmentMap batch={batches.find(b => b.id.toLowerCase() === (result.details?.batchId?.toLowerCase()))!} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </MotionDiv>
          )}

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>How to Verify Your Medicine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Locate the QR code on your medicine package</li>
                <li>Click "Start QR Scanner" and point your camera at the QR code</li>
                <li>Wait for the automatic verification (or enter the batch code manually)</li>
                <li>Review the verification result and batch details</li>
                <li>If the medicine is not authentic, do not use it and report to authorities</li>
              </ol>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Why Verify?</AlertTitle>
                <AlertDescription>
                  Counterfeit medicines can be dangerous. Our blockchain-based verification ensures
                  you're taking genuine, safe medication approved by regulators.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>
    </div>
  );
}
