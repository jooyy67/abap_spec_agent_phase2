import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeEnvSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const unquoted = trimmed.replace(/^["'](.+)["']$/, "$1").trim();
  return unquoted || undefined;
}

export function getGeminiApiKey(): string {
  const apiKey = normalizeEnvSecret(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

export function getGeminiModelName(defaultModel: string): string {
  return (
    process.env.GEMINI_MODEL ||
    process.env.GOOGLE_GEMINI_MODEL ||
    defaultModel
  ).trim();
}

export type GeminiTextPart = { text: string };
export type GeminiInlineImagePart = {
  inlineData: { mimeType: string; data: string };
};
export type GeminiPart = GeminiTextPart | GeminiInlineImagePart;

export async function generateJsonWithGemini(opts: {
  model: string;
  parts: GeminiPart[];
  temperature: number;
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: opts.model });

  const res = await model.generateContent({
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature,
      responseMimeType: "application/json",
    },
  });

  return res.response.text();
}

