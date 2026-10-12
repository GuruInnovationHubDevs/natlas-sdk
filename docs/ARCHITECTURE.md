# Architecture

```
┌────────────────────┐      HTTPS (OpenAI-compatible)      ┌──────────────────────────┐
│  Your app / server │ ──────────────────────────────────▶ │  N-ATLAS endpoint        │
│  natlas-js client  │   POST /v1/chat/completions         │  (HF Inference Endpoint, │
│                    │ ◀────────────────────────────────── │   vLLM or TGI on a GPU)  │
└────────────────────┘     JSON or server-sent events      │  NCAIR1/N-ATLaS weights  │
        ▲                                                  └──────────────────────────┘
        │ same SDK
┌────────────────────┐   fetch /api/generate (SSE)    ┌──────────────────┐
│ Playground server  │ ◀──────────────────────────── │ Browser UI        │
│ playground/        │ ─────────────────────────────▶ │ index.html        │
│ - token stays here │                                │ chat · translate  │
│ - usage + feedback │                                │ summarise · code  │
│   logs (JSONL)     │                                └──────────────────┘
└────────────────────┘
```

## SDK layers (`src/`)

| File | Responsibility |
|---|---|
| `client.ts` | `NAtlas` class: builds requests, applies language instructions, timeouts, retries, streaming |
| `languages.ts` | Supported languages, language instructions, `guessLanguage` heuristic |
| `sse.ts` | Parses server-sent events from streaming responses |
| `errors.ts` | `NAtlasError` with machine-readable codes and `retryable` |
| `types.ts` | Public types |

## Request flow

1. The caller passes messages and an optional `language`.
2. The client merges a base system prompt, any caller instructions and a language instruction ("Respond only in Hausa…") into one system message. N-ATLAS follows a single system message more reliably.
3. The request goes to `{baseURL}/v1/chat/completions` with the model's recommended sampling (low temperature, repetition penalty 1.12).
4. Retryable failures (timeouts, network errors, 429, 5xx, including "model loading" 503s from scaled-to-zero endpoints) are retried with exponential backoff.
5. Non-streaming calls return text, usage and latency. Streaming calls yield text chunks as they arrive.

## Design choices

- **OpenAI-compatible protocol**: N-ATLAS has no official hosted API, and the common ways to serve it (Hugging Face Inference Endpoints, TGI, vLLM) all speak this protocol. One client therefore works with every hosting option.
- **No dependencies**: uses the platform `fetch`, `ReadableStream` and `AbortController`, so it runs anywhere modern JavaScript runs.
- **Server-side tokens**: the playground shows the pattern we recommend: browser → your server → N-ATLAS.
- **Privacy**: the playground's usage log records mode, language, sizes and timing only, never prompt or answer text.
