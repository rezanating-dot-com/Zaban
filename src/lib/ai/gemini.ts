import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, AIProviderConfig } from "./provider";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || "gemini-2.0-flash";
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt || undefined,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error("Unexpected empty response from Gemini");
    }
    return text;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      await model.generateContent("Hi");
      return true;
    } catch {
      return false;
    }
  }
}
