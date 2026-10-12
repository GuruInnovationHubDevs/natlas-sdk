/** Languages supported by N-ATLAS. */
export const LANGUAGES = {
  en: { name: "English", native: "English" },
  ha: { name: "Hausa", native: "Hausa" },
  ig: { name: "Igbo", native: "Asụsụ Igbo" },
  yo: { name: "Yoruba", native: "Èdè Yorùbá" },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && value in LANGUAGES;
}

export function languageName(code: LanguageCode): string {
  return LANGUAGES[code].name;
}

/** Instruction appended to the system prompt so the model answers in the chosen language. */
export function languageInstruction(code: LanguageCode): string {
  if (code === "en") return "Respond in clear, simple English suitable for a Nigerian audience.";
  return `Respond only in ${languageName(code)}. Do not switch to English unless the user asks you to.`;
}

// Characters and short, frequent words that strongly signal each language.
const SIGNALS: Record<Exclude<LanguageCode, "en">, { chars: RegExp; words: string[] }> = {
  yo: {
    chars: /[ẹọṣẸỌṢ]|[àáèéìíòóùú][a-zẹọṣ]/,
    words: ["ni", "ti", "si", "awon", "àwọn", "mo", "kò", "ko", "fun", "pẹlu", "bawo", "báwo", "ẹ", "jọwọ", "ṣe"],
  },
  ig: {
    chars: /[ịọụṅỊỌỤṄ]/,
    words: ["na", "nke", "ka", "ndị", "ndi", "bụ", "bu", "ihe", "gị", "gi", "kedu", "biko", "anyị", "m"],
  },
  ha: {
    chars: /[ɓɗƙƁƊƘ]|ƴ/,
    words: ["da", "na", "ya", "ta", "ba", "shi", "ita", "kuma", "don", "yaya", "ina", "sannu", "wannan", "akwai", "zuwa"],
  },
};

/**
 * Best-effort guess of the language of a short text, using script features and common words.
 * Useful for routing user input before calling the model; it is a heuristic, not a classifier.
 */
export function guessLanguage(text: string): LanguageCode {
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^\p{L}]+/u).filter(Boolean);
  const scores: Record<LanguageCode, number> = { en: 0, ha: 0, ig: 0, yo: 0 };
  for (const code of ["yo", "ig", "ha"] as const) {
    const { chars, words } = SIGNALS[code];
    if (chars.test(text)) scores[code] += 3;
    for (const t of tokens) if (words.includes(t)) scores[code] += 1;
  }
  const englishWords = ["the", "and", "is", "are", "what", "how", "you", "to", "of", "in", "for", "please"];
  for (const t of tokens) if (englishWords.includes(t)) scores.en += 1;
  let best: LanguageCode = "en";
  for (const code of Object.keys(scores) as LanguageCode[]) {
    if (scores[code] > scores[best]) best = code;
  }
  return best;
}
