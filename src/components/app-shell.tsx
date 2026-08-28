import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  Repeat,
  Banknote,
  PiggyBank,
  FileText,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  User,
  HeartPulse,
  Lightbulb,
  Compass,
  ClipboardList,
  Moon,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { TransactionDialog } from "@/components/transaction-dialog";
import { useTheme } from "@/hooks/useTheme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/income", label: "Income", icon: Banknote },
  { to: "/bills", label: "Recurring", icon: Repeat },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/goals", label: "Goals", icon: PiggyBank },
  { to: "/analytics", label: "Analytics", icon: PieChart },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/health", label: "Financial health", icon: HeartPulse },
  { to: "/advisor", label: "Advisor", icon: Compass },
  { to: "/review", label: "Monthly review", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar/80 px-4 py-6 backdrop-blur lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="panel p-4 text-xs text-muted-foreground">
          <p className="font-display text-sm text-foreground">Private by design</p>
          <p className="mt-1">
            Your financial records are tied to your account and isolated from other users.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <div className="min-w-0">
              <div className="lg:hidden">
                <Brand />
              </div>
              <h1 className="mt-1 truncate text-2xl font-semibold lg:mt-0">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
              <TransactionDialog
                trigger={
                  <Button variant="brand" size="sm">
                    <Plus className="size-4" /> Add expense
                  </Button>
                }
              />
              <UserMenu />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground",
                  pathname === to && "bg-secondary text-secondary-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="border-t border-border px-5 py-5 text-xs text-muted-foreground lg:px-8">
          CoinKeep · personal, business & more
        </footer>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="CoinKeep" className="size-9 rounded-xl" />
      <span className="font-display text-lg font-semibold tracking-tight">CoinKeep</span>
    </Link>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const { profile } = useFinance();
  const initials = (profile?.fullName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="size-8">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="size-full object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{profile?.fullName || "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <User className="mr-2 size-4" /> Profile & account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
