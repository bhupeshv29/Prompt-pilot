import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  MessageSquareHeart,
  Shield,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getToken } from "@/api/client";

type Sample = {
  name: string;
  tag: string;
  img: string;
  alt: string;
};

const samples: Sample[] = [
  {
    name: "Hana Café",
    tag: "café landing",
    img: "/samples/cafe.jpg",
    alt: "Cozy café website hero",
  },
  {
    name: "Mono Folio",
    tag: "photo portfolio",
    img: "/samples/portfolio.jpg",
    alt: "Photographer portfolio website",
  },
  {
    name: "Fern & Co",
    tag: "plant shop",
    img: "/samples/plants.jpg",
    alt: "Plant shop website",
  },
  {
    name: "Tidepool",
    tag: "travel journal",
    img: "/samples/travel.jpg",
    alt: "Travel journal website",
  },
  {
    name: "Atelier North",
    tag: "design agency",
    img: "/samples/agency.jpg",
    alt: "Design agency website",
  },
  {
    name: "Kiln & Crumb",
    tag: "bakery site",
    img: "/samples/bakery.jpg",
    alt: "Bakery website",
  },
];

function SampleCard({ sample }: { sample: Sample }) {
  return (
    <figure className="mr-5 w-64 shrink-0 overflow-hidden rounded-3xl border border-border bg-card text-left shadow-[0_18px_50px_-28px_rgba(244,114,182,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
        <span className="size-2 rounded-full bg-rose-300" />
        <span className="size-2 rounded-full bg-amber-300" />
        <span className="size-2 rounded-full bg-emerald-300" />
        <span className="font-accent ml-1 truncate text-[10px] text-muted-foreground">
          {sample.name}
        </span>
      </div>
      <img
        src={sample.img}
        alt={sample.alt}
        loading="lazy"
        className="h-36 w-full bg-muted object-cover"
      />
      <figcaption className="flex items-baseline justify-between gap-2 px-3 py-2">
        <span className="font-display truncate text-sm font-semibold">
          {sample.name}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {sample.tag}
        </span>
      </figcaption>
    </figure>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const signedIn = Boolean(getToken());
  const [prompt, setPrompt] = useState("");

  function submitPrompt() {
    const text = prompt.trim();
    if (!text) return;
    sessionStorage.setItem("pendingPrompt", text);
    navigate(signedIn ? "/studio" : "/login");
  }

  return (
    <div className="relative overflow-hidden">
      <div className="sakura-orb -left-24 -top-16 size-72 bg-primary/25" />
      <div className="sakura-orb -right-6 top-32 size-40 bg-secondary" />
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
        <section className="mx-auto max-w-3xl px-5 py-16 text-center lg:py-24">
          <p className="font-accent text-primary">chat a site into bloom</p>
          <h1 className="font-display mt-2 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Describe it.
            <span className="block text-primary">Watch it live.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
            PromptPilot is a soft little studio: talk to an agent, and a real
            preview blooms in your studio. No local files. Just your idea, a
            sandbox, and a site.
          </p>

          <div className="relative mx-auto mt-8 max-w-2xl text-left">
            <div className="relative rounded-[2rem] border border-border bg-card/90 p-4 shadow-[0_30px_80px_-32px_rgba(244,114,182,0.55)] sm:p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPrompt();
                }}
              >
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitPrompt();
                    }
                  }}
                  placeholder="Describe your dream website…"
                  rows={3}
                />
                <div className="mt-2 flex justify-center">
                  <Button type="submit" disabled={!prompt.trim()}>
                    <Wand2 />
                    {signedIn ? "Build it" : "Sign in to build"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/studio" : "/register"}>
                <Wand2 />
                {signedIn ? "Back to projects" : "Create your studio"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#demo">Watch demo</a>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Light theme. Live iframe. Agent tools you can actually read.
          </p>
        </section>

        <section id="demo" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-4">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-[0_30px_80px_-32px_rgba(244,114,182,0.55)]">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-rose-300" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-emerald-300" />
              <span className="font-accent ml-2 truncate text-xs text-muted-foreground">
                promptpilot — demo
              </span>
            </div>
            <video
              src="/PromptPilot.mp4"
              className="aspect-video w-full bg-muted object-cover"
              controls
              muted
              loop
              playsInline
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Watch PromptPilot turn a prompt into a live site — in under a minute.
          </p>
        </section>

        <section id="samples" className="scroll-mt-24 overflow-hidden py-16">
          <div className="mx-auto max-w-6xl px-5 text-center">
            <p className="font-accent text-primary">fresh from the studio</p>
            <h2 className="font-display mt-1 text-3xl font-bold">
              Sites people grew
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              A few flavors of what a single prompt can bloom into.
            </p>
          </div>
          <div className="marquee mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="animate-marquee flex w-max">
              {[...samples, ...samples].map((s, i) => (
                <SampleCard key={`${s.name}-${i}`} sample={s} />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16">
          <div className="mb-8 text-center">
            <p className="font-accent text-primary">soft by design</p>
            <h2 className="font-display mt-1 text-3xl font-bold">
              Made for easy growing
            </h2>
          </div>
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
                className="rounded-3xl border border-border bg-card/80 p-6 shadow-[0_18px_50px_-28px_rgba(244,114,182,0.45)] transition hover:-translate-y-1"
              >
                <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-primary/10">
                  <item.icon className="size-5 text-primary" />
                </span>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24 border-y border-border bg-card/50 py-16">
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

        <section id="start" className="mx-auto max-w-4xl scroll-mt-24 px-5 py-20 text-center">
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

      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <span className="font-accent text-lg text-primary">promptpilot</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A light studio for sites that bloom. Chat with an agent, watch
              a real preview grow.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              All systems blooming
            </p>
          </div>
          <nav>
            <p className="font-accent text-sm text-primary">studio</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground hover:underline" to="/studio">
                  Open studio
                </Link>
              </li>
              <li>
                <a className="text-muted-foreground hover:text-foreground hover:underline" href="#samples">
                  Sample sites
                </a>
              </li>
              <li>
                <a className="text-muted-foreground hover:text-foreground hover:underline" href="#how">
                  How it works
                </a>
              </li>
            </ul>
          </nav>
          <nav>
            <p className="font-accent text-sm text-primary">account</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground hover:underline" to="/login">
                  Sign in
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground hover:underline" to="/register">
                  Start building
                </Link>
              </li>
            </ul>
          </nav>
          <nav>
            <p className="font-accent text-sm text-primary">explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a className="text-muted-foreground hover:text-foreground hover:underline" href="#features">
                  Features
                </a>
              </li>
              <li>
                <a className="text-muted-foreground hover:text-foreground hover:underline" href="#start">
                  Get started
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border/70">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} promptpilot</p>
            <p className="font-accent text-sm text-primary">grown, not built.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
