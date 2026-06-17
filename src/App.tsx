import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AppShell } from "@/components/app-shell/AppShell";
import { ActivePathContext } from "@/hooks/usePageVisible";
import { sectionMemory } from "@/hooks/useSectionMemory";
import { SettingsContext, useSettingsProvider } from "@/hooks/useSettings";
import {
  UpdaterContext,
  useUpdaterProvider,
  useStartupUpdateCheck,
} from "@/hooks/useUpdater";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ReleaseNotesDialog } from "@/components/ReleaseNotesDialog";
import { LoadingOrbit } from "@/components/ui/LoadingOrbit";

const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const CourseDetail = lazy(() =>
  import("@/pages/CourseDetail").then((module) => ({ default: module.CourseDetail })),
);
const ImportCourse = lazy(() =>
  import("@/pages/ImportCourse").then((module) => ({ default: module.ImportCourse })),
);
const Bookmarks = lazy(() =>
  import("@/pages/Bookmarks").then((module) => ({ default: module.Bookmarks })),
);
const Progress = lazy(() =>
  import("@/pages/Progress").then((module) => ({ default: module.Progress })),
);
const Notes = lazy(() =>
  import("@/pages/Notes").then((module) => ({ default: module.Notes })),
);
const Settings = lazy(() =>
  import("@/pages/Settings").then((module) => ({ default: module.Settings })),
);
const AiModule = lazy(() =>
  import("@/pages/AiModule").then((module) => ({ default: module.AiModule })),
);
const PreviewAiModule = lazy(() =>
  import("@/pages/PreviewAiModule").then((module) => ({ default: module.PreviewAiModule })),
);
const Pets = lazy(() =>
  import("@/pages/Pets").then((module) => ({ default: module.Pets })),
);
const DesktopPetWindow = lazy(() =>
  import("@/components/DesktopPetWindow").then((module) => ({ default: module.DesktopPetWindow })),
);

function routeKey(pathname: string, search: string): string {
  if (pathname.startsWith("/course/")) {
    const section = sectionRoot(pathname, search);
    return `${pathname}::${section}`;
  }
  return pathname;
}

function sectionRoot(pathname: string, search: string): string {
  if (pathname.startsWith("/course/")) {
    const params = new URLSearchParams(search);
    const from = params.get("from");
    return from ? from.split("?")[0] : "/";
  }
  return pathname;
}

const TRANSIENT_ROUTES = new Set(["/import"]);

function shouldKeepAlive(pathname: string): boolean {
  return pathname.startsWith("/course/");
}

function RouteFallback() {
  return (
    <div className="flex h-full min-h-80 items-center justify-center">
      <LoadingOrbit size="sm" />
    </div>
  );
}

/**
 * Keep-alive router: only course pages stay mounted so video/note state can be
 * restored quickly. Normal app pages mount fresh to avoid hidden AI, pet, and
 * settings panels doing background work after navigation.
 */
function KeepAliveRoutes() {
  const location = useLocation();
  const key = routeKey(location.pathname, location.search);
  const isTransient = TRANSIENT_ROUTES.has(location.pathname);
  const keepAlive = !isTransient && shouldKeepAlive(location.pathname);

  const [cache, setCache] = useState<Map<string, ReturnType<typeof useLocation>>>(
    () => keepAlive ? new Map([[key, { ...location }]]) : new Map(),
  );

  useEffect(() => {
    if (isTransient) return;
    const section = sectionRoot(location.pathname, location.search);
    sectionMemory.set(section, location.pathname + location.search);
  }, [location, isTransient]);

  useEffect(() => {
    if (!keepAlive) return;
    setCache((prev) => {
      const next = new Map(prev);
      next.set(key, { ...location });
      for (const cachedKey of next.keys()) {
        if (cachedKey !== key && cachedKey.startsWith("/course/")) {
          next.delete(cachedKey);
        }
      }
      return next;
    });
  }, [location, key, keepAlive]);

  const cachedRoutes = Array.from(cache.entries());
  const hasCurrentCachedRoute = cachedRoutes.some(([cachedKey]) => cachedKey === key);
  const visibleRoutes = keepAlive && !hasCurrentCachedRoute
    ? [...cachedRoutes, [key, { ...location }] as [string, ReturnType<typeof useLocation>]]
    : cachedRoutes;

  return (
    <ActivePathContext.Provider value={key}>
      {visibleRoutes.map(([cachedKey, cachedLocation]) => (
        <div
          key={cachedKey}
          className="route-cache-layer"
          style={{ display: cachedKey === key ? undefined : "none" }}
        >
          <Routes location={cachedLocation}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/ai" element={<AiModule />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pets" element={<Pets />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
          </Routes>
        </div>
      ))}

      {!keepAlive && (
        <div className="route-page-layer" key={key}>
          <Routes location={location}>
            <Route path="/import" element={<ImportCourse />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/ai" element={<AiModule />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pets" element={<Pets />} />
          </Routes>
        </div>
      )}
    </ActivePathContext.Provider>
  );
}

function DesktopPetApp() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <DesktopPetWindow />
    </Suspense>
  );
}

function MainApp() {
  const settingsCtx = useSettingsProvider();
  const updaterCtx = useUpdaterProvider();
  useStartupUpdateCheck(updaterCtx);

  return (
    <SettingsContext.Provider value={settingsCtx}>
      <UpdaterContext.Provider value={updaterCtx}>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <KeepAliveRoutes />
          </Suspense>
        </AppShell>
        <ReleaseNotesDialog />
        <UpdateBanner />
      </UpdaterContext.Provider>
    </SettingsContext.Provider>
  );
}

function App() {
  const location = useLocation();
  const isPreviewAiModule = location.pathname === "/preview/ai";
  const isDesktopPetWindow = location.pathname === "/desktop-pet";

  if (isPreviewAiModule) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PreviewAiModule />
      </Suspense>
    );
  }

  return isDesktopPetWindow ? <DesktopPetApp /> : <MainApp />;
}

export default App;
