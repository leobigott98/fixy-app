import { sessionCookieName } from "@/lib/auth/constants";

export function normalizeSessionEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildSessionCookieValue(email: string) {
  return encodeURIComponent(normalizeSessionEmail(email));
}

export function parseSessionCookieValue(value: string) {
  return decodeURIComponent(value).trim().toLowerCase();
}

export function getDisplayNameFromEmail(email: string) {
  const [localPart] = normalizeSessionEmail(email).split("@");

  if (!localPart) {
    return "Encargado";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildSessionCookieString(email: string) {
  return `${sessionCookieName}=${buildSessionCookieValue(email)}; path=/; max-age=2592000; SameSite=Lax`;
}
