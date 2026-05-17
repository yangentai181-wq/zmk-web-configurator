"use client";

/**
 * GitHub push settings, persisted to localStorage. The PAT lives in
 * the same blob as the other knobs since (a) this app is single-user
 * by design, (b) the alternative would be a OAuth App which needs a
 * server, and (c) we strongly recommend a Fine-grained PAT with
 * only `Contents: Read and write` on the target repo, narrowing
 * blast radius if the page ever gets compromised.
 */

const STORAGE_KEY = "zmk-configurator.github-settings";

export type GithubSettings = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  keymapPath: string;
  confPath: string;
};

export const DEFAULT_GITHUB_SETTINGS: GithubSettings = {
  token: "",
  owner: "yangentai181-wq",
  repo: "minimal-keys-release",
  branch: "feature/raw-hid-monitor",
  keymapPath: "config/minimal-keys.keymap",
  confPath: "config/boards/shields/minimal-keys/minimal-keys_R.conf",
};

export function readGithubSettings(): GithubSettings {
  if (typeof window === "undefined") return { ...DEFAULT_GITHUB_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GITHUB_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GithubSettings>;
    return { ...DEFAULT_GITHUB_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_GITHUB_SETTINGS };
  }
}

export function writeGithubSettings(settings: GithubSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private browsing). Silently skip;
    // the in-memory state still works for the current session.
  }
}

export function clearGithubSettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isGithubSettingsComplete(s: GithubSettings): boolean {
  return !!(s.token && s.owner && s.repo && s.branch);
}
