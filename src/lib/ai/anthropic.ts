import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, AIProviderConfig } from "./provider";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || "claude-sonnet-4-5-20250929";
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: systemPrompt || "",
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }
    return block.text;
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
