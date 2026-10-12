import { NAtlasError, codeForStatus } from "./errors.js";
import { SSEParser } from "./sse.js";

/** Minimal shape of XMLHttpRequest used here (React Native, browsers). */
export interface XHRLike {
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body: string): void;
  abort(): void;
  readonly status: number;
  readonly responseText: string;
  timeout: number;
  onprogress: ((ev?: unknown) => void) | null;
  onload: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  ontimeout: ((ev?: unknown) => void) | null;
}

export type XHRConstructor = new () => XHRLike;

/**
 * Stream server-sent events over XMLHttpRequest. React Native's fetch cannot stream response
 * bodies, but its XMLHttpRequest delivers partial `responseText` on progress events.
 */
export async function* xhrEvents(
  XHR: XHRConstructor,
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
  signal?: AbortSignal,
): AsyncGenerator<unknown> {
  const parser = new SSEParser();
  const queue: unknown[] = [];
  let seen = 0;
  let finished = false;
  let failure: NAtlasError | undefined;
  let wake: (() => void) | undefined;
  const notify = () => {
    wake?.();
    wake = undefined;
  };

  const xhr = new XHR();
  const take = () => {
    const text = xhr.responseText ?? "";
    if (text.length > seen && xhr.status >= 200 && xhr.status < 300) {
      queue.push(...parser.push(text.slice(seen)));
      seen = text.length;
    }
  };
  xhr.open("POST", url);
  for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
  xhr.timeout = timeoutMs;
  xhr.onprogress = () => {
    take();
    notify();
  };
  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      failure = new NAtlasError(`N-ATLAS endpoint returned ${xhr.status}: ${(xhr.responseText ?? "").slice(0, 300)}`, {
        code: codeForStatus(xhr.status),
        status: xhr.status,
        body: xhr.responseText,
      });
    } else {
      take();
      queue.push(...parser.flush());
    }
    finished = true;
    notify();
  };
  xhr.onerror = () => {
    failure = new NAtlasError("Network error", { code: "network" });
    finished = true;
    notify();
  };
  xhr.ontimeout = () => {
    failure = new NAtlasError(`Request timed out after ${timeoutMs} ms`, { code: "timeout" });
    finished = true;
    notify();
  };
  const onAbort = () => {
    xhr.abort();
    failure = new NAtlasError("Request aborted", { code: "aborted" });
    finished = true;
    notify();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  xhr.send(body);

  try {
    while (true) {
      while (queue.length) yield queue.shift();
      if (failure) throw failure;
      if (finished || parser.done) return;
      await new Promise<void>((r) => (wake = r));
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (!finished) xhr.abort();
  }
}
