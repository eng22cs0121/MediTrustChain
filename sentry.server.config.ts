import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Ignore specific errors
  ignoreErrors: [
    "Non-Error promise rejection captured",
    "NetworkError",
    "Failed to fetch",
  ],

  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  integrations: [
    Sentry.prismaIntegration(),
    Sentry.postgresIntegration(),
  ],
});
