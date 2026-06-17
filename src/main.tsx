import ReactDOM from "react-dom/client";
import { StrictMode, lazy, Suspense } from "react";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { LoadingOrbit } from "@/components/ui/LoadingOrbit";
import "./index.css";

const LazyPostHogProvider = lazy(() =>
  import("@posthog/react").then((module) => ({
    default: module.PostHogProvider,
  })),
);

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  exception_autocapture: true,
} as const;

const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const appFallback = (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoadingOrbit size="sm" />
  </div>
);
const app = (
  <ErrorBoundary>
    <HashRouter>
      <App />
    </HashRouter>
    <Toaster />
  </ErrorBoundary>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {posthogApiKey ? (
      <Suspense fallback={appFallback}>
        <LazyPostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
          {app}
        </LazyPostHogProvider>
      </Suspense>
    ) : (
      app
    )}
  </StrictMode>
);
