/** Admin API calls must bypass caches so auth failures reach the rate limiter. */
export function adminApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(path, {
    ...init,
    cache: "no-store",
  });
}
