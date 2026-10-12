## 0.1.0

- Initial release.
- `NAtlas` client for OpenAI-compatible N-ATLAS endpoints: `chat`, `chatStream`, `ask`, `translate`, `summarize` and `health`.
- Language-aware prompting for English, Hausa, Igbo and Yoruba (`Language` enum).
- Retries with backoff for timeouts, network errors, 429 and 5xx; typed `NAtlasException`.
- `extraBody` for server-specific sampling options.
- `guessLanguage` heuristic for routing user input.
