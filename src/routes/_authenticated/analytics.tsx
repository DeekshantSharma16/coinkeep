import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import {
  byMonth,
  categoryTotals,
  CATEGORY_COLOR,
  currentMonthKey,
  lastNMonths,
  monthLabel,
  sum,
  useFinance,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CoinKeep" },
      {
        name: "description",
        content:
          "Month-over-month comparisons, top spending categories, weekday patterns and automated insights.",
      },
      { property: "og:title", content: "Analytics — CoinKeep" },
      {
        property: "og:description",
        content: "Spending patterns, category leaders and automated insights.",
      },
    ],
  }),
  component: Analytics,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Analytics() {
  const { expenses, format, settings } = useFinance();

  const months = lastNMonths(6);
  const monthly = months.map((m) => ({
    month: monthLabel(m),
    total: Math.round(sum(byMonth(expenses, m)) * 100) / 100,
  }));

  const top = categoryTotals(expenses).slice(0, 7);

  const weekday = DAYS.map((day, i) => ({
    day,
    total:
      Math.round(
        sum(expenses.filter((e) => new Date(e.date + "T00:00:00").getDay() === i)) * 100,
      ) / 100,
  }));

  const thisMonth = byMonth(expenses, currentMonthKey());
  const avgTicket = thisMonth.length ? sum(thisMonth) / thisMonth.length : 0;
  const busiestDay = [...weekday].sort((a, b) => b.total - a.total)[0];
  const leader = top[0];
  const prev = monthly[monthly.length - 2]?.total ?? 0;
  const curr = monthly[monthly.length - 1]?.total ?? 0;
  const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  const incomeShare =
    settings.monthlyIncome > 0 ? (curr / settings.monthlyIncome) * 100 : 0;

  const insights = [
    leader ? `${leader.category} is your largest lifetime category at ${format(leader.total)}.` : null,
    busiestDay && busiestDay.total > 0
      ? `You spend the most on ${busiestDay.day}s — ${format(busiestDay.total)} in total.`
      : null,
    prev > 0
      ? `This month is ${Math.abs(change).toFixed(1)}% ${change >= 0 ? "higher" : "lower"} than last month.`
      : null,
    thisMonth.length
      ? `Average transaction size this month is ${format(avgTicket)} across ${thisMonth.length} entries.`
      : null,
    settings.monthlyIncome > 0
      ? `Spending consumes ${incomeShare.toFixed(0)}% of your declared monthly income.`
      : null,
  ].filter(Boolean) as string[];

  const tooltip = {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      color: "var(--popover-foreground)",
    },
  };

  return (
    <AppShell title="Analytics" subtitle="Patterns across your spending history">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Month over month</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: -18, right: 6, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...tooltip} formatter={(v: number) => format(v)} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Top categories</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ left: 40, right: 12 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={110}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip {...tooltip} formatter={(v: number) => format(v)} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {top.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLOR[c.category] ?? "var(--chart-5)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Weekday pattern</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekday} margin={{ left: -18, right: 6, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...tooltip} formatter={(v: number) => format(v)} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Automated insights</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {insights.map((i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground"
              >
                {i}
              </li>
            ))}
            {insights.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Add a few expenses to unlock insights.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
