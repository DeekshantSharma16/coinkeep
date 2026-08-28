import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Plus, Scale, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  byMonth,
  currentMonthKey,
  INCOME_CATEGORIES,
  lastNMonths,
  monthLabel,
  sum,
  useFinance,
  type Income,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({
    meta: [
      { title: "Income & Cashflow — CoinKeep" },
      {
        name: "description",
        content:
          "Log every income source and compare it against spending to see monthly net cashflow and savings rate.",
      },
      { property: "og:title", content: "Income & Cashflow — CoinKeep" },
      { property: "og:description", content: "Income sources, net cashflow and savings rate." },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const { incomes, expenses, addIncome, removeIncome, format } = useFinance();
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Income["category"]>("Salary");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const month = currentMonthKey();
  const monthIncome = sum(byMonth(incomes, month));
  const monthSpend = sum(byMonth(expenses, month));
  const net = monthIncome - monthSpend;
  const savingsRate = monthIncome > 0 ? (net / monthIncome) * 100 : 0;

  const series = useMemo(
    () =>
      lastNMonths(6).map((key) => ({
        month: monthLabel(key),
        income: Number(sum(byMonth(incomes, key)).toFixed(2)),
        spend: Number(sum(byMonth(expenses, key)).toFixed(2)),
      })),
    [incomes, expenses],
  );

  const sorted = useMemo(
    () => [...incomes].sort((a, b) => b.date.localeCompare(a.date)),
    [incomes],
  );

  function create() {
    const value = Number(amount);
    if (!source.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Add a source and valid amount");
      return;
    }
    addIncome({ source: source.trim(), amount: value, category, date });
    setSource("");
    setAmount("");
    toast.success("Income recorded");
  }

  return (
    <AppShell title="Income & cashflow" subtitle="Everything coming in, measured against what goes out">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label="Income this month" value={format(monthIncome)} hint={`${byMonth(incomes, month).length} entries`} />
        <StatCard icon={TrendingUp} label="Spent this month" value={format(monthSpend)} />
        <StatCard icon={Scale} label="Net cashflow" value={format(net)} hint={net >= 0 ? "surplus" : "deficit"} />
        <StatCard icon={TrendingUp} label="Savings rate" value={`${savingsRate.toFixed(1)}%`} hint="of income kept" />
      </div>

      <div className="mt-6 panel p-5">
        <h2 className="font-display text-sm font-semibold">Income vs spending · last 6 months</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number, n) => [format(v), n === "income" ? "Income" : "Spending"]}
              />
              <Area type="monotone" dataKey="income" stroke="var(--chart-1)" fill="url(#inc)" strokeWidth={2} />
              <Area type="monotone" dataKey="spend" stroke="var(--chart-4)" fill="url(#spd)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-semibold">Income log</h2>
          </div>
          <ul className="divide-y divide-border">
            {sorted.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">No income recorded yet.</li>
            ) : null}
            {sorted.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.category} ·{" "}
                    {new Date(`${i.date}T00:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="font-display text-sm font-semibold text-primary">+{format(i.amount)}</p>
                <Button size="icon" variant="ghost" aria-label={`Delete ${i.source}`} onClick={() => removeIncome(i.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel h-fit p-5">
          <h2 className="font-display text-sm font-semibold">Record income</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="inc-source">Source</Label>
              <Input id="inc-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Monthly salary" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-amount">Amount</Label>
              <Input id="inc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4200" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Income["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-date">Date</Label>
              <Input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button variant="brand" className="w-full" onClick={create}>
              <Plus className="size-4" /> Add income
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
