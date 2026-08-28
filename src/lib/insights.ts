import type { Transaction, Budget, RecurringRule, Goal } from "@/lib/finance-store";
import {
  byMonth,
  categoryTotals,
  currentMonthKey,
  lastNMonths,
  shiftMonth,
  sum,
} from "@/lib/finance-utils";

/* ------------------------------------------------------------------ *
 * Shared derivations used by Insights, Financial Health, Advisor and
 * Monthly Review. Everything here is pure and driven by real user data
 * so the pages never invent numbers.
 * ------------------------------------------------------------------ */

export type MonthTotals = {
  key: string;
  income: number;
  expense: number;
  saved: number;
  savingsRate: number;
};

export function monthTotals(
  transactions: Transaction[],
  key: string,
  fallbackIncome = 0,
): MonthTotals {
  const inMonth = byMonth(transactions, key);
  const income = sum(inMonth.filter((t) => t.type === "income"));
  const expense = sum(inMonth.filter((t) => t.type === "expense"));
  const effIncome = income > 0 ? income : fallbackIncome;
  const saved = Math.max(effIncome - expense, 0);
  const savingsRate = effIncome > 0 ? (saved / effIncome) * 100 : 0;
  return { key, income: effIncome, expense, saved, savingsRate };
}

/* ---------- Financial insights ---------- */

export type Insight = {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  detail: string;
};

/**
 * Returns meaningful, data-backed observations. Deliberately empty when
 * there isn't enough history to say anything trustworthy.
 */
export function buildInsights(
  transactions: Transaction[],
  rules: RecurringRule[],
  fallbackIncome = 0,
): Insight[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length < 3) return [];

  const insights: Insight[] = [];
  const thisKey = currentMonthKey();
  const prevKey = shiftMonth(thisKey, -1);

  const thisMonth = byMonth(expenses, thisKey);
  const prevMonth = byMonth(expenses, prevKey);
  const thisSpent = sum(thisMonth);
  const prevSpent = sum(prevMonth);

  // Category with the biggest month-over-month move.
  if (prevMonth.length > 0 && thisMonth.length > 0) {
    const cur = new Map(categoryTotals(thisMonth).map((c) => [c.category, c.total]));
    const prev = new Map(categoryTotals(prevMonth).map((c) => [c.category, c.total]));
    let biggest: { cat: string; diff: number; pct: number } | null = null;
    for (const [cat, total] of cur) {
      const before = prev.get(cat) ?? 0;
      const diff = total - before;
      if (before > 0) {
        const pct = (diff / before) * 100;
        if (!biggest || Math.abs(diff) > Math.abs(biggest.diff)) biggest = { cat, diff, pct };
      }
    }
    if (biggest && Math.abs(biggest.pct) >= 15) {
      const up = biggest.diff > 0;
      insights.push({
        id: "cat-change",
        tone: up ? "warning" : "positive",
        title: `${biggest.cat} spending ${up ? "rose" : "fell"} ${Math.abs(biggest.pct).toFixed(0)}%`,
        detail: `You've ${up ? "spent" : "saved"} about ${Math.abs(biggest.diff).toFixed(0)} ${up ? "more" : "less"} on ${biggest.cat} than last month.`,
      });
    }
  }

  // Largest category this month.
  const topCats = categoryTotals(thisMonth);
  if (topCats.length > 0 && thisSpent > 0) {
    const top = topCats[0]!;
    const share = (top.total / thisSpent) * 100;
    if (share >= 30) {
      insights.push({
        id: "top-cat",
        tone: "neutral",
        title: `${top.category} is your largest expense`,
        detail: `It makes up ${share.toFixed(0)}% of this month's spending. Worth a look if you're trying to trim.`,
      });
    }
  }

  // Weekend vs weekday spending.
  const wk = weekendWeekday(thisMonth);
  if (wk.weekendDays > 0 && wk.weekdayDays > 0 && wk.weekdayAvg > 0) {
    const ratio = wk.weekendAvg / wk.weekdayAvg;
    if (ratio >= 1.4) {
      insights.push({
        id: "weekend",
        tone: "neutral",
        title: "Weekends cost you more",
        detail: `Your average weekend day runs about ${(ratio * 100 - 100).toFixed(0)}% higher than a weekday.`,
      });
    }
  }

  // Month-over-month total.
  if (prevSpent > 0) {
    const pct = ((thisSpent - prevSpent) / prevSpent) * 100;
    if (Math.abs(pct) >= 10) {
      const up = pct > 0;
      insights.push({
        id: "total-change",
        tone: up ? "warning" : "positive",
        title: `Total spending is ${up ? "up" : "down"} ${Math.abs(pct).toFixed(0)}%`,
        detail: `You're on track to ${up ? "spend more" : "spend less"} than last month.`,
      });
    }
  }

  // Recurring / subscription load.
  const subs = rules.filter((r) => r.active && r.isSubscription);
  if (subs.length > 0) {
    const monthly = sum(subs);
    insights.push({
      id: "subs",
      tone: subs.length >= 5 ? "warning" : "neutral",
      title: `${subs.length} active subscription${subs.length > 1 ? "s" : ""}`,
      detail: `They cost about ${monthly.toFixed(0)} a month (${(monthly * 12).toFixed(0)}/year). Cancel anything you've stopped using.`,
    });
  }

  // Savings opportunity: discretionary spend.
  const discretionary = ["Entertainment", "Shopping", "Food & Dining", "Travel"];
  const disc = sum(thisMonth.filter((e) => discretionary.includes(e.category)));
  const income =
    sum(
      byMonth(
        transactions.filter((t) => t.type === "income"),
        thisKey,
      ),
    ) || fallbackIncome;
  if (income > 0 && disc / income >= 0.4) {
    insights.push({
      id: "discretionary",
      tone: "warning",
      title: "High discretionary spending",
      detail: `Around ${((disc / income) * 100).toFixed(0)}% of income went to flexible categories. Trimming 10% would free up ${(disc * 0.1).toFixed(0)}.`,
    });
  }

  return insights;
}

