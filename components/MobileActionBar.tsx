"use client";

import type { ReactNode } from "react";
import { ui } from "@/lib/ui";

/**
 * Sticky bottom action bar shown only on `< md` widths. The parent
 * decides what to put inside based on the current editing context
 * (idle / picking combo keys / form open), so this component stays
 * dumb — it just provides the fixed positioning, safe-area padding,
 * and the standard slot layout (info on the left, primary +
 * secondary on the right).
 *
 * For desktop the bar is hidden via `md:hidden`, and the page's
 * <main> reserves `pb-24` so the last section isn't covered.
 */
export function MobileActionBar({
  info,
  primary,
  secondary,
}: {
  info?: ReactNode;
  primary?: {
    label: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  };
  secondary?: {
    label: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
  };
}) {
  if (!primary && !secondary && !info) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      role="toolbar"
      aria-label="primary actions"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3 pb-safe">
        {info && (
          <div className="min-w-0 flex-1 truncate text-xs text-ink-secondary">
            {info}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              disabled={secondary.disabled}
              title={secondary.title}
              className={ui.ctaSecondary}
            >
              {secondary.label}
            </button>
          )}
          {primary && (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              title={primary.title}
              className={ui.ctaPrimary}
            >
              {primary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
