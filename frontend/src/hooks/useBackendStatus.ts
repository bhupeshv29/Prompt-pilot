import { useCallback, useEffect, useRef, useState } from "react";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BASE = (RAW_BASE ?? "").replace(/\/$/, "");

export type BackendState = "waking" | "ready" | "failed";

export function getHealthUrl(base = BASE) {
  return `${base}/health`;
}

export function useBackendStatus(pollMs = 3000, timeoutMs = 90000) {
  const [state, setState] = useState<BackendState>("waking");
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<number | null>(null);
  const done = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const ping = useCallback(async () => {
    if (done.current) return true;
    if (!BASE) {
      setState("failed");
      return false;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(getHealthUrl(), {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (res.ok) {
        done.current = true;
        setState("ready");
        sessionStorage.setItem("be-awake", "1");
        clearTimer();
        return true;
      }
    } catch {
      // backend still sleeping — retry on next tick
    } finally {
      clearTimeout(t);
    }
    setAttempt((a) => a + 1);
    return false;
  }, []);

  useEffect(() => {
    done.current = false;
    void ping();
    clearTimer();
    timer.current = window.setInterval(() => {
      void ping();
    }, pollMs);
    const killer = window.setTimeout(() => {
      if (!done.current) {
        clearTimer();
        setState((s) => (s === "ready" ? s : "failed"));
      }
    }, timeoutMs);
    return () => {
      clearTimer();
      window.clearTimeout(killer);
    };
  }, [ping, pollMs, timeoutMs]);

  const retry = useCallback(() => {
    sessionStorage.removeItem("be-awake");
    done.current = false;
    setState("waking");
    setAttempt(0);
    void ping();
    clearTimer();
    timer.current = window.setInterval(() => {
      void ping();
    }, pollMs);
  }, [ping, pollMs]);

  return { state, attempt, retry, base: BASE };
}
