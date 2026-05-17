"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { readGithubSettings, type GithubSettings } from "./github-settings";
import {
  downloadArtifactZip,
  getRun,
  listArtifacts,
  listRuns,
  type WorkflowRun,
} from "./github-actions";

/**
 * Status states surfaced to the UI. `searching` is the initial state
 * while we're looking for the workflow run that GitHub spawned from
 * our commit; once we have its id we transition to `queued`/
 * `in_progress` and finally `completed` (success/failure).
 */
export type CiWatchStatus =
  | "idle"
  | "searching"
  | "queued"
  | "in_progress"
  | "success"
  | "failure"
  | "not_found"
  | "error";

export type UnzippedFile = {
  name: string;
  blobUrl: string;
  sizeBytes: number;
};

export type CiWatchState = {
  status: CiWatchStatus;
  run: WorkflowRun | null;
  /** Wall-clock seconds since watch start. */
  elapsedSec: number;
  /** Unzipped artifact files (each .uf2 etc.) ready for download. */
  files: UnzippedFile[];
  error: string | null;
};

const SEARCH_INITIAL_DELAY_MS = 3_000;
const POLL_INTERVAL_MS = 10_000;
const SEARCH_RETRIES = 6; // ~1 min looking for the run after push
const OVERALL_TIMEOUT_MS = 30 * 60_000; // 30 min hard cap

export function useCiWatch(): {
  state: CiWatchState;
  start: (commitSha: string) => void;
  cancel: () => void;
} {
  const [state, setState] = useState<CiWatchState>(initialState);
  const cancelRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setState((s) =>
      s.status === "in_progress" ||
      s.status === "queued" ||
      s.status === "searching"
        ? { ...s, status: "idle" }
        : s,
    );
  }, []);

  const start = useCallback((commitSha: string) => {
    cancelRef.current?.();
    // Reset state. Existing blob URLs are revoked because they'll
    // never be relevant to the new run.
    setState((prev) => {
      for (const f of prev.files) URL.revokeObjectURL(f.blobUrl);
      return { ...initialState(), status: "searching" };
    });

    const ctrl = new AbortController();
    const startedAt = Date.now();
    cancelRef.current = () => ctrl.abort();
    void watch({
      commitSha,
      settings: readGithubSettings(),
      signal: ctrl.signal,
      onState: (next) =>
        setState((prev) => ({
          ...prev,
          ...next,
          elapsedSec: Math.floor((Date.now() - startedAt) / 1000),
        })),
    });
  }, []);

  // Ticker so elapsedSec updates the UI even between polls.
  useEffect(() => {
    if (state.status === "idle") return;
    const id = setInterval(() => {
      setState((s) => ({ ...s, elapsedSec: s.elapsedSec + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  // Revoke blob URLs on unmount so we don't leak memory across navs.
  useEffect(() => {
    return () => {
      for (const f of state.files) URL.revokeObjectURL(f.blobUrl);
      cancelRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, start, cancel };
}

function initialState(): CiWatchState {
  return {
    status: "idle",
    run: null,
    elapsedSec: 0,
    files: [],
    error: null,
  };
}

async function watch(opts: {
  commitSha: string;
  settings: GithubSettings;
  signal: AbortSignal;
  onState: (next: Partial<CiWatchState>) => void;
}): Promise<void> {
  const { commitSha, settings, signal, onState } = opts;
  const start = Date.now();

  // 1. Find the run by head_sha. GitHub takes a few seconds to schedule
  // a new workflow after a push, so the first few attempts may return 0.
  await sleep(SEARCH_INITIAL_DELAY_MS, signal);
  if (signal.aborted) return;

  let run: WorkflowRun | null = null;
  for (let attempt = 0; attempt < SEARCH_RETRIES; attempt++) {
    if (signal.aborted) return;
    try {
      const runs = await listRuns(settings, { headSha: commitSha, perPage: 5 });
      if (runs.length > 0) {
        run = runs[0];
        break;
      }
    } catch (e) {
      onState({ status: "error", error: String(e) });
      return;
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  if (!run) {
    onState({ status: "not_found" });
    return;
  }

  onState({ status: mapStatus(run), run });

  // 2. Poll the run until it completes or we hit the global timeout.
  while (Date.now() - start < OVERALL_TIMEOUT_MS) {
    if (signal.aborted) return;
    await sleep(POLL_INTERVAL_MS, signal);
    if (signal.aborted) return;
    try {
      run = await getRun(settings, run!.id);
    } catch (e) {
      onState({ status: "error", error: String(e), run });
      return;
    }
    onState({ status: mapStatus(run), run });
    if (run.status === "completed") break;
  }

  if (!run || run.status !== "completed") {
    onState({ status: "error", error: "Timed out waiting for CI", run });
    return;
  }

  if (run.conclusion !== "success") {
    onState({ status: "failure", run });
    return;
  }

  // 3. Fetch and unzip the artifact(s). For the minimal-keys repo there's
  // typically a single "firmware" artifact bundling R / L / settings_reset.
  try {
    const artifacts = await listArtifacts(settings, run.id);
    const files: UnzippedFile[] = [];
    for (const artifact of artifacts) {
      if (artifact.expired) continue;
      const blob = await downloadArtifactZip(settings, artifact.id);
      const zip = await JSZip.loadAsync(blob);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const fileBlob = await entry.async("blob");
        const niceName = entry.name.split("/").pop() ?? entry.name;
        files.push({
          name: niceName,
          blobUrl: URL.createObjectURL(fileBlob),
          sizeBytes: fileBlob.size,
        });
      }
    }
    onState({ status: "success", run, files });
  } catch (e) {
    onState({ status: "error", error: String(e), run });
  }
}

function mapStatus(run: WorkflowRun): CiWatchStatus {
  if (run.status === "completed") {
    return run.conclusion === "success" ? "success" : "failure";
  }
  if (
    run.status === "queued" ||
    run.status === "pending" ||
    run.status === "waiting"
  ) {
    return "queued";
  }
  return "in_progress";
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
