import { createFileRoute } from "@tanstack/react-router";
import { Flag, PiggyBank, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { daysUntil, useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Savings Goals — CoinKeep" },
      {
        name: "description",
        content:
          "Create savings goals with targets and deadlines, log contributions and track progress toward each milestone.",
      },
      { property: "og:title", content: "Savings Goals — CoinKeep" },
      { property: "og:description", content: "Targets, deadlines and contribution tracking." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { goals, addGoal, updateGoal, removeGoal, format } = useFinance();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contrib, setContrib] = useState<Record<string, string>>({});

  const totalTarget = goals.reduce((a, g) => a + g.target, 0);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
  const completed = goals.filter((g) => g.saved >= g.target).length;

  function create() {
    const value = Number(target);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Add a goal name and target amount");
      return;
    }
    addGoal({ name: name.trim(), target: value, saved: 0, ...(deadline ? { deadline } : {}) });
    setName("");
    setTarget("");
    setDeadline("");
    toast.success("Goal created");
  }

  return (
    <AppShell title="Savings goals" subtitle="Milestones, deadlines and contribution progress">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={PiggyBank} label="Total saved" value={format(totalSaved)} hint={`of ${format(totalTarget)} targeted`} />
        <StatCard
          icon={Target}
          label="Overall progress"
          value={`${totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0}%`}
          hint={`${goals.length} active goals`}
        />
        <StatCard icon={Flag} label="Goals reached" value={String(completed)} hint="fully funded" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.length === 0 ? (
            <p className="panel p-10 text-center text-sm text-muted-foreground sm:col-span-2">
              No goals yet — create your first one.
            </p>
          ) : null}
          {goals.map((g) => {
            const pct = Math.min(100, (g.saved / g.target) * 100);
            const remaining = Math.max(0, g.target - g.saved);
            const days = g.deadline ? daysUntil(new Date(`${g.deadline}T00:00:00`)) : null;
            return (
              <div key={g.id} className="panel flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">{g.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {g.deadline
                        ? days !== null && days >= 0
                          ? `${days} days left · ${new Date(`${g.deadline}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "Deadline passed"
                        : "No deadline"}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${g.name}`} onClick={() => removeGoal(g.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <p className="mt-4 font-display text-2xl font-semibold tabular-nums">
                  {format(g.saved)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/ {format(g.target)}</span>
                </p>
                <Progress value={pct} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {remaining > 0 ? `${format(remaining)} to go` : "Goal reached 🎉"}
                </p>

                <div className="mt-4 flex gap-2">
                  <Input
                    inputMode="decimal"
                    placeholder="Add amount"
                    value={contrib[g.id] ?? ""}
                    onChange={(e) => setContrib((c) => ({ ...c, [g.id]: e.target.value }))}
                  />
                  <Button
                    variant="subtle"
                    onClick={() => {
                      const v = Number(contrib[g.id]);
                      if (!Number.isFinite(v) || v === 0) {
                        toast.error("Enter an amount");
                        return;
                      }
                      updateGoal(g.id, { saved: Math.max(0, g.saved + v) });
                      setContrib((c) => ({ ...c, [g.id]: "" }));
                      toast.success(`Added to ${g.name}`);
                    }}
                  >
                    Contribute
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel h-fit p-5">
          <h2 className="font-display text-sm font-semibold">New goal</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Name</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input id="goal-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Deadline (optional)</Label>
              <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <Button variant="brand" className="w-full" onClick={create}>
              <Plus className="size-4" /> Create goal
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
