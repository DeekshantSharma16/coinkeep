import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType?: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updateProfile: (attrs: { fullName?: string; avatarUrl?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function must(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, accountType = "personal") => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, account_type: accountType },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      must(error);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    must(error);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    must(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    must(error);
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    must(error);
  }, []);

  const updateProfile = useCallback(async (attrs: { fullName?: string; avatarUrl?: string }) => {
    const updates: { data?: { full_name?: string; avatar_url?: string } } = {};
    if (attrs.fullName !== undefined) {
      updates.data = { ...(updates.data ?? {}), full_name: attrs.fullName };
    }
    if (attrs.avatarUrl !== undefined) {
      updates.data = { ...(updates.data ?? {}), avatar_url: attrs.avatarUrl };
    }
    if (updates.data) {
      const { error } = await supabase.auth.updateUser(updates);
      must(error);
    }
  }, []);

  const deleteAccountFn = useCallback(async () => {
    await deleteAccount();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      sendReset,
      updatePassword,
      updateEmail,
      updateProfile,
      deleteAccount: deleteAccountFn,
    }),
    [session, loading, signUp, signIn, signOut, sendReset, updatePassword, updateEmail, updateProfile, deleteAccountFn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
