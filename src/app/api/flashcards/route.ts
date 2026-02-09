import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { lte, asc, eq, and } from "drizzle-orm";
import { seedDefaults } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  seedDefaults();

  const lang = request.nextUrl.searchParams.get("lang") || "ar";
  const cardType = request.nextUrl.searchParams.get("cardType");
  const now = new Date().toISOString();

  const conditions = [eq(schema.flashcards.languageCode, lang)];
  if (cardType === "vocab" || cardType === "conjugation") {
    conditions.push(eq(schema.flashcards.cardType, cardType));
  }

  const baseFilter = and(...conditions);

  // Get due cards: nextReview <= now, filtered by language + cardType
  const dueCards = db
    .select()
    .from(schema.flashcards)
    .where(and(baseFilter, lte(schema.flashcards.nextReview, now)))
    .orderBy(
      asc(schema.flashcards.repetitions),
      asc(schema.flashcards.easeFactor),
      asc(schema.flashcards.nextReview)
    )
    .all();

  // Get total count for this language + cardType
  const allCards = db
    .select()
    .from(schema.flashcards)
    .where(baseFilter)
    .all();

  return NextResponse.json({
    due: dueCards,
    totalCards: allCards.length,
    dueCount: dueCards.length,
  });
}
