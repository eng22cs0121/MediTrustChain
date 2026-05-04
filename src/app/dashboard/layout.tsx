"use client";

import { useCbacAuth } from "@/contexts/cbac-auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserNav } from "@/components/dashboard/user-nav";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo, LogoCompact } from "@/components/logo";

import { Notifications } from "@/components/dashboard/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoiceCommand } from "@/components/voice-command";
import { WalletConnect } from "@/components/wallet-connect";
import { ExpiryWarningBanner } from "@/components/dashboard/expiry-warning-banner";
import { RoleOnboardingModal } from "@/components/dashboard/role-onboarding-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isMounted } = useCbacAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isMounted, router]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
            <div className="relative p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg shadow-primary/20">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">MediTrustChain</p>
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/3">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-6 shadow-sm">
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="shrink-0 hover:bg-primary/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs border-r border-border/40 bg-background/95 backdrop-blur-xl">
              <nav className="grid gap-6 text-lg font-medium pt-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 mb-4"
                >
                  <Logo size="sm" />
                </Link>
                <DashboardNav isMobile={true} />
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <Link href="/dashboard" className="mr-6 flex items-center gap-3 group">
            <Logo size="sm" />
          </Link>
        )}
        
        {!isMobile && <DashboardNav />}

        <div className="flex w-full items-center gap-2 md:ml-auto md:gap-3 lg:gap-4 justify-end">
          <WalletConnect />
          <VoiceCommand />
          <ThemeToggle />
          <Notifications />
          <div className="w-px h-8 bg-border/50 hidden sm:block" />
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8">
        <ExpiryWarningBanner />
        <RoleOnboardingModal />
        {children}
      </main>
    </div>
  );
}
