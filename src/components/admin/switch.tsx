"use client";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-10 items-center gap-2 text-sm disabled:opacity-40"
    >
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-green-500" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
      <span className={checked ? "text-white/80" : "text-red-300"}>{label}</span>
    </button>
  );
}
