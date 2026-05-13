import type { Binding, EncoderConfig, SensorConfig } from "@/lib/types";
import { describe } from "@/lib/zmk-bindings";

export function EncoderPanel({
  encoder,
  sensors,
  sensorBindings,
  layerNames,
}: {
  encoder: EncoderConfig;
  sensors: SensorConfig[];
  sensorBindings: Binding | null;
  layerNames: string[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 key-shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">🟠 Rotary Encoder</h2>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs",
            encoder.enabled
              ? "bg-orange-50 text-accent"
              : "bg-slate-100 text-ink-secondary",
          ].join(" ")}
        >
          {encoder.driver} · {encoder.enabled ? "enabled" : "disabled"}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-canvas p-3 text-sm">
        <div className="text-[10px] uppercase tracking-widest text-ink-muted">
          Current Layer sensor-bindings
        </div>
        {sensorBindings ? (
          <pre className="mt-1 whitespace-pre-wrap font-medium">
            {describe(sensorBindings, layerNames)}
          </pre>
        ) : (
          <div className="mt-1 text-ink-secondary">
            ▽ (transparent / inherits)
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {sensors.map((s) => (
          <div
            key={s.ref}
            className="rounded-lg border border-border bg-canvas p-3"
          >
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              {s.ref}
            </div>
            <div className="mt-1 text-sm font-medium">{s.name}</div>
            <div className="mt-1 text-xs text-ink-secondary">
              {s.compatible ?? "—"} · {s.enabled ? "enabled" : "disabled"}
            </div>
          </div>
        ))}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-ink-secondary hover:text-ink-primary">
          Raw config ({encoder.settings.length} entries)
        </summary>
        <ul className="mt-2 space-y-1 text-xs">
          {encoder.settings.map((s) => (
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
