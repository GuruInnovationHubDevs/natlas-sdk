# Contributing to natlas-sdk

Thank you for helping make N-ATLAS easier to build with. Contributions of every size are welcome: bug reports, documentation fixes, translations of the docs into Hausa, Igbo or Yoruba, new examples, and code.

## Ways to contribute

- **Report a bug or ask for a feature:** open an issue with steps to reproduce, the platform (Node, browser, React Native or Flutter) and the SDK version.
- **Improve the docs:** typo fixes and clearer explanations are as valuable as code. Translations of `README.md` into Hausa or Igbo are especially welcome (see `docs/README.yo.md` for the Yoruba version).
- **Add examples:** small, focused examples for real Nigerian use cases (health, agriculture, education, civic information, financial literacy).
- **Write code:** fix bugs, improve the SDKs or the playground.

## Development setup

```bash
git clone https://github.com/GuruInnovationHubDevs/natlas-sdk
cd natlas-sdk
npm install
npm test                 # JavaScript/TypeScript SDK (builds, then runs tests against a mock N-ATLAS server)

cd dart
dart pub get
dart test                # Dart/Flutter SDK
```

Run the playground without a model while working on the UI:

```bash
NATLAS_MOCK=1 npm run playground    # http://localhost:3000
```

To test against a real model, copy `.env.example` to `.env.local` and set `NATLAS_BASE_URL` (and `NATLAS_API_KEY` if your endpoint needs one), or point it at the public demo, `https://natlas.guruhub.ng`.

## Pull requests

1. Fork the repository and create a branch from `main` (`fix/stream-timeout`, `docs/hausa-readme`, …).
2. Keep each pull request focused on one change.
3. Add or update tests for code changes. `npm test` and `dart test` must pass.
4. Keep the JavaScript and Dart APIs in step: if you add a method to one SDK, add it to the other or open an issue for it.
5. Update the docs when behaviour changes.
6. Describe what changed and why in the pull request.

## Code style

- TypeScript with `strict` mode and no runtime dependencies in the SDK.
- Dart code must pass `dart analyze` with no issues.
- Clear names over comments; comments explain *why*, not *what*.

## Responsible use

N-ATLAS is released by NCAIR and Awarri Technologies under its own licence. Contributions must not add features aimed at uses the licence prohibits (surveillance, discriminatory profiling, disinformation or impersonation). Never commit endpoint tokens or other secrets.

## Code of conduct

Be respectful and constructive. We want contributors of all experience levels to feel welcome, including first-time open-source contributors. Harassment or discrimination of any kind is not tolerated.

## Questions

Open an issue, or contact Guru Innovation Hub at info@guruhub.ng.
