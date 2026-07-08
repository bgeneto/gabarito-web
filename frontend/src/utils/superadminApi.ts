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

export async function superadminDownload(
  path: string,
  body: unknown,
  fallbackFilename: string,
): Promise<void> {
  const response = await superadminFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "Erro ao baixar backup.";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface RestoreBackupResult {
  imported: { id: string; public_code: string; title: string }[];
  skipped: {
    id: string;
    public_code: string;
    title: string;
    reason: string;
  }[];
  errors: { id: string; public_code: string; title: string; message: string }[];
}

export async function superadminUpload<T>(
  path: string,
  file: File,
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await superadminFetch(path, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Erro na requisição.");
  }
  return data as T;
}
