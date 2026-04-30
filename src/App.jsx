import React, { useEffect, useMemo, useState } from "react";

/**
 * Self-contained, preview-friendly React presentation app.
 * Fixes vs. your snippet:
 * - Removes path-alias imports ("@/components/ui/*") by inlining Card/Button components
 * - Removes lucide-react + framer-motion dependencies (common cause of preview being greyed out)
 * - Replaces HTML entities (&lt; &gt; &amp;) with valid JSX
 * - Fixes broken newline regex in split() and CSV newline handling
 *
 * Tailwind classes are used for styling (no extra imports required).
 */

const SECTIONS = [
  { id: "home", label: "Intro" },
  { id: "problem", label: "Problem" },
  { id: "approach", label: "Approach" },
  { id: "demo", label: "Demo" },
  { id: "results", label: "Impact" },
  { id: "guardrails", label: "Guardrails" },
  { id: "close", label: "Close" },
];

const sampleJava = `@Test
public void createSalesOrder_shouldSucceed() {
  driver.get(baseUrl + "/login");
  type(By.id("username"), "test.user");
  type(By.id("password"), secret("***"));
  click(By.cssSelector("button[type='submit']"));

  click(By.id("menu-orders"));
  click(By.id("create-order"));
  type(By.id("customer"), "CUST-1001");
  type(By.id("material"), "MAT-011");
  type(By.id("quantity"), "10");
  click(By.id("save"));

  assertText(By.cssSelector(".toast"), "Order created");
}`;

// Demo-only translator. Real workflow: Copilot on your actual repo.
function translateCodeToSteps(code) {
  const lines = code
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const steps = [];
  const push = (action, data = "", expected = "") => {
    if (!action) return;
    steps.push({ Action: action, Data: data, "Expected Result": expected });
  };

  for (const l of lines) {
    if (l.startsWith("driver.get(")) {
      const m = l.match(/driver\.get\((.*)\);/);
      push("Navigate to URL", m ? m[1] : "", "Login page is displayed");
    }

    if (l.startsWith("type(")) {
      const m = l.match(/type\((.*?),\s*(.*?)\);/);
      if (m) {
        const locator = m[1];
        const value = m[2];
        push(`Enter value in field (${locator})`, value, "Value is captured");
      }
    }

    if (l.startsWith("click(")) {
      const m = l.match(/click\((.*?)\);/);
      push(`Click element (${m ? m[1] : ""})`, "", "Action is executed");
    }

    if (l.startsWith("assertText(")) {
      const m = l.match(/assertText\((.*?),\s*(.*?)\);/);
      if (m) {
        push(`Verify text on (${m[1]})`, "", `Text equals ${m[2]}`);
      }
    }
  }

  if (steps.length === 0) {
    push("Review automation code", "", "Test intent is understood");
  }

  return steps;
}

function stepsToCsv(steps) {
  const headers = ["Issue ID", "Summary", "Description", "Test Type", "Priority", "Labels", "Action", "Data", "Expected Result"]; // more Xray-mappable

  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\n") || s.includes('"')
      ? `"${s.replaceAll('"', '""')}"`
      : s;
  };

  const rows = steps.map((s, i) => {
    const summary = `AI as a Test Translator - Step ${i + 1}`;
    const description = "Auto-extracted draft step from Selenium/Java code. Review required.";
    const testType = "Manual";
    const priority = "Medium";
    const labels = "ai,translator,xray";

    // Keep Issue ID blank for create-on-import flows.
    return [
      "",
      summary,
      description,
      testType,
      priority,
      labels,
      s.Action,
      s.Data,
      s["Expected Result"],
    ];
  });

  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

function useActiveSection() {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const handler = () => {
      const positions = SECTIONS.map(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Number.POSITIVE_INFINITY };
        const rect = el.getBoundingClientRect();
        return { id, top: Math.abs(rect.top - 96) };
      });
      positions.sort((a, b) => a.top - b.top);
      if (positions[0]) setActive(positions[0].id);
    };

    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return active;
}

