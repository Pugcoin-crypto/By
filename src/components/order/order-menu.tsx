"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { readLastOrder, useCart } from "@/lib/client/cart-store";
import { formatHuf } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { Badges } from "./badges";
import { CartDrawer } from "./cart-drawer";
import { BagIcon, BikeIcon, PlusIcon, SearchIcon } from "./icons";
import { useMenu, usePricedCart } from "./menu-context";
import { ProductSheet } from "./product-sheet";

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function OrderMenu() {
  const { menu } = useMenu();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id);
  const [toast, setToast] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<{ token: string; number: string } | null>(null);
  const lines = useCart();
  const { subtotal, count } = usePricedCart(lines);
  const tabsRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
  useEffect(() => setLastOrder(readLastOrder()), []);

  const sections = useMemo(() => {
    const q = fold(deferredQuery.trim());
    return menu.categories
      .map((c) => ({
        category: c,
        products: menu.products.filter(
          (p) => p.categoryId === c.id && (!q || fold(`${p.name} ${p.description ?? ""}`).includes(q)),
        ),
      }))
      .filter((s) => s.products.length > 0);
  }, [menu, deferredQuery]);

  // Highlight the tab of the section currently on screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCategory(visible.target.id.replace("kat-", ""));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    document.querySelectorAll("[data-category-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    tabsRef.current?.querySelector(`[data-tab="${activeCategory}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeCategory]);

  const onAdded = useCallback(() => {
    setOpenProduct(null);
    setToast("Hozzáadva a kosárhoz");
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const state = menu.store.state;
  const freeCities = menu.zones.filter((z) => z.fee === 0).map((z) => z.city);
  const paidZones = menu.zones.filter((z) => z.fee > 0);

  return (
    <div className="mx-auto w-full max-w-3xl pb-32">
      {/* Header */}
      <header className="px-4 pt-6">
        <Link href="/" className="text-sm text-text-custom-2 hover:text-white">
          ← Főoldal
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-wide uppercase">Erden&apos;s Kebab</h1>
        <p className="mt-1 text-text-custom-2">Monor · Online rendelés</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 rounded-card bg-surface p-3">
            <BikeIcon className="mt-0.5 shrink-0 text-secondary" />
            <div>
              <p className="font-bold">Házhozszállítás</p>
              <p className="text-text-custom-2">
                {freeCities.join(", ")}: ingyenes
                {paidZones.length > 0 && ` · ${paidZones.length} környező település: ${formatHuf(paidZones[0].fee)}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-card bg-surface p-3">
            <BagIcon className="mt-0.5 shrink-0 text-secondary" />
            <div>
              <p className="font-bold">Elvitel</p>
              <p className="text-text-custom-2">Személyes átvétel az étteremben</p>
            </div>
          </div>
        </div>

        {!state.open && (
          <p className="mt-4 rounded-card border border-secondary/50 bg-secondary/10 px-4 py-3 text-tertiary" role="status">
            {state.message}
          </p>
        )}

        {lastOrder && (
          <Link
            href={`/rendeles/kovetes/${lastOrder.token}`}
            className="mt-4 flex items-center justify-between rounded-card bg-surface px-4 py-3 hover:bg-surface-2"
          >
            <span>
              Aktuális rendelésed: <b>{lastOrder.number}</b>
            </span>
            <span className="text-secondary">Követés →</span>
          </Link>
        )}
      </header>

      {/* Sticky search + category tabs */}
      <div className="sticky top-0 z-30 mt-5 border-b border-white/10 bg-primary/95 backdrop-blur">
        <div className="px-4 pt-3">
          <label className="flex h-11 items-center gap-2 rounded-card bg-surface px-4 text-white/60 focus-within:ring-2 focus-within:ring-secondary">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés az étlapon…"
              className="h-full flex-1 bg-transparent text-white outline-none placeholder:text-white/40"
            />
          </label>
        </div>
        <div ref={tabsRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {sections.map(({ category }) => (
            <a
              key={category.id}
              data-tab={category.id}
              href={`#kat-${category.id}`}
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
                activeCategory === category.id ? "bg-secondary text-white" : "bg-surface-2 text-white/80 hover:text-white"
              }`}
            >
              {category.name}
            </a>
          ))}
        </div>
      </div>

      {/* Menu */}
      {sections.length === 0 && <p className="px-4 py-16 text-center text-white/60">Nincs találat erre: „{query}”.</p>}
      {sections.map(({ category, products }) => (
        <section key={category.id} id={`kat-${category.id}`} data-category-section className="scroll-mt-36 px-4 pt-8">
          <h2 className="text-2xl font-bold">{category.name}</h2>
          {category.description && <p className="mt-1 text-text-custom-2">{category.description}</p>}
          <ul className="mt-3 divide-y divide-white/10">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setOpenProduct(p)}
                  disabled={!p.available}
                  className="flex w-full items-center gap-4 py-4 text-left disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{p.name}</p>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-text-custom-2">{p.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-bold tabular-nums">{formatHuf(p.price)}</span>
                      {p.available ? <Badges badges={p.badges} /> : <span className="text-sm text-red-400">Elfogyott</span>}
                    </div>
                  </div>
                  {p.imageUrl ? (
                    <span className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="size-24 rounded-card object-cover" />
                      <span className="absolute -right-1 -bottom-1 grid size-10 place-items-center rounded-full bg-white text-black shadow">
                        <PlusIcon />
                      </span>
                    </span>
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-white" aria-hidden>
                      <PlusIcon />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="px-4 pt-10 text-center text-sm text-text-custom-2">
        Az ételek allergénjeiről érdeklődj az étteremben: <a href={`tel:${menu.store.phone}`} className="underline">+36 30 528 5188</a>
      </p>

      {/* Floating cart bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-card bg-secondary px-5 font-bold text-white shadow-lg shadow-black/50 transition hover:brightness-110"
          >
            <span className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-black/25 text-sm tabular-nums">{count}</span>
              Kosár megtekintése
            </span>
            <span className="tabular-nums">{formatHuf(subtotal)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-0 top-4 z-[60] mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-lg">
          {toast}
        </div>
      )}

      {openProduct && <ProductSheet product={openProduct} onClose={() => setOpenProduct(null)} onAdded={onAdded} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
