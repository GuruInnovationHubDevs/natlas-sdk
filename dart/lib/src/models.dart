import 'language.dart';

enum Role { system, user, assistant }

class Message {
  const Message(this.role, this.content);
  const Message.user(this.content) : role = Role.user;
  const Message.assistant(this.content) : role = Role.assistant;
  const Message.system(this.content) : role = Role.system;

  final Role role;
  final String content;

  Map<String, String> toJson() => {'role': role.name, 'content': content};
}

class Usage {
  const Usage({this.promptTokens, this.completionTokens, this.totalTokens});
  final int? promptTokens;
  final int? completionTokens;
  final int? totalTokens;
}

class ChatResult {
  const ChatResult({
    required this.text,
    required this.language,
    required this.latency,
    this.finishReason,
    this.usage,
  });

  final String text;

  /// Language the answer was requested in.
  final Language language;

  /// Time from request start to full response.
  final Duration latency;
  final String? finishReason;
  final Usage? usage;
}

class HealthResult {
  const HealthResult({required this.ok, required this.latency, this.error});
  final bool ok;
  final Duration latency;
  final String? error;
}
