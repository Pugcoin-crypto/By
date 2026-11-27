"use client";

// The cart lives in localStorage so a refresh (or closing the tab) keeps it.
// It only stores product ids, choices and quantities; prices are always
// recomputed from the current menu.

import { useSyncExternalStore } from "react";
import type { CartLineInput } from "../types";

export interface CartLine extends CartLineInput {
  key: string;
}

const STORAGE_KEY = "erdens-cart-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    if (Array.isArray(parsed)) {
      lines = parsed.filter((l) => l && typeof l.productId === "string" && Number.isInteger(l.quantity) && l.quantity > 0);
    }
  } catch {
    lines = [];
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    loaded = false;
    load();
    emit();
  });
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or full storage: the cart still works for this page view.
  }
}

function emit() {
  for (const l of listeners) l();
}

function set(next: CartLine[]) {
  lines = next;
  persist();
  emit();
}

export function lineKey(productId: string, selections: Record<string, string[]>): string {
  const normalized = Object.keys(selections)
    .sort()
    .filter((k) => selections[k].length > 0)
    .map((k) => `${k}=${[...selections[k]].sort().join(",")}`)
    .join(";");
  return `${productId}|${normalized}`;
}

export const cart = {
  add(productId: string, selections: Record<string, string[]>, quantity: number) {
    load();
    const key = lineKey(productId, selections);
    const existing = lines.find((l) => l.key === key);
    if (existing) {
      set(lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l)));
    } else {
      set([...lines, { key, productId, selections, quantity }]);
    }
  },
  setQuantity(key: string, quantity: number) {
    load();
    if (quantity <= 0) set(lines.filter((l) => l.key !== key));
    else set(lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l)));
  },
  remove(key: string) {
    load();
    set(lines.filter((l) => l.key !== key));
  },
  clear() {
    set([]);
  },
};

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    subscribe,
    () => (load(), lines),
    () => EMPTY,
  );
}

// ------------------------------------------------------------ last order

const LAST_ORDER_KEY = "erdens-last-order";

export function rememberOrder(token: string, number: string) {
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ token, number, at: Date.now() }));
  } catch {}
}

export function readLastOrder(): { token: string; number: string } | null {
  try {
    const raw = window.localStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { token: string; number: string; at: number };
    // Only show it for 12 hours.
    return Date.now() - v.at < 12 * 3600_000 ? v : null;
  } catch {
    return null;
  }
}
