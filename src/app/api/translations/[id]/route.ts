import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = db
    .select()
    .from(schema.translations)
    .where(eq(schema.translations.id, parseInt(id)))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.delete(schema.translations)
    .where(eq(schema.translations.id, parseInt(id)))
    .run();

  return NextResponse.json({ success: true });
}
