import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, like, or, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const lang = searchParams.get("lang") || "ar";
  const type = searchParams.get("type");

  const conditions = [eq(schema.translations.languageCode, lang)];

  if (type === "reference" || type === "practice") {
    conditions.push(eq(schema.translations.type, type));
  }

  if (search) {
    conditions.push(
      or(
        like(schema.translations.sourceText, `%${search}%`),
        like(schema.translations.translation, `%${search}%`),
        like(schema.translations.transliteration, `%${search}%`)
      )!
    );
  }

  const results = db
    .select()
    .from(schema.translations)
    .where(and(...conditions))
    .orderBy(desc(schema.translations.createdAt))
    .all();

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, sourceText, translation } = body;

  if (!type || !sourceText || !translation) {
    return NextResponse.json(
      { error: "type, sourceText, and translation are required" },
      { status: 400 }
    );
  }

  if (type !== "reference" && type !== "practice") {
    return NextResponse.json(
      { error: "type must be 'reference' or 'practice'" },
      { status: 400 }
    );
  }

  const result = db
    .insert(schema.translations)
    .values({
      languageCode: body.languageCode || "ar",
      type,
      sourceText,
      translation,
      transliteration: body.transliteration || null,
      notes: body.notes || null,
      attempt: body.attempt || null,
      score: body.score ?? null,
      isCorrect: body.isCorrect ?? null,
      mistakes: body.mistakes ? JSON.stringify(body.mistakes) : null,
      feedback: body.feedback || null,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
