import { LanguageConfig } from "@/lib/language/types";

export function buildReferenceTranslationPrompt(
  text: string,
  langConfig: LanguageConfig,
  addresseeGender?: string
): { system: string; user: string } {
  const genderInstruction = addresseeGender
    ? `\nThe speaker is addressing a ${addresseeGender} person. Use the appropriate gendered verb forms, pronouns, and grammar for a ${addresseeGender} addressee.`
    : "";

  const system = `You are a ${langConfig.name} language expert and translator. Provide accurate translations with transliterations. Use natural, conversational language — the way educated native speakers actually talk in everyday life, NOT written/literary register. For example in Farsi, prefer "لغت" over "واژگان", "سخت" over "دشواری", "حرف زدن" over "ابراز". Avoid bookish, poetic, or academic vocabulary entirely. ALL ${langConfig.name} text MUST include full tashkeel/diacritical marks (harakat). Always respond with valid JSON only.${genderInstruction}`;

  const user = `Translate the following English text to ${langConfig.name}:

"${text}"

Return a JSON object with this exact structure:
{
  "translation": "<translated text with full tashkeel/diacritics>",
  "transliteration": "<romanized pronunciation>",
  "notes": "<brief grammar or usage notes, if relevant>",
  "breakdown": [
    {
      "word": "<${langConfig.name} word with diacritics>",
      "transliteration": "<romanized>",
      "meaning": "<English meaning>",
      "parts": [
        { "arabic": "<morpheme with diacritics>", "transliteration": "<romanized>", "meaning": "<meaning>" }
      ]
    }
  ]
}

The "breakdown" array should contain one entry per word in the translation, in order. Keep meanings brief (1-3 words). Include particles and prepositions.

The "parts" field is optional. Include it ONLY when a word has a detachable prefix or attached preposition/particle (e.g. كَ، وَ، بِ، لِ، فَ، الـ). Split the word into its morphemes. Do NOT split verb conjugations or internal morphology — only split detachable particles and prepositions. Omit "parts" for simple words.

Return ONLY the JSON object, no markdown, no explanation.`;

  return { system, user };
}

export function buildPracticeScoringPrompt(
  english: string,
  userAttempt: string,
  langConfig: LanguageConfig,
  addresseeGender?: string
): { system: string; user: string } {
  const genderInstruction = addresseeGender
    ? `\nThe original English text is addressing a ${addresseeGender} person. Evaluate and correct the translation using the appropriate gendered verb forms, pronouns, and grammar for a ${addresseeGender} addressee.`
    : "";

  const system = `You are a ${langConfig.name} language teacher. You evaluate student translation attempts, providing corrections and encouragement. Use natural, conversational language — the way educated native speakers actually talk, NOT written/literary register. Avoid bookish or academic vocabulary. ALL ${langConfig.name} text in your response MUST include full tashkeel/diacritical marks (harakat). Always respond with valid JSON only.${genderInstruction}`;

  const user = `A student is learning ${langConfig.name}. They were asked to translate:

English: "${english}"
Their attempt: "${userAttempt}"

Evaluate their translation. Return a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "correct": <boolean>,
  "correctedText": "<the correct ${langConfig.name} translation with full tashkeel/diacritics>",
  "transliteration": "<romanized pronunciation of correct version>",
  "mistakes": [
    {
      "type": "<spelling|grammar|word_choice|word_order|missing|extra>",
      "explanation": "<brief explanation of the mistake>"
    }
  ],
  "feedback": "<encouraging feedback message>"
}

Return ONLY the JSON object, no markdown, no explanation.`;

  return { system, user };
}
