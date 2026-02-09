import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { createAIProvider } from "@/lib/ai/factory";
import { buildVocabTranslatePrompt } from "@/lib/ai/prompts/vocab-translate";
import { getLanguageConfig } from "@/lib/language/config";
import { createVocabFlashcard } from "@/lib/flashcards/create";

const BATCH_SIZE = 15;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids, languageCode } = body as {
    ids?: number[];
    languageCode: string;
  };

  if (!languageCode) {
    return NextResponse.json(
      { error: "languageCode is required" },
      { status: 400 }
    );
  }

  // Get words to translate
  let wordsToTranslate;
  if (ids && ids.length > 0) {
    wordsToTranslate = db
      .select()
      .from(schema.vocab)
      .where(
        and(
          inArray(schema.vocab.id, ids),
          eq(schema.vocab.languageCode, languageCode)
        )
      )
      .all();
  } else {
    // All untranslated words for this language
    wordsToTranslate = db
      .select()
      .from(schema.vocab)
      .where(
        and(
          eq(schema.vocab.languageCode, languageCode),
          eq(schema.vocab.target, "")
        )
      )
      .all();
  }

  if (wordsToTranslate.length === 0) {
    return NextResponse.json({ translated: 0 });
  }

  const langConfig = getLanguageConfig(languageCode);
  const ai = createAIProvider();

  let translated = 0;
  let lastError: string | null = null;

  // Process in batches
  for (let i = 0; i < wordsToTranslate.length; i += BATCH_SIZE) {
    const batch = wordsToTranslate.slice(i, i + BATCH_SIZE);
    const englishWords = batch.map((w) => w.english);
    const { system, user } = buildVocabTranslatePrompt(englishWords, langConfig);

    let raw: string;
    try {
      raw = await ai.complete(user, system);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "AI request failed";
      continue;
    }

    // Parse JSON response - strip markdown fences if present
    let translations: {
      english: string;
      target: string;
      transliteration: string;
      partOfSpeech: string;
      plural1?: string;
      plural2?: string;
      muradif?: string;
      mudaad?: string;
    }[];

    try {
      const cleaned = raw.replace(/```json\s*\n?/g, "").replace(/```\s*$/g, "").trim();
      translations = JSON.parse(cleaned);
    } catch {
      lastError = "Failed to parse AI response";
      continue;
    }

    if (!Array.isArray(translations) || translations.length !== batch.length) {
      lastError = "AI returned unexpected number of translations";
      continue;
    }

    // Update each word and create flashcards
    for (let j = 0; j < batch.length; j++) {
      const word = batch[j];
      const t = translations[j];

      if (!t.target) continue;

      db.update(schema.vocab)
        .set({
          target: t.target,
          transliteration: t.transliteration || null,
          partOfSpeech: t.partOfSpeech || null,
          plural1: t.plural1 || null,
          plural2: t.plural2 || null,
          muradif: t.muradif || null,
          mudaad: t.mudaad || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.vocab.id, word.id))
        .run();

      createVocabFlashcard(word.id);
      translated++;
    }
  }

  if (translated === 0 && lastError) {
    return NextResponse.json({ error: lastError }, { status: 502 });
  }

  return NextResponse.json({ translated });
}
