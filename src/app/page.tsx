import Link from "next/link";

// Temporary home page in the erdenskebap.hu style; the layout may change later.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-wide uppercase">Erden&apos;s Kebab</h1>
      <p className="text-text-custom-2">Monor · Nyitva minden nap 10:30–20:00</p>
      <Link
        href="/rendeles"
        className="flex h-14 items-center rounded-button bg-secondary px-8 text-lg font-bold text-white transition hover:brightness-110"
      >
        Rendelj online
      </Link>
      <p className="max-w-md text-white/70">
        Házhozszállítás Monoron ingyen, Monorierdőre, Vasadra, Csévharasztra, Péteribe, Gombára és Bényére 800 Ft-ért.
      </p>
      <a href="tel:+36305285188" className="text-tertiary underline-offset-4 hover:underline">
        Rendelés telefonon: +36 30 528 5188
      </a>
    </main>
  );
}
