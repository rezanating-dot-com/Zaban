import { LanguageConfig } from "@/lib/language/types";

export function buildReferenceTranslationPrompt(
  text: string,
  langConfig: LanguageConfig
): { system: string; user: string } {
  const system = `You are a ${langConfig.name} language expert and translator. Provide accurate translations with transliterations. ALL ${langConfig.name} text MUST include full tashkeel/diacritical marks (harakat). Always respond with valid JSON only.`;

  const user = `Translate the following English text to ${langConfig.name}:

"${text}"

Return a JSON object with this exact structure:
{
  "translation": "<translated text with full tashkeel/diacritics>",
  "transliteration": "<romanized pronunciation>",
  "notes": "<brief grammar or usage notes, if relevant>"
}

Return ONLY the JSON object, no markdown, no explanation.`;

  return { system, user };
}

export function buildPracticeScoringPrompt(
  english: string,
  userAttempt: string,
  langConfig: LanguageConfig
): { system: string; user: string } {
  const system = `You are a ${langConfig.name} language teacher. You evaluate student translation attempts, providing corrections and encouragement. ALL ${langConfig.name} text in your response MUST include full tashkeel/diacritical marks (harakat). Always respond with valid JSON only.`;

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
