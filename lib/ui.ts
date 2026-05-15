/**
 * Shared Tailwind class tokens, aligned with the project's ui-design.md:
 *   - Primary teal #0D9488, accent orange #F97316, canvas #F8FAFC
 *   - JetBrains Mono throughout
 *   - 48px form inputs / primary CTAs, 44px minimum tap targets
 *   - Always-on focus ring (ring-2 ring-primary ring-offset-2)
 *   - Card shadow uses shadow-sm with a slate-200 border
 *
 * Components import from here instead of hand-rolling Tailwind strings,
 * so the look stays consistent and brush-ups land in one place.
 */

const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";

export const ui = {
  /** Standard text / number input, select. 48px tall. */
  input: [
    "h-12 w-full rounded-lg border border-border bg-white px-3 text-sm",
    focusRing,
    "aria-[invalid=true]:border-status-warn",
  ].join(" "),

  /** Primary CTA — bold, teal fill. Used for Apply / Save / Connect / Download. */
  ctaPrimary: [
    "inline-flex items-center justify-center gap-1.5",
    "h-12 rounded-xl border border-primary bg-primary px-4 text-sm font-bold text-white",
    "transition hover:bg-primary-hover",
    focusRing,
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" "),

  /** Compact primary CTA for headers where 48px would dominate. 36px. */
  ctaPrimarySmall: [
    "inline-flex items-center justify-center gap-1.5",
    "h-9 rounded-lg border border-primary bg-primary px-3 text-xs font-bold text-white",
    "transition hover:bg-primary-hover",
    focusRing,
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" "),

  /** Accent CTA — orange. For Studio connect, "Done" picking, destructive-ish flows. */
  ctaAccent: [
    "inline-flex items-center justify-center gap-1.5",
    "h-9 rounded-lg border border-accent bg-accent px-3 text-xs font-bold text-white",
    "transition hover:opacity-90",
    focusRing,
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" "),

  /** Secondary action — white card with border. Cancel, Reset, etc. */
  ctaSecondary: [
    "inline-flex items-center justify-center gap-1.5",
    "h-10 rounded-lg border border-border bg-card px-3 text-sm text-ink-secondary",
    "transition hover:bg-canvas",
    focusRing,
  ].join(" "),

  /** Compact secondary for header chips / reset buttons. 36px. */
  ctaSecondarySmall: [
    "inline-flex items-center justify-center gap-1.5",
    "h-9 rounded-lg border border-border bg-card px-3 text-xs text-ink-secondary",
    "transition hover:bg-canvas",
    focusRing,
  ].join(" "),

  /** Icon-only button (×, etc.). Meets 44px tap target on touch. */
  iconButton: [
    "inline-flex items-center justify-center",
    "h-10 w-10 min-w-[44px] rounded-lg border border-border bg-card text-ink-secondary",
    "transition hover:bg-canvas",
    focusRing,
  ].join(" "),

  /** Card surface — used for the major sections (keyboard, side panel, combos). */
  card: "rounded-xl border border-border bg-card p-5 shadow-sm",

  /** Inner content card (nested inside a section). Lighter padding + canvas bg. */
  innerCard: "rounded-lg border border-border bg-canvas p-3",

  /** Status chip / informational pill. */
  chip: "inline-flex items-center gap-1 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-secondary",

  /** Status chip — positive (teal). */
  chipPrimary:
    "inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-teal-50 px-3 py-1.5 text-xs text-primary",

  /** Status chip — attention (orange). */
  chipAccent:
    "inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-orange-50 px-3 py-1.5 text-xs text-accent",

  /** Field label above an input. */
  fieldLabel: "mb-1 block text-xs uppercase tracking-widest text-ink-muted",

  /** Small caption (Recent inputreports, etc.). */
  microLabel: "text-[10px] uppercase tracking-widest text-ink-muted",
} as const;
