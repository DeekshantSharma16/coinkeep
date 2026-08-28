import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { TransactionDialog } from "@/components/transaction-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORIES, sum, toCsv, useFinance, type Expense } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — CoinKeep" },
      {
        name: "description",
        content: "Search, filter, sort, edit and export every tracked transaction in one table.",
      },
      { property: "og:title", content: "Transactions — CoinKeep" },
      { property: "og:description", content: "Search, filter and export your transaction history." },
    ],
  }),
  component: Transactions,
});

type SortKey = "date" | "amount" | "title";
const PAGE_SIZE = 15;

function Transactions() {
  const { transactions, removeTransaction, duplicateTransaction, format } = useFinance();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [range, setRange] = useState("30");
  const [sort, setSort] = useState<SortKey>("date");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    return transactions
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter((t) => (category === "all" ? true : t.category === category))
      .filter((t) => (range === "all" ? true : t.date >= cutoffIso))
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q) ||
          (t.merchant ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sort === "amount") return b.amount - a.amount;
        if (sort === "title") return a.title.localeCompare(b.title);
        return a.date < b.date ? 1 : -1;
      });
  }, [transactions, category, range, query, sort, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} transactions`);
  }

  async function remove(id: string) {
    await removeTransaction(id);
    toast.success("Transaction deleted");
    setDeleting(null);
  }

  async function duplicate(id: string) {
    await duplicateTransaction(id);
    toast.success("Transaction duplicated");
  }

  return (
    <AppShell
      title="Transactions"
      subtitle={`${filtered.length} records · ${format(sum(filtered))} total`}
      actions={
        <Button variant="subtle" size="sm" onClick={exportCsv}>
          <Download className="size-4" /> Export CSV
        </Button>
      }
    >
      <div className="panel p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, category, merchant or note"
              className="pl-9"
            />
          </div>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as typeof type);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={range}
              onValueChange={(v) => {
                setRange(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="amount">Highest</SelectItem>
                <SelectItem value="title">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{t.title}</span>
                  {t.recurring ? (
                    <Badge variant="secondary" className="ml-2">
                      Recurring
                    </Badge>
                  ) : null}
                  {t.type === "income" ? (
                    <Badge variant="outline" className="ml-2 border-success/50 text-success">
                      Income
                    </Badge>
                  ) : null}
                  {t.note ? (
                    <p className="text-xs text-muted-foreground">{t.note}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{t.category}</TableCell>
                <TableCell className="text-muted-foreground">{t.method}</TableCell>
                <TableCell
                  className={`text-right font-medium tabular-nums ${t.type === "income" ? "text-success" : ""}`}
                >
                  {t.type === "income" ? "+" : ""}
                  {format(t.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(t)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicate(t.id)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(t)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {editing ? (
        <TransactionDialog
          editing={editing}
          open
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleting?.title}" ({format(deleting?.amount ?? 0)}). This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
