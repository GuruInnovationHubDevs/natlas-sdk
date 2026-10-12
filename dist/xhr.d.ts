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
export declare function xhrEvents(XHR: XHRConstructor, url: string, headers: Record<string, string>, body: string, timeoutMs: number, signal?: AbortSignal): AsyncGenerator<unknown>;
