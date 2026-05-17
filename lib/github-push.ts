"use client";

/**
 * Minimal GitHub Contents API wrapper for committing text files
 * straight from the browser. We deliberately avoid Octokit so the
 * client stays small and the request shape is obvious in DevTools.
 *
 * Token is passed in explicitly (read from settings by the caller),
 * never read from any global, so a misconfigured component can't
 * leak credentials.
 */

import type { GithubSettings } from "./github-settings";

export type PushResult = {
  ok: boolean;
  /** SHA of the resulting commit. Needed downstream so a CI watcher
   * can filter workflow_runs by head_sha. */
  commitSha?: string;
  /** URL of the resulting commit on github.com, if any. */
  commitUrl?: string;
  /** URL of the Actions tab for the target repo so the user can
   * watch the build that the push (probably) triggered. */
  actionsUrl?: string;
  error?: string;
  /** HTTP status from GitHub, useful for distinguishing auth /
   * permission / not-found errors. */
  status?: number;
};

export type GithubFileMeta = {
  sha: string;
  /** github.com URL for inspection. */
  htmlUrl?: string;
};

const API = "https://api.github.com";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Look up the current SHA of a file. Returns null on 404 (file
 * doesn't exist yet — that's fine, PUT will create it).
 */
export async function getFileSha(
  settings: GithubSettings,
  path: string,
): Promise<GithubFileMeta | null> {
  const url = `${API}/repos/${settings.owner}/${settings.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(settings.branch)}`;
  const res = await fetch(url, { headers: authHeaders(settings.token) });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw await formatHttpError(res, "getFileSha");
  }
  const data = (await res.json()) as { sha: string; html_url?: string };
  return { sha: data.sha, htmlUrl: data.html_url };
}

/**
 * Create or update a text file. If `sha` is omitted, we fetch it
 * first; this keeps callers from accidentally overwriting newer
 * commits.
 */
export async function putFile(
  settings: GithubSettings,
  path: string,
  content: string,
  message: string,
  preFetchedSha?: string | null,
): Promise<PushResult> {
  try {
    let sha = preFetchedSha;
    if (sha === undefined) {
      const meta = await getFileSha(settings, path);
      sha = meta?.sha ?? null;
    }

    const url = `${API}/repos/${settings.owner}/${settings.repo}/contents/${encodePath(path)}`;
    const body: Record<string, unknown> = {
      message,
      content: encodeBase64Utf8(content),
      branch: settings.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        ...authHeaders(settings.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await formatHttpError(res, "putFile");
      return { ok: false, error: err.message, status: res.status };
    }
    const data = (await res.json()) as {
      commit?: { sha?: string; html_url?: string };
    };
    return {
      ok: true,
      commitSha: data.commit?.sha,
      commitUrl: data.commit?.html_url,
      actionsUrl: `https://github.com/${settings.owner}/${settings.repo}/actions`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Probe the repo with a cheap GET so the settings UI can show a
 * green/red indicator without modifying anything.
 */
export async function testConnection(
  settings: GithubSettings,
): Promise<PushResult> {
  try {
    const url = `${API}/repos/${settings.owner}/${settings.repo}`;
    const res = await fetch(url, { headers: authHeaders(settings.token) });
    if (!res.ok) {
      const err = await formatHttpError(res, "testConnection");
      return { ok: false, error: err.message, status: res.status };
    }
    return {
      ok: true,
      actionsUrl: `https://github.com/${settings.owner}/${settings.repo}/actions`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/* ---------- helpers ---------- */

function encodePath(p: string): string {
  return p
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeBase64Utf8(text: string): string {
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  // Older runtimes: fall back to URI-component dance.
  return btoa(unescape(encodeURIComponent(text)));
}

async function formatHttpError(res: Response, op: string): Promise<Error> {
  let detail = "";
  try {
    const data = (await res.json()) as { message?: string };
    detail = data.message ? `: ${data.message}` : "";
  } catch {
    // ignore body parse failures
  }
  return new Error(`GitHub ${op} ${res.status} ${res.statusText}${detail}`);
}
