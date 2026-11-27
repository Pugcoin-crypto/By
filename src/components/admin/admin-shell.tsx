"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { StaffSession } from "@/server/admin-auth";
import { adminFetch } from "./api";

const StaffContext = createContext<StaffSession | null>(null);
export const useStaff = () => useContext(StaffContext)!;

const NAV = [
  { href: "/admin", label: "Rendelések", admin: false },
  { href: "/admin/etlap", label: "Étlap", admin: false },
  { href: "/admin/opciok", label: "Opciók", admin: true },
  { href: "/admin/beallitasok", label: "Beállítások", admin: true },
  { href: "/admin/statisztika", label: "Statisztika", admin: true },
  { href: "/admin/szemelyzet", label: "Személyzet", admin: true },
];

export function AdminShell({
  staff,
  acceptingOrders,
  pauseMessage,
  children,
}: {
  staff: StaffSession;
  acceptingOrders: boolean;
  pauseMessage: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [accepting, setAccepting] = useState(acceptingOrders);
  const [busy, setBusy] = useState(false);

  const togglePause = async () => {
    const next = !accepting;
    const message = next ? "" : (window.prompt("Üzenet a vásárlóknak (nem kötelező):", pauseMessage || "Nagy a forgalom, most nem fogadunk online rendelést.") ?? null);
    if (message === null) return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/settings", { method: "PATCH", body: { acceptingOrders: next, pauseMessage: message } });
      setAccepting(next);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Hiba");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    try {
      const { getFirebaseApp } = await import("@/lib/client/firebase");
      const app = getFirebaseApp();
      if (app) (await import("firebase/auth")).getAuth(app).signOut();
    } catch {}
    router.replace("/admin/belepes");
    router.refresh();
  };

  return (
    <StaffContext.Provider value={staff}>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-primary/95 backdrop-blur print:hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Link href="/admin" className="font-bold tracking-wide uppercase">
              Erden&apos;s Admin
            </Link>
            <button
              onClick={togglePause}
              disabled={busy}
              className={`ml-auto flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold ${
                accepting ? "bg-green-500/15 text-green-400" : "bg-red-500/20 text-red-300"
              }`}
              aria-pressed={!accepting}
            >
              <span className={`size-2.5 rounded-full ${accepting ? "bg-green-400" : "bg-red-400"}`} />
              {accepting ? "Rendelésfogadás: BE" : "Rendelésfogadás: SZÜNETEL"}
            </button>
            <button onClick={logout} className="h-10 rounded-full px-3 text-sm text-white/60 hover:text-white">
              Kilépés
            </button>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2">
            {NAV.filter((n) => !n.admin || staff.role === "admin").map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-secondary text-white" : "text-white/70 hover:bg-surface-2"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </StaffContext.Provider>
  );
}
