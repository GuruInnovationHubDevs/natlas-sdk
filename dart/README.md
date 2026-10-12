# natlas (Dart and Flutter)

Dart and Flutter SDK for [N-ATLAS](https://huggingface.co/NCAIR1/N-ATLaS), Nigeria's multilingual language model for English, Hausa, Igbo and Yoruba. Same API as the JavaScript SDK.

## Install

```bash
flutter pub add natlas   # Flutter apps
dart pub add natlas      # Dart projects
```

Try it against the public demo endpoint, `https://natlas.guruhub.ng`, which needs no token (CPU-hosted, so allow 15–90 s per answer).

## Use

```dart
import 'package:natlas/natlas.dart';

final natlas = NAtlas(baseUrl: 'https://your-backend.example.com'); // see "Keep the token off the phone"

final answer = await natlas.ask('What are the early signs of malaria?', language: Language.hausa);
print(answer.text);

final t = await natlas.translate('Wash your hands before eating.', from: Language.english, to: Language.yoruba);
print(t.text);

await for (final chunk in natlas.chatStream([const Message.user('Kedu ka m ga-esi chekwaa ego m?')], language: Language.igbo)) {
  stdout.write(chunk);
}
```

## Flutter chat widget

```dart
import 'package:flutter/material.dart';
import 'package:natlas/natlas.dart';

class NAtlasChat extends StatefulWidget {
  const NAtlasChat({super.key, required this.natlas});
  final NAtlas natlas;
  @override
  State<NAtlasChat> createState() => _NAtlasChatState();
}

class _NAtlasChatState extends State<NAtlasChat> {
  final _input = TextEditingController();
  final _messages = <Message>[];
  var _language = Language.yoruba;
  var _streaming = '';
  var _busy = false;

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    setState(() { _messages.add(Message.user(text)); _input.clear(); _busy = true; _streaming = ''; });
    try {
      await for (final chunk in widget.natlas.chatStream(_messages, language: _language)) {
        setState(() => _streaming += chunk);
      }
      setState(() => _messages.add(Message.assistant(_streaming)));
    } on NAtlasException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      setState(() { _busy = false; _streaming = ''; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = [..._messages.map((m) => m.content), if (_streaming.isNotEmpty) _streaming];
    return Column(children: [
      DropdownButton<Language>(
        value: _language,
        items: Language.values.map((l) => DropdownMenuItem(value: l, child: Text(l.displayName))).toList(),
        onChanged: (l) => setState(() => _language = l!),
      ),
      Expanded(child: ListView(children: items.map((t) => ListTile(title: Text(t))).toList())),
      Row(children: [
        Expanded(child: TextField(controller: _input, onSubmitted: (_) => _send())),
        IconButton(icon: const Icon(Icons.send), onPressed: _busy ? null : _send),
      ]),
      const Text(natlasAttribution, style: TextStyle(fontSize: 11)),
    ]);
  }
}
```

## Keep the token off the phone

Never put your N-ATLAS endpoint token inside a mobile app; anyone can extract it. Run a small backend that holds the token and forwards requests. The playground server in this repository already does this: point `baseUrl` at it and it adds the token on the server (`POST /v1/chat/completions`).

## API

| Member | Description |
|---|---|
| `NAtlas({baseUrl, apiKey, model, defaultLanguage, timeout, maxRetries, headers, httpClient})` | Create a client |
| `chat(messages, {language, system, temperature, maxTokens})` | Full answer as `ChatResult` (`text`, `language`, `latency`, `usage`) |
| `chatStream(messages, {...})` | `Stream<String>` of text chunks |
| `ask(prompt, {language})` | Single question |
| `translate(text, {to, from})` | Translation between the four languages |
| `summarize(text, {language, length})` | Summary |
| `health()` | Endpoint check |
| `guessLanguage(text)` | Heuristic language guess for routing input |

Errors are `NAtlasException` with `code`, `status` and `retryable`. On Flutter web, the browser buffers responses, so streamed chunks arrive together at the end.

## Test

```bash
dart pub get
dart test
```
