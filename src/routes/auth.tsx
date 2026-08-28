import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CoinKeep" },
      {
        name: "description",
        content:
          "Sign in or create your CoinKeep account to track income, expenses, budgets and savings goals securely.",
      },
      { property: "og:title", content: "Sign in — CoinKeep" },
      {
        property: "og:description",
        content: "Secure access to your private personal finance workspace.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user, loading, signIn, signUp, sendReset } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  function validate() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (mode !== "forgot" && password.length < 8)
      return "Password must be at least 8 characters.";
    if (mode === "signup" && name.trim().length < 2) return "Enter your name.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        void navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        await signUp(email.trim(), password, name.trim(), accountType);
        toast.success("Account created — you're all set.");
        void navigate({ to: "/dashboard" });
      } else {
        await sendReset(email.trim());
        toast.success("Password reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5">
          <img src="/logo.svg" alt="CoinKeep" className="size-9 rounded-xl" />
          <span className="font-display text-lg font-semibold tracking-tight">CoinKeep</span>
        </Link>

        <div className="panel p-6">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a secure link to choose a new password."
              : "Your financial data stays private to your account."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                />
              </div>
            ) : null}

            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: "personal", label: "Personal" },
                    { code: "business", label: "Business" },
                    { code: "family", label: "Family / Group" },
                    { code: "other", label: "Other" },
                  ].map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setAccountType(t.code)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        accountType === t.code
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" variant="brand" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button className="text-primary hover:underline" onClick={() => setMode("forgot")}>
                  Forgot your password?
                </button>
                <p>
                  New here?{" "}
                  <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                </p>
              </>
            ) : (
              <p>
                Already have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
