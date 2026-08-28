import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Trophy, Receipt, ClipboardList } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Wallet, PiggyBank, TrendingUp } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { currentMonthKey, monthLongLabel, percentChange, shiftMonth } from "@/lib/finance-utils";
import { buildMonthlyReview } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Monthly Review — CoinKeep" },
      {
        name: "description",
        content:
          "A month-end summary: income, expenses, savings rate, top categories, budget performance and recommended actions.",
      },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { transactions, budgets, goals, rules, settings, format, ready } = useFinance();
  const [month, setMonth] = useState(currentMonthKey());

  if (!ready) {
    return (
      <AppShell title="Monthly review">
        <div className="panel h-64 animate-pulse" />
      </AppShell>
    );
  }

  const review = buildMonthlyReview({
    transactions,
    budgets,
    goals,
    rules,
    monthKey: month,
    fallbackIncome: settings.monthlyIncome,
  });

  const spendDelta = percentChange(review.totals.expense, review.prev.expense);
  const isCurrent = month === currentMonthKey();

  return (
    <AppShell
      title="Monthly review"
      subtitle="Your month in numbers"
      actions={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{monthLongLabel(month)}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={isCurrent}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Income" value={format(review.totals.income)} icon={TrendingUp} />
        <StatCard
          label="Expenses"
          value={format(review.totals.expense)}
          icon={Wallet}
          delta={spendDelta}
          invertDelta
          hint="vs prev month"
        />
        <StatCard label="Saved" value={format(review.totals.saved)} icon={PiggyBank} />
        <StatCard
          label="Savings rate"
          value={`${review.totals.savingsRate.toFixed(0)}%`}
          icon={PiggyBank}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Top categories</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {review.topCategories.map((c) => (
              <li key={c.category} className="flex items-center justify-between">
                <span className="text-muted-foreground">{c.category}</span>
                <span className="tabular-nums">{format(c.total)}</span>
              </li>
            ))}
            {review.topCategories.length === 0 ? (
              <li className="text-muted-foreground">No spending recorded this month.</li>
            ) : null}
          </ul>
          {review.largest ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <Receipt className="size-4 text-primary" />
              <span>
                Largest expense: <span className="font-medium">{review.largest.title}</span> ·{" "}
                {format(review.largest.amount)}
              </span>
            </div>
          ) : null}
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Budget performance</h2>
          {review.budgetPerformance.total > 0 ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {review.budgetPerformance.onTrack} of {review.budgetPerformance.total} budgets kept
                within limit.
              </p>
              <Progress
                className="mt-3 h-2"
                value={(review.budgetPerformance.onTrack / review.budgetPerformance.total) * 100}
              />
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No budgets set for this month.</p>
          )}

          <h3 className="mt-6 font-medium">Goal progress</h3>
          <div className="mt-3 space-y-3">
            {review.goalProgress.slice(0, 4).map((g) => (
              <div key={g.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{g.name}</span>
                  <span className="tabular-nums">{g.pct.toFixed(0)}%</span>
                </div>
                <Progress className="mt-1 h-1.5" value={g.pct} />
              </div>
            ))}
            {review.goalProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-4 text-primary" /> Savings opportunities
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {review.opportunities.length > 0 ? (
              review.opportunities.map((o, i) => <li key={i}>· {o}</li>)
            ) : (
              <li>Nothing obvious to cut — your spending looks controlled this month.</li>
            )}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="size-4 text-primary" /> Recommended actions
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {review.actions.length > 0 ? (
              review.actions.map((a, i) => (
                <li key={i}>
                  {i + 1}. {a}
                </li>
              ))
            ) : (
              <li>You're on track. Keep doing what you're doing.</li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
