"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnomalyDetection } from "@/types/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Eye, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AnomalyDetectionDashboardProps {
  anomalies: AnomalyDetection[];
  onMarkResolved?: (id: string) => void;
  onMarkInvestigating?: (id: string) => void;
  onMarkFalsePositive?: (id: string) => void;
}

export function AnomalyDetectionDashboard({
  anomalies,
  onMarkResolved,
  onMarkInvestigating,
  onMarkFalsePositive,
}: AnomalyDetectionDashboardProps) {
  const severityConfig = {
    critical: {
      icon: '🚨',
      bg: 'bg-destructive-subtle',
      border: 'border-destructive/50',
      text: 'text-destructive',
      badge: 'destructive',
    },
    high: {
      icon: '⚠️',
      bg: 'bg-warning-subtle',
      border: 'border-warning/50',
      text: 'text-warning',
      badge: 'secondary',
    },
    medium: {
      icon: '⚡',
      bg: 'bg-warning-subtle',
      border: 'border-warning/30',
      text: 'text-warning',
      badge: 'outline',
    },
    low: {
      icon: 'ℹ️',
      bg: 'bg-primary-subtle',
      border: 'border-primary/30',
      text: 'text-primary',
      badge: 'outline',
    },
  } as const;

  const typeLabels = {
    timing: 'Timing Anomaly',
    location: 'Location Anomaly',
    quantity: 'Quantity Anomaly',
    verification: 'Verification Issue',
    tampering: 'Tampering Alert',
  };

  const statusConfig = {
    new: { label: 'New', color: 'bg-primary text-primary-foreground' },
    investigating: { label: 'Investigating', color: 'bg-warning text-warning-foreground' },
    resolved: { label: 'Resolved', color: 'bg-success text-success-foreground' },
    false_positive: { label: 'False Positive', color: 'bg-muted text-muted-foreground' },
  };

  const groupedAnomalies = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.severity]) {
      acc[anomaly.severity] = [];
    }
    acc[anomaly.severity].push(anomaly);
    return acc;
  }, {} as Record<string, AnomalyDetection[]>);

  const anomalyCounts = {
    critical: groupedAnomalies.critical?.length || 0,
    high: groupedAnomalies.high?.length || 0,
    medium: groupedAnomalies.medium?.length || 0,
    low: groupedAnomalies.low?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(anomalyCounts).map(([severity, count]) => {
          const config = severityConfig[severity as keyof typeof severityConfig];
          return (
            <Card key={severity} className={`${config.bg} border-2 ${config.border}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground capitalize">
                      {severity}
                    </p>
                    <p className={`text-3xl font-bold ${config.text}`}>{count}</p>
                  </div>
                  <div className="text-4xl">{config.icon}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Detected Anomalies
          </CardTitle>
          <CardDescription>
            AI-powered anomaly detection across your supply chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Anomalies Detected</h3>
              <p className="text-sm text-muted-foreground">
                Your supply chain is operating normally
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly) => {
                const config = severityConfig[anomaly.severity];
                const status = statusConfig[anomaly.status];
                return (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-lg border-2 ${config.border} ${config.bg} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">{config.icon}</span>
                          <Badge variant={config.badge as any}>
                            {anomaly.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {typeLabels[anomaly.type]}
                          </Badge>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
                            {status.label}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {anomaly.confidence}% confidence
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-lg">{anomaly.drugName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Batch ID: <span className="font-mono">{anomaly.batchId}</span>
                          </p>
                        </div>

                        <p className="text-sm">{anomaly.description}</p>

                        {anomaly.location && (
                          <p className="text-sm text-muted-foreground">
                            📍 Location: {anomaly.location}
                          </p>
                        )}

                        {anomaly.expectedValue && anomaly.actualValue && (
                          <div className="grid grid-cols-2 gap-4 text-sm bg-background/50 p-3 rounded">
                            <div>
                              <p className="text-muted-foreground">Expected</p>
                              <p className="font-semibold">{anomaly.expectedValue}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Actual</p>
                              <p className="font-semibold">{anomaly.actualValue}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Detected: {format(parseISO(anomaly.detectedAt), 'PPp')}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {config.icon} Anomaly Details
                              </DialogTitle>
                              <DialogDescription>
                                Comprehensive information about this anomaly
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Anomaly ID</p>
                                  <p className="text-sm font-mono text-muted-foreground">
                                    {anomaly.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Type</p>
                                  <p className="text-sm text-muted-foreground">
                                    {typeLabels[anomaly.type]}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Severity</p>
                                  <Badge variant={config.badge as any}>
                                    {anomaly.severity.toUpperCase()}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Confidence</p>
                                  <p className="text-sm text-muted-foreground">
                                    {anomaly.confidence}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Batch ID</p>
                                  <p className="text-sm font-mono text-muted-foreground">
                                    {anomaly.batchId}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Drug Name</p>
                                  <p className="text-sm text-muted-foreground">
                                    {anomaly.drugName}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">Description</p>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                  {anomaly.description}
                                </p>
                              </div>
                              {anomaly.location && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Location</p>
                                  <p className="text-sm text-muted-foreground">
                                    {anomaly.location}
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {anomaly.status === 'new' && (
                          <>
                            {onMarkInvestigating && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onMarkInvestigating(anomaly.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Investigate
                              </Button>
                            )}
                            {onMarkResolved && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onMarkResolved(anomaly.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            )}
                            {onMarkFalsePositive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMarkFalsePositive(anomaly.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                False
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
