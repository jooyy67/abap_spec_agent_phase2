import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

function normalizeEnvSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const unquoted = trimmed.replace(/^["'](.+)["']$/, "$1").trim();
  return unquoted || undefined;
}

/**
 * OpenAI 클라이언트. HTTPS_PROXY / HTTP_PROXY 가 있으면 해당 프록시로 연결합니다.
 * (회사망·로컬 VPN 클라이언트 등에서 api.openai.com 직접 연결이 막힐 때 사용)
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = normalizeEnvSecret(
    process.env.OPENAI_API_KEY ||
      process.env.GPT_API_KEY ||
      process.env.GEMINI_API_KEY,
  );
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const httpAgent = proxy?.trim()
    ? new HttpsProxyAgent(proxy.trim())
    : undefined;

  const baseURL = process.env.OPENAI_BASE_URL?.trim();

  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    httpAgent,
    maxRetries: 3,
  });
}
