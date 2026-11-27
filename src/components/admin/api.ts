"use client";

/** fetch wrapper for the admin API: JSON in/out, Hungarian error messages, login redirect on 401. */
export async function adminFetch<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    // Not a component, so no router here; a full load also drops stale admin state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/belepes";
    throw new Error("Jelentkezz be újra.");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Hiba (${res.status})`);
  return data as T;
}
