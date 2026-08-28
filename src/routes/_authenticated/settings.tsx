import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Download, Loader2, Mail, Save, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toCsv, useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CoinKeep" },
      {
        name: "description",
        content: "Manage your CoinKeep profile, account security, currency and financial goals.",
      },
      { property: "og:title", content: "Settings — CoinKeep" },
      { property: "og:description", content: "Profile, security, currency and financial goals." },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES: { code: string; label: string }[] = [
  { code: "INR", label: "₹  Indian Rupee (INR)" },
  { code: "USD", label: "$  US Dollar (USD)" },
  { code: "EUR", label: "€  Euro (EUR)" },
  { code: "GBP", label: "£  British Pound (GBP)" },
  { code: "AED", label: "د.إ  UAE Dirham (AED)" },
  { code: "SGD", label: "$  Singapore Dollar (SGD)" },
  { code: "AUD", label: "$  Australian Dollar (AUD)" },
  { code: "CAD", label: "$  Canadian Dollar (CAD)" },
  { code: "JPY", label: "¥  Japanese Yen (JPY)" },
  { code: "CNY", label: "¥  Chinese Yuan (CNY)" },
  { code: "CHF", label: "Fr  Swiss Franc (CHF)" },
  { code: "SAR", label: "﷼  Saudi Riyal (SAR)" },
  { code: "MYR", label: "RM  Malaysian Ringgit (MYR)" },
  { code: "THB", label: "฿  Thai Baht (THB)" },
  { code: "ZAR", label: "R  South African Rand (ZAR)" },
  { code: "NZD", label: "$  NZ Dollar (NZD)" },
  { code: "HKD", label: "$  Hong Kong Dollar (HKD)" },
  { code: "BRL", label: "R$  Brazilian Real (BRL)" },
  { code: "RUB", label: "₽  Russian Ruble (RUB)" },
  { code: "KRW", label: "₩  South Korean Won (KRW)" },
  { code: "IDR", label: "Rp  Indonesian Rupiah (IDR)" },
  { code: "PHP", label: "₱  Philippine Peso (PHP)" },
  { code: "BDT", label: "৳  Bangladeshi Taka (BDT)" },
  { code: "PKR", label: "₨  Pakistani Rupee (PKR)" },
  { code: "LKR", label: "Rs  Sri Lankan Rupee (LKR)" },
  { code: "NPR", label: "रू  Nepalese Rupee (NPR)" },
];

const ACCOUNT_TYPES: { code: string; label: string; hint: string }[] = [
  { code: "personal", label: "Personal", hint: "Track your own income and spending." },
  { code: "business", label: "Business", hint: "Company expenses, revenue and cashflow." },
  { code: "family", label: "Family / Group", hint: "A shared household or group budget." },
  { code: "other", label: "Other", hint: "Club, project, NGO or anything else." },
];

function SettingsPage() {
  const { user } = useAuth();
  const { profile, settings, updateSettings, expenses, transactions, format } = useFinance();

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [income, setIncome] = useState(String(settings.monthlyIncome));
  const [goal, setGoal] = useState(String(settings.savingsGoal));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
  }, [profile?.fullName]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  async function saveProfile() {
    try {
      await updateSettings({ fullName: fullName.trim() });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  async function saveEmail() {
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      toast.success("Confirmation email sent. Check your inbox to finish the change.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update email");
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Could not generate avatar URL");

      await updateSettings({ avatarUrl: url });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  }

  function saveFinancials() {
    updateSettings({
      monthlyIncome: Math.max(Number(income) || 0, 0),
      savingsGoal: Math.max(Number(goal) || 0, 0),
    });
    toast.success("Financial preferences saved");
  }

  function exportCsv() {
    const blob = new Blob([toCsv(expenses)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgerly-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  async function removeAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      const { deleteAccount: deleteAccountFn } = await import("@/lib/account.functions");
      await deleteAccountFn();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  const initials = (profile?.fullName || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <AppShell title="Settings" subtitle="Profile, account security and financial preferences">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your public name and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" className="size-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary text-xl font-medium text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 size-4" />
                    )}
                    Change photo
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 2 MB.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="flex-1"
                    />
                    <Button variant="brand" size="icon" onClick={saveProfile}>
                      <Save className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={saveEmail}>
                      <Mail className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Changing your email sends a confirmation link.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="brand"
                    className="w-full"
                    onClick={changePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Change password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial profile</CardTitle>
              <CardDescription>
                Currency, monthly income and savings goal used across dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Account type</Label>
                <Select
                  value={settings.accountType}
                  onValueChange={(v) => {
                    updateSettings({ accountType: v });
                    toast.success("Account type updated");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ACCOUNT_TYPES.find((t) => t.code === settings.accountType)?.hint}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) => {
                      updateSettings({ currency: v });
                      toast.success(`Currency set to ${v}`);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="income">Monthly income</Label>
                  <Input
                    id="income"
                    type="number"
                    min="0"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="goal">Savings goal</Label>
                  <Input
                    id="goal"
                    type="number"
                    min="0"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="brand" onClick={saveFinancials}>
                Save preferences
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>Permanently delete your account and all data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will remove your profile, transactions, budgets, bills and goals. This action
                cannot be undone.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type DELETE to confirm'
                />
                <Button
                  variant="destructive"
                  onClick={removeAccount}
                  disabled={deleting || deleteConfirm !== "DELETE"}
                >
                  {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
              <CardDescription>Export or manage your records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-medium">{transactions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Savings goal</span>
                <span className="font-medium">{format(settings.savingsGoal)}</span>
              </div>
              <Separator />
              <Button variant="outline" className="w-full" onClick={exportCsv}>
                <Download className="mr-2 size-4" /> Download CSV backup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Signed in as</span>
                <span className="truncate font-medium">{user?.email}</span>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth">Switch account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
