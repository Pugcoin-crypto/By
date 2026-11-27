"use client";

import { useEffect, useRef } from "react";

const PX_PER_MM = 96 / 25.4;

/**
 * Prints the kitchen ticket on a page exactly as long as the ticket, so a PDF or
 * a sheet printer doesn't add blank paper. (Chrome ignores `size: 80mm auto`.)
 */
function printTicket(button: HTMLElement | null) {
  const ticket = document.querySelector<HTMLElement>(".ticket");
  if (ticket) {
    const buttonSpace = button ? button.offsetHeight + parseFloat(getComputedStyle(button).marginBottom || "0") : 0;
    const heightMm = Math.ceil((ticket.scrollHeight - buttonSpace) / PX_PER_MM) + 6;
    let style = document.getElementById("ticket-page-size");
    if (!style) {
      style = document.createElement("style");
      style.id = "ticket-page-size";
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: 80mm ${heightMm}mm; margin: 0; } }`;
  }
  window.print();
}

export function PrintOnLoad() {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => printTicket(button.current), 300);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <button ref={button} onClick={() => printTicket(button.current)} className="mb-3 w-full border border-black py-2 font-bold print:hidden">
      Nyomtatás
    </button>
  );
}
