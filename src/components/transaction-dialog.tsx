import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  SUBCATEGORIES,
  useFinance,
  type PaymentMethod,
  type Transaction,
  type TransactionInput,
} from "@/lib/finance-store";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyForm(type: "income" | "expense"): TransactionInput {
  return {
    type,
    title: "",
    amount: 0,
    category: type === "income" ? "Salary" : "Food & Dining",
    date: today(),
    method: type === "income" ? "Bank Transfer" : "Cash",
    tags: [],
    recurring: false,
  };
}

export function TransactionDialog({
  trigger,
  defaultType = "expense",
  editing,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  defaultType?: "income" | "expense";
  editing?: Transaction;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { addTransaction, updateTransaction } = useFinance();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionInput>(() => emptyForm(defaultType));
  const [amountText, setAmountText] = useState("");
  const [tagText, setTagText] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const { id: _id, ...rest } = editing;
      void _id;
      setForm(rest);
      setAmountText(String(editing.amount));
      setTagText(editing.tags.join(", "));
    } else {
      setForm(emptyForm(defaultType));
      setAmountText("");
      setTagText("");
    }
    setError(null);
  }, [open, editing, defaultType]);

  const isIncome = form.type === "income";
  const categories = isIncome ? [...INCOME_CATEGORIES] : [...CATEGORIES];

  function set<K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    const amount = Number(amountText);
    if (!form.title.trim()) return setError("Add a short description.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setError("Pick a valid date.");

    const payload: TransactionInput = {
      ...form,
      title: form.title.trim(),
      amount,
      tags: tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateTransaction(editing.id, payload);
        toast.success("Transaction updated");
      } else {
        await addTransaction(payload);
        toast.success(isIncome ? "Income recorded" : "Expense recorded");
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const subcats = SUBCATEGORIES[form.category] ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit transaction" : isIncome ? "Add income" : "Add expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={form.type === t ? "brand" : "outline"}
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    type: t,
                    category: t === "income" ? "Salary" : "Food & Dining",
                    subcategory: undefined,
                  }));
                }}
              >
                {t === "expense" ? "Expense" : "Income"}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-title">Description</Label>
              <Input
                id="tx-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={isIncome ? "Monthly salary" : "Groceries"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v, subcategory: undefined }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <Select
                value={form.subcategory ?? "none"}
                onValueChange={(v) => set("subcategory", v === "none" ? undefined : v)}
                disabled={subcats.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subcats.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select
                value={form.method}
                onValueChange={(v) => set("method", v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-merchant">Merchant</Label>
              <Input
                id="tx-merchant"
                value={form.merchant ?? ""}
                onChange={(e) => set("merchant", e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-tags">Tags</Label>
              <Input
                id="tx-tags"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="comma, separated, tags"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-note">Notes</Label>
              <Textarea
                id="tx-note"
                value={form.note ?? ""}
                onChange={(e) => set("note", e.target.value)}
                rows={2}
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:col-span-2">
              <div>
                <Label htmlFor="tx-recurring">Recurring</Label>
                <p className="text-xs text-muted-foreground">Repeats every month</p>
              </div>
              <Switch
                id="tx-recurring"
                checked={form.recurring}
                onCheckedChange={(v) => set("recurring", v)}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
