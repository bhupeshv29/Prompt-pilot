import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-10">
      <div className="sakura-orb floaty left-[-4rem] top-10 size-52 bg-primary/30" />
      <div className="sakura-orb right-[-3rem] top-24 size-64 bg-secondary" />
      <div className="sakura-orb bottom-[-4rem] left-1/3 size-72 bg-accent" />
      <div className="relative z-10 w-full max-w-[26rem]">{children}</div>
    </div>
  );
}
