// N-ATLAS Playground server: serves the UI and proxies requests to an N-ATLAS endpoint
// through the natlas-js SDK, so the endpoint token never reaches the browser.
//
//   NATLAS_BASE_URL=... NATLAS_API_KEY=... npm run playground
//   NATLAS_MOCK=1 npm run playground        # UI development without an endpoint
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LANGUAGES, NAtlas, NAtlasError, isLanguageCode } from "../dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(here, "..", ".env.local"));

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const MOCK = process.env.NATLAS_MOCK === "1";
const DATA_DIR = process.env.PLAYGROUND_DATA_DIR ?? path.join(here, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

if (!MOCK && !process.env.NATLAS_BASE_URL) {
  console.error("Set NATLAS_BASE_URL (and NATLAS_API_KEY) in .env.local, or run with NATLAS_MOCK=1.");
  process.exit(1);
}

const client = new NAtlas({
  baseURL: MOCK ? "http://mock.invalid" : process.env.NATLAS_BASE_URL,
  apiKey: process.env.NATLAS_API_KEY,
  model: process.env.NATLAS_MODEL,
  timeoutMs: 120_000,
  fetch: MOCK ? mockFetch : undefined,
});

const MODES = ["chat", "translate", "summarize"];
const MAX_TOKENS = Number(process.env.PLAYGROUND_MAX_TOKENS ?? 350);
const hits = new Map();
let healthCache;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return sendFile(res, path.join(here, "index.html"), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && url.pathname === "/natlas-logo.svg") {
      res.setHeader("cache-control", "public, max-age=86400");
      return sendFile(res, path.join(here, "natlas-logo.svg"), "image/svg+xml");
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJSON(res, 200, { mock: MOCK, languages: LANGUAGES, model: process.env.NATLAS_MODEL ?? "NCAIR1/N-ATLaS" });
    }
    if (req.method === "GET" && url.pathname === "/api/evidence") {
      // Download usage and feedback logs (hosts like free Spaces don't keep files across restarts).
      if (!process.env.ADMIN_KEY || url.searchParams.get("key") !== process.env.ADMIN_KEY) {
        return sendJSON(res, 403, { error: "Forbidden" });
      }
      const read = (f) => {
        const p = path.join(DATA_DIR, f);
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
      };
      return sendJSON(res, 200, { usage: read("usage.jsonl"), feedback: read("feedback.jsonl"), ratings: read("ratings.jsonl") });
    }
    if (req.method === "GET" && url.pathname === "/api/health") {
      // Cached: each check runs a tiny generation, which is expensive on CPU hosting.
      if (!healthCache || Date.now() - healthCache.at > 60_000) {
        healthCache = { at: Date.now(), value: await client.health() };
      }
      return sendJSON(res, 200, healthCache.value);
    }
    if (req.method === "POST" && url.pathname === "/api/generate") {
      if (rateLimited(req)) return sendJSON(res, 429, { error: "Too many requests. Please wait a minute." });
      return generate(req, res);
    }
    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      // Token-free proxy for mobile apps: point the SDK's baseURL at this server.
      if (rateLimited(req)) return sendJSON(res, 429, { error: "Too many requests. Please wait a minute." });
      return proxy(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/rate") {
      // Thumbs up/down on a single answer: anonymous, no text stored.
      const body = await readJSON(req);
      if (body.vote !== "up" && body.vote !== "down") return sendJSON(res, 400, { error: "vote must be up or down" });
      append("ratings.jsonl", {
        at: new Date().toISOString(),
        vote: body.vote,
        mode: MODES.includes(body.mode) ? body.mode : "chat",
        language: isLanguageCode(body.language) ? body.language : "en",
        mock: MOCK,
      });
      return sendJSON(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/feedback") {
      const body = await readJSON(req);
      const entry = {
        at: new Date().toISOString(),
        name: clip(body.name, 80),
        role: clip(body.role, 80),
        rating: Math.max(1, Math.min(5, Number(body.rating) || 0)),
        easeOfUse: clip(body.easeOfUse, 40),
        worked: clip(body.worked, 1000),
        problems: clip(body.problems, 1000),
        wouldUse: clip(body.wouldUse, 40),
      };
      append("feedback.jsonl", entry);
      return sendJSON(res, 200, { ok: true });
    }
    sendJSON(res, 404, { error: "Not found" });
  } catch (e) {
    sendJSON(res, 500, { error: (e && e.message) || "Server error" });
  }
});

async function generate(req, res) {
  const body = await readJSON(req);
  const mode = MODES.includes(body.mode) ? body.mode : "chat";
  const language = isLanguageCode(body.language) ? body.language : "en";
  const from = isLanguageCode(body.from) ? body.from : undefined;
  const text = clip(body.text, 6000);
  if (!text) return sendJSON(res, 400, { error: "Enter some text first." });
  const temperature = Math.max(0, Math.min(1, Number(body.temperature ?? 0.2)));
  const history = Array.isArray(body.history)
    ? body.history
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-10)
        .map((m) => ({ role: m.role, content: clip(m.content, 4000) }))
    : [];

  // Stop generating (and free the model) if the visitor presses Stop or leaves the page.
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });
  const params = { ...buildParams({ mode, language, from, text, temperature, history }), signal: abort.signal };
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const started = Date.now();
  let firstTokenMs;
  let chars = 0;
  let ok = true;
  try {
    for await (const chunk of client.chatStream(params)) {
      firstTokenMs ??= Date.now() - started;
      chars += chunk.length;
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    }
  } catch (e) {
    ok = false;
    if (!abort.signal.aborted) {
      const message = e instanceof NAtlasError ? friendly(e) : "Something went wrong.";
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    }
  }
  const latencyMs = Date.now() - started;
  if (!abort.signal.aborted) {
    res.write(`data: ${JSON.stringify({ done: true, latencyMs, firstTokenMs })}\n\n`);
    res.end();
  }
  // Usage log for integration evidence: no prompt or answer text is stored.
  append("usage.jsonl", {
    at: new Date().toISOString(), mode, language, from, inputChars: text.length, outputChars: chars,
    latencyMs, firstTokenMs, ok, cancelled: abort.signal.aborted, mock: MOCK,
  });
}

