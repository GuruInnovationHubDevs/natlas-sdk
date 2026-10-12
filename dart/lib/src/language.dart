/// Languages supported by N-ATLAS.
enum Language {
  english('en', 'English'),
  hausa('ha', 'Hausa'),
  igbo('ig', 'Igbo'),
  yoruba('yo', 'Yoruba');

  const Language(this.code, this.displayName);

  /// ISO 639-1 code: "en", "ha", "ig" or "yo".
  final String code;
  final String displayName;

  static Language? fromCode(String code) {
    for (final l in Language.values) {
      if (l.code == code) return l;
    }
    return null;
  }

  /// Instruction added to the system prompt so the model answers in this language.
  String get instruction => this == Language.english
      ? 'Respond in clear, simple English suitable for a Nigerian audience.'
      : 'Respond only in $displayName. Do not switch to English unless the user asks you to.';
}

final _signals = <Language, (RegExp, Set<String>)>{
  Language.yoruba: (
    RegExp(r'[ẹọṣẸỌṢ]'),
    {'ni', 'ti', 'si', 'awon', 'àwọn', 'mo', 'kò', 'ko', 'fun', 'pẹlu', 'bawo', 'báwo', 'ẹ', 'jọwọ', 'ṣe'},
  ),
  Language.igbo: (
    RegExp(r'[ịọụṅỊỌỤṄ]'),
    {'na', 'nke', 'ka', 'ndị', 'ndi', 'bụ', 'bu', 'ihe', 'gị', 'gi', 'kedu', 'biko', 'anyị', 'm'},
  ),
  Language.hausa: (
    RegExp(r'[ɓɗƙƁƊƘƴ]'),
    {'da', 'na', 'ya', 'ta', 'ba', 'shi', 'ita', 'kuma', 'don', 'yaya', 'ina', 'sannu', 'wannan', 'akwai', 'zuwa'},
  ),
};

const _english = {'the', 'and', 'is', 'are', 'what', 'how', 'you', 'to', 'of', 'in', 'for', 'please'};

/// Best-effort guess of the language of a short text. A heuristic for routing input, not a classifier.
Language guessLanguage(String text) {
  final tokens = text.toLowerCase().split(RegExp(r'[^\p{L}]+', unicode: true)).where((t) => t.isNotEmpty).toList();
  final scores = {for (final l in Language.values) l: 0};
  _signals.forEach((lang, signal) {
    final (chars, words) = signal;
    if (chars.hasMatch(text)) scores[lang] = scores[lang]! + 3;
    for (final t in tokens) {
      if (words.contains(t)) scores[lang] = scores[lang]! + 1;
    }
  });
  for (final t in tokens) {
    if (_english.contains(t)) scores[Language.english] = scores[Language.english]! + 1;
  }
  var best = Language.english;
  scores.forEach((lang, score) {
    if (score > scores[best]!) best = lang;
  });
  return best;
}
