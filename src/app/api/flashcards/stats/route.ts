import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, lte, gte, eq, and } from "drizzle-orm";
import { seedDefaults } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  seedDefaults();

  const lang = request.nextUrl.searchParams.get("lang") || "ar";
  const cardType = request.nextUrl.searchParams.get("cardType");
  const now = new Date().toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const conditions = [eq(schema.flashcards.languageCode, lang)];
  if (cardType === "vocab" || cardType === "conjugation") {
    conditions.push(eq(schema.flashcards.cardType, cardType));
  }
  const baseFilter = and(...conditions);

  const totalCards = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.flashcards)
    .where(baseFilter)
    .get();

  const dueCards = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.flashcards)
    .where(and(baseFilter, lte(schema.flashcards.nextReview, now)))
    .get();

  const reviewedToday = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.reviewHistory)
    .where(gte(schema.reviewHistory.reviewedAt, todayStr))
    .get();

  const totalVocab = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.vocab)
    .where(eq(schema.vocab.languageCode, lang))
    .get();

  const totalVerbs = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.verbs)
    .where(eq(schema.verbs.languageCode, lang))
    .get();

  return NextResponse.json({
    totalCards: totalCards?.count || 0,
    dueCards: dueCards?.count || 0,
    reviewedToday: reviewedToday?.count || 0,
    totalVocab: totalVocab?.count || 0,
    totalVerbs: totalVerbs?.count || 0,
  });
}
