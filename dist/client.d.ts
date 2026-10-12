import type { ChatParams, ChatResult, ClientOptions, GenerationOptions, SummarizeParams, TranslateParams } from "./types.js";
export declare class NAtlas {
    private readonly baseURL;
    private readonly apiKey?;
    private readonly model;
    private readonly defaultLanguage;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly headers;
    private readonly fetchImpl;
    private readonly transport;
    private readonly extraBody;
    private readonly xhrCtor?;
    constructor(options: ClientOptions);
    /** Send a conversation and get the full answer. */
    chat(params: ChatParams): Promise<ChatResult>;
    /** Stream the answer as text chunks. */
    chatStream(params: ChatParams): AsyncGenerator<string>;
    /** Whether streaming should use XMLHttpRequest (React Native, or runtimes without streaming fetch). */
    private useXHR;
    private url;
    private requestHeaders;
    /** Ask a single question. */
    ask(prompt: string, options?: GenerationOptions): Promise<ChatResult>;
    /** Translate text between English, Hausa, Igbo and Yoruba. */
    translate(params: TranslateParams): Promise<ChatResult>;
    /** Summarise text, answering in the requested language. */
    summarize(params: SummarizeParams): Promise<ChatResult>;
    /** Check that the endpoint is reachable and answering. */
    health(): Promise<{
        ok: boolean;
        latencyMs: number;
        error?: string;
    }>;
    /** Build the OpenAI-compatible request body. Exposed for debugging and code generation. */
    body(params: ChatParams, stream: boolean): Record<string, unknown>;
    private request;
    private once;
}
