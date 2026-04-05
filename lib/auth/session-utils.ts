import { sessionCookieName } from "@/lib/auth/constants";

export function normalizeSessionEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeSessionPhone(phone: string) {
  return phone.replace(/\D+/g, "");
}

export function isEmailIdentifier(value: string) {
  return value.includes("@");
}

export function normalizeLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();

  return isEmailIdentifier(trimmed)
    ? normalizeSessionEmail(trimmed)
    : normalizeSessionPhone(trimmed);
}

export function buildSessionCookieValue(identifier: string) {
  return encodeURIComponent(normalizeLoginIdentifier(identifier));
}

export function parseSessionCookieValue(value: string) {
  return normalizeLoginIdentifier(decodeURIComponent(value));
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

export function getDisplayNameFromIdentifier(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return getDisplayNameFromEmail(identifier);
  }

  const digits = normalizeSessionPhone(identifier);

  if (!digits) {
    return "Miembro";
  }

  return `Usuario ${digits.slice(-4)}`;
}

export function buildSessionCookieString(identifier: string) {
  return `${sessionCookieName}=${buildSessionCookieValue(identifier)}; path=/; max-age=2592000; SameSite=Lax`;
}
