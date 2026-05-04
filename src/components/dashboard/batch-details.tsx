
"use client";

import { useEffect, useState } from "react";
import { type Batch } from "@/contexts/batches-context";
import { BatchJourney } from "./batch-journey";
import { BlockchainAuditTrail } from "./blockchain-audit-trail";
import { SupplyChainTimeline } from "./supply-chain-timeline";
import { getDrugInfo, type DrugInfoOutput } from "@/ai/flows/drug-info-flow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Pill, Video, Loader2, Blocks } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";
import { generateVideoSummary } from "@/ai/flows/video-generation-flow";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { isBlockchainConfigured } from "@/lib/blockchain";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function DrugInfoCard({ drugName }: { drugName: string }) {
    const [drugInfo, setDrugInfo] = useState<DrugInfoOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDrugInfo = async () => {
            if (!drugName) return;
            setIsLoading(true);
            setError(null);
            try {
                const result = await getDrugInfo({ drugName });
                setDrugInfo(result);
            } catch (err) {
                console.error("Failed to fetch drug info:", err);
                setError("Could not load AI-generated drug information.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchDrugInfo();
    }, [drugName]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                     <Pill className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>AI-Generated Drug Information</CardTitle>
                        <CardDescription>
                            Quick summary for {drugName}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 {isLoading && (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                 )}
                 {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                 )}
                 {drugInfo && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="text-sm space-y-3">
                            <div>
                                <h4 className="font-semibold text-foreground">Summary</h4>
                                <p className="text-muted-foreground">{drugInfo.summary}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-foreground">Primary Use</h4>
                                <p className="text-muted-foreground">{drugInfo.primaryUse}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-foreground">Key Warnings</h4>
                                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                   {drugInfo.keyWarnings.split('\n- ').map((warning, index) => (
                                        <li key={index}>{warning.replace(/^- /, '')}</li>
                                   ))}
                                </ul>
                            </div>
                        </div>
                        {drugInfo.imageDataUri && (
                             <div className="flex flex-col items-center justify-center space-y-2">
                                <Image 
                                    src={drugInfo.imageDataUri}
                                    width={200}
                                    height={200}
                                    alt={`AI-generated image of ${drugName}`}
                                    className="rounded-lg object-cover"
                                />
                                <p className="text-xs text-muted-foreground">AI-generated image</p>
                            </div>
                        )}
                    </div>
                 )}
            </CardContent>
        </Card>
    )

}


export function BatchDetails({ batch }: { batch: Batch }) {
  const { toast } = useToast();
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const blockchainEnabled = isBlockchainConfigured();

  const handleGenerateVideo = async () => {
    setIsVideoLoading(true);
    setVideoUrl(null);
    try {
      const result = await generateVideoSummary({ batch });
      setVideoUrl(result.videoDataUri);
      setIsVideoModalOpen(true);
    } catch (e) {
      console.error("Video generation failed", e);
      toast({
        variant: "destructive",
        title: "Video Generation Failed",
        description: "Could not generate video summary. The service may be busy. Please try again later.",
      });
    } finally {
      setIsVideoLoading(false);
    }
  }
  
  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(112, 53, 219); // Primary purple
    doc.text("MediTrustChain", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Comprehensive Batch Audit Report", 14, 28);
    
    // Batch Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Batch ID: ${batch.id}`, 14, 40);
    doc.text(`Drug Name: ${batch.name}`, 14, 48);
    doc.text(`Manufacturer: ${batch.manufacturer}`, 14, 56);
    doc.text(`Manufacturing Date: ${batch.mfg}`, 120, 40);
    doc.text(`Expiry Date: ${batch.exp}`, 120, 48);
    doc.text(`Quantity: ${batch.qty.toLocaleString()}`, 120, 56);
    doc.text(`Current Status: ${batch.status}`, 14, 64);

    if (batch.dataHash) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Blockchain Hash: ${batch.dataHash}`, 14, 72);
    }
    
    // History Table
    const tableData = batch.history.map(h => [
      new Date(h.timestamp).toLocaleString(),
      h.status,
      h.location,
      h.latitude && h.longitude ? `${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}` : "N/A"
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Timestamp', 'Status', 'Location', 'GPS']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [112, 53, 219] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`MediTrustChain_Audit_${batch.id}.pdf`);
    
    toast({
      title: "PDF Generated",
      description: "Audit report has been downloaded successfully.",
    });
  };
  
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Drug Name</p>
            <p className="font-medium">{batch.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Manufacturer</p>
            <p className="font-medium">{batch.manufacturer}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mfg. Date</p>
            <p className="font-medium">{batch.mfg}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expiry Date</p>
            <p className="font-medium">{batch.exp}</p>
          </div>
           <div>
            <p className="text-muted-foreground">Quantity</p>
            <p className="font-medium">{batch.qty.toLocaleString()}</p>
          </div>
        </div>

      {/* Tabbed View for Journey vs Blockchain Audit Trail */}
      <Tabs defaultValue="journey" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">📍 Timeline</TabsTrigger>
          <TabsTrigger value="journey">Supply Chain Journey</TabsTrigger>
          <TabsTrigger value="blockchain" className="flex items-center gap-2">
            <Blocks className="h-4 w-4" />
            Blockchain Audit Trail
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="mt-4">
          <SupplyChainTimeline history={batch.history} />
        </TabsContent>

        <TabsContent value="journey" className="mt-4">
          <BatchJourney batch={batch} />
        </TabsContent>
        
        <TabsContent value="blockchain" className="mt-4">
          {blockchainEnabled ? (
            <BlockchainAuditTrail batchId={batch.id} />
          ) : (
            <Alert>
              <Blocks className="h-4 w-4" />
              <AlertTitle>Blockchain Not Configured</AlertTitle>
              <AlertDescription>
                Set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment to enable blockchain audit trail viewing.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={handleGeneratePdf}>
          <Blocks className="mr-2 h-4 w-4" />
          Download PDF Audit
        </Button>
        <Button onClick={handleGenerateVideo} disabled={isVideoLoading}>
            {isVideoLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Video className="mr-2 h-4 w-4" />
            )}
            {isVideoLoading ? "Generating..." : "Generate Video Summary"}
        </Button>
      </div>

      <DrugInfoCard drugName={batch.name} />

      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Video Summary for Batch {batch.id}</DialogTitle>
                <DialogDescription>
                    An AI-generated summary of this batch's journey through the supply chain.
                </DialogDescription>
            </DialogHeader>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {videoUrl && (
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                    />
                )}
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
