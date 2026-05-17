"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/ui";
import {
  DEFAULT_GITHUB_SETTINGS,
  readGithubSettings,
  writeGithubSettings,
  clearGithubSettings,
  type GithubSettings,
} from "@/lib/github-settings";
import { testConnection } from "@/lib/github-push";

/**
 * Settings modal for the GitHub push target. Opens from the ⚙️
 * button in the header. Doesn't store anything globally; the
 * parent re-reads settings via `readGithubSettings()` whenever it
 * needs them (cheap, sync).
 */
export function GithubSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GithubSettings>(DEFAULT_GITHUB_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; message: string } | { ok: false; message: string } | null
  >(null);

  useEffect(() => {
    if (open) {
      setDraft(readGithubSettings());
      setTestResult(null);
    }
  }, [open]);

  if (!open) return null;

  function update<K extends keyof GithubSettings>(
    key: K,
    value: GithubSettings[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  }

  async function onTest() {
    setTesting(true);
    const r = await testConnection(draft);
    setTesting(false);
    setTestResult(
      r.ok
        ? { ok: true, message: `Connected — ${draft.owner}/${draft.repo}` }
        : { ok: false, message: r.error ?? "Unknown error" },
    );
  }

  function onSave() {
    writeGithubSettings(draft);
    onClose();
  }

  function onClear() {
    clearGithubSettings();
    setDraft({ ...DEFAULT_GITHUB_SETTINGS });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="GitHub settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">⚙️ GitHub Push Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={ui.iconButton}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-xs text-ink-secondary">
          Push edited .keymap / .conf directly to a GitHub repo and watch the
          resulting CI build. Use a <strong>Fine-grained PAT</strong> scoped to{" "}
          <code className="rounded bg-canvas px-1">
            Contents: Read and write
          </code>{" "}
          (for pushing) and{" "}
          <code className="rounded bg-canvas px-1">Actions: Read</code> (for
          watching the build and downloading UF2 artifacts), both on this one
          repo. The token is kept in localStorage on this device only — not
          transmitted anywhere except api.github.com.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Personal Access Token (PAT)">
            <input
              type="password"
              autoComplete="off"
              value={draft.token}
              onChange={(e) => update("token", e.target.value)}
              placeholder="github_pat_…"
              className={`${ui.input} font-mono`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <input
                value={draft.owner}
                onChange={(e) => update("owner", e.target.value.trim())}
                className={ui.input}
              />
            </Field>
            <Field label="Repo">
              <input
                value={draft.repo}
                onChange={(e) => update("repo", e.target.value.trim())}
                className={ui.input}
              />
            </Field>
          </div>

          <Field label="Branch">
            <input
              value={draft.branch}
              onChange={(e) => update("branch", e.target.value.trim())}
              className={ui.input}
            />
          </Field>

          <Field label=".keymap path">
            <input
              value={draft.keymapPath}
              onChange={(e) => update("keymapPath", e.target.value.trim())}
              className={`${ui.input} font-mono text-xs`}
            />
          </Field>

          <Field label=".conf path (R-side)">
            <input
              value={draft.confPath}
              onChange={(e) => update("confPath", e.target.value.trim())}
              className={`${ui.input} font-mono text-xs`}
            />
          </Field>
        </div>

        {testResult && (
          <div
            className={[
              "mt-3 rounded-lg border px-3 py-2 text-xs",
              testResult.ok
                ? "border-primary/30 bg-teal-50 text-primary"
                : "border-status-warn/30 bg-red-50 text-status-warn",
            ].join(" ")}
          >
            {testResult.ok ? "✅ " : "❌ "}
            {testResult.message}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClear}
            className={ui.ctaSecondarySmall}
            title="Forget all settings (clears token from localStorage)"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onTest}
              disabled={testing || !draft.token || !draft.owner || !draft.repo}
              className={ui.ctaSecondary}
            >
              {testing ? "Testing…" : "Test"}
            </button>
            <button type="button" onClick={onSave} className={ui.ctaPrimary}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={ui.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
