import { NAtlasError, codeForStatus } from "./errors.js";
import { languageInstruction, languageName, type LanguageCode } from "./languages.js";
import { parseSSE } from "./sse.js";
import { xhrEvents, type XHRConstructor } from "./xhr.js";
import type {
  ChatParams,
  ChatResult,
  ClientOptions,
  GenerationOptions,
  Message,
  SummarizeParams,
  TranslateParams,
} from "./types.js";

const DEFAULT_MODEL = "NCAIR1/N-ATLaS";
const BASE_SYSTEM =
  "You are a helpful assistant built on N-ATLAS, a language model for Nigerian languages. " +
  "Be accurate, concise and culturally aware.";

export class NAtlas {
  private readonly baseURL: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly defaultLanguage: LanguageCode;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly transport: "auto" | "fetch" | "xhr";
  private readonly xhrCtor?: XHRConstructor;

  constructor(options: ClientOptions) {
    if (!options?.baseURL) throw new NAtlasError("baseURL is required", { code: "config" });
    this.baseURL = options.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.defaultLanguage = options.defaultLanguage ?? "en";
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.headers = options.headers ?? {};
    this.transport = options.transport ?? "auto";
    this.xhrCtor = options.XMLHttpRequest as XHRConstructor | undefined;
    const f = options.fetch ?? globalThis.fetch;
    if (!f) throw new NAtlasError("No fetch implementation available; pass options.fetch", { code: "config" });
    this.fetchImpl = f.bind(globalThis);
  }

  /** Send a conversation and get the full answer. */
  async chat(params: ChatParams): Promise<ChatResult> {
    const language = params.language ?? this.defaultLanguage;
    const started = Date.now();
    const res = await this.request(this.body(params, false), params.signal);
    let json: any;
    const raw = await res.text();
    try {
      json = JSON.parse(raw);
    } catch (cause) {
      throw new NAtlasError("Endpoint returned invalid JSON", { code: "bad_response", status: res.status, body: raw, cause });
    }
    const choice = json?.choices?.[0];
    if (typeof choice?.message?.content !== "string") {
      throw new NAtlasError("Endpoint response has no message content", { code: "bad_response", body: raw });
    }
    return {
      text: choice.message.content.trim(),
      finishReason: choice.finish_reason ?? undefined,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
      language,
      latencyMs: Date.now() - started,
    };
  }

