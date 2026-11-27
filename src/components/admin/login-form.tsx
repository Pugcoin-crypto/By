"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getFirebaseApp } from "@/lib/client/firebase";

export function LoginForm() {
  const firebase = getFirebaseApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let body: { idToken?: string; password?: string };
      let refreshIdToken: (() => Promise<unknown>) | null = null;
      if (firebase) {
        const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(getAuth(firebase), email, password).catch(() => null);
        if (!cred) throw new Error("Hibás e-mail cím vagy jelszó.");
        body = { idToken: await cred.user.getIdToken() };
        refreshIdToken = () => cred.user.getIdToken(true);
      } else {
        body = { password };
      }
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; refreshToken?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Sikertelen bejelentkezés.");
      // The server just granted the admin role: fetch a token that carries it (live order board).
      if (data.refreshToken && refreshIdToken) await refreshIdToken().catch(() => undefined);
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sikertelen bejelentkezés.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid w-full max-w-sm gap-4 rounded-card bg-surface p-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Erden&apos;s Kebab</h1>
        <p className="text-text-custom-2">Személyzeti belépés</p>
      </div>
      {firebase && (
        <label className="grid gap-1.5">
          <span className="text-sm text-white/80">E-mail</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-card border border-white/10 bg-primary px-4 outline-none focus:border-secondary" />
        </label>
      )}
      <label className="grid gap-1.5">
        <span className="text-sm text-white/80">Jelszó</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-card border border-white/10 bg-primary px-4 outline-none focus:border-secondary" />
      </label>
      {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
      <button disabled={busy} className="h-12 rounded-button bg-secondary font-bold text-white disabled:opacity-50">
        {busy ? "Belépés…" : "Belépés"}
      </button>
    </form>
  );
}
