"use client";

import { useState } from "react";
import { useRecalls } from "@/contexts/recall-context";
import { BatchRecall } from "@/types/recall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface BatchRecallInfoProps {
  batchId: string;
}

export function BatchRecallInfo({ batchId }: BatchRecallInfoProps) {
  const { getRecallsByBatch } = useRecalls();
  const recalls = getRecallsByBatch(batchId);
  const [expanded, setExpanded] = useState(false);

  if (recalls.length === 0) {
    return null;
  }

  const activeRecalls = recalls.filter(r => 
    r.status === 'Initiated' || r.status === 'In Progress' || r.status === 'Ongoing'
  );

  const getClassColor = (recallClass: string) => {
    switch (recallClass) {
      case 'Class I': return 'destructive';
      case 'Class II': return 'default';
      case 'Class III': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Initiated': return <Clock className="h-4 w-4" />;
      case 'In Progress': return <Clock className="h-4 w-4" />;
      case 'Completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Terminated': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      case 'Ongoing': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={activeRecalls.length > 0 ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Recall Information</CardTitle>
          </div>
          {activeRecalls.length > 0 && (
            <Badge variant="destructive">
              {activeRecalls.length} Active Recall{activeRecalls.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <CardDescription>
          {recalls.length} recall{recalls.length > 1 ? 's' : ''} associated with this batch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recalls.slice(0, expanded ? recalls.length : 1).map((recall) => (
          <div 
            key={recall.id}
            className={`p-4 rounded-lg border ${
              recall.status === 'Initiated' || recall.status === 'In Progress' 
                ? 'border-destructive bg-destructive/5' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getClassColor(recall.recallClass)}>
                    {recall.recallClass}
                  </Badge>
                  <Badge variant="outline">
                    {recall.id}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getStatusIcon(recall.status)}
                  <span>{recall.status}</span>
                  <span>•</span>
                  <span>{format(recall.recallDate, 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Reason:</p>
                <p className="text-sm text-muted-foreground">{recall.reason}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Health Hazard:</p>
                <p className="text-sm text-muted-foreground">{recall.healthHazard}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Distributed</p>
                  <p className="text-lg font-semibold">{recall.unitsDistributed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recovered</p>
                  <p className="text-lg font-semibold text-green-600">{recall.unitsRecovered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-semibold text-orange-600">{recall.unitsOutstanding.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-lg font-semibold">{recall.responseRate}%</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Badge variant="outline">
                  {recall.recommendedAction}
                </Badge>
                {recall.fdaNotified && (
                  <Badge variant="outline">
                    FDA Notified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}

        {recalls.length > 1 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            {expanded ? 'Show Less' : `Show All ${recalls.length} Recalls`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
