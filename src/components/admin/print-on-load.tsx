"use client";

import { useEffect } from "react";

export function PrintOnLoad() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <button onClick={() => window.print()} className="mb-3 w-full border border-black py-2 font-bold print:hidden">
      Nyomtatás
    </button>
  );
}
