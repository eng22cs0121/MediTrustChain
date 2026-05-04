"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, TrendingUp, Clock, MapPin, RefreshCw, Shield, Loader2,
  Package, Calendar, Hash, Brain, Sparkles, CheckCircle2, XCircle,
  AlertCircle, ThumbsUp, ThumbsDown, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { useBatches, type Batch } from "@/contexts/batches-context";
import { checkForAnomalies, analyzeBatchesForAnomalies } from "@/ai/flows/anomaly-detection-flow";
import { quickAnomalyCheck, type Anomaly, type AnomalyDetectionOutput, type BatchAnalysisOutput } from "@/ai/flows/anomaly-detection-types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const typeIcons: Record<string, React.ReactNode> = {
  time_delay: <Clock className="h-4 w-4" />,
  status_regression: <AlertTriangle className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  quantity: <Package className="h-4 w-4" />,
  expiry: <Calendar className="h-4 w-4" />,
  pattern: <Hash className="h-4 w-4" />,
  gps_anomaly: <TrendingUp className="h-4 w-4" />,
};

const severityConfig: Record<string, { color: string; bgColor: string; label: string; badge: string }> = {
  critical: { color: "text-destructive", bgColor: "bg-destructive-subtle", label: "CRITICAL", badge: "destructive" },
  high: { color: "text-orange-500", bgColor: "bg-warning-subtle", label: "HIGH", badge: "destructive" },
  medium: { color: "text-warning", bgColor: "bg-warning-subtle", label: "MEDIUM", badge: "secondary" },
  low: { color: "text-blue-500", bgColor: "bg-primary-subtle", label: "LOW", badge: "outline" },
};

