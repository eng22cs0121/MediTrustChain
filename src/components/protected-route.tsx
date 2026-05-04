"use client";

import { useCbacAuth, type OrganizationType } from "@/contexts/cbac-auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: (OrganizationType | 'admin')[];
}

export function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, organizationType, isAdmin, isMounted } = useCbacAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (!isAuthenticated) {
      // Save the attempted URL for redirect after login
      sessionStorage.setItem("redirectAfterLogin", pathname);
      router.replace("/login");
      return;
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const userType = isAdmin ? 'admin' : organizationType;
      if (!userType || !allowedTypes.includes(userType as any)) {
        console.warn(
          `[CBAC] Access denied to ${pathname}. User type: ${userType}, Required: ${allowedTypes.join(", ")}`
        );
        setAccessDenied(true);
        return;
      }
    }

    setAccessDenied(false);
  }, [isAuthenticated, isLoading, organizationType, isAdmin, allowedTypes, router, isMounted, pathname]);

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              You don&apos;t have permission to access this page.
              {allowedTypes && allowedTypes.length > 0 && (
                <>
                  {" "}
                  Required type: <strong>{allowedTypes.join(" or ")}</strong>.
                  Your current type is: <strong>{isAdmin ? 'admin' : (organizationType || "none")}</strong>.
                </>
              )}
            </p>
            <Button
              onClick={() => {
                if (isAdmin) {
                  router.push("/dashboard/admin");
                } else if (organizationType) {
                  router.push(`/dashboard/${organizationType}`);
                } else {
                  router.push("/dashboard");
                }
              }}
              variant="outline"
            >
              Go to My Dashboard
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
