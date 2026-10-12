# natlas-js

**SDKs for JavaScript/TypeScript, React Native and Flutter, plus a web playground, for [N-ATLAS](https://huggingface.co/NCAIR1/N-ATLaS), Nigeria's multilingual language model for English, Hausa, Igbo and Yoruba.**

N-ATLAS is open, but building with it from the stacks most Nigerian web and mobile developers use has meant writing your own HTTP calls, prompt formats, streaming parsers and retry logic. This repository gives you all of that with the same API on every platform, plus a playground to try the model before you write any code.

| Platform | Package | Guide |
|---|---|---|
| Node, browsers, edge runtimes | `natlas-js` (this folder) | below |
| React Native (Expo or bare) | `natlas-js`, with automatic streaming over XMLHttpRequest | [docs/REACT_NATIVE.md](docs/REACT_NATIVE.md) |
| Flutter and Dart | `natlas` | [dart/README.md](dart/README.md) |

**Live playground: https://natlas.guruhub.ng** · [Yoruba version of this guide](docs/README.yo.md) · [Architecture](docs/ARCHITECTURE.md) · [Run N-ATLAS on an endpoint](docs/DEPLOY_NATLAS.md) · [Beta testing](docs/BETA_TESTING.md)

---

## Features

- **One client for any N-ATLAS server**: Hugging Face Inference Endpoints, vLLM or Text Generation Inference (anything OpenAI-compatible)
- **Language-aware prompts**: pass `language: "ha" | "ig" | "yo" | "en"` and the SDK tells the model to answer in that language
- **Streaming**: `for await (const chunk of natlas.chatStream(...))`
- **Helpers**: `ask`, `translate`, `summarize`, `health`, and `guessLanguage` for routing user input
- **Production basics**: timeouts, retries with backoff on 429/5xx, typed `NAtlasError`, abort signals
- **Zero runtime dependencies**: works in Node 18+, Deno, Bun, edge runtimes and the browser
- **Playground**: chat, translate and summarise in all four languages, with the matching SDK code shown live

## Install

```bash
npm install natlas-js
```

Until the package is published to npm, install it straight from the repository:

```bash
npm install github:GuruInnovationHubDevs/natlas-sdk
```

## Quick start

```js
import { NAtlas } from "natlas-js";

const natlas = new NAtlas({
  baseURL: process.env.NATLAS_BASE_URL, // your N-ATLAS endpoint
  apiKey: process.env.NATLAS_API_KEY,   // e.g. a Hugging Face token
});

// Ask in English, answer in Hausa
const { text } = await natlas.ask("What are the early signs of malaria?", { language: "ha" });
console.log(text);

// Translate
const t = await natlas.translate({ text: "Wash your hands before eating.", from: "en", to: "yo" });
console.log(t.text);

// Stream a conversation
for await (const chunk of natlas.chatStream({
  messages: [{ role: "user", content: "Kedu ka m ga-esi chekwaa ego m?" }],
  language: "ig",
})) {
  process.stdout.write(chunk);
}
```

Keep the token on your server. In a browser app, call your own backend (like the playground does) rather than the N-ATLAS endpoint directly.

## API

### `new NAtlas(options)`

| Option | Default | Description |
|---|---|---|
| `baseURL` | required | Endpoint root. The SDK calls `{baseURL}/v1/chat/completions` |
| `apiKey` | none | Sent as `Authorization: Bearer ...` |
| `model` | `"NCAIR1/N-ATLaS"` | Model name sent to the endpoint |
| `defaultLanguage` | `"en"` | Used when a call doesn't set `language` |
| `timeoutMs` | `60000` | Per request |
| `maxRetries` | `2` | For timeouts, network errors, 429 and 5xx |
| `headers` | `{}` | Extra headers |
| `fetch` | global `fetch` | Custom fetch, for tests or proxies |

### Methods

| Method | Returns | Description |
|---|---|---|
| `chat({ messages, language?, system?, temperature?, maxTokens?, signal? })` | `ChatResult` | Full answer: `{ text, language, latencyMs, usage, finishReason }` |
| `chatStream(params)` | `AsyncGenerator<string>` | Text chunks as they arrive |
| `ask(prompt, options?)` | `ChatResult` | Single question |
| `translate({ text, to, from? })` | `ChatResult` | Translation between the four languages |
| `summarize({ text, language?, length? })` | `ChatResult` | Summary in the chosen language |
| `health()` | `{ ok, latencyMs, error? }` | Checks the endpoint is answering |

### Utilities

- `LANGUAGES`: the supported languages and their names
- `guessLanguage(text)`: a quick heuristic guess (`"en" | "ha" | "ig" | "yo"`) for routing input
- `ATTRIBUTION`: the attribution string to show in products built on N-ATLAS

### Errors

Every failure throws `NAtlasError` with `code` (`unauthorized`, `rate_limited`, `model_loading`, `timeout`, `network`, `bad_response`, ...), `status` and `retryable`.

```js
try {
  await natlas.ask("Hello");
} catch (e) {
  if (e.code === "model_loading") console.log("The endpoint is waking up; try again shortly.");
}
```

## Playground

```bash
cp .env.example .env.local   # add your endpoint URL and token
npm install
npm run playground           # http://localhost:3000
```

Run `NATLAS_MOCK=1 npm run playground` to work on the UI without an endpoint. The playground keeps your token on the server, logs anonymous usage (mode, language, timing, never the text) and collects beta-tester feedback in `playground/data/`.

## Public demo endpoint

For trying the SDK without your own server, `https://natlas.guruhub.ng` accepts SDK calls without a token (rate-limited, CPU-hosted, so allow 15–90 s per answer):

```js
const natlas = new NAtlas({ baseURL: "https://natlas.guruhub.ng", timeoutMs: 180_000 });
```

## Running N-ATLAS

N-ATLAS has no public hosted API yet, so you need an endpoint. The quickest route is a Hugging Face Inference Endpoint on a single GPU. See [docs/DEPLOY_NATLAS.md](docs/DEPLOY_NATLAS.md).

## Development

```bash
npm install
npm test        # builds, then runs the test suite against a mock N-ATLAS server
```

## Contributing

Contributions are welcome, from docs and translations to code. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence and attribution

`natlas-js` is MIT-licensed. N-ATLAS itself is released by NCAIR and Awarri Technologies under its own licence, which is free for products with up to 1,000 monthly active users and requires attribution. Read the [model licence](https://huggingface.co/NCAIR1/N-ATLaS) before shipping.

Built by [Guru Innovation Hub](https://guruhub.ng), Calabar, Nigeria.