// =============================================
// MAIN COMPONENT (used in Regulator Dashboard)
// =============================================
export function AnomalyDetection() {
  const { batches, updateBatchStatus } = useBatches();
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<BatchAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickIssues, setQuickIssues] = useState<Map<string, { issues: string[]; riskScore: number }>>(new Map());
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const activeBatches = batches.filter(b => 
    b.status !== 'Sold' && 
    b.status !== 'Delivered' && 
    b.status !== 'Rejected' && 
    b.status !== 'Recalled' &&
    b.status !== 'Blocked'
  );

  // Quick local check on mount/batch change
  useEffect(() => {
    const issues = new Map<string, { issues: string[]; riskScore: number }>();
    
    activeBatches.forEach(batch => {
      const check = quickAnomalyCheck({
        id: batch.id, name: batch.name, mfg: batch.mfg, exp: batch.exp,
        qty: batch.qty, status: batch.status, manufacturer: batch.manufacturer,
        history: batch.history,
      });
      if (check.hasIssues) issues.set(batch.id, { issues: check.issues, riskScore: check.riskScore });
    });
    setQuickIssues(issues);
  }, [batches]); // We still depend on batches array

  const runAIAnalysis = useCallback(async () => {
    if (activeBatches.length === 0) { 
      toast({ title: "No Active Batches", description: "There are no active batches to analyze.", variant: "default" }); 
      return; 
    }
    
    setIsAnalyzing(true);
    try {
      const batchData = activeBatches.map(b => ({
        id: b.id, name: b.name, mfg: b.mfg, exp: b.exp, qty: b.qty,
        status: b.status, manufacturer: b.manufacturer || "Unknown", history: b.history,
      }));
      const result = await analyzeBatchesForAnomalies(batchData);
      setAnalysisResult(result);
      setLastAnalyzed(new Date());
      toast({ title: "✅ Analysis Complete", description: `Found ${result.anomalies.length} anomalies across ${result.batchesWithAnomalies} batches.` });
    } catch (error) {
      toast({ title: "Analysis Failed", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  }, [batches, toast]);

  const handleFlagBatch = (anomaly: Anomaly) => {
    const batch = batches.find(b => b.id === anomaly.batchId);
    if (batch) {
      updateBatchStatus(anomaly.batchId, "Flagged" as any, "AI Anomaly Detection", anomaly.description);
      toast({ title: "🚩 Batch Flagged", description: `${anomaly.batchId} flagged for regulator review.` });
    }
  };

  const totalQuickIssues = Array.from(quickIssues.values()).reduce((sum, v) => sum + v.issues.length, 0);
  const highRiskBatches = Array.from(quickIssues.entries()).filter(([, v]) => v.riskScore >= 60);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-primary/20 glass-panel dark:glass-panel-dark box-glow relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                AI Anomaly Detection
                <Badge variant="outline" className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  GenKit + Gemini
                </Badge>
              </CardTitle>
              <CardDescription>Real-time supply chain risk analysis. Results inform approval decisions.</CardDescription>
            </div>
          </div>
          <Button onClick={runAIAnalysis} disabled={isAnalyzing} className="gap-2">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</> : <><RefreshCw className="h-4 w-4" />Run Full AI Scan</>}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Active Batches", value: activeBatches.length, icon: <Package className="h-4 w-4" />, variant: "default" },
            { label: "Quick Issues", value: totalQuickIssues, icon: <AlertCircle className="h-4 w-4" />, variant: totalQuickIssues > 0 ? "warning" : "default" },
            { label: "High Risk", value: highRiskBatches.length, icon: <XCircle className="h-4 w-4" />, variant: highRiskBatches.length > 0 ? "danger" : "default" },
            { label: "AI Anomalies", value: analysisResult?.anomalies.length ?? "—", icon: <Brain className="h-4 w-4" />, variant: (analysisResult?.anomalies.length ?? 0) > 0 ? "danger" : "default" },
            { label: "Critical", value: analysisResult?.criticalCount ?? "—", icon: <XCircle className="h-4 w-4" />, variant: (analysisResult?.criticalCount ?? 0) > 0 ? "danger" : "default" },
          ].map(s => (
            <div key={s.label} className={`p-3 rounded-lg border ${s.variant === "danger" ? "bg-destructive-subtle" : s.variant === "warning" ? "bg-warning-subtle" : "bg-muted/50"}`}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="quick">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick"><Clock className="h-4 w-4 mr-1" />Quick Check ({totalQuickIssues})</TabsTrigger>
            <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-1" />AI Analysis {analysisResult ? `(${analysisResult.anomalies.length})` : ""}</TabsTrigger>
            <TabsTrigger value="summary"><Shield className="h-4 w-4 mr-1" />Summary</TabsTrigger>
          </TabsList>

          {/* QUICK CHECK TAB */}
          <TabsContent value="quick" className="mt-4">
            {totalQuickIssues === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-60" />
                <p className="font-semibold">All Clear</p>
                <p className="text-sm text-muted-foreground">Local rule checks passed for all batches.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {Array.from(quickIssues.entries()).map(([batchId, { issues, riskScore }]) => (
                    <div key={batchId} className={`p-3 border rounded-lg ${riskScore >= 70 ? "bg-destructive-subtle" : "bg-warning-subtle"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono">{batchId}</Badge>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">Risk Score:</div>
                          <Progress value={riskScore} className="w-24 h-2" />
                          <span className={`text-sm font-bold ${riskScore >= 70 ? "text-red-600" : "text-yellow-600"}`}>{riskScore}%</span>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {issues.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0 text-red-500" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* AI ANALYSIS TAB */}
          <TabsContent value="ai" className="mt-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="relative">
                  <Brain className="h-16 w-16 text-primary opacity-20" />
                  <Loader2 className="h-16 w-16 animate-spin text-primary absolute inset-0" />
                </div>
                <p className="text-muted-foreground text-sm">Gemini AI is analyzing {activeBatches.length} batches...</p>
              </div>
            ) : !analysisResult ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="font-semibold">No AI Analysis Yet</p>
                <p className="text-sm text-muted-foreground mb-4">Click "Run Full AI Scan" to get Gemini's full assessment.</p>
                <Button onClick={runAIAnalysis} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Start Analysis</Button>
              </div>
            ) : analysisResult.anomalies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-green-700">All Clear — AI Found No Anomalies</p>
                <p className="text-sm text-muted-foreground">Supply chain is operating normally.</p>
              </div>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="space-y-3">
                  {analysisResult.anomalies.map(anomaly => (
                    <AnomalyCard key={anomaly.id} anomaly={anomaly} onFlag={() => handleFlagBatch(anomaly)} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* SUMMARY TAB */}
          <TabsContent value="summary" className="mt-4">
            {!analysisResult ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Run an AI scan to see the executive summary.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className={analysisResult.criticalCount > 0 ? "bg-destructive-subtle" : "bg-success-subtle"}>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>{analysisResult.criticalCount > 0 ? "⚠️ Action Required" : "✅ Supply Chain Healthy"}</AlertTitle>
                  <AlertDescription>{analysisResult.summary}</AlertDescription>
                </Alert>
                {analysisResult.topRisks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Top Risk Areas</h4>
                    <ul className="space-y-2">
                      {analysisResult.topRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{i + 1}</span>{risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 pt-4 border-t">
                  {[
                    { label: "Critical", count: analysisResult.criticalCount, color: "text-destructive", bg: "bg-destructive-subtle" },
                    { label: "High", count: analysisResult.highCount, color: "text-orange-500", bg: "bg-warning-subtle" },
                    { label: "Medium", count: analysisResult.mediumCount, color: "text-warning", bg: "bg-warning-subtle" },
                    { label: "Low", count: analysisResult.lowCount, color: "text-blue-500", bg: "bg-primary-subtle" },
                  ].map(s => (
                    <div key={s.label} className={`text-center p-3 rounded-lg ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                {lastAnalyzed && <p className="text-xs text-muted-foreground text-center">Last analyzed: {format(lastAnalyzed, "PPpp")}</p>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </motion.div>
  );
}

// =============================================
// INLINE BATCH SCANNER (used in Approve Dialog)
// =============================================
export function BatchAIScanner({ batch }: { batch: Batch }) {
  const [result, setResult] = useState<AnomalyDetectionOutput | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const quickCheck = quickAnomalyCheck({
    id: batch.id, name: batch.name, mfg: batch.mfg, exp: batch.exp,
    qty: batch.qty, status: batch.status, manufacturer: batch.manufacturer,
    history: batch.history,
  });

  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await checkForAnomalies({
        batch: {
          id: batch.id, name: batch.name, mfg: batch.mfg, exp: batch.exp,
          qty: batch.qty, status: batch.status, manufacturer: batch.manufacturer || "Unknown",
          history: batch.history,
        },
        currentDate: new Date().toISOString(),
      });
      setResult(res);
    } catch (e) {
      console.error("Batch scan failed:", e);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan on mount
  useEffect(() => { runScan(); }, []);

  const recConfig = result?.approvalRecommendation === "approve"
    ? { icon: <ThumbsUp className="h-5 w-5" />, color: "text-success", bg: "bg-success-subtle", label: "✅ SAFE TO APPROVE" }
    : result?.approvalRecommendation === "reject"
    ? { icon: <ThumbsDown className="h-5 w-5" />, color: "text-destructive", bg: "bg-destructive-subtle", label: "🚨 AI RECOMMENDS REJECT" }
    : { icon: <Search className="h-5 w-5" />, color: "text-warning", bg: "bg-warning-subtle", label: "⚠️ INVESTIGATE BEFORE APPROVING" };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI Safety Scan</span>
          <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Gemini</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={runScan} disabled={isScanning}>
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Quick check - always shown immediately */}
      {quickCheck.hasIssues && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Instant Rule Check:</p>
          {quickCheck.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 bg-warning-subtle rounded">
              <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-600 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Scan Result */}
      {isScanning ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Gemini AI is scanning this batch...</p>
            <p className="text-xs text-muted-foreground">Checking expiry, history, GPS, status patterns</p>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-3">
          {/* Recommendation Banner */}
          <div className={`flex items-center gap-3 p-3 border rounded-lg ${recConfig.bg}`}>
            <div className={recConfig.color}>{recConfig.icon}</div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${recConfig.color}`}>{recConfig.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{result.approvalJustification}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className={`text-xl font-bold ${result.overallRiskScore >= 70 ? "text-destructive" : result.overallRiskScore >= 40 ? "text-warning" : "text-success"}`}>
                {result.overallRiskScore}%
              </p>
            </div>
          </div>

          {/* Anomaly list */}
          {result.anomalies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detected Issues ({result.anomalies.length})</p>
              {result.anomalies.map(anomaly => {
                const cfg = severityConfig[anomaly.severity] || severityConfig.medium;
                return (
                  <div key={anomaly.id} className={`border rounded-lg ${cfg.bgColor}`}>
                    <button
                      className="w-full p-3 text-left flex items-center justify-between"
                      onClick={() => setExpanded(e => ({ ...e, [anomaly.id]: !e[anomaly.id] }))}
                    >
                      <div className="flex items-center gap-2">
                        {typeIcons[anomaly.type] || <AlertTriangle className="h-4 w-4" />}
                        <Badge variant={cfg.badge as any} className="text-xs">{cfg.label}</Badge>
                        <span className="text-sm font-medium">{anomaly.title}</span>
                      </div>
                      {expanded[anomaly.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expanded[anomaly.id] && (
                      <div className="px-3 pb-3 space-y-1 border-t border-dashed pt-2">
                        <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                        <p className="text-xs"><span className="font-semibold">Recommendation:</span> {anomaly.recommendation}</p>
                        <p className="text-xs text-muted-foreground">AI Confidence: {anomaly.confidence}% | Stage: {anomaly.affectedStage}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {result.anomalies.length === 0 && (
            <div className="flex items-center gap-2 p-2 bg-success-subtle rounded text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> No anomalies detected by AI.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AnomalyCard({ anomaly, onFlag }: { anomaly: Anomaly; onFlag: () => void }) {
  const config = severityConfig[anomaly.severity] || severityConfig.medium;
  const icon = typeIcons[anomaly.type] || <AlertTriangle className="h-4 w-4" />;
  const [open, setOpen] = useState(false);

  return (
    <div className={`border rounded-lg ${config.bgColor}`}>
      <button className="w-full p-4 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <Badge variant={config.badge as any} className="text-xs">{config.label}</Badge>
              <Badge variant="outline" className="font-mono text-xs">{anomaly.batchId}</Badge>
              <Badge variant="secondary" className="text-xs">{anomaly.type.replace("_", " ")}</Badge>
            </div>
            <p className="font-semibold text-sm">{anomaly.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{anomaly.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); onFlag(); }}>Flag</Button>
            <span className="text-xs text-muted-foreground">{anomaly.confidence}% confident</span>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-dashed pt-3 space-y-1">
          <p className="text-xs">{anomaly.description}</p>
          <p className="text-xs"><span className="font-semibold">Action:</span> {anomaly.recommendation}</p>
          <p className="text-xs text-muted-foreground">Stage: {anomaly.affectedStage}</p>
        </div>
      )}
    </div>
  );
}
