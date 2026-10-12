import { NAtlasError, codeForStatus } from "./errors.js";
import { SSEParser } from "./sse.js";
/**
 * Stream server-sent events over XMLHttpRequest. React Native's fetch cannot stream response
 * bodies, but its XMLHttpRequest delivers partial `responseText` on progress events.
 */
export async function* xhrEvents(XHR, url, headers, body, timeoutMs, signal) {
    const parser = new SSEParser();
    const queue = [];
    let seen = 0;
    let finished = false;
    let failure;
    let wake;
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
    for (const [k, v] of Object.entries(headers))
        xhr.setRequestHeader(k, v);
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
        }
        else {
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
            while (queue.length)
                yield queue.shift();
            if (failure)
                throw failure;
            if (finished || parser.done)
                return;
            await new Promise((r) => (wake = r));
        }
    }
    finally {
        signal?.removeEventListener("abort", onAbort);
        if (!finished)
            xhr.abort();
    }
}
//# sourceMappingURL=xhr.js.map