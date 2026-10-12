// Quick end-to-end check against a real N-ATLAS endpoint.
//   NATLAS_BASE_URL=... NATLAS_API_KEY=... npm run example
import fs from "node:fs";

import { ATTRIBUTION, NAtlas } from "../dist/index.js";

loadEnv(new URL("../.env.local", import.meta.url));

if (!process.env.NATLAS_BASE_URL) {
  console.error("Set NATLAS_BASE_URL and NATLAS_API_KEY (see docs/DEPLOY_NATLAS.md).");
  process.exit(1);
}

const natlas = new NAtlas({
  baseURL: process.env.NATLAS_BASE_URL,
  apiKey: process.env.NATLAS_API_KEY,
  model: process.env.NATLAS_MODEL,
  timeoutMs: 120_000,
});

const health = await natlas.health();
console.log("Endpoint health:", health);
if (!health.ok) process.exit(1);

const cases = [
  ["ask (Hausa)", () => natlas.ask("What are the early signs of malaria?", { language: "ha" })],
  ["ask (Igbo)", () => natlas.ask("Kedu ka m ga-esi chekwaa ego m?", { language: "ig" })],
  ["translate en → yo", () => natlas.translate({ text: "Wash your hands with soap before eating.", from: "en", to: "yo" })],
  ["summarize (English)", () =>
    natlas.summarize({
      text: "N-ATLAS is a multilingual language model for English, Hausa, Igbo and Yoruba, fine-tuned from Llama 3 8B and released by NCAIR and Awarri in 2025.",
      language: "en",
      length: "one sentence",
    })],
];

for (const [label, run] of cases) {
  const res = await run();
  console.log(`\n=== ${label} (${res.latencyMs} ms) ===\n${res.text}`);
}

process.stdout.write("\nStreaming (Yoruba): ");
for await (const chunk of natlas.chatStream({
  messages: [{ role: "user", content: "Say a short greeting to a new student." }],
  language: "yo",
  maxTokens: 80,
})) {
  process.stdout.write(chunk);
}
console.log(`\n\n${ATTRIBUTION}`);

function loadEnv(url) {
  if (!fs.existsSync(url)) return;
  for (const line of fs.readFileSync(url, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
