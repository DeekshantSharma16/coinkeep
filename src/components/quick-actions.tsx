import { useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Goal,
  Landmark,
  PiggyBank,
  Plus,
  Repeat,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { CATEGORIES, currentMonthKey, useFinance } from "@/lib/finance-store";

export function QuickActions() {
  const { setBudget, addGoal, addRule } = useFinance();
  const navigate = useNavigate();

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<string>(CATEGORIES[0]);
  const [budgetLimit, setBudgetLimit] = useState("");

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  function saveBudget() {
    const value = Number(budgetLimit);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a limit above zero");
      return;
    }
    void setBudget(budgetCategory, Math.round(value * 100) / 100, currentMonthKey());
    setBudgetLimit("");
    setBudgetOpen(false);
    toast.success(`Budget saved for ${budgetCategory}`);
  }

  function saveGoal() {
    const value = Number(goalTarget);
    if (!goalName.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a goal name and target amount");
      return;
    }
    void addGoal({ name: goalName.trim(), target: value, saved: 0 });
    setGoalName("");
    setGoalTarget("");
    setGoalOpen(false);
    toast.success("Goal created");
  }

  function addSubscription() {
    void addRule({
      title: "New subscription",
      amount: 0,
      category: "Entertainment",
      method: "Credit Card",
      dayOfMonth: 1,
      active: true,
      isSubscription: true,
    });
    navigate({ to: "/bills" });
    toast.success("Subscription draft created — finish it in Recurring");
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <TransactionDialog
        trigger={
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Wallet className="size-5" />
            <span className="text-xs">Add expense</span>
          </Button>
        }
      />
      <TransactionDialog
        defaultType="income"
        trigger={
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Banknote className="size-5" />
            <span className="text-xs">Add income</span>
          </Button>
        }
      />

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Goal className="size-5" />
            <span className="text-xs">Add goal</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="qa-goal-name">Goal name</Label>
              <Input
                id="qa-goal-name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Emergency fund"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qa-goal-target">Target amount</Label>
              <Input
                id="qa-goal-target"
                inputMode="decimal"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="5000"
              />
            </div>
            <Button variant="brand" className="w-full" onClick={saveGoal}>
              <Plus className="mr-2 size-4" /> Create goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <PiggyBank className="size-5" />
            <span className="text-xs">Add budget</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set a budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={budgetCategory} onValueChange={setBudgetCategory}>
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
              <Label htmlFor="qa-budget-limit">Monthly limit</Label>
              <Input
                id="qa-budget-limit"
                inputMode="decimal"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="500"
              />
            </div>
            <Button variant="brand" className="w-full" onClick={saveBudget}>
              <Plus className="mr-2 size-4" /> Save budget
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        className="h-auto flex-col gap-2 py-4"
        onClick={() => navigate({ to: "/bills" })}
      >
        <Landmark className="size-5" />
        <span className="text-xs">Add bill</span>
      </Button>

      <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={addSubscription}>
        <Repeat className="size-5" />
        <span className="text-xs">Subscription</span>
      </Button>
    </div>
  );
}
