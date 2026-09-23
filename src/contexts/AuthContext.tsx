import { createContext, useContext, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

type ServerUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
};

interface AuthContextType {
  session: null;
  user: ServerUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.setData(undefined, null),
  });

  const signIn = async (_email: string, _password: string) => {
    window.location.href = getLoginUrl();
  };
  const signUp = async (_email: string, _password: string, _username: string) => {
    window.location.href = getLoginUrl();
  };
  const signOut = async () => {
    await logoutMutation.mutateAsync();
    await utils.auth.me.invalidate();
  };

  const value = useMemo<AuthContextType>(() => ({
    session: null,
    user: (meQuery.data as ServerUser | null | undefined) ?? null,
    isLoading: meQuery.isLoading || logoutMutation.isPending,
    signUp,
    signIn,
    signOut,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.isLoading, logoutMutation.isPending, utils]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
