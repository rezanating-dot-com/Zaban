import { AIProvider } from "./provider";
import { AnthropicProvider } from "./anthropic";
import { DeepSeekProvider } from "./deepseek";
import { GeminiProvider } from "./gemini";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

function getSetting(key: string): string | undefined {
  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get();
  return row?.value;
}

export function createAIProvider(): AIProvider {
  const provider = getSetting("aiProvider") || "anthropic";
  const model = getSetting("aiModel");

  const envKeys: Record<string, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  const apiKey = getSetting("aiApiKey") || envKeys[provider] || "";

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider({ apiKey, model });
    case "deepseek":
      return new DeepSeekProvider({ apiKey, model });
    case "gemini":
      return new GeminiProvider({ apiKey, model });
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
