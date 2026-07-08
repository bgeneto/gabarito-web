import { clearAdminSession, getAdminSession } from "./adminSession";

export interface AdminSessionExchange {
  session_token: string;
  expires_at: number;
}

/** Admin API calls must bypass caches so auth failures reach the rate limiter. */
export function adminApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const sessionToken = getAdminSession();
  const headers = new Headers(init?.headers);

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function exchangeAdminToken(
  adminToken: string,
): Promise<AdminSessionExchange> {
  const response = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_token: adminToken }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 429) {
    throw new Error(
      data.message ||
        "Muitas tentativas de acesso. Aguarde um minuto e tente novamente.",
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Token administrativo inválido ou prova não encontrada.",
    );
  }

  if (
    typeof data.session_token !== "string" ||
    typeof data.expires_at !== "number"
  ) {
    throw new Error("Resposta inválida ao criar sessão administrativa.");
  }

  return {
    session_token: data.session_token,
    expires_at: data.expires_at,
  };
}

export function handleAdminAuthFailure(response: Response): void {
  if (response.status === 401) {
    clearAdminSession();
  }
}
