"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { clearBatches, clearAllData } from "@/lib/clear-data";

interface ClearDataButtonProps {
  variant?: "batches" | "all";
}

export function ClearDataButton({ variant = "batches" }: ClearDataButtonProps) {
  const handleClear = () => {
    if (variant === "all") {
      clearAllData();
    } else {
      clearBatches();
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Clear {variant === "all" ? "All Data" : "Batches"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Clear {variant === "all" ? "All Data" : "Batches"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-semibold">
              {variant === "all"
                ? "This will delete ALL data including:"
                : "This will delete:"}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All batches and their history</li>
              {variant === "all" && (
                <>
                  <li>All recalls and notifications</li>
                  <li>Search history and preferences</li>
                  <li>Analytics cache</li>
                </>
              )}
            </ul>
            <p className="text-destructive font-medium mt-3">
              ⚠️ This action cannot be undone!
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Blockchain records remain immutable and cannot be deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Yes, Clear Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
