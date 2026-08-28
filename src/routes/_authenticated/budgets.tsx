import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  byMonth,
  CATEGORIES,
  currentMonthKey,
  monthLongLabel,
  shiftMonth,
  sum,
  useFinance,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — CoinKeep" },
      {
        name: "description",
        content: "Set monthly category budgets and watch live progress against real spending.",
      },
      { property: "og:title", content: "Budgets — CoinKeep" },
      { property: "og:description", content: "Monthly category limits with live progress." },
    ],
  }),
  component: Budgets,
});

function Budgets() {
  const { budgets, expenses, setBudget, removeBudget, copyPreviousBudgets, format } = useFinance();
  const [month, setMonth] = useState(currentMonthKey());
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [copying, setCopying] = useState(false);

  const monthExpenses = useMemo(() => byMonth(expenses, month), [expenses, month]);
  const rows = useMemo(
    () =>
      budgets
        .filter((b) => b.month === month)
        .map((b) => {
          const used = sum(monthExpenses.filter((e) => e.category === b.category));
          return { ...b, used, pct: b.limit > 0 ? (used / b.limit) * 100 : 0 };
        })
        .sort((a, b) => b.pct - a.pct),
    [budgets, monthExpenses, month],
  );

  const totalLimit = rows.reduce((a, b) => a + b.limit, 0);
  const totalUsed = rows.reduce((a, b) => a + b.used, 0);
  const overBudget = rows.filter((b) => b.pct >= 100);
  const closeBudget = rows.filter((b) => b.pct >= 80 && b.pct < 100);

  function add() {
    const value = Number(limit);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a limit above zero");
      return;
    }
    void setBudget(category, Math.round(value * 100) / 100, month);
    setLimit("");
    toast.success(`Budget saved for ${category}`);
  }

  async function copyPrevious() {
    setCopying(true);
    try {
      const copied = await copyPreviousBudgets(month);
      if (copied === 0) {
        toast.info("No budgets from the previous month to copy");
      } else {
        toast.success(`Copied ${copied} budgets from last month`);
      }
    } finally {
      setCopying(false);
    }
  }

  return (
    <AppShell
      title="Budgets"
      subtitle={`${format(totalUsed)} used of ${format(totalLimit)} planned in ${monthLongLabel(month)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-medium">
            {monthLongLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="subtle" size="sm" onClick={copyPrevious} disabled={copying}>
          {copying ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
          Copy last month
        </Button>
      </div>

      {(overBudget.length > 0 || closeBudget.length > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {overBudget.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="size-4" />
              <span>
                <span className="font-medium">{b.category}</span> is over budget by{" "}
                {format(Math.max(b.used - b.limit, 0))}
              </span>
            </div>
          ))}
          {closeBudget.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning"
            >
              <AlertTriangle className="size-4" />
              <span>
                <span className="font-medium">{b.category}</span> is at {Math.round(b.pct)}% of its
                limit
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Category limits</h2>
          <div className="mt-5 space-y-5">
            {rows.map((b) => {
              const state =
                b.pct >= 100 ? "Over budget" : b.pct >= 80 ? "Close to limit" : "On track";
              const stateColor =
                b.pct >= 100 ? "text-destructive" : b.pct >= 80 ? "text-warning" : "text-success";
              return (
                <div key={b.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{b.category}</p>
                      <p className={`text-xs ${stateColor}`}>
                        {state} · {format(Math.max(b.limit - b.used, 0))} left
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-sm">
                        {format(b.used)} / {format(b.limit)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          void removeBudget(b.id);
                          toast.success("Budget removed");
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(b.pct, 100)}
                    className={`mt-2 h-2 ${b.pct >= 100 ? "[&>div]:bg-destructive" : b.pct >= 80 ? "[&>div]:bg-warning" : ""}`}
                  />
                </div>
              );
            })}
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No budgets for {monthLongLabel(month)}. Create one on the right or copy last
                month.
              </p>
            ) : null}
          </div>
        </section>

        <section className="panel h-fit p-5">
          <h2 className="text-lg font-semibold">Set a budget</h2>
          <p className="text-sm text-muted-foreground">Applies to {monthLongLabel(month)}.</p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="limit">Monthly limit</Label>
              <Input
                id="limit"
                type="number"
                min="0"
                step="1"
                value={limit}
                placeholder="500"
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
            <Button variant="brand" onClick={add}>
              <Plus className="size-4" /> Save budget
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
