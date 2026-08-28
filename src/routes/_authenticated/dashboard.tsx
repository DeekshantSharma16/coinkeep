import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  PiggyBank,
  Repeat,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  byMonth,
  categoryTotals,
  CATEGORY_COLOR,
  currentMonthKey,
  daysUntil,
  lastNMonths,
  monthLabel,
  monthLongLabel,
  nextOccurrence,
  sum,
  useFinance,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "CoinKeep — Personal Expense Command Center" },
      {
        name: "description",
        content:
          "Track spending, set category budgets and see monthly trends in a clean private expense dashboard.",
      },
      { property: "og:title", content: "CoinKeep — Personal Expense Command Center" },
      {
        property: "og:description",
        content: "Budgets, insights and spending trends in one private dashboard.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { expenses, budgets, settings, incomes, rules, goals, format, ready } = useFinance();

  const thisKey = currentMonthKey();
  const months = lastNMonths(6);
  const prevKey = months[months.length - 2] ?? thisKey;

  const thisMonth = byMonth(expenses, thisKey);
  const prevMonth = byMonth(expenses, prevKey);
  const spent = sum(thisMonth);
  const prevSpent = sum(prevMonth);
  const delta = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;

  const loggedIncome = sum(byMonth(incomes, thisKey));
  const income = loggedIncome > 0 ? loggedIncome : settings.monthlyIncome;

  const saved = Math.max(income - spent, 0);
  const savingsRate = income > 0 ? (saved / income) * 100 : 0;
  const recurring = sum(thisMonth.filter((e) => e.recurring));
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();
  const projected = dayOfMonth > 0 ? (spent / dayOfMonth) * daysInMonth : spent;

  const trend = months.map((m) => ({
    month: monthLabel(m),
    total: Math.round(sum(byMonth(expenses, m)) * 100) / 100,
  }));

  const cats = categoryTotals(thisMonth).slice(0, 6);
  const recent = [...expenses]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  const budgetRows = budgets
    .map((b) => {
      const used = sum(thisMonth.filter((e) => e.category === b.category));
      return { ...b, used, pct: b.limit > 0 ? (used / b.limit) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const overBudget = budgetRows.filter((b) => b.pct >= 100);

  const upcoming = rules
    .filter((r) => r.active && r.lastPostedMonth !== thisKey)
    .map((r) => {
      const next = nextOccurrence(r.dayOfMonth);
      return { rule: r, next, days: daysUntil(next) };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  if (!ready) {
    return (
      <AppShell title="Overview">
        <div className="panel h-64 animate-pulse" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Overview"
      subtitle={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={format(spent)}
          icon={Wallet}
          delta={delta}
          invertDelta
          hint="vs last month"
        />
        <StatCard
          label="Projected month end"
          value={format(projected)}
          icon={CalendarClock}
          hint={`${daysInMonth - dayOfMonth} days remaining`}
        />
        <StatCard
          label="Saved"
          value={format(saved)}
          icon={PiggyBank}
          hint={`${savingsRate.toFixed(0)}% of income`}
        />
        <StatCard
          label="Recurring commitments"
          value={format(recurring)}
          icon={Repeat}
          hint="fixed monthly costs"
        />
      </div>

      <div className="mt-4">
        <QuickActions />
      </div>

      {overBudget.length > 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <TrendingDown className="mt-0.5 size-4 text-destructive" />
          <p>
            <span className="font-medium text-destructive">Budget alert.</span>{" "}
            {overBudget.map((b) => b.category).join(", ")} exceeded the monthly limit.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming bills</h2>
            <Link to="/bills" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {upcoming.map(({ rule, next, days }) => (
              <li key={rule.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{rule.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {next.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                    {days === 0 ? "due today" : `in ${days} days`}
                  </p>
                </div>
                <span className="tabular-nums font-medium">{format(rule.amount)}</span>
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="text-muted-foreground">No bills scheduled.</li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Savings goals</h2>
            <Link to="/goals" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {goals.slice(0, 3).map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{g.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {format(g.saved)} / {format(g.target)}
                  </span>
                </div>
                <Progress value={Math.min(100, (g.saved / g.target) * 100)} className="mt-2" />
              </div>
            ))}
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Spending trend</h2>
              <p className="text-sm text-muted-foreground">Last 6 months</p>
            </div>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number) => format(v)}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Category split</h2>
          <p className="text-sm text-muted-foreground">This month</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cats}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="none"
                >
                  {cats.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLOR[c.category] ?? "var(--chart-5)"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => format(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {cats.map((c) => (
              <li key={c.category} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLOR[c.category] ?? "var(--chart-5)" }}
                  />
                  <span className="truncate text-muted-foreground">{c.category}</span>
                </span>
                <span className="tabular-nums">{format(c.total)}</span>
              </li>
            ))}
            {cats.length === 0 ? (
              <li className="text-muted-foreground">No spending recorded yet.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {e.category} · {e.method}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {e.recurring ? <Badge variant="secondary">Recurring</Badge> : null}
                  <span className="tabular-nums font-medium">{format(e.amount)}</span>
                </div>
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="py-6 text-sm text-muted-foreground">
                Nothing tracked yet — add your first expense.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Budget health</h2>
            <Link to="/budgets" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {budgetRows.map((b) => (
              <div key={b.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.category}</span>
                  <span className="tabular-nums">
                    {format(b.used)} / {format(b.limit)}
                  </span>
                </div>
                <Progress value={Math.min(b.pct, 100)} className="mt-2 h-2" />
              </div>
            ))}
            {budgetRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No budgets set yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
