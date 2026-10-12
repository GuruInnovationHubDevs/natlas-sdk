/** Languages supported by N-ATLAS. */
export declare const LANGUAGES: {
    readonly en: {
        readonly name: "English";
        readonly native: "English";
    };
    readonly ha: {
        readonly name: "Hausa";
        readonly native: "Hausa";
    };
    readonly ig: {
        readonly name: "Igbo";
        readonly native: "Asụsụ Igbo";
    };
    readonly yo: {
        readonly name: "Yoruba";
        readonly native: "Èdè Yorùbá";
    };
};
export type LanguageCode = keyof typeof LANGUAGES;
export declare function isLanguageCode(value: unknown): value is LanguageCode;
export declare function languageName(code: LanguageCode): string;
/** Instruction appended to the system prompt so the model answers in the chosen language. */
export declare function languageInstruction(code: LanguageCode): string;
/**
 * Best-effort guess of the language of a short text, using script features and common words.
 * Useful for routing user input before calling the model; it is a heuristic, not a classifier.
 */
export declare function guessLanguage(text: string): LanguageCode;
