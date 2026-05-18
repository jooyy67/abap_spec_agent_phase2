import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Dispatcher } from "undici";
import { ProxyAgent } from "undici";

/** 신규 API 키는 gemini-2.0-flash를 쓸 수 없어 2.5 Flash를 기본으로 둡니다. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_FETCH_PATCHED = Symbol.for("abapSpecAgentGeminiFetchProxyPatched");

function resolveHttpProxyUrl(): string | undefined {
  const raw =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  const t = raw?.trim();
  return t || undefined;
}

/**
 * Node(Next API)의 기본 fetch는 Windows 시스템 프록시를 따르지 않습니다.
 * HTTPS_PROXY 등이 있으면 undici ProxyAgent로 globalThis.fetch를 한 번 감쌉니다.
 * (회사망·VPN에서 generativelanguage.googleapis.com 직접 연결이 막힐 때)
 */
function ensureGlobalFetchUsesHttpProxy(): void {
  const proxyUrl = resolveHttpProxyUrl();
  if (!proxyUrl || typeof globalThis.fetch !== "function") return;

  const g = globalThis as unknown as Record<symbol, boolean>;
  if (g[GEMINI_FETCH_PATCHED]) return;

  let agent: ProxyAgent;
  try {
    agent = new ProxyAgent(proxyUrl);
  } catch (e) {
    console.warn("[google-gemini-client] ProxyAgent 생성 실패:", e);
    return;
  }

  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const next = { ...(init ?? {}) } as RequestInit & {
      dispatcher?: Dispatcher;
    };
    if (!next.dispatcher) next.dispatcher = agent;
    return original(input, next as RequestInit);
  }) as typeof fetch;

  g[GEMINI_FETCH_PATCHED] = true;
}

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

export function getGeminiModelName(
  defaultModel: string = DEFAULT_GEMINI_MODEL,
): string {
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
  /** 기본값은 GEMINI_MAX_OUTPUT_TOKENS 환경변수 또는 32768. 코드 생성 등 대용량 JSON은 더 크게 지정하세요. */
  maxOutputTokens?: number;
}): Promise<string> {
  ensureGlobalFetchUsesHttpProxy();

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: opts.model });

  const envCap = Number.parseInt(
    process.env.GEMINI_MAX_OUTPUT_TOKENS || "32768",
    10,
  );
  const maxOutputTokens =
    typeof opts.maxOutputTokens === "number" && opts.maxOutputTokens > 0
      ? opts.maxOutputTokens
      : Number.isFinite(envCap) && envCap > 0
        ? envCap
        : 32768;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature,
      responseMimeType: "application/json",
      maxOutputTokens,
    },
  });

  const response = result.response;
  const finish = response.candidates?.[0]?.finishReason;
  if (finish === "MAX_TOKENS") {
    throw new Error(
      "Gemini 응답이 출력 토큰 한도로 잘려 JSON이 불완전합니다. .env에 GEMINI_MAX_OUTPUT_TOKENS=65536 등으로 올린 뒤 개발 서버를 재시작하거나, 한 번에 생성할 ABAP 분량을 줄여 보세요.",
    );
  }

  const text = response.text();
  if (!text?.trim()) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }
  return text;
}

