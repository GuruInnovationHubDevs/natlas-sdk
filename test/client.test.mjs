import assert from "node:assert/strict";
import { test } from "node:test";

import { NAtlas, NAtlasError, guessLanguage } from "../dist/index.js";
import { reply, startMock } from "./mock-server.mjs";

test("chat sends an OpenAI-compatible request and returns the answer", async () => {
  const mock = await startMock(() => reply("  Ẹ káàárọ̀!  "));
  try {
    const client = new NAtlas({ baseURL: `${mock.url}/v1/`, apiKey: "secret", model: "test-model" });
    const res = await client.chat({ messages: [{ role: "user", content: "Good morning" }], language: "yo" });
    assert.equal(res.text, "Ẹ káàárọ̀!");
    assert.equal(res.language, "yo");
    assert.equal(res.usage.totalTokens, 15);
    const sent = mock.requests[0];
    assert.equal(sent.url, "/v1/chat/completions");
    assert.equal(sent.headers.authorization, "Bearer secret");
    assert.equal(sent.body.model, "test-model");
    assert.equal(sent.body.stream, false);
    assert.equal(sent.body.messages[0].role, "system");
    assert.match(sent.body.messages[0].content, /Respond only in Yoruba/);
    assert.deepEqual(sent.body.messages[1], { role: "user", content: "Good morning" });
  } finally {
    await mock.close();
  }
});

test("caller system messages are merged into one system prompt", async () => {
  const mock = await startMock(() => reply("ok"));
  try {
    const client = new NAtlas({ baseURL: mock.url });
    await client.chat({
      system: "You help farmers.",
      messages: [
        { role: "system", content: "Use short sentences." },
        { role: "user", content: "Hi" },
      ],
    });
    const msgs = mock.requests[0].body.messages;
    assert.equal(msgs.filter((m) => m.role === "system").length, 1);
    assert.match(msgs[0].content, /You help farmers\./);
    assert.match(msgs[0].content, /Use short sentences\./);
  } finally {
    await mock.close();
  }
});

test("chatStream yields text chunks in order", async () => {
  const mock = await startMock(() => ({ stream: ["Sannu", " da", " zuwa"] }));
  try {
    const client = new NAtlas({ baseURL: mock.url });
    let out = "";
    for await (const chunk of client.chatStream({ messages: [{ role: "user", content: "Hello" }], language: "ha" })) {
      out += chunk;
    }
    assert.equal(out, "Sannu da zuwa");
    assert.equal(mock.requests[0].body.stream, true);
  } finally {
    await mock.close();
  }
});

test("retries on 503 then succeeds", async () => {
  const mock = await startMock(({ count }) => (count < 3 ? { status: 503, json: { error: "loading" } } : reply("ready")));
  try {
    const client = new NAtlas({ baseURL: mock.url, maxRetries: 3 });
    const res = await client.ask("Are you up?");
    assert.equal(res.text, "ready");
    assert.equal(mock.requests.length, 3);
  } finally {
    await mock.close();
  }
});

test("does not retry on 401 and exposes a typed error", async () => {
  const mock = await startMock(() => ({ status: 401, json: { error: "bad token" } }));
  try {
    const client = new NAtlas({ baseURL: mock.url, maxRetries: 3 });
    await assert.rejects(client.ask("Hi"), (err) => {
      assert.ok(err instanceof NAtlasError);
      assert.equal(err.status, 401);
      assert.equal(err.code, "unauthorized");
      assert.equal(err.retryable, false);
      return true;
    });
    assert.equal(mock.requests.length, 1);
  } finally {
    await mock.close();
  }
});

test("times out slow responses", async () => {
  const mock = await startMock(() => ({ ...reply("late"), delayMs: 300 }));
  try {
    const client = new NAtlas({ baseURL: mock.url, timeoutMs: 50, maxRetries: 0 });
    await assert.rejects(client.ask("Hi"), (err) => err.code === "timeout");
  } finally {
    await mock.close();
  }
});

test("translate builds a translation prompt in the target language", async () => {
  const mock = await startMock(() => reply("Daalụ"));
  try {
    const client = new NAtlas({ baseURL: mock.url });
    const res = await client.translate({ text: "Thank you", from: "en", to: "ig" });
    assert.equal(res.text, "Daalụ");
    const sys = mock.requests[0].body.messages[0].content;
    assert.match(sys, /from English into Igbo/);
    assert.match(sys, /Respond only in Igbo/);
    assert.equal(mock.requests[0].body.temperature, 0.1);
  } finally {
    await mock.close();
  }
});

test("guessLanguage recognises the four N-ATLAS languages", () => {
  assert.equal(guessLanguage("How are you doing today?"), "en");
  assert.equal(guessLanguage("Ẹ káàárọ̀, báwo ni?"), "yo");
  assert.equal(guessLanguage("Kedu ka ị mere?"), "ig");
  assert.equal(guessLanguage("Sannu, yaya kake? Ina kwana"), "ha");
});

// XMLHttpRequest stand-in that behaves like React Native's: partial responseText on progress events.
import http from "node:http";
class FakeXHR {
  constructor() { this.status = 0; this.responseText = ""; this.timeout = 0; this.headers = {}; }
  open(method, url) { this.method = method; this.url = new URL(url); }
  setRequestHeader(k, v) { this.headers[k] = v; }
  abort() { this.req?.destroy(); }
  send(body) {
    this.req = http.request(this.url, { method: this.method, headers: this.headers }, (res) => {
      this.status = res.statusCode;
      res.setEncoding("utf8");
      res.on("data", (chunk) => { this.responseText += chunk; this.onprogress?.(); });
      res.on("end", () => this.onload?.());
    });
    this.req.on("error", () => this.onerror?.());
    this.req.end(body);
  }
}

test("chatStream works over XMLHttpRequest (React Native transport)", async () => {
  const mock = await startMock(() => ({ stream: ["Ndewo", " ", "nwanne"] }));
  try {
    const client = new NAtlas({ baseURL: mock.url, transport: "xhr", XMLHttpRequest: FakeXHR, apiKey: "k" });
    let out = "";
    for await (const chunk of client.chatStream({ messages: [{ role: "user", content: "Hi" }], language: "ig" })) out += chunk;
    assert.equal(out, "Ndewo nwanne");
    assert.equal(mock.requests[0].headers.authorization, "Bearer k");
    assert.equal(mock.requests[0].body.stream, true);
  } finally {
    await mock.close();
  }
});

test("XMLHttpRequest transport surfaces HTTP errors", async () => {
  const mock = await startMock(() => ({ status: 401, json: { error: "bad token" } }));
  try {
    const client = new NAtlas({ baseURL: mock.url, transport: "xhr", XMLHttpRequest: FakeXHR });
    const iterate = async () => { for await (const _ of client.chatStream({ messages: [{ role: "user", content: "Hi" }] })) {} };
    await assert.rejects(iterate, (err) => err.code === "unauthorized" && err.status === 401);
  } finally {
    await mock.close();
  }
});

test("requires a baseURL", () => {
  assert.throws(() => new NAtlas({}), /baseURL is required/);
});
