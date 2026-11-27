import { connection } from "next/server";
import type { ReactNode } from "react";
import { getPublicMenu } from "@/server/public-menu";
import { MenuProvider } from "./menu-context";

/** Loads the live menu at request time and makes it available to client components. */
export async function MenuLoader({ children }: { children: ReactNode }) {
  await connection();
  const menu = await getPublicMenu();
  return <MenuProvider menu={menu}>{children}</MenuProvider>;
}

export function MenuSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-4 pt-6" aria-busy="true" aria-label="Betöltés">
      <div className="h-8 w-56 rounded bg-surface" />
      <div className="mt-3 h-4 w-40 rounded bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-20 rounded-card bg-surface" />
        <div className="h-20 rounded-card bg-surface" />
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-surface" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mt-6 h-20 rounded-card bg-surface" />
      ))}
    </div>
  );
}
