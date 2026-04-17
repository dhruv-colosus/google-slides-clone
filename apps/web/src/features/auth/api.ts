import type { AuthUser } from "./store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const authEndpoints = {
  login: `${API_URL}/auth/login`,
  me: `${API_URL}/auth/me`,
  logout: `${API_URL}/auth/logout`,
};

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch(authEndpoints.me, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Unauthenticated");
  }
  return res.json();
}

export async function logoutRequest(): Promise<void> {
  const res = await fetch(authEndpoints.logout, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Logout failed");
  }
}
