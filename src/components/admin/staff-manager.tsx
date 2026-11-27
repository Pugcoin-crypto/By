"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "./api";

interface StaffUser {
  uid: string;
  email?: string;
  role?: string;
  disabled: boolean;
  lastSignIn?: string;
}

export function StaffManager() {
  const [data, setData] = useState<{ firebase: boolean; users: StaffUser[] } | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminFetch("/api/admin/staff"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba");
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => void load(), [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLink(null);
    try {
      const r = await adminFetch<{ passwordLink: string | null }>("/api/admin/staff", { method: "POST", body: { email, role } });
      setLink(r.passwordLink);
      setEmail("");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba");
    }
  };

  const revoke = async (u: StaffUser) => {
    if (!u.email || !window.confirm(`Elveszed ${u.email} hozzáférését?`)) return;
    try {
      await adminFetch("/api/admin/staff", { method: "POST", body: { email: u.email, role: "none" } });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba");
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Személyzet</h1>
      {data && !data.firebase && (
        <p className="mt-4 rounded-card bg-surface p-4 text-white/70">
          Helyi (Firebase nélküli) módban egyetlen admin jelszó van. Személyzeti fiókokat a Firebase beállítása után tudsz hozzáadni.
        </p>
      )}
      {data?.firebase && (
        <>
          <form onSubmit={submit} className="mt-6 grid gap-3 rounded-card bg-surface p-4 sm:grid-cols-[1fr_auto_auto]">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@pelda.hu" className="h-11 rounded-button bg-surface-2 px-3" aria-label="E-mail" />
            <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className="h-11 rounded-button bg-surface-2 px-3" aria-label="Szerepkör">
              <option value="staff">Személyzet</option>
              <option value="admin">Admin</option>
            </select>
            <button className="h-11 rounded-button bg-secondary px-4 font-bold text-white">Hozzáadás</button>
          </form>
          {link && (
            <p className="mt-3 rounded-card bg-green-500/10 p-3 text-sm break-all text-green-300">
              Küldd el neki ezt a linket, ezzel állítja be a jelszavát: <a href={link} className="underline">{link}</a>
            </p>
          )}
          <ul className="mt-6 divide-y divide-white/10 rounded-card bg-surface">
            {data.users.map((u) => (
              <li key={u.uid} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="font-bold">{u.email}</p>
                  <p className="text-sm text-text-custom-2">{u.role === "admin" ? "Admin" : "Személyzet"}</p>
                </div>
                <button onClick={() => revoke(u)} className="h-10 rounded-button px-3 text-sm text-red-300 hover:bg-red-500/10">
                  Hozzáférés elvétele
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p className="mt-3 text-red-300">{error}</p>}
    </div>
  );
}