export function weekendWeekday(expenses: Transaction[]) {
  let weekend = 0;
  let weekday = 0;
  const weekendDates = new Set<string>();
  const weekdayDates = new Set<string>();
  for (const e of expenses) {
    const d = new Date(`${e.date}T00:00:00`);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      weekend += e.amount;
      weekendDates.add(e.date);
    } else {
      weekday += e.amount;
      weekdayDates.add(e.date);
    }
  }
  const weekendDays = weekendDates.size;
  const weekdayDays = weekdayDates.size;
  return {
    weekend,
    weekday,
    weekendDays,
    weekdayDays,
    weekendAvg: weekendDays ? weekend / weekendDays : 0,
    weekdayAvg: weekdayDays ? weekday / weekdayDays : 0,
  };
}

/* ---------- Financial health score ---------- */

export type HealthFactor = {
  key: string;
  label: string;
  score: number; // 0-100 for this factor
  weight: number;
  status: "good" | "ok" | "poor";
  note: string;
};

export type HealthReport = {
  score: number;
  band: "Excellent" | "Good" | "Fair" | "Needs work";
  factors: HealthFactor[];
  wins: string[];
  risks: string[];
  next: string[];
};

export function buildHealthReport(args: {
  transactions: Transaction[];
  budgets: Budget[];
  rules: RecurringRule[];
  goals: Goal[];
  monthlyIncomeTarget: number;
}): HealthReport | null {
  const { transactions, budgets, rules, goals, monthlyIncomeTarget } = args;
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length < 3) return null;

  const months = lastNMonths(6);
  const thisKey = currentMonthKey();
  const totals = months.map((m) => monthTotals(transactions, m, monthlyIncomeTarget));
  const current = monthTotals(transactions, thisKey, monthlyIncomeTarget);

  const factors: HealthFactor[] = [];

  // 1. Savings rate.
  {
    const rate = current.savingsRate;
    const score = clamp((rate / 25) * 100);
    factors.push({
      key: "savings",
      label: "Savings rate",
      score,
      weight: 0.25,
      status: rate >= 20 ? "good" : rate >= 10 ? "ok" : "poor",
      note: `You're saving ${rate.toFixed(0)}% of income this month.`,
    });
  }

  // 2. Expense / income ratio.
  {
    const ratio = current.income > 0 ? current.expense / current.income : 1.2;
    const score = clamp((1 - (ratio - 0.5) / 0.5) * 100);
    factors.push({
      key: "ratio",
      label: "Expense-to-income",
      score,
      weight: 0.2,
      status: ratio <= 0.7 ? "good" : ratio <= 0.9 ? "ok" : "poor",
      note: `Expenses are ${(ratio * 100).toFixed(0)}% of income.`,
    });
  }

  // 3. Spending consistency (lower volatility is better).
  {
    const spends = totals.map((t) => t.expense).filter((v) => v > 0);
    let score = 60;
    let note = "Not enough history to judge consistency.";
    if (spends.length >= 3) {
      const mean = spends.reduce((a, b) => a + b, 0) / spends.length;
      const variance = spends.reduce((a, b) => a + (b - mean) ** 2, 0) / spends.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      score = clamp((1 - cv / 0.5) * 100);
      note = `Monthly spending varies by about ${(cv * 100).toFixed(0)}%.`;
    }
    factors.push({
      key: "consistency",
      label: "Spending consistency",
      score,
      weight: 0.15,
      status: score >= 70 ? "good" : score >= 45 ? "ok" : "poor",
      note,
    });
  }

  // 4. Budget adherence.
  {
    const monthBudgets = budgets.filter((b) => b.month === thisKey && b.category);
    const thisMonthExp = byMonth(expenses, thisKey);
    let score = 65;
    let note = "No category budgets set for this month.";
    let status: HealthFactor["status"] = "ok";
    if (monthBudgets.length > 0) {
      let within = 0;
      for (const b of monthBudgets) {
        const used = sum(thisMonthExp.filter((e) => e.category === b.category));
        if (used <= b.limit) within++;
      }
      const pct = within / monthBudgets.length;
      score = clamp(pct * 100);
      status = pct >= 0.8 ? "good" : pct >= 0.5 ? "ok" : "poor";
      note = `${within} of ${monthBudgets.length} budgets are on track.`;
    }
    factors.push({ key: "budgets", label: "Budget adherence", score, weight: 0.15, status, note });
  }

  // 5. Goal progress.
  {
    let score = 55;
    let note = "No savings goals yet.";
    let status: HealthFactor["status"] = "ok";
    if (goals.length > 0) {
      const avg =
        goals.reduce((a, g) => a + (g.target > 0 ? Math.min(g.saved / g.target, 1) : 0), 0) /
        goals.length;
      score = clamp(avg * 100);
      status = avg >= 0.5 ? "good" : avg >= 0.2 ? "ok" : "poor";
      note = `Average goal is ${(avg * 100).toFixed(0)}% funded.`;
    }
    factors.push({ key: "goals", label: "Goal progress", score, weight: 0.1, status, note });
  }

  // 6. Recurring load.
  {
    const monthly = sum(rules.filter((r) => r.active));
    const share = current.income > 0 ? monthly / current.income : 0.5;
    const score = clamp((1 - share / 0.6) * 100);
    factors.push({
      key: "recurring",
      label: "Fixed-cost load",
      score,
      weight: 0.15,
      status: share <= 0.35 ? "good" : share <= 0.55 ? "ok" : "poor",
      note: `Fixed commitments take ${(share * 100).toFixed(0)}% of income.`,
    });
  }

  const total = factors.reduce((a, f) => a + f.score * f.weight, 0);
  const score = Math.round(total);
  const band =
    score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 45 ? "Fair" : "Needs work";

  const wins = factors.filter((f) => f.status === "good").map((f) => f.note);
  const risks = factors.filter((f) => f.status === "poor").map((f) => f.note);
  const next = factors
    .filter((f) => f.status !== "good")
    .sort((a, b) => a.score * a.weight - b.score * b.weight)
    .slice(0, 3)
    .map((f) => improvementFor(f.key));

  return { score, band, factors, wins, risks, next };
}

