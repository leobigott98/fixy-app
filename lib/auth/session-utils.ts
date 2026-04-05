export function normalizeSessionEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeSessionPhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D+/g, "");

  if (!digits) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("58")) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+58${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+58${digits}`;
  }

  return `+${digits}`;
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
