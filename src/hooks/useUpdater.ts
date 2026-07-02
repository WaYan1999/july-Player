import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdaterState {
  status: UpdaterStatus;
  version?: string;
  currentVersion?: string;
  notes?: string;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  lastCheckedAt?: number;
  error?: string;
}

export interface UpdaterApi extends UpdaterState {
  check: (opts?: { silent?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
  dismissed: boolean;
}

const initialState: UpdaterState = {
  status: "idle",
  progress: 0,
};

const UPDATE_CHECK_TIMEOUT_MS = 5000;
const SILENT_UPDATE_CHECK_TIMEOUT_MS = 3000;
const STARTUP_UPDATE_CHECK_DELAY_MS = 1800;
const PERIODIC_UPDATE_CHECK_MS = 6 * 60 * 60 * 1000;
const FOCUS_UPDATE_CHECK_COOLDOWN_MS = 30 * 60 * 1000;

export function useUpdaterProvider(): UpdaterApi {
  const [state, setState] = useState<UpdaterState>(initialState);
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<Update | null>(null);
  const totalBytesRef = useRef(0);
  const downloadedBytesRef = useRef(0);
  const checkingRef = useRef(false);
  const installingRef = useRef(false);

  const runCheck = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (checkingRef.current || installingRef.current) return;
    checkingRef.current = true;
    try {
      if (!silent) setDismissed(false);
      setState((s) => ({ ...s, status: silent ? s.status : "checking", error: undefined }));
      const update = await check({
        timeout: silent ? SILENT_UPDATE_CHECK_TIMEOUT_MS : UPDATE_CHECK_TIMEOUT_MS,
      });
      if (!update) {
        updateRef.current = null;
        setState((s) => ({
          ...s,
          status: silent && s.status === "idle" ? "idle" : "up-to-date",
          version: undefined,
          notes: undefined,
          progress: 0,
          downloadedBytes: undefined,
          totalBytes: undefined,
          lastCheckedAt: Date.now(),
        }));
        return;
      }
      updateRef.current = update;
      setDismissed(false);
      setState({
        status: "available",
        version: update.version,
        currentVersion: update.currentVersion,
        notes: update.body ?? undefined,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: undefined,
        lastCheckedAt: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((s) => ({
        ...s,
        status: silent ? s.status : "error",
        error: message,
        lastCheckedAt: Date.now(),
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update || installingRef.current) return;
    installingRef.current = true;
    try {
      setDismissed(false);
      totalBytesRef.current = 0;
      downloadedBytesRef.current = 0;
      setState((s) => ({
        ...s,
        status: "downloading",
        progress: 0,
        downloadedBytes: 0,
        totalBytes: undefined,
        error: undefined,
      }));
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytesRef.current = event.data.contentLength ?? 0;
          downloadedBytesRef.current = 0;
          setState((s) => ({
            ...s,
            progress: 0,
            downloadedBytes: 0,
            totalBytes: totalBytesRef.current || undefined,
          }));
        } else if (event.event === "Progress") {
          downloadedBytesRef.current += event.data.chunkLength;
          const total = totalBytesRef.current;
          const progress = total > 0 ? downloadedBytesRef.current / total : 0;
          setState((s) => ({
            ...s,
            progress,
            downloadedBytes: downloadedBytesRef.current,
            totalBytes: total || undefined,
          }));
        } else if (event.event === "Finished") {
          setState((s) => ({
            ...s,
            status: "ready",
            progress: 1,
            downloadedBytes: totalBytesRef.current || downloadedBytesRef.current,
            totalBytes: totalBytesRef.current || downloadedBytesRef.current || undefined,
          }));
        }
      });
      await relaunch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, status: "error", error: message }));
    } finally {
      installingRef.current = false;
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { ...state, check: runCheck, install, dismiss, dismissed };
}

export const UpdaterContext = createContext<UpdaterApi | null>(null);

export function useUpdater(): UpdaterApi {
  const ctx = useContext(UpdaterContext);
  if (!ctx) throw new Error("useUpdater must be used within UpdaterContext.Provider");
  return ctx;
}

export function useStartupUpdateCheck(api: UpdaterApi) {
  const apiRef = useRef(api);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    let lastAttemptAt = 0;

    const runSilentCheck = () => {
      if (cancelled) return;
      const current = apiRef.current;
      if (
        current.status === "checking" ||
        current.status === "available" ||
        current.status === "downloading" ||
        current.status === "ready"
      ) {
        return;
      }
      lastAttemptAt = Date.now();
      current.check({ silent: true }).catch(() => {});
    };

    const startupTimer = window.setTimeout(runSilentCheck, STARTUP_UPDATE_CHECK_DELAY_MS);
    const periodicTimer = window.setInterval(runSilentCheck, PERIODIC_UPDATE_CHECK_MS);
    const onFocus = () => {
      if (Date.now() - lastAttemptAt < FOCUS_UPDATE_CHECK_COOLDOWN_MS) return;
      runSilentCheck();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      onFocus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(startupTimer);
      window.clearInterval(periodicTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