// Forward an OpenAI-compatible request to the N-ATLAS endpoint, adding the server-side token.
async function proxy(req, res) {
  const body = await readJSON(req);
  const started = Date.now();
  if (!Array.isArray(body.messages) || body.messages.length === 0) return sendJSON(res, 400, { error: "messages required" });
  body.max_tokens = Math.min(Number(body.max_tokens) || 512, 1024);
  const target = MOCK ? null : `${process.env.NATLAS_BASE_URL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1/chat/completions`;
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });
  let upstream;
  try {
    upstream = MOCK
      ? await mockFetch(target, { body: JSON.stringify(body) })
      : await fetch(target, {
          method: "POST",
          signal: abort.signal,
          headers: {
            "content-type": "application/json",
            ...(process.env.NATLAS_API_KEY ? { authorization: `Bearer ${process.env.NATLAS_API_KEY}` } : {}),
          },
          body: JSON.stringify(body),
        });
  } catch (e) {
    return sendJSON(res, 502, { error: "N-ATLAS endpoint unreachable" });
  }
  res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
  let bytes = 0;
  try {
    if (upstream.body) {
      for await (const chunk of upstream.body) {
        bytes += chunk.length;
        res.write(chunk);
      }
    }
  } catch {
    // client went away; upstream request was aborted
  }
  res.end();
  append("usage.jsonl", {
    at: new Date().toISOString(), mode: "api", language: "n/a", inputChars: JSON.stringify(body.messages).length,
    outputChars: bytes, latencyMs: Date.now() - started, ok: upstream.ok, mock: MOCK,
  });
}

function buildParams({ mode, language, from, text, temperature, history }) {
  if (mode === "translate") {
    const p = { ...translatePrompt(from, language), temperature: Math.min(temperature, 0.2) };
    return { ...p, maxTokens: MAX_TOKENS, messages: [{ role: "user", content: text }] };
  }
  if (mode === "summarize") {
    return {
      language,
      temperature,
      maxTokens: MAX_TOKENS,
      system: "Summarise the user's text in 3 short bullet points. Keep key facts and numbers.",
      messages: [{ role: "user", content: text }],
    };
  }
  return { language, temperature, maxTokens: MAX_TOKENS, messages: [...history, { role: "user", content: text }] };
}

function translatePrompt(from, to) {
  const source = from ? LANGUAGES[from].name : "the source language";
  return {
    language: to,
    system:
      `You are a professional translator. Translate the user's text from ${source} into ${LANGUAGES[to].name}. ` +
      "Keep the meaning, names and numbers exactly. Reply with the translation only, without notes.",
  };
}

function friendly(e) {
  if (e.code === "unauthorized") return "The N-ATLAS endpoint rejected the access token.";
  if (e.code === "model_loading") return "The model is starting up. Try again in a minute.";
  if (e.code === "timeout") return "The model took too long to answer. Try a shorter request.";
  if (e.code === "rate_limited") return "The endpoint is busy. Try again shortly.";
  return `The N-ATLAS endpoint returned an error (${e.code}).`;
}

function rateLimited(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "?";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

// ---------- helpers ----------
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function clip(v, n) {
  return typeof v === "string" ? v.trim().slice(0, n) : "";
}

async function readJSON(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Request too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function append(file, entry) {
  fs.appendFileSync(path.join(DATA_DIR, file), JSON.stringify(entry) + "\n");
}

function sendJSON(res, status, data) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendFile(res, file, type) {
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(file).pipe(res);
}

// Offline stand-in for UI work; clearly labelled as mock in the UI.
async function mockFetch(_url, init) {
  const body = JSON.parse(init.body);
  const last = body.messages[body.messages.length - 1].content;
  const words = `[mock] You said: "${last.slice(0, 80)}". Connect a real N-ATLAS endpoint to get model answers.`.split(" ");
  const stream = new ReadableStream({
    async start(c) {
      await new Promise((r) => setTimeout(r, Number(process.env.NATLAS_MOCK_DELAY_MS ?? 0)));
      for (const w of words) {
        c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: w + " " } }] })}\n\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      c.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  if (body.stream) return new Response(stream, { headers: { "content-type": "text/event-stream" } });
  return new Response(JSON.stringify({ choices: [{ message: { content: "OK" }, finish_reason: "stop" }] }), {
    headers: { "content-type": "application/json" },
  });
}

server.listen(PORT, HOST, () => {
  console.log(`N-ATLAS Playground on http://${HOST}:${PORT}${MOCK ? "  (MOCK MODE)" : ""}`);
});
