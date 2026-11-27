// Hungarian phone numbers. Accepts "+36 30 123 4567", "06301234567",
// "06-1-234-5678" etc. and normalises them to "+36301234567".

const MOBILE_PREFIXES = new Set(["20", "30", "31", "50", "70"]);

export function normalizeHungarianPhone(input: string): string | null {
  const raw = input.trim();
  if (!/^[+\d\s()\-/.]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+")) {
    if (!digits.startsWith("36")) return null;
    digits = digits.slice(2);
  } else if (digits.startsWith("0036")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("06")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("36") && digits.length >= 10) {
    digits = digits.slice(2);
  } else {
    return null;
  }

  // Mobile: 2-digit prefix + 7 digits.
  if (MOBILE_PREFIXES.has(digits.slice(0, 2))) {
    return digits.length === 9 ? `+36${digits}` : null;
  }
  // Budapest landline: 1 + 7 digits.
  if (digits.startsWith("1")) {
    return digits.length === 8 ? `+36${digits}` : null;
  }
  // Other landlines: 2-digit area code + 6 digits.
  if (/^[2-9]\d/.test(digits)) {
    return digits.length === 8 ? `+36${digits}` : null;
  }
  return null;
}

/** "+36301234567" → "+36 30 123 4567" */
export function formatHungarianPhone(normalized: string): string {
  const d = normalized.replace(/^\+36/, "");
  if (d.startsWith("1")) return `+36 1 ${d.slice(1, 4)} ${d.slice(4)}`;
  if (d.length === 9) return `+36 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `+36 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}
