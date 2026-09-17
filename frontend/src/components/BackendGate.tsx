import type { ReactNode } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackendStatus } from "@/hooks/useBackendStatus";

export default function BackendGate({ children }: { children: ReactNode }) {
  const { state, attempt, retry } = useBackendStatus();

  if (state === "ready") return <>{children}</>;

  const failed = state === "failed";

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5">
      <div className="sakura-orb -left-24 -top-16 size-72 bg-primary/25" />
      <div className="sakura-orb -right-6 top-32 size-40 bg-secondary" />

      <div className="relative w-full max-w-sm rounded-[2rem] border border-border bg-card/90 p-8 text-center shadow-[0_30px_80px_-32px_rgba(244,114,182,0.55)]">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          {failed ? <RefreshCw className="size-5" /> : <Sparkles className="size-5" />}
        </span>
        <p className="font-accent mt-4 text-primary">
          {failed ? "backend is sleepy" : "waking up backend…"}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">
          {failed ? "Backend is still asleep" : "Warming up Render…"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {failed
            ? "Render free tier took too long to wake. Hit retry to ping /health again."
            : "Render sleeps when idle. First load takes ~30–60s. " +
              (attempt > 0 ? `Attempt ${attempt}…` : "Pinging /health…")}
        </p>

        {failed ? (
          <Button onClick={retry} className="mt-5">
            <RefreshCw />
            Retry
          </Button>
        ) : (
          <Loader2 className="mx-auto mt-5 size-6 animate-spin text-primary" />
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          status: {failed ? "failed" : "waking up"} · pinging /health
        </p>
      </div>
    </div>
  );
}
