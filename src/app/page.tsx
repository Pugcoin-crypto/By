// Temporary home page. The menu and ordering UI arrive in step 2.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-wide uppercase">Erden&apos;s Kebab</h1>
      <p className="text-text-custom-2">Monor · Nyitva minden nap 10:30–20:00</p>
      <p className="max-w-md text-tertiary">Az online rendelés hamarosan indul.</p>
      <a
        href="tel:+36305285188"
        className="rounded-button bg-secondary px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
      >
        Rendelés telefonon: +36 30 528 5188
      </a>
    </main>
  );
}
