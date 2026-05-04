"use client";

import { useState, useEffect } from "react";
import { useBatches } from "@/contexts/batches-context";
import { AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ExpiryWarningBanner() {
  const { batches } = useBatches();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss daily
  useEffect(() => {
    const lastDismiss = localStorage.getItem("meditrust-expiry-dismissed");
    if (lastDismiss) {
      const diff = Date.now() - parseInt(lastDismiss);
      if (diff < 24 * 60 * 60 * 1000) setDismissed(true);
    }
  }, []);

  const activeBatches = batches.filter(
    b => !["Sold", "Recalled", "Rejected", "Blocked"].includes(b.status)
  );

  const now = new Date();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  const expiringBatches = activeBatches.filter(b => {
    const exp = new Date(b.exp);
    const diff = exp.getTime() - now.getTime();
    return diff > 0 && diff < fourteenDays;
  });

  const expiredBatches = activeBatches.filter(b => new Date(b.exp) <= now);

  if (dismissed || (expiringBatches.length === 0 && expiredBatches.length === 0)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("meditrust-expiry-dismissed", Date.now().toString());
  };

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${
      expiredBatches.length > 0
        ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
          expiredBatches.length > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        }`} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {expiredBatches.length > 0 && (
            <span className="font-semibold text-red-700 dark:text-red-300">
              🚨 {expiredBatches.length} active batch{expiredBatches.length > 1 ? "es" : ""} EXPIRED!
            </span>
          )}
          {expiringBatches.length > 0 && (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              ⚠️ {expiringBatches.length} batch{expiringBatches.length > 1 ? "es" : ""} expiring within 14 days
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            ({[...expiredBatches, ...expiringBatches].map(b => b.id).join(", ")})
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleDismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
