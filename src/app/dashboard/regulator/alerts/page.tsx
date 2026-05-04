"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { fetchAnomalies, updateAnomalyStatus } from "./actions";
import { format } from "date-fns";
import { ShieldAlert, CheckCircle2, Search, Filter, AlertTriangle, Eye, ArrowLeft, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { MotionDiv } from "@/components/motion-div";
import { useBatches } from "@/contexts/batches-context";

const severityConfig: Record<string, { badge: string; color: string }> = {
  critical: { badge: "destructive", color: "text-destructive" },
  high: { badge: "destructive", color: "text-orange-500" },
  medium: { badge: "secondary", color: "text-warning" },
  low: { badge: "outline", color: "text-blue-500" },
};

const statusConfig: Record<string, { badge: string; label: string }> = {
  open: { badge: "destructive", label: "Open" },
  investigating: { badge: "secondary", label: "Investigating" },
  resolved: { badge: "outline", label: "Resolved" },
  false_positive: { badge: "outline", label: "False Positive" },
};

export default function AnomalyInboxPage() {
  const { user } = useCbacAuth();
  const { toast } = useToast();
  const { updateBatchStatus } = useBatches();
  
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("open");
  
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState<"resolved" | "false_positive" | "investigating">("resolved");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAnomalies = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnomalies();
      setAnomalies(data);
    } catch (error) {
      toast({ title: "Error loading anomalies", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const handleResolve = async () => {
    if (!selectedAnomaly || !user) return;
    if (resolutionAction === "resolved" && !reviewNotes.trim()) {
      toast({ title: "Review notes required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAnomalyStatus(selectedAnomaly.id, resolutionAction, reviewNotes, user.id);
      
      // If marking as false positive, we should clear the batch flag if it exists
      if (resolutionAction === "false_positive" && selectedAnomaly.batches?.status === "Flagged") {
         await updateBatchStatus(selectedAnomaly.batch_id, "In-Transit", "Regulator cleared anomaly as false positive");
      }

      toast({ title: "Anomaly updated successfully" });
      setIsResolveDialogOpen(false);
      loadAnomalies();
    } catch (error) {
      toast({ title: "Failed to update anomaly", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResolveDialog = (anomaly: any, action: "resolved" | "false_positive" | "investigating") => {
    setSelectedAnomaly(anomaly);
    setResolutionAction(action);
    setReviewNotes("");
    setIsResolveDialogOpen(true);
  };

  const filteredAnomalies = anomalies.filter(a => {
    const matchesSearch = 
      a.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute allowedTypes={["regulator"]}>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Link href="/dashboard/regulator" className="hover:text-foreground flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              Anomaly Alert Inbox
            </h1>
            <p className="text-muted-foreground mt-1">Review and resolve AI-detected supply chain anomalies.</p>
          </div>
        </div>

        <Card className="glass-card border-destructive/20 shadow-[0_0_20px_hsla(var(--destructive)/0.05)]">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>All historical and active alerts</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search batch ID or title..."
                    className="pl-9 bg-background/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-muted/50 p-1 rounded-lg border">
                  {["open", "resolved", "false_positive", "all"].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                        filterStatus === status 
                          ? "bg-background shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading anomalies...</p>
              </div>
            ) : filteredAnomalies.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium">No anomalies found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchQuery || filterStatus !== "all" 
                    ? "Try adjusting your filters" 
                    : "The supply chain is operating normally without detected risks."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Detected</TableHead>
                      <TableHead>Batch / Stage</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnomalies.map((anomaly, idx) => {
                      const sev = severityConfig[anomaly.severity] || severityConfig.medium;
                      const stat = statusConfig[anomaly.status] || statusConfig.open;
                      
                      return (
                        <MotionDiv
                          key={anomaly.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <TableRow className={anomaly.status === "open" ? "bg-destructive-subtle/30" : ""}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(anomaly.created_at), "MMM dd, HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm font-medium">{anomaly.batch_id}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {anomaly.batches?.name} • {anomaly.affected_stage || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm flex items-center gap-1.5">
                                {anomaly.title || anomaly.type}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[250px]" title={anomaly.description}>
                                {anomaly.description || (anomaly.reasons && anomaly.reasons[0])}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sev.badge as any} className="text-[10px] uppercase">{anomaly.severity}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={stat.badge as any} className="text-[10px] uppercase">{stat.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {anomaly.status === "open" ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-8" onClick={() => openResolveDialog(anomaly, "false_positive")}>
                                    Dismiss
                                  </Button>
                                  <Button size="sm" className="h-8" onClick={() => openResolveDialog(anomaly, "resolved")}>
                                    Resolve
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => openResolveDialog(anomaly, "resolved")}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        </MotionDiv>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {resolutionAction === "false_positive" ? "Dismiss as False Positive" : 
                 selectedAnomaly?.status === "open" ? "Resolve Anomaly" : "Anomaly Details"}
              </DialogTitle>
              <DialogDescription>
                {resolutionAction === "false_positive" 
                  ? "Marking this as a false positive will train the AI to ignore similar patterns and unflag the batch."
                  : "Provide details on how this anomaly was investigated and resolved."}
              </DialogDescription>
            </DialogHeader>
            
            {selectedAnomaly && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{selectedAnomaly.title || selectedAnomaly.type}</span>
                    <Badge variant="outline">{selectedAnomaly.batch_id}</Badge>
                  </div>
                  <p className="text-muted-foreground">{selectedAnomaly.description}</p>
                </div>
                
                {selectedAnomaly.status === "open" || resolutionAction !== "resolved" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Review Notes {resolutionAction === "resolved" && "*"}</label>
                    <Textarea 
                      placeholder="Explain your findings..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resolution Notes</label>
                    <div className="p-3 border rounded-md text-sm bg-background">
                      {selectedAnomaly.review_notes || "No notes provided."}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                {selectedAnomaly?.status === "open" ? "Cancel" : "Close"}
              </Button>
              {selectedAnomaly?.status === "open" && (
                <Button onClick={handleResolve} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
