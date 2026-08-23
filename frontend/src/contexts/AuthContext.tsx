import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

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

  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        // Token inválido ou expirado
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setSessionToken(null);
        setUser(null);
      }
    } catch {
      // Falha de rede ou backend offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionToken) {
      fetchCurrentUser(sessionToken);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [sessionToken, fetchCurrentUser]);

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
      redirect_to: data.redirect_to || "/minhas-provas",
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
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSessionToken(null);
    setUser(null);
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
      throw new Error(data.message || "Erro ao vincular prova.");
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
    if (sessionToken) {
      await fetchCurrentUser(sessionToken);
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
