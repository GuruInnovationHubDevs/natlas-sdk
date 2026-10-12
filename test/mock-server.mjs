import http from "node:http";

/**
 * Minimal OpenAI-compatible server for tests. `behaviour` decides each response:
 * ({ body, count }) => { status?, json?, stream?: string[], delayMs? }
 */
export async function startMock(behaviour) {
  let count = 0;
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    count += 1;
    requests.push({ url: req.url, headers: req.headers, body });
    const plan = behaviour({ body, count, req });
    if (plan.delayMs) await new Promise((r) => setTimeout(r, plan.delayMs));
    if (plan.stream) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      for (const piece of plan.stream) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
      }
      res.end("data: [DONE]\n\n");
      return;
    }
    res.writeHead(plan.status ?? 200, { "content-type": "application/json" });
    res.end(JSON.stringify(plan.json ?? {}));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((r) => server.close(r)),
  };
}

export const reply = (content) => ({
  json: {
    choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  },
});
