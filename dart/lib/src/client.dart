import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import 'errors.dart';
import 'language.dart';
import 'models.dart';

const _defaultModel = 'NCAIR1/N-ATLaS';
const _baseSystem = 'You are a helpful assistant built on N-ATLAS, a language model for Nigerian languages. '
    'Be accurate, concise and culturally aware.';

/// Client for an OpenAI-compatible endpoint serving N-ATLAS
/// (Hugging Face Inference Endpoint, vLLM or TGI), or your own proxy in front of one.
///
/// In a Flutter app, point [baseUrl] at your backend proxy so the endpoint token never ships in the app.
class NAtlas {
  NAtlas({
    required String baseUrl,
    this.apiKey,
    this.model = _defaultModel,
    this.defaultLanguage = Language.english,
    this.timeout = const Duration(seconds: 60),
    this.maxRetries = 2,
    this.headers = const {},
    this.extraBody = const {},
    http.Client? httpClient,
  })  : baseUrl = baseUrl.replaceAll(RegExp(r'/+$'), '').replaceAll(RegExp(r'/v1$'), ''),
        _http = httpClient ?? http.Client();

  final String baseUrl;
  final String? apiKey;
  final String model;
  final Language defaultLanguage;
  final Duration timeout;
  final int maxRetries;
  final Map<String, String> headers;

  /// Extra fields merged into every request body, for server-specific options
  /// (for example `{'repeat_penalty': 1.12}` on llama.cpp servers).
  final Map<String, dynamic> extraBody;
  final http.Client _http;

  Uri get _uri => Uri.parse('$baseUrl/v1/chat/completions');

  /// Send a conversation and get the full answer.
  Future<ChatResult> chat(
    List<Message> messages, {
    Language? language,
    String? system,
    double temperature = 0.2,
    int maxTokens = 512,
    double repetitionPenalty = 1.12,
  }) async {
    final lang = language ?? defaultLanguage;
    final started = DateTime.now();
    final body = buildBody(messages,
        language: lang, system: system, temperature: temperature, maxTokens: maxTokens,
        repetitionPenalty: repetitionPenalty, stream: false);
    final res = await _withRetries(() => _post(body));
    final Map<String, dynamic> json;
    try {
      json = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw NAtlasException('Endpoint returned invalid JSON', code: 'bad_response', status: res.statusCode, body: res.body);
    }
    final choice = (json['choices'] as List?)?.firstOrNull as Map<String, dynamic>?;
    final content = (choice?['message'] as Map<String, dynamic>?)?['content'];
    if (content is! String) {
      throw NAtlasException('Endpoint response has no message content', code: 'bad_response', body: res.body);
    }
    final usage = json['usage'] as Map<String, dynamic>?;
    return ChatResult(
      text: content.trim(),
      language: lang,
      latency: DateTime.now().difference(started),
      finishReason: choice?['finish_reason'] as String?,
      usage: usage == null
          ? null
          : Usage(
              promptTokens: usage['prompt_tokens'] as int?,
              completionTokens: usage['completion_tokens'] as int?,
              totalTokens: usage['total_tokens'] as int?,
            ),
    );
  }

  /// Stream the answer as text chunks.
  ///
  /// On Flutter web the browser client buffers the response, so chunks arrive at the end.
  Stream<String> chatStream(
    List<Message> messages, {
    Language? language,
    String? system,
    double temperature = 0.2,
    int maxTokens = 512,
    double repetitionPenalty = 1.12,
  }) async* {
    final body = buildBody(messages,
        language: language ?? defaultLanguage, system: system, temperature: temperature,
        maxTokens: maxTokens, repetitionPenalty: repetitionPenalty, stream: true);
    final request = http.Request('POST', _uri)
      ..headers.addAll(_headers(stream: true))
      ..body = jsonEncode(body);
    final http.StreamedResponse res;
    try {
      res = await _withRetries(() async {
        final r = await _http.send(request.copy()).timeout(timeout);
        if (r.statusCode < 200 || r.statusCode >= 300) {
          final text = await r.stream.bytesToString();
          throw NAtlasException('N-ATLAS endpoint returned ${r.statusCode}: ${_clip(text)}',
              code: codeForStatus(r.statusCode), status: r.statusCode, body: text);
        }
        return r;
      });
    } on TimeoutException {
      throw NAtlasException('Request timed out after ${timeout.inMilliseconds} ms', code: 'timeout');
    }
    final lines = res.stream.transform(utf8.decoder).transform(const LineSplitter());
    final data = <String>[];
    await for (final line in lines) {
      if (line.isEmpty) {
        if (data.isEmpty) continue;
        final payload = data.join('\n');
        data.clear();
        if (payload == '[DONE]') return;
        final delta = _delta(payload);
        if (delta != null && delta.isNotEmpty) yield delta;
      } else if (line.startsWith('data:')) {
        data.add(line.substring(5).trimLeft());
      }
    }
    if (data.isNotEmpty && data.join('\n') != '[DONE]') {
      final delta = _delta(data.join('\n'));
      if (delta != null && delta.isNotEmpty) yield delta;
    }
  }

