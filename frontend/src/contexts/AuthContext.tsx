import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { sanitizePostLoginPath } from "../utils/postLoginRedirect";
import {
  interpretAuthMeStatus,
  nextSessionProbeDelayMs,
} from "../utils/userSessionProbe";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestMagicLink: (
    email: string,
    targetRoute?: string,
  ) => Promise<{ ok: boolean; message: string }>;
  verifyMagicLink: (
    token: string,
  ) => Promise<{ ok: boolean; redirect_to: string }>;
  logout: () => Promise<void>;
  claimExam: (adminToken: string) => Promise<{ ok: boolean; message: string }>;
  claimSubmission: (
    submissionId: string,
  ) => Promise<{ ok: boolean; message: string }>;
  refreshUser: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "gabarito_user_session_token";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSessionToken(null);
    setUser(null);
  }, []);

  const fetchCurrentUser = useCallback(async (token: string) => {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const action = interpretAuthMeStatus(res.status);
    if (action === "authenticated") {
      const data = await res.json();
      if (!data.user) {
        throw new Error("Resposta de sessão sem usuário.");
      }
      setUser(data.user);
      return "authenticated" as const;
    }
    if (action === "invalid") {
      return "invalid" as const;
    }
    return "retry" as const;
  }, []);

  useEffect(() => {
    if (!sessionToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settleWait: (() => void) | undefined;

    const restoreSession = async () => {
      setIsLoading(true);
      let failedAttempts = 0;

      while (!cancelled) {
        try {
          const result = await fetchCurrentUser(sessionToken);
          if (cancelled) return;
          if (result === "authenticated") {
            setIsLoading(false);
            return;
          }
          if (result === "invalid") {
            clearLocalSession();
            setIsLoading(false);
            return;
          }
        } catch {
          if (cancelled) return;
        }

        const delay = nextSessionProbeDelayMs(failedAttempts);
        failedAttempts += 1;
        await new Promise<void>((resolve) => {
          settleWait = resolve;
          timer = setTimeout(resolve, delay);
        });
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      settleWait?.();
    };
  }, [sessionToken, fetchCurrentUser, clearLocalSession]);

  const requestMagicLink = async (email: string, targetRoute?: string) => {
    const res = await fetch("/api/auth/magic-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, target_route: targetRoute }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Erro ao solicitar link de acesso.");
    }
    return data;
  };

  const verifyMagicLink = async (token: string) => {
    const res = await fetch("/api/auth/magic-link/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Link inválido ou expirado.");
    }

    const tokenReceived = data.session_token;
    if (tokenReceived) {
      localStorage.setItem(AUTH_STORAGE_KEY, tokenReceived);
      setSessionToken(tokenReceived);
      setUser(data.user || null);
    }

    return {
      ok: true,
      redirect_to: sanitizePostLoginPath(data.redirect_to) || "/conta",
    };
  };

  const logout = async () => {
    if (sessionToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      } catch {
        // ignora erro ao deslogar
      }
    }
    clearLocalSession();
  };

  const claimExam = async (adminToken: string) => {
    if (!sessionToken) throw new Error("Você precisa estar logado.");
    const res = await fetch("/api/user/claim-exam", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ admin_token: adminToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Erro ao vincular avaliação.");
    }
    return data;
  };

  const claimSubmission = async (submissionId: string) => {
    if (!sessionToken) throw new Error("Você precisa estar logado.");
    const res = await fetch("/api/user/claim-submission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ submission_id: submissionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Erro ao vincular submissão.");
    }
    return data;
  };

  const refreshUser = async () => {
    if (!sessionToken) return;
    try {
      const result = await fetchCurrentUser(sessionToken);
      if (result === "invalid") {
        clearLocalSession();
      }
    } catch {
      // Falha transitória: mantém a sessão atual.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isLoading,
        isAuthenticated: !!user,
        requestMagicLink,
        verifyMagicLink,
        logout,
        claimExam,
        claimSubmission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
