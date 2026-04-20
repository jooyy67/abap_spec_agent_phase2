import {
  APIConnectionError,
  APIConnectionTimeoutError,
} from "openai";

function openAiConnectionHelp(detail?: string): string {
  const base = [
    "OpenAI 서버(api.openai.com)에 연결하지 못했습니다.",
    "PC·회사망 방화벽, DNS, VPN 필요 여부를 확인한 뒤 다시 시도해 주세요.",
    "프록시/VPN을 쓰는 경우 터미널·시스템 환경변수 HTTPS_PROXY(또는 HTTP_PROXY)를 설정하거나, .env에 동일 값을 넣은 뒤 개발 서버를 재시작해 보세요.",
    "호환 API 게이트웨이를 쓰는 경우 OPENAI_BASE_URL을 그 엔드포인트로 지정할 수 있습니다.",
  ].join(" ");
  return detail ? `${base} (${detail})` : base;
}

function errorCauseChain(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur instanceof Error && depth < 4) {
    if (cur.message) parts.push(cur.message);
    cur = "cause" in cur ? (cur as Error & { cause?: unknown }).cause : undefined;
    depth += 1;
  }
  return parts.filter(Boolean).join(" → ");
}

/**
 * OpenAI SDK 및 HTTP 오류 메시지를 사용자용 짧은 한글로 정리
 */
export function formatGeminiError(error: unknown): string {
  if (error instanceof APIConnectionTimeoutError) {
    return openAiConnectionHelp("요청 시간 초과");
  }

  if (error instanceof APIConnectionError) {
    const causeText = errorCauseChain(error);
    const trimmed = causeText.replace(/^Connection error\.?\s*→?\s*/i, "").trim();
    return openAiConnectionHelp(trimmed || undefined);
  }

  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (
    lower.includes("connection error") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("fetch failed") ||
    lower.includes("getaddrinfo")
  ) {
    return openAiConnectionHelp(raw.length < 120 ? raw : undefined);
  }

  if (
    lower.includes("api key expired") ||
    lower.includes("api_key_invalid") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid api key") ||
    lower.includes("invalid_api_key") ||
    (lower.includes("reason") && lower.includes("api_key_invalid"))
  ) {
    return [
      "OpenAI API 키가 만료되었거나 올바르지 않습니다.",
      "https://platform.openai.com/api-keys 에서 키를 확인한 뒤,",
      "프로젝트 루트 .env의 OPENAI_API_KEY(또는 GPT_API_KEY)를 수정하고 개발 서버를 다시 시작하세요.",
      "(Vercel 등 배포 환경에도 동일 변수를 반영해야 합니다.)",
    ].join(" ");
  }

  if (
    raw.includes("OPENAI_API_KEY is not configured") ||
    raw.includes("GPT_API_KEY is not configured")
  ) {
    return "OPENAI_API_KEY 또는 GPT_API_KEY가 설정되지 않았습니다. .env 파일에 키를 추가하세요.";
  }

  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted")
  ) {
    return "OpenAI API 사용 한도에 도달했거나 요청이 제한되었습니다. 잠시 후 다시 시도하거나 플랫폼에서 할당량·결제를 확인하세요.";
  }

  if (lower.includes("permission denied") || lower.includes("403")) {
    return "OpenAI API 접근이 거부되었습니다. API 키 권한·조직 정책·결제 설정을 확인하세요.";
  }

  /* 너무 긴 SDK/JSON 본문은 잘라서 표시 */
  if (raw.length > 480) {
    const head = raw.slice(0, 320).trim();
    return `${head}… (전체 오류는 서버 로그를 확인하세요)`;
  }

  return raw;
}
