import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  currentMonthKey,
  makeFormatter,
  type IncomeCategory,
  type PaymentMethod,
} from "@/lib/finance-utils";

export * from "@/lib/finance-utils";

/* ---------- domain types ---------- */

export type Transaction = {
  id: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  category: string;
  subcategory?: string | undefined;
  date: string; // yyyy-mm-dd
  method: PaymentMethod;
  merchant?: string | undefined;
  note?: string | undefined;
  tags: string[];
  recurring: boolean;
};

export type TransactionInput = Omit<Transaction, "id">;

export type Expense = Transaction;

export type Income = {
  id: string;
  source: string;
  amount: number;
  date: string;
  category: IncomeCategory | string;
};

export type Budget = { id: string; month: string; category: string | null; limit: number };

export type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  category: string;
  method: PaymentMethod;
  dayOfMonth: number;
  active: boolean;
  isSubscription: boolean;
  lastPostedMonth?: string | undefined;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string | undefined;
};

export type Profile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  currency: string;
  accountType: string;
  monthlyIncome: number;
  savingsGoal: number;
};

/* ---------- row mappers ---------- */

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0);

function toTransaction(r: Row): Transaction {
  return {
    id: String(r["id"]),
    type: r["type"] === "income" ? "income" : "expense",
    title: String(r["title"] ?? ""),
    amount: num(r["amount"]),
    category: String(r["category"] ?? "Other"),
    subcategory: (r["subcategory"] as string) ?? undefined,
    date: String(r["occurred_on"]),
    method: (r["payment_method"] as PaymentMethod) ?? "Cash",
    merchant: (r["merchant"] as string) ?? undefined,
    note: (r["notes"] as string) ?? undefined,
    tags: (r["tags"] as string[]) ?? [],
    recurring: Boolean(r["is_recurring"]),
  };
}

function fromTransaction(t: Partial<TransactionInput>) {
  const out: Row = {};
  if (t.type !== undefined) out["type"] = t.type;
  if (t.title !== undefined) out["title"] = t.title;
  if (t.amount !== undefined) out["amount"] = t.amount;
  if (t.category !== undefined) out["category"] = t.category;
  if (t.subcategory !== undefined) out["subcategory"] = t.subcategory || null;
  if (t.date !== undefined) out["occurred_on"] = t.date;
  if (t.method !== undefined) out["payment_method"] = t.method;
  if (t.merchant !== undefined) out["merchant"] = t.merchant || null;
  if (t.note !== undefined) out["notes"] = t.note || null;
  if (t.tags !== undefined) out["tags"] = t.tags;
  if (t.recurring !== undefined) out["is_recurring"] = t.recurring;
  return out;
}

function toBudget(r: Row): Budget {
  return {
    id: String(r["id"]),
    month: String(r["month"]),
    category: (r["category"] as string) ?? null,
    limit: num(r["amount"]),
  };
}

function toRule(r: Row): RecurringRule {
  return {
    id: String(r["id"]),
    title: String(r["name"]),
    amount: num(r["amount"]),
    category: String(r["category"] ?? "Other"),
    method: (r["payment_method"] as PaymentMethod) ?? "Cash",
    dayOfMonth: Number(r["due_day"] ?? 1),
    active: Boolean(r["is_active"]),
    isSubscription: Boolean(r["is_subscription"]),
    lastPostedMonth: (r["last_paid_month"] as string) ?? undefined,
  };
}

function toGoal(r: Row): Goal {
  return {
    id: String(r["id"]),
    name: String(r["name"]),
    target: num(r["target_amount"]),
    saved: num(r["saved_amount"]),
    deadline: (r["deadline"] as string) ?? undefined,
  };
}

function toProfile(r: Row): Profile {
  return {
    id: String(r["id"]),
    fullName: String(r["full_name"] ?? ""),
    avatarUrl: (r["avatar_url"] as string) ?? null,
    currency: String(r["currency"] ?? "INR"),
    accountType: String(r["account_type"] ?? "personal"),
    monthlyIncome: num(r["monthly_income_target"]),
    savingsGoal: num(r["savings_goal"]),
  };
}

/* ---------- context ---------- */

type Ctx = {
  ready: boolean;
  loading: boolean;
  transactions: Transaction[];
  expenses: Transaction[];
  incomes: Income[];
  budgets: Budget[];
  rules: RecurringRule[];
  goals: Goal[];
  profile: Profile | null;
  settings: { currency: string; accountType: string; monthlyIncome: number; savingsGoal: number };
  format: (n: number) => string;

  addTransaction: (t: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<TransactionInput>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  importExpenses: (rows: TransactionInput[]) => Promise<void>;

  addIncome: (i: { source: string; amount: number; date: string; category: string }) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;

  setBudget: (category: string | null, limit: number, month?: string) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  copyPreviousBudgets: (month: string) => Promise<number>;

  addRule: (r: Omit<RecurringRule, "id" | "lastPostedMonth">) => Promise<void>;
  updateRule: (id: string, patch: Partial<RecurringRule>) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  postRule: (id: string) => Promise<void>;

  addGoal: (g: Omit<Goal, "id">) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<Profile>) => Promise<void>;
};

