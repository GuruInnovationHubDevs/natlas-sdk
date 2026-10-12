import type { LanguageCode } from "./languages.js";
export type Role = "system" | "user" | "assistant";
export interface Message {
    role: Role;
    content: string;
}
export interface ClientOptions {
    /**
     * Base URL of an OpenAI-compatible endpoint serving N-ATLAS, e.g. a Hugging Face Inference
     * Endpoint ("https://xyz.endpoints.huggingface.cloud") or a vLLM server ("http://localhost:8000").
     * The client calls `{baseURL}/v1/chat/completions`.
     */
    baseURL: string;
    /** Bearer token for the endpoint (e.g. a Hugging Face access token). Keep it server-side. */
    apiKey?: string;
    /** Model name sent to the endpoint. Defaults to "NCAIR1/N-ATLaS". */
    model?: string;
    /** Language used when a call does not set one. Defaults to "en". */
    defaultLanguage?: LanguageCode;
    /** Per-request timeout in milliseconds. Defaults to 60 000. */
    timeoutMs?: number;
    /** Retries for timeouts, network errors, 429 and 5xx responses. Defaults to 2. */
    maxRetries?: number;
    /** Extra headers sent with every request. */
    headers?: Record<string, string>;
    /** Custom fetch implementation (for tests, proxies or older runtimes). */
    fetch?: typeof fetch;
    /**
     * How `chatStream` reads the stream. "auto" (default) uses XMLHttpRequest on React Native and in
     * runtimes without streaming fetch, and fetch everywhere else.
     */
    transport?: "auto" | "fetch" | "xhr";
    /** Custom XMLHttpRequest constructor for the "xhr" transport (mainly for tests). */
    XMLHttpRequest?: unknown;
    /**
     * Extra fields merged into every request body, for server-specific options.
     * Example for llama.cpp servers: `{ repeat_penalty: 1.12 }`.
     */
    extraBody?: Record<string, unknown>;
}
export interface GenerationOptions {
    /** Answer language. Adds an instruction to the system prompt. */
    language?: LanguageCode;
    /** Extra system instructions, placed before the language instruction. */
    system?: string;
    /** Defaults to 0.2. N-ATLAS is recommended at low temperatures. */
    temperature?: number;
    /** Defaults to 512. */
    maxTokens?: number;
    /** Defaults to 1.12, matching the model card's recommended setting. */
    repetitionPenalty?: number;
    topP?: number;
    stop?: string[];
    /** Abort the request from outside. */
    signal?: AbortSignal;
}
export interface ChatParams extends GenerationOptions {
    messages: Message[];
}
export interface Usage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}
export interface ChatResult {
    text: string;
    finishReason?: string;
    usage?: Usage;
    /** Language the answer was requested in. */
    language: LanguageCode;
    /** Milliseconds from request start to full response. */
    latencyMs: number;
}
export interface TranslateParams extends Omit<GenerationOptions, "language"> {
    text: string;
    to: LanguageCode;
    from?: LanguageCode;
}
export interface SummarizeParams extends GenerationOptions {
    text: string;
    /** Rough target length, e.g. "3 bullet points" or "one sentence". */
    length?: string;
}