// --- Minimal UI primitives (replacing shadcn/ui path-alias imports) ---
function Card({ className = "", children }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/5 shadow-sm ${className}`}>{children}</div>
  );
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({
  children,
  onClick,
  className = "",
  variant = "default",
  size = "md",
  type = "button",
}) {
  const base =
    "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50 disabled:pointer-events-none";

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };

  const variants = {
    default:
      "bg-white text-black hover:bg-white/90 border border-white/10 shadow-lg shadow-sky-500/10",
    secondary:
      "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function SectionTitle({ kicker, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Pill>✨ {kicker}</Pill>
      </div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm md:text-base text-white/70 max-w-3xl">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Stat({ emoji, label, value, hint }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg">
            {emoji}
          </div>
          <div>
            <div className="text-sm text-white/70">{label}</div>
            <div className="text-xl md:text-2xl font-semibold text-white">{value}</div>
            {hint ? <div className="text-xs text-white/50 mt-1">{hint}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Nav() {
  const active = useActiveSection();

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/60 border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-amber-400 shadow-lg shadow-red-500/20" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">AI as a Test Translator</div>
            <div className="text-[11px] text-white/60">From Selenium code to Xray in minutes</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={
                "px-3 py-2 rounded-xl text-xs transition " +
                (active === s.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5")
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="md:hidden text-xs text-white/70">
          {SECTIONS.find((s) => s.id === active)?.label ?? ""}
        </div>
      </div>
    </div>
  );
}

export default function PresentationSite() {
  const [code, setCode] = useState(sampleJava);
  const [steps, setSteps] = useState(() => translateCodeToSteps(sampleJava));

  const csv = useMemo(() => stepsToCsv(steps), [steps]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-40" />
      </div>

      <Nav />

      <main className="relative mx-auto max-w-4xl px-4 py-10 md:py-14">
        <div className="space-y-14">
            {/* HOME */}
            <section id="home" className="scroll-mt-24">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8 shadow-xl shadow-red-500/10">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Pill>🪄 AI + QA</Pill>
                  <Pill>🌿 Selenium/Java Repo</Pill>
                  <Pill>📄 Xray CSV Import</Pill>
                </div>

                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  AI as a Test Translator:
                  <span className="block text-white/80">From Selenium Code to Xray in Minutes</span>
                </h1>

                <p className="mt-4 text-white/70 max-w-2xl">
                  Our repo contained solid automated coverage, but Xray in Jira didn’t reflect it. We used GitHub Copilot
                  to extract test cases and steps from Selenium + Java code and generate Xray‑ready CSV — closing the
                  automation↔test management gap.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    className="rounded-2xl"
                    onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Start the story →
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Jump to demo
                  </Button>
                </div>

              </div>
            </section>

            {/* PROBLEM */}
            <section id="problem" className="scroll-mt-24">
              <SectionTitle
                kicker="The problem - Tiyani"
                title="The Automation–Xray Mismatch"
                subtitle="We had working Selenium automation in the repo, but not enough aligned test cases in Xray Jira. That creates gaps in traceability, reporting, and audit readiness."
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat emoji="🐞" label="Pain" value="Coverage exists, visibility doesn’t" hint="Automation knowledge locked in code" />
                <Stat emoji="📊" label="Impact" value="Xray reports incomplete" hint="Hard to prove what’s actually tested" />
                <Stat emoji="👥" label="Cost" value="Manual documentation debt" hint="Slow + inconsistent + out of date" />
              </div>

              <Card className="mt-4">
                <CardContent className="p-5">
                  <div className="text-sm text-white/80 font-medium mb-2">What we needed</div>
                  <ul className="text-sm text-white/70 space-y-2 list-disc pl-5">
                    <li>Extract test case intent and steps from existing Selenium + Java tests</li>
                    <li>Produce a consistent CSV structure compatible with Xray Importer</li>
                    <li>Keep humans in control (AI drafts, team validates)</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* APPROACH */}
            <section id="approach" className="scroll-mt-24">
              <SectionTitle
                kicker="The approach - Tiyani"
                title="AI‑Assisted Translation Pipeline"
                subtitle="We used GitHub Copilot to read automation code, extract steps, and output Xray‑ready CSV. No custom models. No complex infrastructure. Just a repeatable prompt + review checklist."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-white font-medium">🌿 Inputs</div>
                    <ul className="mt-3 text-sm text-white/70 space-y-2 list-disc pl-5">
                      <li>Selenium + Java repo</li>
                      <li>Test naming conventions</li>
                      <li>Common helper methods (click/type/assert)</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-white font-medium">📄 Output</div>
                    <ul className="mt-3 text-sm text-white/70 space-y-2 list-disc pl-5">
                      <li>Xray‑friendly CSV with steps</li>
                      <li>Action / Data / Expected Result</li>
                      <li>Ready to import into Jira Xray</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardContent className="p-5">
                  <div className="text-sm text-white/80 font-medium mb-2">Pipeline in one line</div>
                  <div className="rounded-3xl border border-white/10 bg-black/40 p-4 text-sm text-white/70 flex flex-wrap gap-2 items-center">
                    <Pill>Repo code</Pill>
                    <span className="text-white/40">→</span>
                    <Pill>Copilot extracts steps</Pill>
                    <span className="text-white/40">→</span>
                    <Pill>CSV formatted for Xray</Pill>
                    <span className="text-white/40">→</span>
                    <Pill>Import & validate</Pill>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* DEMO */}
            <section id="demo" className="scroll-mt-24">
              <SectionTitle
                kicker="Interactive demo - Vhonani"
                title="Code → Steps → Xray CSV"
                subtitle="This demo simulates the idea: turning automation intent into structured steps. In real life we used Copilot on the actual repo; here we show the concept end‑to‑end in your browser."
              />

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-white">Selenium/Java snippet</div>
                      <Button size="sm" variant="secondary" className="rounded-2xl" onClick={() => setCode(sampleJava)}>
                        Reset sample
                      </Button>
                    </div>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-64 rounded-3xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-white/80 outline-none focus:ring-2 focus:ring-red-400/30"
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <Button className="rounded-2xl" onClick={() => setSteps(translateCodeToSteps(code))}>
                        Translate 🪄
                      </Button>
                      <Button variant="secondary" className="rounded-2xl" onClick={() => copy(code)}>
                        Copy code
                      </Button>
                    </div>

                    <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                      <div className="font-semibold text-white mb-1">Translator rules (demo)</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>driver.get(...) → Navigate</li>
                        <li>type(locator, value) → Enter value</li>
                        <li>click(locator) → Click element</li>
                        <li>assertText(locator, text) → Verify text</li>
                      </ul>
                    </div>

                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-white">Xray-ready CSV preview</div>
                      <Button size="sm" variant="secondary" className="rounded-2xl" onClick={() => copy(csv)}>
                        Copy CSV
                      </Button>
                    </div>
                    <pre className="w-full h-64 overflow-auto rounded-3xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
{csv}
                    </pre>

                    <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                      <div className="font-semibold text-white mb-1">What Xray gets</div>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Summary per step</li>
                        <li>Action, Data, Expected Result columns</li>
                        <li>Plus extra fields ready for mapping (Type/Priority/Labels)</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* RESULTS */}
            <section id="results" className="scroll-mt-24">
              <SectionTitle
                kicker="Impact - Vhonani"
                title="What We Gained"
                subtitle="The goal wasn’t ‘AI magic’ — it was alignment: repo truth represented in Xray for reporting, traceability, and team visibility."
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat emoji="✅" label="Outcome" value="More aligned test cases" hint="Xray reflects what’s in the repo" />
                <Stat emoji="⚡" label="Efficiency" value="Faster documentation" hint="AI drafts, humans validate" />
                <Stat emoji="🔁" label="Sustainability" value="Repeatable workflow" hint="Prompt + checklist + import" />
              </div>

              <Card className="mt-4">
                <CardContent className="p-5">
                  <div className="text-sm font-medium text-white mb-2">A simple success metric (for the team)</div>
                  <div className="text-sm text-white/70">
                    <span className="text-white">Alignment rate</span> = (Automated tests represented in Xray) / (Automated tests in repo)
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* GUARDRAILS */}
            <section id="guardrails" className="scroll-mt-24">
              <SectionTitle
                kicker="Trust & control - Ntuthuko"
                title="Guardrails: AI With Rules"
                subtitle="We treat AI output as a draft. Accountability stays with the team. This keeps quality high and avoids ‘hallucinated’ steps."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-white font-medium">🛡️ Validation checklist</div>
                    <ul className="mt-3 text-sm text-white/70 space-y-2 list-disc pl-5">
                      <li>Does each step map to real code lines?</li>
                      <li>Do the locators / pages match the repo?</li>
                      <li>Are expected results verifiable?</li>
                      <li>Is the CSV structure compatible with Xray importer?</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-white font-medium">👤 Human-in-the-loop roles</div>
                    <ul className="mt-3 text-sm text-white/70 space-y-2 list-disc pl-5">
                      <li>Engineer: confirms technical accuracy</li>
                      <li>Tester/Analyst: confirms test intent & coverage</li>
                      <li>Reviewer: checks import format + consistency</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

            </section>

            {/* CLOSE */}
            <section id="close" className="scroll-mt-24">
              <SectionTitle
                kicker="Close - Ntuthuko"
                title="AI as a Bridge — Not a Replacement"
                subtitle="We didn’t invent new tests. We translated existing automation knowledge into a format the organization can track, report, and trust."
              />

              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-2 flex-wrap md:justify-end">
                    <Button className="rounded-2xl" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}>
                      Re-run demo
                    </Button>
                    <Button variant="secondary" className="rounded-2xl" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                      Back to top
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </section>
          </div>

        {/* Footer */}
        <div className="mt-14 pt-8 border-t border-white/10 text-xs text-white/50">
          Built for a 10‑minute AI challenge demo • Self-contained React + Tailwind (no external UI/icon libs required).
        </div>
      </main>
    </div>
  );
}
