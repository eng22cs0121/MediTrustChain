"use client";

import { type BatchHistoryEvent } from "@/contexts/batches-context";
import { motion } from "framer-motion";
import { Factory, Warehouse, Truck, Building2, ShoppingBag, User, MapPin, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stageConfig: Record<string, { icon: React.ElementType; color: string; glowColor: string; label: string }> = {
  "Pending": { icon: Clock, color: "text-yellow-600 bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700", glowColor: "shadow-yellow-400/30", label: "Pending Review" },
  "Approved": { icon: CheckCircle2, color: "text-green-600 bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-700", glowColor: "shadow-green-400/30", label: "Approved" },
  "In-Transit": { icon: Truck, color: "text-blue-600 bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-700", glowColor: "shadow-blue-400/30", label: "In Transit" },
  "At-Warehouse": { icon: Warehouse, color: "text-indigo-600 bg-indigo-100 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-700", glowColor: "shadow-indigo-400/30", label: "At Warehouse" },
  "At-Pharmacy": { icon: Building2, color: "text-purple-600 bg-purple-100 border-purple-300 dark:bg-purple-950 dark:border-purple-700", glowColor: "shadow-purple-400/30", label: "At Pharmacy" },
  "Sold": { icon: ShoppingBag, color: "text-emerald-600 bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700", glowColor: "shadow-emerald-400/30", label: "Sold to Patient" },
  "Delivered": { icon: Building2, color: "text-teal-600 bg-teal-100 border-teal-300 dark:bg-teal-950 dark:border-teal-700", glowColor: "shadow-teal-400/30", label: "Delivered" },
  "Rejected": { icon: AlertTriangle, color: "text-red-600 bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-700", glowColor: "shadow-red-400/30", label: "Rejected" },
  "Recalled": { icon: AlertTriangle, color: "text-red-600 bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-700", glowColor: "shadow-red-400/30", label: "Recalled" },
  "Flagged": { icon: AlertTriangle, color: "text-orange-600 bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-700", glowColor: "shadow-orange-400/30", label: "Flagged" },
};

const defaultStage = { icon: MapPin, color: "text-gray-600 bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600", glowColor: "shadow-gray-400/20", label: "Unknown" };

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return ts; }
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface Props {
  history: BatchHistoryEvent[];
  compact?: boolean;
}

export function SupplyChainTimeline({ history, compact = false }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No tracking history yet.
      </div>
    );
  }

  return (
    <motion.div
      className="relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {history.map((event, idx) => {
        const stage = stageConfig[event.status] || defaultStage;
        const Icon = stage.icon;
        const isLast = idx === history.length - 1;
        const hasGPS = event.latitude && event.longitude;

        return (
          <motion.div
            key={`${event.timestamp}-${idx}`}
            className="flex gap-4 group"
            variants={itemVariants}
          >
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110",
                stage.color,
                isLast && "ring-2 ring-offset-2 ring-primary/30 dark:ring-offset-background shadow-lg " + stage.glowColor
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 min-h-[40px] bg-gradient-to-b from-border to-border/30 dark:from-border dark:to-border/20" />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1 min-w-0", isLast && "pb-2")}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={isLast ? "default" : "secondary"} className="text-xs font-semibold">
                  {stage.label}
                </Badge>
                {isLast && (
                  <Badge variant="outline" className="text-xs text-primary animate-pulse">
                    ● Current
                  </Badge>
                )}
              </div>
              <p className="font-medium text-sm mt-1 text-foreground">{event.location}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(event.timestamp)}</p>
              {!compact && hasGPS && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  📍 {(event.latitude as number).toFixed(4)}, {(event.longitude as number).toFixed(4)}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
