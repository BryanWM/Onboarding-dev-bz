import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured, isModoDemo, signInAdmin, signOutAdmin } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  modoDemo: boolean;
  // null = ainda verificando; false = logado, mas fora da tabela public.gestores
  isGestor: boolean | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGestor, setIsGestor] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsGestor(null);
      return;
    }
    if (!isSupabaseConfigured) {
      setIsGestor(isModoDemo);
      return;
    }
    let ativo = true;
    setIsGestor(null);
    supabase.rpc("is_gestor").then(({ data, error }) => {
      if (ativo) setIsGestor(!error && data === true);
    });
    return () => {
      ativo = false;
    };
  }, [user]);

  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      if (!isModoDemo) {
        throw new Error("Login indisponível: Supabase não configurado neste ambiente.");
      }
      // Modo demo (dev local sem .env): qualquer credencial entra
      const mockUser = {
        id: "mock-admin-id",
        email,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User;
      setUser(mockUser);
      setSession({
        access_token: "mock-token",
        refresh_token: "mock-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      });
      return;
    }

    const data = await signInAdmin(email, pass);
    setUser(data.user);
    setSession(data.session);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await signOutAdmin();
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        modoDemo: isModoDemo,
        isGestor,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
