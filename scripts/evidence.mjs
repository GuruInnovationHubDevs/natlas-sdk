// Summarise playground usage and beta-tester feedback into a Markdown report for validation evidence.
//   node scripts/evidence.mjs [dataDir] > docs/VALIDATION.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] ?? path.join(here, "..", "playground", "data");
const read = (f) =>
  fs.existsSync(path.join(dir, f))
    ? fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];

const usage = read("usage.jsonl").filter((u) => !u.mock);
const feedback = read("feedback.jsonl");
const count = (arr, key) => arr.reduce((m, x) => { const k = x[key] || "not given"; m[k] = (m[k] ?? 0) + 1; return m; }, {});
const ok = usage.filter((u) => u.ok);
const lat = ok.map((u) => u.latencyMs).sort((a, b) => a - b);
const pct = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] : 0);

const lines = [];
lines.push("# Validation evidence", "");
lines.push(`_Generated ${new Date().toISOString()} from playground logs._`, "");
lines.push("## Live N-ATLAS requests", "");
lines.push(`- Requests to the N-ATLAS endpoint: **${usage.length}** (${ok.length} successful)`);
if (usage.length) {
  lines.push(`- First: ${usage[0].at} · Last: ${usage[usage.length - 1].at}`);
  lines.push(`- By mode: ${Object.entries(count(usage, "mode")).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  lines.push(`- By answer language: ${Object.entries(count(usage, "language")).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  lines.push(`- Latency (successful, end to end): median ${pct(50)} ms, p90 ${pct(90)} ms`);
}
lines.push("", "## External beta testers", "");
lines.push(`- Feedback responses: **${feedback.length}**`);
if (feedback.length) {
  const avg = feedback.reduce((s, f) => s + f.rating, 0) / feedback.length;
  lines.push(`- Average rating: ${avg.toFixed(1)} / 5`);
  lines.push(`- Ease of integration: ${Object.entries(count(feedback, "easeOfUse")).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  lines.push(`- Would use in a project: ${Object.entries(count(feedback, "wouldUse")).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  lines.push("", "| # | Tester role | Rating | What worked | What was difficult |", "|---|---|---|---|---|");
  feedback.forEach((f, i) => {
    const cell = (s) => (s || "").replace(/\|/g, "/").replace(/\n/g, " ");
    lines.push(`| ${i + 1} | ${cell(f.role)} | ${f.rating}/5 | ${cell(f.worked)} | ${cell(f.problems)} |`);
  });
}
console.log(lines.join("\n"));