function improvementFor(key: string): string {
  switch (key) {
    case "savings":
      return "Automate a fixed transfer to savings on payday to lift your savings rate.";
    case "ratio":
      return "Trim your two largest flexible categories to bring expenses under 70% of income.";
    case "consistency":
      return "Smooth out big one-off months by spreading large purchases or building a buffer.";
    case "budgets":
      return "Set realistic category budgets and review them weekly.";
    case "goals":
      return "Add a monthly contribution to your top goal so it funds steadily.";
    case "recurring":
      return "Audit subscriptions and fixed bills — cancel or renegotiate the largest ones.";
    default:
      return "Review this area to strengthen your finances.";
  }
}

/* ---------- Smart advisor ---------- */

export type Allocation = { savings: number; debt: number; goals: number; invest: number };
export type Scenario = { id: string; label: string; description: string; split: Allocation };

export function surplusAndScenarios(current: MonthTotals): {
  surplus: number;
  scenarios: Scenario[];
} {
  const surplus = Math.max(current.income - current.expense, 0);
  const scenarios: Scenario[] = [
    {
      id: "conservative",
      label: "Conservative",
      description: "Build a safety net first — most of the surplus into cash savings.",
      split: { savings: 0.6, debt: 0.25, goals: 0.1, invest: 0.05 },
    },
    {
      id: "balanced",
      label: "Balanced",
      description: "A steady mix across savings, debt payoff, goals and investing.",
      split: { savings: 0.35, debt: 0.25, goals: 0.2, invest: 0.2 },
    },
    {
      id: "goal-focused",
      label: "Goal-focused",
      description: "Push hard toward your goals while keeping a small buffer.",
      split: { savings: 0.2, debt: 0.15, goals: 0.45, invest: 0.2 },
    },
  ];
  return { surplus, scenarios };
}

