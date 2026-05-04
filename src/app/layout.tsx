
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import GlobalThemeToggle from "@/components/global-theme-toggle";
import { AIChatbot } from "@/components/ai-chatbot";
import { CbacAuthProvider } from '@/contexts/cbac-auth-context';
import { TenantProvider } from '@/contexts/tenant-context';
import { BatchesProvider } from '@/contexts/batches-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { RecallProvider } from '@/contexts/recall-context';
import { SearchProvider } from '@/contexts/search-context';
import { PreferencesProvider } from '@/contexts/preferences-context';
import { AnalyticsProvider } from '@/contexts/analytics-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { BlockchainProvider } from '@/lib/blockchain';
import { CommandPalette } from '@/components/dashboard/command-palette';
import '@/lib/clear-data'; // Import to expose clear functions to window

export const metadata: Metadata = {
  title: 'MediTrustChain | Trusted Pharmaceutical Supply Chain',
  description: 'MediTrustChain - Blockchain-powered pharmaceutical supply chain security. Ensure drug authenticity, prevent counterfeits, and protect patients with immutable verification.',
  keywords: ['pharmaceutical', 'supply chain', 'blockchain', 'traceability', 'MediTrustChain', 'healthcare'],
  authors: [{ name: 'MediTrustChain' }],
  openGraph: {
    title: 'MediTrustChain | Trusted Pharmaceutical Supply Chain',
    description: 'Blockchain-powered pharmaceutical supply chain security for drug authenticity and patient safety.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <BlockchainProvider>
              <CbacAuthProvider>
                <TenantProvider>
                  <NotificationsProvider>
                    <BatchesProvider>
                      <RecallProvider>
                        <SearchProvider>
                          <PreferencesProvider>
                            <AnalyticsProvider>
                              <GlobalThemeToggle />
                              <CommandPalette />
                              <AIChatbot />
                              {children}
                              <Toaster />
                            </AnalyticsProvider>
                          </PreferencesProvider>
                        </SearchProvider>
                      </RecallProvider>
                    </BatchesProvider>
                  </NotificationsProvider>
                </TenantProvider>
              </CbacAuthProvider>
            </BlockchainProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