  /** Stream the answer as text chunks. */
  async *chatStream(params: ChatParams): AsyncGenerator<string> {
    const body = this.body(params, true);
    let events: AsyncIterable<unknown>;
    if (this.useXHR()) {
      const XHR = this.xhrCtor ?? (globalThis as any).XMLHttpRequest;
      events = xhrEvents(XHR, this.url(), this.requestHeaders(true), JSON.stringify(body), this.timeoutMs, params.signal);
    } else {
      const res = await this.request(body, params.signal);
      if (!res.body) throw new NAtlasError("Endpoint returned no stream body", { code: "bad_response" });
      events = parseSSE(res.body);
    }
    for await (const event of events) {
      const delta = (event as any)?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) yield delta;
    }
  }

  /** Whether streaming should use XMLHttpRequest (React Native, or runtimes without streaming fetch). */
  private useXHR(): boolean {
    if (this.transport === "xhr") return true;
    if (this.transport === "fetch") return false;
    const hasXHR = Boolean(this.xhrCtor ?? (globalThis as any).XMLHttpRequest);
    const isReactNative = typeof navigator !== "undefined" && (navigator as any).product === "ReactNative";
    return hasXHR && (isReactNative || typeof ReadableStream === "undefined");
  }

  private url(): string {
    return `${this.baseURL}/v1/chat/completions`;
  }

  private requestHeaders(stream: boolean): Record<string, string> {
    return {
      "content-type": "application/json",
      accept: stream ? "text/event-stream" : "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      ...this.headers,
    };
  }

  /** Ask a single question. */
  async ask(prompt: string, options: GenerationOptions = {}): Promise<ChatResult> {
    return this.chat({ ...options, messages: [{ role: "user", content: prompt }] });
  }

  /** Translate text between English, Hausa, Igbo and Yoruba. */
  async translate(params: TranslateParams): Promise<ChatResult> {
    const { text, to, from, ...rest } = params;
    const source = from ? languageName(from) : "the source language";
    const system =
      `You are a professional translator. Translate the user's text from ${source} into ${languageName(to)}. ` +
      "Keep the meaning, names and numbers exactly. Reply with the translation only, without notes.";
    return this.chat({
      ...rest,
      system: rest.system ? `${system}\n${rest.system}` : system,
      language: to,
      temperature: rest.temperature ?? 0.1,
      messages: [{ role: "user", content: text }],
    });
  }

  /** Summarise text, answering in the requested language. */
  async summarize(params: SummarizeParams): Promise<ChatResult> {
    const { text, length, ...rest } = params;
    const system = `Summarise the user's text in ${length ?? "3 short bullet points"}. Keep key facts and numbers.`;
    return this.chat({
      ...rest,
      system: rest.system ? `${system}\n${rest.system}` : system,
      messages: [{ role: "user", content: text }],
    });
  }

  /** Check that the endpoint is reachable and answering. */
  async health(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const started = Date.now();
    try {
      await this.chat({ messages: [{ role: "user", content: "Reply with: OK" }], maxTokens: 5, temperature: 0 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - started, error: (e as Error).message };
    }
  }

  /** Build the OpenAI-compatible request body. Exposed for debugging and code generation. */
  body(params: ChatParams, stream: boolean): Record<string, unknown> {
    const language = params.language ?? this.defaultLanguage;
    const system = [BASE_SYSTEM, params.system, languageInstruction(language)].filter(Boolean).join("\n\n");
    const conversation: Message[] = params.messages.filter((m) => m.role !== "system");
    const callerSystem = params.messages.filter((m) => m.role === "system").map((m) => m.content);
    const messages: Message[] = [
      { role: "system", content: [system, ...callerSystem].join("\n\n") },
      ...conversation,
    ];
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 512,
      stream,
    };
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop) body.stop = params.stop;
    // Most N-ATLAS servers (TGI, vLLM) accept this as a non-standard sampling parameter.
    body.repetition_penalty = params.repetitionPenalty ?? 1.12;
    return body;
  }

  private async request(body: Record<string, unknown>, external?: AbortSignal): Promise<Response> {
    let attempt = 0;
    while (true) {
      try {
        return await this.once(body, external);
      } catch (e) {
        const err = e as NAtlasError;
        if (!(err instanceof NAtlasError) || !err.retryable || attempt >= this.maxRetries || external?.aborted) throw err;
        attempt += 1;
        await sleep(Math.min(500 * 2 ** (attempt - 1), 4000));
      }
    }
  }

  private async once(body: Record<string, unknown>, external?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("timeout")), this.timeoutMs);
    const onAbort = () => controller.abort(external?.reason);
    external?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await this.fetchImpl(this.url(), {
        method: "POST",
        headers: this.requestHeaders(Boolean(body.stream)),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new NAtlasError(`N-ATLAS endpoint returned ${res.status}: ${text.slice(0, 300)}`, {
          code: codeForStatus(res.status),
          status: res.status,
          body: text,
        });
      }
      return res;
    } catch (e) {
      if (e instanceof NAtlasError) throw e;
      if (controller.signal.aborted && !external?.aborted) {
        throw new NAtlasError(`Request timed out after ${this.timeoutMs} ms`, { code: "timeout", cause: e });
      }
      if (external?.aborted) throw new NAtlasError("Request aborted", { code: "aborted", cause: e });
      throw new NAtlasError(`Network error: ${(e as Error).message}`, { code: "network", cause: e });
    } finally {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
