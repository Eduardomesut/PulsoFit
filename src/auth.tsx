import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

type AuthValue = {
  user: any;
  ready: boolean;
  enabled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue>({
  user: null, ready: true, enabled: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, needsConfirm: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  // Si no hay Supabase configurado, ya estamos "listos" (modo invitado).
  const [ready, setReady] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    user,
    ready,
    enabled: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) return { error: new Error("Login no disponible") };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    signUp: async (email, password) => {
      if (!supabase) return { error: new Error("Login no disponible"), needsConfirm: false };
      const { data, error } = await supabase.auth.signUp({ email, password });
      // Si el email requiere confirmación, no habrá sesión activa todavía.
      const needsConfirm = !error && !data.session;
      return { error, needsConfirm };
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
