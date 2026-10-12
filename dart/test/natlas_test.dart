import 'dart:convert';
import 'dart:io';

import 'package:natlas/natlas.dart';
import 'package:test/test.dart';

/// Minimal OpenAI-compatible server. [plan] returns (status, jsonBody) or a list of stream chunks.
Future<(HttpServer, List<Map<String, dynamic>>, List<HttpHeaders>)> mock(Object Function(int count) plan) async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  final bodies = <Map<String, dynamic>>[];
  final headers = <HttpHeaders>[];
  var count = 0;
  server.listen((req) async {
    count += 1;
    bodies.add(jsonDecode(await utf8.decoder.bind(req).join()) as Map<String, dynamic>);
    headers.add(req.headers);
    final p = plan(count);
    if (p is List<String>) {
      req.response.headers.contentType = ContentType('text', 'event-stream', charset: 'utf-8');
      for (final piece in p) {
        req.response.write('data: ${jsonEncode({
              'choices': [
                {'delta': {'content': piece}}
              ]
            })}\n\n');
        await req.response.flush();
      }
      req.response.write('data: [DONE]\n\n');
    } else {
      final (status, body) = p as (int, Object);
      req.response.statusCode = status;
      req.response.headers.contentType = ContentType.json;
      req.response.write(jsonEncode(body));
    }
    await req.response.close();
  });
  return (server, bodies, headers);
}

Map<String, dynamic> reply(String content) => {
      'choices': [
        {'message': {'role': 'assistant', 'content': content}, 'finish_reason': 'stop'}
      ],
      'usage': {'prompt_tokens': 10, 'completion_tokens': 5, 'total_tokens': 15},
    };

void main() {
  test('chat sends an OpenAI-compatible request with a language instruction', () async {
    final (server, bodies, headers) = await mock((_) => (200, reply('  Sannu!  ')));
    final natlas = NAtlas(baseUrl: 'http://127.0.0.1:${server.port}/v1/', apiKey: 'secret');
    final res = await natlas.ask('Hello', language: Language.hausa);
    expect(res.text, 'Sannu!');
    expect(res.language, Language.hausa);
    expect(res.usage?.totalTokens, 15);
    expect(headers.first.value('authorization'), 'Bearer secret');
    final msgs = bodies.first['messages'] as List;
    expect(msgs.first['role'], 'system');
    expect(msgs.first['content'], contains('Respond only in Hausa'));
    expect(msgs.last, {'role': 'user', 'content': 'Hello'});
    expect(bodies.first['stream'], false);
    await server.close(force: true);
  });

  test('chatStream yields chunks in order', () async {
    final (server, bodies, _) = await mock((_) => ['Ẹ ', 'káàbọ̀', '!']);
    final natlas = NAtlas(baseUrl: 'http://127.0.0.1:${server.port}');
    final out = await natlas.chatStream(const [Message.user('Welcome me')], language: Language.yoruba).join();
    expect(out, 'Ẹ káàbọ̀!');
    expect(bodies.first['stream'], true);
    await server.close(force: true);
  });

  test('retries 503 then succeeds', () async {
    final (server, bodies, _) = await mock((n) => n < 3 ? (503, {'error': 'loading'}) : (200, reply('ready')));
    final natlas = NAtlas(baseUrl: 'http://127.0.0.1:${server.port}', maxRetries: 3);
    expect((await natlas.ask('Up?')).text, 'ready');
    expect(bodies.length, 3);
    await server.close(force: true);
  });

  test('401 is not retried and is typed', () async {
    final (server, bodies, _) = await mock((_) => (401, {'error': 'bad token'}));
    final natlas = NAtlas(baseUrl: 'http://127.0.0.1:${server.port}', maxRetries: 3);
    await expectLater(
      natlas.ask('Hi'),
      throwsA(isA<NAtlasException>().having((e) => e.code, 'code', 'unauthorized').having((e) => e.retryable, 'retryable', false)),
    );
    expect(bodies.length, 1);
    await server.close(force: true);
  });

  test('translate asks for the target language', () async {
    final (server, bodies, _) = await mock((_) => (200, reply('Daalụ')));
    final natlas = NAtlas(baseUrl: 'http://127.0.0.1:${server.port}');
    final res = await natlas.translate('Thank you', from: Language.english, to: Language.igbo);
    expect(res.text, 'Daalụ');
    final system = (bodies.first['messages'] as List).first['content'] as String;
    expect(system, contains('from English into Igbo'));
    expect(bodies.first['temperature'], 0.1);
    await server.close(force: true);
  });

  test('guessLanguage recognises the four languages', () {
    expect(guessLanguage('How are you doing today?'), Language.english);
    expect(guessLanguage('Ẹ káàárọ̀, báwo ni?'), Language.yoruba);
    expect(guessLanguage('Kedu ka ị mere?'), Language.igbo);
    expect(guessLanguage('Sannu, yaya kake? Ina kwana'), Language.hausa);
  });
}