const FinanceContext = createContext<Ctx | null>(null);

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const qc = useQueryClient();

  const enabled = Boolean(uid);

  const txQuery = useQuery({
    queryKey: ["transactions", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      check(error);
      return (data ?? []).map(toTransaction);
    },
  });

  const budgetQuery = useQuery({
    queryKey: ["budgets", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*");
      check(error);
      return (data ?? []).map(toBudget);
    },
  });

  const billQuery = useQuery({
    queryKey: ["bills", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("*").order("due_day");
      check(error);
      return (data ?? []).map(toRule);
    },
  });

  const goalQuery = useQuery({
    queryKey: ["goals", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at");
      check(error);
      return (data ?? []).map(toGoal);
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      check(error);
      return data ? toProfile(data as Row) : null;
    },
  });

  const invalidate = useCallback(
    (key: string) => {
      void qc.invalidateQueries({ queryKey: [key, uid] });
    },
    [qc, uid],
  );

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);
  const budgets = useMemo(() => budgetQuery.data ?? [], [budgetQuery.data]);
  const rules = useMemo(() => billQuery.data ?? [], [billQuery.data]);
  const goals = useMemo(() => goalQuery.data ?? [], [goalQuery.data]);
  const profile = profileQuery.data ?? null;

  const expenses = useMemo(() => transactions.filter((t) => t.type === "expense"), [transactions]);
  const incomes = useMemo<Income[]>(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .map((t) => ({
          id: t.id,
          source: t.title,
          amount: t.amount,
          date: t.date,
          category: t.category,
        })),
    [transactions],
  );

  const currency = profile?.currency ?? "INR";
  const format = useMemo(() => makeFormatter(currency), [currency]);

  /* ---------- mutations ---------- */

  const addTransaction = useCallback(
    async (t: TransactionInput) => {
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("transactions")
        .insert({ ...fromTransaction(t), user_id: uid } as never);
      check(error);
      invalidate("transactions");
    },
    [uid, invalidate],
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<TransactionInput>) => {
      const { error } = await supabase
        .from("transactions")
        .update(fromTransaction(patch) as never)
        .eq("id", id);
      check(error);
      invalidate("transactions");
    },
    [invalidate],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      check(error);
      invalidate("transactions");
    },
    [invalidate],
  );

  const duplicateTransaction = useCallback(
    async (id: string) => {
      const found = transactions.find((t) => t.id === id);
      if (!found) return;
      const { id: _drop, ...rest } = found;
      void _drop;
      await addTransaction(rest);
    },
    [transactions, addTransaction],
  );

  const importExpenses = useCallback(
    async (rows: TransactionInput[]) => {
      if (!uid || rows.length === 0) return;
      const { error } = await supabase
        .from("transactions")
        .insert(rows.map((r) => ({ ...fromTransaction(r), user_id: uid })) as never);
      check(error);
      invalidate("transactions");
    },
    [uid, invalidate],
  );

  const addIncome = useCallback(
    async (i: { source: string; amount: number; date: string; category: string }) => {
      await addTransaction({
        type: "income",
        title: i.source,
        amount: i.amount,
        category: i.category,
        date: i.date,
        method: "Bank Transfer",
        tags: [],
        recurring: false,
      });
    },
    [addTransaction],
  );

  const setBudget = useCallback(
    async (category: string | null, limit: number, month = currentMonthKey()) => {
      if (!uid) throw new Error("Not signed in");
      const existing = budgets.find((b) => b.month === month && b.category === category);
      if (existing) {
        const { error } = await supabase
          .from("budgets")
          .update({ amount: limit } as never)
          .eq("id", existing.id);
        check(error);
      } else {
        const { error } = await supabase
          .from("budgets")
          .insert({ user_id: uid, month, category, amount: limit } as never);
        check(error);
      }
      invalidate("budgets");
    },
    [uid, budgets, invalidate],
  );

  const removeBudget = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      check(error);
      invalidate("budgets");
    },
    [invalidate],
  );

  const copyPreviousBudgets = useCallback(
    async (month: string) => {
      if (!uid) throw new Error("Not signed in");
      const [y, m] = month.split("-").map(Number);
      const prevDate = new Date(y ?? 1970, (m ?? 1) - 2, 1);
      const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      const source = budgets.filter((b) => b.month === prev);
      const existing = new Set(budgets.filter((b) => b.month === month).map((b) => b.category));
      const rows = source
        .filter((b) => !existing.has(b.category))
        .map((b) => ({ user_id: uid, month, category: b.category, amount: b.limit }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("budgets").insert(rows as never);
      check(error);
      invalidate("budgets");
      return rows.length;
    },
    [uid, budgets, invalidate],
  );

  const addRule = useCallback(
    async (r: Omit<RecurringRule, "id" | "lastPostedMonth">) => {
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("bills").insert({
        user_id: uid,
        name: r.title,
        amount: r.amount,
        category: r.category,
        payment_method: r.method,
        due_day: r.dayOfMonth,
        is_active: r.active,
        is_subscription: r.isSubscription,
      } as never);
      check(error);
      invalidate("bills");
    },
    [uid, invalidate],
  );

  const updateRule = useCallback(
    async (id: string, patch: Partial<RecurringRule>) => {
      const row: Row = {};
      if (patch.title !== undefined) row["name"] = patch.title;
      if (patch.amount !== undefined) row["amount"] = patch.amount;
      if (patch.category !== undefined) row["category"] = patch.category;
      if (patch.method !== undefined) row["payment_method"] = patch.method;
      if (patch.dayOfMonth !== undefined) row["due_day"] = patch.dayOfMonth;
      if (patch.active !== undefined) row["is_active"] = patch.active;
      if (patch.isSubscription !== undefined) row["is_subscription"] = patch.isSubscription;
      if (patch.lastPostedMonth !== undefined) row["last_paid_month"] = patch.lastPostedMonth;
      const { error } = await supabase.from("bills").update(row as never).eq("id", id);
      check(error);
      invalidate("bills");
    },
    [invalidate],
  );

  const removeRule = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", id);
      check(error);
      invalidate("bills");
    },
    [invalidate],
  );

  const postRule = useCallback(
    async (id: string) => {
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;
      const now = new Date();
      const day = Math.min(Math.max(rule.dayOfMonth, 1), 28);
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      await addTransaction({
        type: "expense",
        title: rule.title,
        amount: rule.amount,
        category: rule.category,
        date,
        method: rule.method,
        tags: rule.isSubscription ? ["subscription"] : ["bill"],
        recurring: true,
      });
      await updateRule(id, { lastPostedMonth: date.slice(0, 7) });
    },
    [rules, addTransaction, updateRule],
  );

  const addGoal = useCallback(
    async (g: Omit<Goal, "id">) => {
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("goals").insert({
        user_id: uid,
        name: g.name,
        target_amount: g.target,
        saved_amount: g.saved,
        deadline: g.deadline || null,
      } as never);
      check(error);
      invalidate("goals");
    },
    [uid, invalidate],
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<Goal>) => {
      const row: Row = {};
      if (patch.name !== undefined) row["name"] = patch.name;
      if (patch.target !== undefined) row["target_amount"] = patch.target;
      if (patch.saved !== undefined) row["saved_amount"] = patch.saved;
      if (patch.deadline !== undefined) row["deadline"] = patch.deadline || null;
      const { error } = await supabase.from("goals").update(row as never).eq("id", id);
      check(error);
      invalidate("goals");
    },
    [invalidate],
  );

  const removeGoal = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      check(error);
      invalidate("goals");
    },
    [invalidate],
  );

  const removeIncome = removeTransaction;

  const updateSettings = useCallback(
    async (patch: Partial<Profile>) => {
      if (!uid) throw new Error("Not signed in");
      const row: Row = {};
      if (patch.fullName !== undefined) row["full_name"] = patch.fullName;
      if (patch.avatarUrl !== undefined) row["avatar_url"] = patch.avatarUrl;
      if (patch.currency !== undefined) row["currency"] = patch.currency;
      if (patch.accountType !== undefined) row["account_type"] = patch.accountType;
      if (patch.monthlyIncome !== undefined) row["monthly_income_target"] = patch.monthlyIncome;
      if (patch.savingsGoal !== undefined) row["savings_goal"] = patch.savingsGoal;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: uid, ...row } as never)
        .eq("id", uid);
      check(error);
      invalidate("profile");
    },
    [uid, invalidate],
  );

  const loading =
    enabled &&
    (txQuery.isLoading ||
      budgetQuery.isLoading ||
      billQuery.isLoading ||
      goalQuery.isLoading ||
      profileQuery.isLoading);

  const value = useMemo<Ctx>(
    () => ({
      ready: !loading,
      loading,
      transactions,
      expenses,
      incomes,
      budgets,
      rules,
      goals,
      profile,
      settings: {
        currency,
        accountType: profile?.accountType ?? "personal",
        monthlyIncome: profile?.monthlyIncome ?? 0,
        savingsGoal: profile?.savingsGoal ?? 0,
      },
      format,
      addTransaction,
      updateTransaction,
      removeTransaction,
      duplicateTransaction,
      importExpenses,
      addIncome,
      removeIncome,
      setBudget,
      removeBudget,
      copyPreviousBudgets,
      addRule,
      updateRule,
      removeRule,
      postRule,
      addGoal,
      updateGoal,
      removeGoal,
      updateSettings,
    }),
    [
      loading,
      transactions,
      expenses,
      incomes,
      budgets,
      rules,
      goals,
      profile,
      currency,
      format,
      addTransaction,
      updateTransaction,
      removeTransaction,
      duplicateTransaction,
      importExpenses,
      addIncome,
      removeIncome,
      setBudget,
      removeBudget,
      copyPreviousBudgets,
      addRule,
      updateRule,
      removeRule,
      postRule,
      addGoal,
      updateGoal,
      removeGoal,
      updateSettings,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}

/** Legacy alias kept so existing screens keep working. */
export const useExpenses = useFinance;

export function useTransactionMutation() {
  const { addTransaction } = useFinance();
  return useMutation({ mutationFn: addTransaction });
}
