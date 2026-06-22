import type { AdvicePointer, Severity } from "@/lib/types";

const STYLES: Record<Severity, { badge: string; dot: string; label: string }> = {
  bad: { badge: "border-rose-900 bg-rose-950/40", dot: "bg-rose-500", label: "Fix" },
  warn: { badge: "border-amber-900 bg-amber-950/40", dot: "bg-amber-500", label: "Watch" },
  good: { badge: "border-emerald-900 bg-emerald-950/40", dot: "bg-emerald-500", label: "Keep" },
  info: { badge: "border-neutral-800 bg-neutral-900/60", dot: "bg-neutral-500", label: "Note" },
};

export function Pointers({ pointers }: { pointers: AdvicePointer[] }) {
  return (
    <div className="space-y-2">
      {pointers.map((p) => {
        const s = STYLES[p.severity];
        return (
          <div key={p.id} className={`rounded-xl border p-3 ${s.badge}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                {s.label}
              </span>
              <span className="font-semibold">{p.title}</span>
            </div>
            <p className="mt-1 pl-4 text-sm text-neutral-300">{p.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
