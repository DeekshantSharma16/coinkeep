import { createFileRoute } from "@tanstack/react-router";
import { Compass, Wallet, PiggyBank, CreditCard, Target, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/lib/finance-store";
import { currentMonthKey } from "@/lib/finance-utils";
import { monthTotals, surplusAndScenarios, type Allocation } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/advisor")({
  head: () => ({
    meta: [
      { title: "Smart Advisor — CoinKeep" },
      {
        name: "description",
        content:
          "Turn this month's surplus into a plan across savings, debt, goals and investments with editable scenarios.",
      },
    ],
  }),
  component: AdvisorPage,
});

const BUCKETS: { key: keyof Allocation; label: string; icon: typeof Wallet }[] = [
  { key: "savings", label: "Cash savings", icon: PiggyBank },
  { key: "debt", label: "Debt payoff", icon: CreditCard },
  { key: "goals", label: "Goals", icon: Target },
  { key: "invest", label: "Investing", icon: LineChart },
];

function AdvisorPage() {
  const { transactions, settings, format, ready } = useFinance();
  const current = useMemo(
    () => monthTotals(transactions, currentMonthKey(), settings.monthlyIncome),
    [transactions, settings.monthlyIncome],
  );
  const { surplus, scenarios } = useMemo(() => surplusAndScenarios(current), [current]);

  const [scenarioId, setScenarioId] = useState("balanced");
  const [pct, setPct] = useState<Allocation>(
    () => scenarios.find((s) => s.id === "balanced")!.split,
  );

  function pickScenario(id: string) {
    setScenarioId(id);
    const s = scenarios.find((x) => x.id === id);
    if (s) setPct(s.split);
  }

  function setBucket(key: keyof Allocation, value: number) {
    setScenarioId("custom");
    setPct((prev) => ({ ...prev, [key]: value / 100 }));
  }

  const totalPct = BUCKETS.reduce((a, b) => a + pct[b.key], 0);

  if (!ready) {
    return (
      <AppShell title="Smart advisor">
        <div className="panel h-64 animate-pulse" />
      </AppShell>
    );
  }

  const activeScenario = scenarios.find((s) => s.id === scenarioId);

  return (
    <AppShell title="Smart advisor" subtitle="Put this month's surplus to work">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">Monthly surplus</p>
            <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{format(surplus)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Income {format(current.income)} − expenses {format(current.expense)}
          </p>
        </section>

        <section className="panel p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="size-4 text-primary" /> Choose a strategy
          </h2>
          <Tabs value={scenarioId === "custom" ? "" : scenarioId} className="mt-3">
            <TabsList>
              {scenarios.map((s) => (
                <TabsTrigger key={s.id} value={s.id} onClick={() => pickScenario(s.id)}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="mt-3 text-sm text-muted-foreground">
            {scenarioId === "custom"
              ? "Custom mix — adjust the sliders below to fit your priorities."
              : activeScenario?.description}
          </p>
        </section>
      </div>

      {surplus <= 0 ? (
        <div className="panel mt-4 p-8 text-center text-sm text-muted-foreground">
          You have no surplus this month — expenses are at or above income. Focus on trimming
          spending before allocating.
        </div>
      ) : (
        <section className="panel mt-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Allocation plan</h3>
            <span
              className={`text-sm tabular-nums ${
                Math.abs(totalPct - 1) < 0.001 ? "text-muted-foreground" : "text-[var(--warning)]"
              }`}
            >
              {(totalPct * 100).toFixed(0)}% allocated
            </span>
          </div>

          <div className="mt-4 space-y-5">
            {BUCKETS.map(({ key, label, icon: Icon }) => {
              const share = pct[key];
              const amount = surplus * share;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" /> {label}
                    </span>
                    <span className="tabular-nums">
                      {format(amount)}{" "}
                      <span className="text-muted-foreground">({(share * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                  <Slider
                    className="mt-2"
                    value={[Math.round(share * 100)]}
                    max={100}
                    step={5}
                    onValueChange={(v) => setBucket(key, v[0] ?? 0)}
                  />
                </div>
              );
            })}
          </div>

          {Math.abs(totalPct - 1) >= 0.001 ? (
            <p className="mt-4 text-xs text-[var(--warning)]">
              Your allocations add up to {(totalPct * 100).toFixed(0)}%. Adjust so they total 100%
              to spend the full surplus.
            </p>
          ) : null}
        </section>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        These recommendations are educational and general in nature, generated from your recorded
        data. They are not guaranteed or personalized financial advice.
      </p>
    </AppShell>
  );
}
