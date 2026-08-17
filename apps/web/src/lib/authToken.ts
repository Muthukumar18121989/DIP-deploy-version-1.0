// Single source of truth for the bearer token, kept outside api.ts/useAuthStore
// so neither has to import the other (api.ts needs the token synchronously on
// every request; useAuthStore needs to call api.ts's auth functions).
const KEY = "dip_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}
