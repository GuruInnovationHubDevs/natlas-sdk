/** Incremental parser for text/event-stream data. Feed it text, get back the JSON payloads of complete events. */
export class SSEParser {
  private buffer = "";
  /** Set once the stream sends `data: [DONE]`. */
  done = false;

  push(text: string): unknown[] {
    this.buffer += text;
    const out: unknown[] = [];
    let boundary: number;
    while (!this.done && (boundary = this.buffer.search(/\r?\n\r?\n/)) !== -1) {
      const event = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary).replace(/^\r?\n\r?\n/, "");
      this.handle(event, out);
    }
    return out;
  }

  flush(): unknown[] {
    const out: unknown[] = [];
    if (!this.done && this.buffer.trim()) this.handle(this.buffer, out);
    this.buffer = "";
    return out;
  }

  private handle(event: string, out: unknown[]): void {
    const lines = event.split(/\r?\n/).filter((l) => l.startsWith("data:"));
    if (lines.length === 0) return;
    const payload = lines.map((l) => l.slice(5).trimStart()).join("\n");
    if (payload === "[DONE]") {
      this.done = true;
      return;
    }
    out.push(JSON.parse(payload));
  }
}

/** Parse a fetch response body (ReadableStream) into event payloads. */
export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  try {
    while (!parser.done) {
      const { value, done } = await reader.read();
      if (done) break;
      yield* parser.push(decoder.decode(value, { stream: true }));
    }
    yield* parser.flush();
  } finally {
    reader.releaseLock();
  }
}
