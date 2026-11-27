import type { Badge } from "@/lib/types";
import { FlameIcon, LeafIcon, StarIcon } from "./icons";

const STYLES: Record<Badge, { label: string; className: string; Icon: typeof StarIcon }> = {
  nepszeru: { label: "Népszerű", className: "bg-secondary/20 text-tertiary", Icon: StarIcon },
  vega: { label: "Vega", className: "bg-green-500/15 text-green-400", Icon: LeafIcon },
  csipos: { label: "Csípős", className: "bg-red-500/15 text-red-400", Icon: FlameIcon },
};

export function Badges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const s = STYLES[b];
        return (
          <span key={b} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
            <s.Icon />
            {s.label}
          </span>
        );
      })}
    </span>
  );
}