/* ---------- Monthly review ---------- */

export type MonthlyReview = {
  key: string;
  totals: MonthTotals;
  prev: MonthTotals;
  topCategories: { category: string; total: number }[];
  largest: Transaction | null;
  budgetPerformance: { onTrack: number; total: number };
  goalProgress: { name: string; pct: number }[];
  opportunities: string[];
  actions: string[];
};

export function buildMonthlyReview(args: {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  rules: RecurringRule[];
  monthKey: string;
  fallbackIncome: number;
}): MonthlyReview {
  const { transactions, budgets, goals, rules, monthKey: key, fallbackIncome } = args;
  const totals = monthTotals(transactions, key, fallbackIncome);
  const prev = monthTotals(transactions, shiftMonth(key, -1), fallbackIncome);

  const monthExp = byMonth(
    transactions.filter((t) => t.type === "expense"),
    key,
  );
  const topCategories = categoryTotals(monthExp).slice(0, 5);
  const largest = monthExp.reduce<Transaction | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max),
    null,
  );

  const monthBudgets = budgets.filter((b) => b.month === key && b.category);
  let onTrack = 0;
  for (const b of monthBudgets) {
    const used = sum(monthExp.filter((e) => e.category === b.category));
    if (used <= b.limit) onTrack++;
  }

  const goalProgress = goals.map((g) => ({
    name: g.name,
    pct: g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0,
  }));

  const opportunities: string[] = [];
  const insights = buildInsights(transactions, rules, fallbackIncome);
  for (const i of insights) if (i.tone === "warning") opportunities.push(i.detail);

  const actions: string[] = [];
  if (totals.savingsRate < 15) actions.push("Aim to save at least 15% of income next month.");
  if (totals.expense > prev.expense && prev.expense > 0)
    actions.push("Spending rose vs last month — set a cap on your top category.");
  if (monthBudgets.length === 0)
    actions.push("Set category budgets to make next month easier to steer.");
  if (goals.length > 0 && goalProgress.some((g) => g.pct < 50))
    actions.push("Add a contribution to the goals that are lagging.");

  return {
    key,
    totals,
    prev,
    topCategories,
    largest,
    budgetPerformance: { onTrack, total: monthBudgets.length },
    goalProgress,
    opportunities,
    actions,
  };
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}
