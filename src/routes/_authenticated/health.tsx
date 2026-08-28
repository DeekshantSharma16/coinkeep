import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, HeartPulse, TriangleAlert, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useFinance } from "@/lib/finance-store";
import { buildHealthReport } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({
    meta: [
      { title: "Financial Health — CoinKeep" },
      {
        name: "description",
        content:
          "A 0–100 financial health score from your savings rate, budgets, goals and fixed costs, with what to improve next.",
      },
    ],
  }),
  component: HealthPage,
});

const statusColor: Record<string, string> = {
  good: "text-primary",
  ok: "text-[var(--warning)]",
  poor: "text-destructive",
};

function HealthPage() {
  const { transactions, budgets, rules, goals, settings, ready } = useFinance();

  if (!ready) {
    return (
      <AppShell title="Financial health">
        <div className="panel h-64 animate-pulse" />
      </AppShell>
    );
  }

  const report = buildHealthReport({
    transactions,
    budgets,
    rules,
    goals,
    monthlyIncomeTarget: settings.monthlyIncome,
  });

  if (!report) {
    return (
      <AppShell title="Financial health" subtitle="Your overall financial score">
        <EmptyState />
      </AppShell>
    );
  }

  const ring = Math.round((report.score / 100) * 360);

  return (
    <AppShell title="Financial health" subtitle="A single score across eight factors">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel flex flex-col items-center justify-center p-8 text-center">
          <div
            className="grid size-44 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${ring}deg, var(--secondary) 0deg)`,
            }}
          >
            <div className="grid size-36 place-items-center rounded-full bg-card">
              <div>
                <p className="font-display text-5xl font-semibold tabular-nums">{report.score}</p>
                <p className="text-sm text-muted-foreground">out of 100</p>
              </div>
            </div>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            <HeartPulse className="size-4 text-primary" /> {report.band}
          </p>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Score breakdown</h2>
          <p className="text-sm text-muted-foreground">Each factor is weighted into your score.</p>
          <div className="mt-4 space-y-4">
            {report.factors.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.label}</span>
                  <span className={`tabular-nums ${statusColor[f.status]}`}>
                    {Math.round(f.score)}/100
                  </span>
                </div>
                <Progress value={f.score} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">{f.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-primary" /> What's going well
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {report.wins.length > 0 ? (
              report.wins.map((w, i) => <li key={i}>· {w}</li>)
            ) : (
              <li>No standout strengths yet — keep building history.</li>
            )}
          </ul>
        </section>

        <section className="panel p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4 text-destructive" /> What's hurting the score
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {report.risks.length > 0 ? (
              report.risks.map((r, i) => <li key={i}>· {r}</li>)
            ) : (
              <li>Nothing pulling you down right now. Nice.</li>
            )}
          </ul>
        </section>

        <section className="panel p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <ArrowUpRight className="size-4 text-primary" /> What to improve next
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {report.next.length > 0 ? (
              report.next.map((n, i) => (
                <li key={i}>
                  {i + 1}. {n}
                </li>
              ))
            ) : (
              <li>You're in great shape — maintain your current habits.</li>
            )}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        This score is a general, educational indicator based on your recorded data — not
        professional financial advice.
      </p>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center justify-center gap-2 p-12 text-center">
      <HeartPulse className="size-8 text-muted-foreground" />
      <p className="font-medium">Not enough data yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Add a few income and expense transactions and we'll calculate your financial health score
        across savings, budgets, goals and fixed costs.
      </p>
    </div>
  );
}
