import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Printer, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
  categoryTotals,
  currentMonthKey,
  lastNMonths,
  monthLabel,
  parseCsv,
  sum,
  toCsv,
  useFinance,
} from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Import — CoinKeep" },
      {
        name: "description",
        content:
          "Generate a printable monthly finance report and import transactions from any CSV statement.",
      },
      { property: "og:title", content: "Reports & Import — CoinKeep" },
      { property: "og:description", content: "Printable monthly statements and CSV import." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { expenses, incomes, budgets, importExpenses, format } = useFinance();
  const [month, setMonth] = useState(currentMonthKey());
  const fileRef = useRef<HTMLInputElement>(null);

  const months = useMemo(() => lastNMonths(12).slice().reverse(), []);
  const monthExpenses = useMemo(() => byMonth(expenses, month), [expenses, month]);
  const monthIncomes = useMemo(() => byMonth(incomes, month), [incomes, month]);
  const totals = categoryTotals(monthExpenses);
  const spent = sum(monthExpenses);
  const earned = sum(monthIncomes);
  const net = earned - spent;
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function exportMonthCsv() {
    const blob = new Blob([toCsv(monthExpenses)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgerly-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  async function onFile(file: File) {
    const text = await file.text();
    const { rows, skipped } = parseCsv(text);
    if (rows.length === 0) {
      toast.error("No valid rows found. Expected Date,Title,Category,Method,Amount,Note");
      return;
    }
    void importExpenses(
      rows.map((r) => ({
        type: "expense" as const,
        title: r.title,
        amount: r.amount,
        category: r.category,
        date: r.date,
        method: r.method,
        note: r.note,
        tags: [],
        recurring: false,
      })),
    );
    toast.success(`Imported ${rows.length} transactions${skipped ? ` · ${skipped} skipped` : ""}`);
  }

  return (
    <AppShell
      title="Reports & import"
      subtitle="Printable monthly statements and CSV data import"
      actions={
        <>
          <Button variant="subtle" size="sm" onClick={exportMonthCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button variant="subtle" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="panel p-6 print:border-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Monthly statement</p>
              <h2 className="font-display text-2xl font-semibold">{label}</h2>
            </div>
            <FileText className="size-6 text-muted-foreground" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Figure label="Income" value={format(earned)} />
            <Figure label="Spending" value={format(spent)} />
            <Figure label="Net" value={format(net)} accent={net >= 0} />
          </div>

          <h3 className="mt-8 font-display text-sm font-semibold">Category breakdown</h3>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Budget</th>
                <th className="py-2 text-right font-medium">Spent</th>
                <th className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {totals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No activity recorded in {label}.
                  </td>
                </tr>
              ) : null}
              {totals.map((t) => {
                const budget = budgets.find((b) => b.category === t.category);
                return (
                  <tr key={t.category} className="border-b border-border/60">
                    <td className="py-2.5">{t.category}</td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {budget ? format(budget.limit) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{format(t.total)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {spent ? `${((t.total / spent) * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="mt-8 font-display text-sm font-semibold">Top transactions</h3>
          <ul className="mt-3 divide-y divide-border/60 text-sm">
            {[...monthExpenses]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 8)
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span className="truncate">
                    {e.title} <span className="text-muted-foreground">· {e.category}</span>
                  </span>
                  <span className="tabular-nums">{format(e.amount)}</span>
                </li>
              ))}
          </ul>

          <p className="mt-8 text-xs text-muted-foreground">
            Generated by CoinKeep · {new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}
          </p>
        </div>

        <div className="space-y-6 print:hidden">
          <div className="panel p-5">
            <h2 className="font-display text-sm font-semibold">Report period</h2>
            <div className="mt-3 space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {monthLabel(m)} {m.slice(0, 4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-sm font-semibold">Import CSV</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Columns: Date (YYYY-MM-DD), Title, Category, Method, Amount, Note. Unknown categories
              fall back to “Other”.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="brand" className="mt-4 w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Choose file
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-xl font-semibold tabular-nums ${
          accent === undefined ? "" : accent ? "text-primary" : "text-destructive"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
