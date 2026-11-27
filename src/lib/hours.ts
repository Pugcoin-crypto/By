// Opening hours, evaluated in the restaurant's own time zone regardless of
// where the server runs (Vercel runs in UTC).

import type { StoreSettings } from "./types";

interface LocalTime {
  weekday: number; // 0 = Sunday
  minutes: number; // minutes since local midnight
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function localTime(now: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function isWithinOpeningHours(settings: Pick<StoreSettings, "openingHours" | "timezone">, now: Date): boolean {
  const { weekday, minutes } = localTime(now, settings.timezone);
  const today = settings.openingHours[weekday]?.intervals ?? [];
  return today.some((iv) => {
    const open = toMinutes(iv.open);
    const close = toMinutes(iv.close);
    // An interval like 18:00–02:00 runs past midnight.
    return close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
  });
}

export type StoreState =
  | { open: true }
  | { open: false; reason: "paused" | "closed"; message: string };

export function storeState(settings: StoreSettings, now: Date): StoreState {
  if (!settings.acceptingOrders) {
    return {
      open: false,
      reason: "paused",
      message: settings.pauseMessage || "Jelenleg nem fogadunk online rendelést. Kérjük, próbáld újra később!",
    };
  }
  if (!isWithinOpeningHours(settings, now)) {
    const { weekday } = localTime(now, settings.timezone);
    const today = settings.openingHours[weekday]?.intervals ?? [];
    const hours = today.map((iv) => `${iv.open}–${iv.close}`).join(", ");
    return {
      open: false,
      reason: "closed",
      message: hours ? `Most zárva vagyunk. Nyitvatartás ma: ${hours}.` : "Ma zárva vagyunk.",
    };
  }
  return { open: true };
}
