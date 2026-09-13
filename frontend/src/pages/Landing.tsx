import { Link } from "react-router-dom";
import {
  Eye,
  MessageSquareHeart,
  Shield,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken } from "@/api/client";

export default function Landing() {
  const signedIn = Boolean(getToken());

  return (
    <div className="relative overflow-hidden">
      <div className="sakura-orb -left-24 -top-16 size-72 bg-primary/25" />
      <div className="sakura-orb -right-10 top-24 size-80 bg-secondary" />
      <div className="petal left-[12%] top-28" />
      <div className="petal delay-700 left-[78%] top-40" />
      <div className="petal delay-1000 left-[55%] top-16" />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-accent text-lg text-primary">promptpilot</span>
          </Link>
          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild>
                <Link to="/studio">Open studio</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Start building</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="font-accent text-primary">chat a site into bloom</p>
            <h1 className="font-display mt-2 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Describe it.
              <span className="block text-primary">Watch it live.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              PromptPilot is a soft little studio: talk to an agent, and a real
              preview grows on the right. No local files. Just your idea, a
              sandbox, and a site.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={signedIn ? "/studio" : "/register"}>
                  <Wand2 />
                  {signedIn ? "Back to projects" : "Create your studio"}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Light theme. Live iframe. Agent tools you can actually read.
            </p>
          </div>

          <div className="floaty relative">
            <div className="absolute -left-6 -top-6 size-24 rounded-full bg-accent/80 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-32px_rgba(244,114,182,0.55)]">
              <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                <span className="size-2.5 rounded-full bg-rose-300" />
                <span className="size-2.5 rounded-full bg-amber-300" />
                <span className="size-2.5 rounded-full bg-emerald-300" />
                <span className="font-accent ml-2 text-xs text-muted-foreground">
                  sakura café
                </span>
              </div>
              <div className="grid min-h-[320px] sm:grid-cols-[0.9fr_1.2fr]">
                <div className="space-y-3 border-r border-border bg-card p-4">
                  <div className="ml-6 rounded-2xl rounded-br-md bg-primary px-3 py-2 text-xs text-primary-foreground">
                    Make a pastel café landing page
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <p className="font-accent text-[10px] text-primary">thinking</p>
                    Sketching a warm storefront…
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Write App.jsx ✓
                      </span>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        Read index.css ✓
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-[linear-gradient(180deg,oklch(0.95_0.03_350),oklch(0.99_0.01_95))] p-5">
                  <p className="font-accent text-primary text-xs">open · 8–4</p>
                  <h2 className="font-display text-2xl font-bold">Hana Café</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Matcha, soft bread, rainy-day windows.
                  </p>
                  <div className="mt-4 h-24 rounded-2xl bg-white/70 shadow-inner" />
                  <div className="mt-3 h-8 w-28 rounded-full bg-primary/80" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: MessageSquareHeart,
                title: "Chat, don’t wrangle files",
                body: "Ask for a landing page, a color shift, a new section. The agent edits the live project.",
              },
              {
                icon: Eye,
                title: "Preview on the right",
                body: "A real Vite app in a sandbox iframe. It reloads when the site actually changes.",
              },
              {
                icon: Shield,
                title: "Kept for you",
                body: "Each project has its own sandbox. Snapshots remember the last good bloom.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-border bg-card/80 p-6 shadow-[0_18px_50px_-28px_rgba(244,114,182,0.45)]"
              >
                <item.icon className="mb-3 size-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-border bg-card/50 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <p className="font-accent text-primary">three soft steps</p>
            <h2 className="font-display mt-1 text-3xl font-bold">How a project grows</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                { n: "01", t: "Open a canvas", d: "Start a project. We spin a sandbox and a blank React site." },
                { n: "02", t: "Tell it a feeling", d: "Type the vibe. The agent reads, writes, and patches files." },
                { n: "03", t: "See it instantly", d: "The preview wakes on the right. Tweak until it sings." },
              ].map((step) => (
                <li key={step.n} className="relative">
                  <p className="font-display text-4xl font-extrabold text-primary/30">
                    {step.n}
                  </p>
                  <h3 className="font-display mt-2 text-xl font-semibold">{step.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight">
            Ready when the idea is.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Make a café, a portfolio, a tiny shop. PromptPilot keeps the
            preview honest and the chat kind.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to={signedIn ? "/studio" : "/register"}>
              {signedIn ? "Open studio" : "Start free"}
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center">
        <p className="font-accent text-sm text-primary">promptpilot</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A light studio for sites that bloom.
        </p>
      </footer>
    </div>
  );
}
