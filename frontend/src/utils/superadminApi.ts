import { navigateTo } from "../App";
import { clearSuperadminToken, getSuperadminToken } from "./superadminSession";

export class SuperadminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuperadminAuthError";
  }
}

export async function superadminFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getSuperadminToken();
  if (!token) {
    clearSuperadminToken();
    navigateTo("/superadmin");
    throw new SuperadminAuthError("Sessão expirada.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401 || response.status === 404) {
    clearSuperadminToken();
    navigateTo("/superadmin");
    throw new SuperadminAuthError("Token inválido ou área desabilitada.");
  }

  return response;
}

export async function superadminJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await superadminFetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Erro na requisição.");
  }
  return data as T;
}
