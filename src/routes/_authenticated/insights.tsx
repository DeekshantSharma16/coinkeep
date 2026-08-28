import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb, TrendingUp, TrendingDown, Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useFinance } from "@/lib/finance-store";
import { buildInsights, type Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — CoinKeep" },
      {
        name: "description",
        content:
          "Data-backed observations about category changes, weekend spending, subscriptions and savings opportunities.",
      },
    ],
  }),
  component: InsightsPage,
});

const toneStyle: Record<Insight["tone"], { border: string; icon: typeof Info }> = {
  positive: { border: "border-primary/40 bg-primary/5", icon: TrendingUp },
  warning: { border: "border-destructive/40 bg-destructive/5", icon: TrendingDown },
  neutral: { border: "border-border", icon: Info },
};

function InsightsPage() {
  const { transactions, rules, settings, ready } = useFinance();

  if (!ready) {
    return (
      <AppShell title="Insights">
        <div className="panel h-48 animate-pulse" />
      </AppShell>
    );
  }

  const insights = buildInsights(transactions, rules, settings.monthlyIncome);

  return (
    <AppShell title="Insights" subtitle="What your spending is telling you">
      {insights.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Lightbulb className="size-8 text-muted-foreground" />
          <p className="font-medium">No insights yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Once you've logged a bit more activity across a couple of months, we'll surface
            meaningful patterns here. We won't invent insights from thin data.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((i) => {
            const style = toneStyle[i.tone];
            const Icon = style.icon;
            return (
              <div key={i.id} className={cn("rounded-xl border p-5", style.border)}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
