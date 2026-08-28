import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  invertDelta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  icon: LucideIcon;
  invertDelta?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  const good = invertDelta ? !positive : positive;

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta === null || delta === undefined ? null : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              good ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
