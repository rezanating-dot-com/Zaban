import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createAIProvider } from "@/lib/ai/factory";
import { buildConjugationPrompt } from "@/lib/ai/prompts/conjugation";
import { getLanguageConfig } from "@/lib/language/config";
import { createConjugationFlashcards } from "@/lib/flashcards/create";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const verb = db
    .select()
    .from(schema.verbs)
    .where(eq(schema.verbs.id, parseInt(id)))
    .get();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  const conjugations = db
    .select()
    .from(schema.conjugations)
    .where(eq(schema.conjugations.verbId, verb.id))
    .all();

  return NextResponse.json({ verb, conjugations });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const verb = db
    .select()
    .from(schema.verbs)
    .where(eq(schema.verbs.id, parseInt(id)))
    .get();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  // Delete existing conjugations
  db.delete(schema.conjugations)
    .where(eq(schema.conjugations.verbId, verb.id))
    .run();

  try {
    const langConfig = getLanguageConfig(verb.languageCode);
    const ai = createAIProvider();
    const { system, user } = buildConjugationPrompt(
      verb.infinitive,
      verb.root || undefined,
      verb.form || undefined,
      langConfig
    );

    const response = await ai.complete(user, system);

    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(jsonStr) as {
      metadata?: {
        root?: string;
        meaning?: string;
        masdar?: string;
        masdarVoweled?: string;
        verbType?: string;
      };
      conjugations: {
        tense: string;
        person: string;
        conjugated: string;
        voweled?: string;
        transliteration?: string;
      }[];
    };

    db.update(schema.verbs)
      .set({
        aiModel: ai.name,
        root: parsed.metadata?.root || verb.root,
        meaning: parsed.metadata?.meaning || null,
        masdar: parsed.metadata?.masdar || null,
        masdarVoweled: parsed.metadata?.masdarVoweled || null,
        verbType: parsed.metadata?.verbType || null,
      })
      .where(eq(schema.verbs.id, verb.id))
      .run();

    for (const conj of parsed.conjugations) {
      db.insert(schema.conjugations)
        .values({
          verbId: verb.id,
          tense: conj.tense,
          person: conj.person,
          conjugated: conj.conjugated,
          voweled: conj.voweled || null,
          transliteration: conj.transliteration || null,
        })
        .run();
    }

    createConjugationFlashcards(verb.id);

    const updatedVerb = db
      .select()
      .from(schema.verbs)
      .where(eq(schema.verbs.id, verb.id))
      .get();

    const conjugations = db
      .select()
      .from(schema.conjugations)
      .where(eq(schema.conjugations.verbId, verb.id))
      .all();

    return NextResponse.json({ verb: updatedVerb, conjugations });
  } catch (error) {
    return NextResponse.json(
      {
        error: `AI generation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const verb = db
    .select()
    .from(schema.verbs)
    .where(eq(schema.verbs.id, parseInt(id)))
    .get();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  db.delete(schema.verbs).where(eq(schema.verbs.id, parseInt(id))).run();

  return NextResponse.json({ success: true });
}
