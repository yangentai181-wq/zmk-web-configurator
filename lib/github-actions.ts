"use client";

/**
 * Lightweight GitHub Actions API client. Only what the CI-watch
 * hook needs: list runs filtered by SHA, poll a single run, list
 * artifacts on that run, and download an artifact zip.
 *
 * Mirrors lib/github-push.ts in style — explicit token argument,
 * tight error formatting, no Octokit dependency.
 */

import type { GithubSettings } from "./github-settings";

const API = "https://api.github.com";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export type WorkflowRunStatus =
  | "queued"
  | "in_progress"
  | "requested"
  | "waiting"
  | "pending"
  | "completed";

export type WorkflowRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "stale"
  | null;

export type WorkflowRun = {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  htmlUrl: string;
  headSha: string;
  createdAt: string;
};

export type Artifact = {
  id: number;
  name: string;
  sizeBytes: number;
  expired: boolean;
};

/**
 * List workflow runs for the configured branch, optionally filtered to
 * a specific head_sha. Returns runs newest-first.
 */
export async function listRuns(
  settings: GithubSettings,
  opts: { headSha?: string; perPage?: number } = {},
): Promise<WorkflowRun[]> {
  const params = new URLSearchParams({
    branch: settings.branch,
    per_page: String(opts.perPage ?? 5),
  });
  if (opts.headSha) params.set("head_sha", opts.headSha);
  const url = `${API}/repos/${settings.owner}/${settings.repo}/actions/runs?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders(settings.token) });
  if (!res.ok) throw await formatError(res, "listRuns");
  const data = (await res.json()) as { workflow_runs: any[] };
  return data.workflow_runs.map(normalizeRun);
}

export async function getRun(
  settings: GithubSettings,
  runId: number,
): Promise<WorkflowRun> {
  const url = `${API}/repos/${settings.owner}/${settings.repo}/actions/runs/${runId}`;
  const res = await fetch(url, { headers: authHeaders(settings.token) });
  if (!res.ok) throw await formatError(res, "getRun");
  const data = await res.json();
  return normalizeRun(data);
}

export async function listArtifacts(
  settings: GithubSettings,
  runId: number,
): Promise<Artifact[]> {
  const url = `${API}/repos/${settings.owner}/${settings.repo}/actions/runs/${runId}/artifacts`;
  const res = await fetch(url, { headers: authHeaders(settings.token) });
  if (!res.ok) throw await formatError(res, "listArtifacts");
  const data = (await res.json()) as { artifacts: any[] };
  return data.artifacts.map((a) => ({
    id: a.id,
    name: a.name,
    sizeBytes: a.size_in_bytes,
    expired: a.expired,
  }));
}

/**
 * Download an artifact zip into a Blob. GitHub responds with 302 to a
 * signed asset URL, but fetch follows redirects automatically.
 */
export async function downloadArtifactZip(
  settings: GithubSettings,
  artifactId: number,
): Promise<Blob> {
  const url = `${API}/repos/${settings.owner}/${settings.repo}/actions/artifacts/${artifactId}/zip`;
  const res = await fetch(url, { headers: authHeaders(settings.token) });
  if (!res.ok) throw await formatError(res, "downloadArtifactZip");
  return await res.blob();
}

/* ---------- helpers ---------- */

function normalizeRun(data: any): WorkflowRun {
  return {
    id: data.id,
    name: data.name ?? data.display_title ?? "",
    status: data.status as WorkflowRunStatus,
    conclusion: data.conclusion as WorkflowRunConclusion,
    htmlUrl: data.html_url,
    headSha: data.head_sha,
    createdAt: data.created_at,
  };
}

async function formatError(res: Response, op: string): Promise<Error> {
  let detail = "";
  try {
    const data = (await res.json()) as { message?: string };
    detail = data.message ? `: ${data.message}` : "";
  } catch {
    // ignore
  }
  return new Error(
    `GitHub Actions ${op} ${res.status} ${res.statusText}${detail}`,
  );
}
