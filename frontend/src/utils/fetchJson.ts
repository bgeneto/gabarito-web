export interface FetchJsonResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

export function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    err.name === "TypeError" ||
    message.includes("load failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  );
}

export function formatFetchErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (isNetworkFetchError(err)) {
    return "Falha de conexão. Se você já enviou, aguarde ou consulte seu comprovante na Home.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<FetchJsonResult<T>> {
  const response = await fetch(input, init);
  let data = {} as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      data = (await response.json()) as T;
    } catch {
      if (!response.ok) {
        throw new Error("Resposta inválida do servidor.");
      }
    }
  } else if (!response.ok) {
    throw new Error(`Erro do servidor (${response.status}).`);
  }

  return { ok: response.ok, status: response.status, data };
}
