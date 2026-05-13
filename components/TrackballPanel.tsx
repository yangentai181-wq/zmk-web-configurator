import type { TrackballConfig } from "@/lib/types";

export function TrackballPanel({
  trackball,
  layerNames,
}: {
  trackball: TrackballConfig;
  layerNames: string[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 key-shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">🟢 Trackball</h2>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs",
            trackball.enabled
              ? "bg-teal-50 text-primary"
              : "bg-slate-100 text-ink-secondary",
          ].join(" ")}
        >
          {trackball.driver} · {trackball.enabled ? "enabled" : "disabled"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Stat
          label="Scroll Layer"
          value={
            trackball.scrollLayer != null
              ? `L${trackball.scrollLayer} ${layerNames[trackball.scrollLayer] ?? ""}`
              : "—"
          }
        />
        <Stat
          label="Auto-mouse Layer"
          value={
            trackball.automouseLayer != null
              ? `L${trackball.automouseLayer} ${layerNames[trackball.automouseLayer] ?? ""}`
              : "—"
          }
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-ink-secondary hover:text-ink-primary">
          Raw config ({trackball.settings.length} entries)
        </summary>
        <ul className="mt-2 space-y-1 text-xs">
          {trackball.settings.map((s) => (
            <li
              key={s.key}
              className="flex justify-between gap-3 border-b border-border/60 py-1"
            >
              <span className="text-ink-secondary">{s.key}</span>
              <span className="font-medium">{s.value}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-canvas p-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
