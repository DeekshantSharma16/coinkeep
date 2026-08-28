export type TxnType = "income" | "expense";

export type PaymentMethod =
  | "Cash"
  | "UPI"
  | "Credit Card"
  | "Debit Card"
  | "Bank Transfer"
  | "Wallet";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Wallet",
];

export const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Education",
  "Travel",
  "Other",
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  "Food & Dining": ["Groceries", "Restaurants", "Coffee", "Delivery"],
  Transport: ["Fuel", "Public transit", "Taxi", "Maintenance"],
  Housing: ["Rent", "Mortgage", "Repairs", "Furniture"],
  Utilities: ["Electricity", "Water", "Internet", "Phone"],
  Health: ["Pharmacy", "Doctor", "Fitness", "Insurance"],
  Shopping: ["Clothing", "Electronics", "Home", "Gifts"],
  Entertainment: ["Streaming", "Events", "Games", "Hobbies"],
  Education: ["Courses", "Books", "Tuition"],
  Travel: ["Flights", "Stays", "Activities"],
  Other: ["Misc"],
};

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investments",
  "Refund",
  "Other",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const CATEGORY_COLOR: Record<string, string> = {
  "Food & Dining": "var(--chart-1)",
  Transport: "var(--chart-2)",
  Housing: "var(--chart-3)",
  Utilities: "var(--chart-4)",
  Health: "var(--chart-5)",
  Shopping: "var(--chart-1)",
  Entertainment: "var(--chart-2)",
  Education: "var(--chart-3)",
  Travel: "var(--chart-4)",
  Other: "var(--chart-5)",
};

export function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date((y ?? 1970), (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sum(list: { amount: number }[]) {
  return list.reduce((a, b) => a + b.amount, 0);
}

export function byMonth<T extends { date: string }>(list: T[], key: string) {
  return list.filter((e) => monthKey(e.date) === key);
}

export function lastNMonths(n: number, from = currentMonthKey()) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(from, -i));
  return out;
}

export function monthLabel(key: string) {
  const [yearPart, monthPart] = key.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export function monthLongLabel(key: string) {
  const [yearPart, monthPart] = key.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function categoryTotals<T extends { category: string; amount: number }>(list: T[]) {
  const map = new Map<string, number>();
  for (const e of list) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function daysInMonth(key = currentMonthKey()) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y ?? 1970, m ?? 1, 0).getDate();
}

export function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function nextOccurrence(dayOfMonth: number, from = new Date()) {
  const day = Math.min(Math.max(dayOfMonth, 1), 28);
  const d = new Date(from.getFullYear(), from.getMonth(), day);
  if (d < new Date(from.getFullYear(), from.getMonth(), from.getDate()))
    d.setMonth(d.getMonth() + 1);
  return d;
}

export function daysUntil(date: Date, from = new Date()) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AUD: "en-AU",
  CAD: "en-CA",
  JPY: "ja-JP",
  SGD: "en-SG",
  AED: "ar-AE",
  CHF: "de-CH",
  CNY: "zh-CN",
  ZAR: "en-ZA",
  NZD: "en-NZ",
  HKD: "zh-HK",
  SAR: "ar-SA",
  MYR: "ms-MY",
  THB: "th-TH",
  BRL: "pt-BR",
  RUB: "ru-RU",
  KRW: "ko-KR",
  IDR: "id-ID",
  PHP: "en-PH",
  BDT: "bn-BD",
  PKR: "en-PK",
  LKR: "si-LK",
  NPR: "ne-NP",
};

// Currencies with no minor units (whole-number only).
const ZERO_DECIMAL = new Set(["JPY", "KRW", "IDR", "VND"]);

export function makeFormatter(currency: string) {
  const cur = currency || "INR";
  const locale = CURRENCY_LOCALE[cur] ?? "en-IN";
  return (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: ZERO_DECIMAL.has(cur) ? 0 : 2,
    }).format(n);
}

export function toCsv(rows: {
  date: string;
  title: string;
  category: string;
  method: string;
  amount: number;
  note?: string | undefined;
}[]) {
  const head = "Date,Title,Category,Method,Amount,Note";
  const body = rows.map((e) =>
    [e.date, e.title, e.category, e.method, e.amount, e.note ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head, ...body].join("\n");
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export type ParsedRow = {
  date: string;
  title: string;
  category: string;
  method: PaymentMethod;
  amount: number;
  note?: string;
};

export function parseCsv(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const hasHeader = header.includes("date") || header.includes("amount");
  const idx = (name: string, fallback: number) => {
    const i = header.indexOf(name);
    return hasHeader && i >= 0 ? i : fallback;
  };
  const di = idx("date", 0);
  const ti = idx("title", 1);
  const ci = idx("category", 2);
  const mi = idx("method", 3);
  const ai = idx("amount", 4);
  const ni = idx("note", 5);

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = splitCsvLine(line);
    const date = cells[di] ?? "";
    const amount = Number(String(cells[ai] ?? "").replace(/[^0-9.-]/g, ""));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount) || amount <= 0) {
      skipped++;
      continue;
    }
    const method = PAYMENT_METHODS.find(
      (m) => m.toLowerCase() === String(cells[mi] ?? "").toLowerCase(),
    );
    const category = CATEGORIES.find(
      (c) => c.toLowerCase() === String(cells[ci] ?? "").toLowerCase(),
    );
    const row: ParsedRow = {
      date,
      title: cells[ti] || "Imported expense",
      category: category ?? "Other",
      method: method ?? "Cash",
      amount,
    };
    const note = cells[ni];
    if (note) row.note = note;
    rows.push(row);
  }
  return { rows, skipped };
}
