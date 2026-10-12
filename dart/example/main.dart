// dart run example/main.dart   (reads NATLAS_BASE_URL and NATLAS_API_KEY from the environment)
import 'dart:io';

import 'package:natlas/natlas.dart';

Future<void> main() async {
  final baseUrl = Platform.environment['NATLAS_BASE_URL'];
  if (baseUrl == null || baseUrl.isEmpty) {
    stderr.writeln('Set NATLAS_BASE_URL (and NATLAS_API_KEY).');
    exit(1);
  }
  final natlas = NAtlas(
    baseUrl: baseUrl,
    apiKey: Platform.environment['NATLAS_API_KEY'],
    timeout: const Duration(minutes: 2),
  );

  final health = await natlas.health();
  print('Endpoint healthy: ${health.ok} (${health.latency.inMilliseconds} ms)');
  if (!health.ok) exit(1);

  final answer = await natlas.ask('What are the early signs of malaria?', language: Language.hausa);
  print('\nHausa answer (${answer.latency.inMilliseconds} ms):\n${answer.text}');

  final translation = await natlas.translate('Wash your hands with soap before eating.',
      from: Language.english, to: Language.yoruba);
  print('\nYoruba translation:\n${translation.text}');

  stdout.write('\nStreaming (Igbo): ');
  await for (final chunk in natlas.chatStream(const [Message.user('Say a short greeting to a new student.')],
      language: Language.igbo, maxTokens: 80)) {
    stdout.write(chunk);
  }
  print('\n\n$natlasAttribution');
  natlas.close();
}
