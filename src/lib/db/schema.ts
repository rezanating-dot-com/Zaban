import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const languages = sqliteTable("languages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  direction: text("direction", { enum: ["ltr", "rtl"] })
    .notNull()
    .default("ltr"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const vocab = sqliteTable("vocab", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  languageCode: text("language_code").notNull(),
  english: text("english").notNull(),
  target: text("target").notNull(),
  transliteration: text("transliteration"),
  partOfSpeech: text("part_of_speech"),
  tags: text("tags"),
  notes: text("notes"),
  plural1: text("plural1"),
  plural2: text("plural2"),
  muradif: text("muradif"),
  mudaad: text("mudaad"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const verbs = sqliteTable("verbs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  languageCode: text("language_code").notNull(),
  vocabId: integer("vocab_id").references(() => vocab.id, {
    onDelete: "set null",
  }),
  infinitive: text("infinitive").notNull(),
  root: text("root"),
  form: text("form"),
  meaning: text("meaning"),
  masdar: text("masdar"),
  masdarVoweled: text("masdar_voweled"),
  verbType: text("verb_type"),
  aiGenerated: integer("ai_generated", { mode: "boolean" })
    .notNull()
    .default(false),
  aiModel: text("ai_model"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const conjugations = sqliteTable("conjugations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  verbId: integer("verb_id")
    .notNull()
    .references(() => verbs.id, { onDelete: "cascade" }),
  tense: text("tense").notNull(),
  person: text("person").notNull(),
  conjugated: text("conjugated").notNull(),
  voweled: text("voweled"),
  transliteration: text("transliteration"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const flashcards = sqliteTable("flashcards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  languageCode: text("language_code").notNull(),
  vocabId: integer("vocab_id").references(() => vocab.id, {
    onDelete: "cascade",
  }),
  conjugationId: integer("conjugation_id").references(() => conjugations.id, {
    onDelete: "cascade",
  }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  cardType: text("card_type", {
    enum: ["vocab", "conjugation"],
  }).notNull(),
  easeFactor: real("ease_factor").notNull().default(2.5),
  interval: integer("interval").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  nextReview: text("next_review")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const reviewHistory = sqliteTable("review_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flashcardId: integer("flashcard_id")
    .notNull()
    .references(() => flashcards.id, { onDelete: "cascade" }),
  quality: integer("quality").notNull(),
  easeFactor: real("ease_factor").notNull(),
  interval: integer("interval").notNull(),
  reviewedAt: text("reviewed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const translations = sqliteTable("translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  languageCode: text("language_code").notNull(),
  type: text("type", { enum: ["reference", "practice"] }).notNull(),
  sourceText: text("source_text").notNull(),
  translation: text("translation").notNull(),
  transliteration: text("transliteration"),
  notes: text("notes"),
  attempt: text("attempt"),
  score: integer("score"),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  mistakes: text("mistakes"),
  feedback: text("feedback"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
