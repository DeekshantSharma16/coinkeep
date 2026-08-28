import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, CalendarClock, Check, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  CATEGORIES,
  currentMonthKey,
  daysUntil,
  nextOccurrence,
  useFinance,
  type Expense,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Recurring Bills — CoinKeep" },
      {
        name: "description",
        content:
          "Track recurring bills and subscriptions, see what is due soon and post them to your ledger in one click.",
      },
      { property: "og:title", content: "Recurring Bills — CoinKeep" },
      { property: "og:description", content: "Subscriptions, due-soon reminders and one-click posting." },
    ],
  }),
  component: BillsPage,
});

const METHODS: Expense["method"][] = ["Credit Card", "Debit Card", "Cash", "UPI", "Bank Transfer", "Wallet"];

function BillsPage() {
  const { rules, addRule, updateRule, removeRule, postRule, format } = useFinance();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Utilities");
  const [method, setMethod] = useState<Expense["method"]>("Credit Card");
  const [day, setDay] = useState("1");

  const month = currentMonthKey();

  const enriched = useMemo(
    () =>
      rules
        .map((r) => {
          const next = nextOccurrence(r.dayOfMonth);
          return { rule: r, next, days: daysUntil(next), posted: r.lastPostedMonth === month };
        })
        .sort((a, b) => a.days - b.days),
    [rules, month],
  );

  const activeRules = rules.filter((r) => r.active);
  const monthlyCommitted = activeRules.reduce((a, b) => a + b.amount, 0);
  const dueSoon = enriched.filter((e) => e.rule.active && !e.posted && e.days <= 7);
  const pending = enriched.filter((e) => e.rule.active && !e.posted);

  function create() {
    const value = Number(amount);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Add a name and a valid amount");
      return;
    }
    addRule({
      title: title.trim(),
      amount: value,
      category,
      method,
      dayOfMonth: Math.min(Math.max(Number(day) || 1, 1), 28),
      active: true,
      isSubscription: false,
    });
    setTitle("");
    setAmount("");
    toast.success("Recurring bill added");
  }

  return (
    <AppShell
      title="Recurring bills"
      subtitle="Subscriptions and fixed costs with due-date reminders"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Repeat} label="Committed monthly" value={format(monthlyCommitted)} hint={`${activeRules.length} active bills`} />
        <StatCard icon={AlarmClock} label="Due within 7 days" value={String(dueSoon.length)} hint={format(dueSoon.reduce((a, b) => a + b.rule.amount, 0))} />
        <StatCard icon={CalendarClock} label="Unposted this month" value={String(pending.length)} hint={format(pending.reduce((a, b) => a + b.rule.amount, 0))} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <CalendarClock className="size-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Schedule</h2>
          </div>
          <ul className="divide-y divide-border">
            {enriched.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No recurring bills yet.
              </li>
            ) : null}
            {enriched.map(({ rule, next, days, posted }) => (
              <li key={rule.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{rule.title}</p>
                    {posted ? (
                      <Badge variant="secondary">Posted</Badge>
                    ) : rule.active && days <= 3 ? (
                      <Badge variant="destructive">
                        <AlarmClock className="size-3" /> Due soon
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rule.category} · {rule.method} · day {rule.dayOfMonth} ·{" "}
                    {posted
                      ? "handled this month"
                      : `next ${next.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${days === 0 ? "today" : `in ${days}d`})`}
                  </p>
                </div>
                <p className="font-display text-sm font-semibold">{format(rule.amount)}</p>
                <Switch
                  checked={rule.active}
                  onCheckedChange={(v) => updateRule(rule.id, { active: v })}
                  aria-label={`Toggle ${rule.title}`}
                />
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={posted || !rule.active}
                  onClick={() => {
                    postRule(rule.id);
                    toast.success(`${rule.title} posted to transactions`);
                  }}
                >
                  <Check className="size-4" /> Post
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${rule.title}`}
                  onClick={() => removeRule(rule.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel h-fit p-5">
          <h2 className="font-display text-sm font-semibold">New recurring bill</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-title">Name</Label>
              <Input id="bill-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internet" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bill-amount">Amount</Label>
                <Input id="bill-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="55" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-day">Day of month</Label>
                <Input id="bill-day" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Expense["method"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="brand" className="w-full" onClick={create}>
              <Plus className="size-4" /> Add bill
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
