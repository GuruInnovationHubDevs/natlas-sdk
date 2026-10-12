/// Error thrown by the N-ATLAS client.
class NAtlasException implements Exception {
  NAtlasException(this.message, {required this.code, this.status, this.body});

  final String message;

  /// Machine-readable code: "unauthorized", "rate_limited", "model_loading", "timeout", "network", "bad_response"…
  final String code;

  /// HTTP status, when the error came from a response.
  final int? status;

  /// Raw response body, when available.
  final String? body;

  /// Whether retrying the same request may succeed.
  bool get retryable => code == 'timeout' || code == 'network' || status == 429 || (status ?? 0) >= 500;

  @override
  String toString() => 'NAtlasException($code${status != null ? ', $status' : ''}): $message';
}

String codeForStatus(int status) {
  if (status == 401 || status == 403) return 'unauthorized';
  if (status == 404) return 'not_found';
  if (status == 429) return 'rate_limited';
  if (status == 503) return 'model_loading';
  if (status >= 500) return 'server_error';
  return 'bad_request';
}
