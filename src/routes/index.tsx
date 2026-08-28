import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Lock, PiggyBank, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoinKeep — Money Tracker for Everyone" },
      {
        name: "description",
        content:
          "Track income and expenses, set monthly budgets, plan bills and grow savings with CoinKeep's private finance dashboard.",
      },
      { property: "og:title", content: "CoinKeep — Money Tracker for Everyone" },
      {
        property: "og:description",
        content: "Budgets, cashflow insights and savings goals in one secure dashboard.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Wallet,
    title: "Every transaction, organised",
    text: "Income and expenses with categories, merchants, tags, payment methods and notes.",
  },
  {
    icon: BarChart3,
    title: "Answers, not spreadsheets",
    text: "Savings rate, month-over-month comparisons, category breakdowns and spending trends.",
  },
  {
    icon: PiggyBank,
    title: "Budgets and goals",
    text: "Monthly and per-category budgets with warnings before you overspend.",
  },
  {
    icon: Lock,
    title: "Private by account",
    text: "Real authentication with strict isolation — your records are only visible to you.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="CoinKeep" className="size-9 rounded-xl" />
          <span className="font-display text-lg font-semibold tracking-tight">CoinKeep</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="brand" size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 lg:pt-20">
        <p className="text-sm font-medium text-primary">For personal, business, family & more</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight lg:text-6xl">
          Know exactly how you're doing financially this month.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          CoinKeep turns your day-to-day spending into a clear picture: balance, savings rate,
          budget health, upcoming bills and where the money actually went.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="brand" size="lg">
            <Link to="/auth">Create your free account</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="size-4" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        CoinKeep · money tracker for personal, business & more
      </footer>
    </main>
  );
}