  /// Ask a single question.
  Future<ChatResult> ask(String prompt, {Language? language, String? system, double temperature = 0.2, int maxTokens = 512}) =>
      chat([Message.user(prompt)], language: language, system: system, temperature: temperature, maxTokens: maxTokens);

  /// Translate text between English, Hausa, Igbo and Yoruba.
  Future<ChatResult> translate(String text, {required Language to, Language? from}) {
    final source = from?.displayName ?? 'the source language';
    return chat(
      [Message.user(text)],
      language: to,
      temperature: 0.1,
      system: "You are a professional translator. Translate the user's text from $source into ${to.displayName}. "
          'Keep the meaning, names and numbers exactly. Reply with the translation only, without notes.',
    );
  }

  /// Summarise text in the requested language.
  Future<ChatResult> summarize(String text, {Language? language, String length = '3 short bullet points'}) => chat(
        [Message.user(text)],
        language: language,
        system: "Summarise the user's text in $length. Keep key facts and numbers.",
      );

  /// Check that the endpoint is reachable and answering.
  Future<HealthResult> health() async {
    final started = DateTime.now();
    try {
      await chat(const [Message.user('Reply with: OK')], maxTokens: 5, temperature: 0);
      return HealthResult(ok: true, latency: DateTime.now().difference(started));
    } catch (e) {
      return HealthResult(ok: false, latency: DateTime.now().difference(started), error: e.toString());
    }
  }

  /// Close the underlying HTTP client.
  void close() => _http.close();

  /// Build the OpenAI-compatible request body. Exposed for debugging.
  Map<String, dynamic> buildBody(
    List<Message> messages, {
    required Language language,
    String? system,
    required double temperature,
    required int maxTokens,
    required double repetitionPenalty,
    required bool stream,
  }) {
    final callerSystem = messages.where((m) => m.role == Role.system).map((m) => m.content);
    final systemPrompt = [_baseSystem, if (system != null) system, language.instruction, ...callerSystem].join('\n\n');
    return {
      'model': model,
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        ...messages.where((m) => m.role != Role.system).map((m) => m.toJson()),
      ],
      'temperature': temperature,
      'max_tokens': maxTokens,
      'repetition_penalty': repetitionPenalty,
      'stream': stream,
      ...extraBody,
    };
  }

  Map<String, String> _headers({required bool stream}) => {
        'content-type': 'application/json',
        'accept': stream ? 'text/event-stream' : 'application/json',
        if (apiKey != null) 'authorization': 'Bearer $apiKey',
        ...headers,
      };

  Future<http.Response> _post(Map<String, dynamic> body) async {
    final http.Response res;
    try {
      res = await _http.post(_uri, headers: _headers(stream: false), body: jsonEncode(body)).timeout(timeout);
    } on TimeoutException {
      throw NAtlasException('Request timed out after ${timeout.inMilliseconds} ms', code: 'timeout');
    } on http.ClientException catch (e) {
      throw NAtlasException('Network error: ${e.message}', code: 'network');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw NAtlasException('N-ATLAS endpoint returned ${res.statusCode}: ${_clip(res.body)}',
          code: codeForStatus(res.statusCode), status: res.statusCode, body: res.body);
    }
    return res;
  }

  Future<T> _withRetries<T>(Future<T> Function() run) async {
    var attempt = 0;
    while (true) {
      try {
        return await run();
      } on NAtlasException catch (e) {
        if (!e.retryable || attempt >= maxRetries) rethrow;
        attempt += 1;
        await Future<void>.delayed(Duration(milliseconds: min(500 * pow(2, attempt - 1).toInt(), 4000)));
      }
    }
  }

  static String? _delta(String payload) {
    final json = jsonDecode(payload) as Map<String, dynamic>;
    final choice = (json['choices'] as List?)?.firstOrNull as Map<String, dynamic>?;
    return (choice?['delta'] as Map<String, dynamic>?)?['content'] as String?;
  }

  static String _clip(String s) => s.length > 300 ? s.substring(0, 300) : s;
}

extension on http.Request {
  http.Request copy() => http.Request(method, url)
    ..headers.addAll(headers)
    ..body = body;
}
