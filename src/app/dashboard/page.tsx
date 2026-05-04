"use client";

import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const { organizationType, isAdmin, isAuthenticated, isMounted, isLoading } = useCbacAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (isAuthenticated) {
      if (isAdmin) {
        router.replace('/dashboard/admin');
      } else if (organizationType) {
        router.replace(`/dashboard/${organizationType}`);
      }
    } else {
      router.replace('/login');
    }
  }, [organizationType, isAdmin, isAuthenticated, isMounted, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium">Loading your dashboard...</p>
          <p className="text-sm text-muted-foreground">Please wait a moment</p>
        </div>
    </div>
  );
}
