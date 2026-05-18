function geminiConnectionHelp(detail?: string): string {
  const base = [
    "Gemini 서버에 연결하지 못했습니다.",
    "PC·회사망 방화벽, DNS, VPN 필요 여부를 확인한 뒤 다시 시도해 주세요.",
    "Next.js(Node)는 Windows의 시스템 프록시를 자동으로 쓰지 않습니다. 회사 프록시가 있다면 프로젝트 루트 .env에 HTTPS_PROXY(또는 HTTP_PROXY)를 넣고 개발 서버를 재시작하세요.",
    "로컬 API까지 프록시를 타면 안 되는 경우 NO_PROXY=localhost,127.0.0.1 을 함께 설정해 보세요.",
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
 * Gemini SDK 및 HTTP 오류 메시지를 사용자용 짧은 한글로 정리
 */
export function formatGeminiError(error: unknown): string {
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
    const causeText = errorCauseChain(error);
    const detail = (causeText || raw).trim();
    return geminiConnectionHelp(detail.length < 160 ? detail : undefined);
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
      "Gemini API 키가 만료되었거나 올바르지 않습니다.",
      "Google AI Studio에서 키를 확인한 뒤,",
      "프로젝트 루트 .env의 GEMINI_API_KEY를 수정하고 개발 서버를 다시 시작하세요.",
    ].join(" ");
  }

  if (
    raw.includes("GEMINI_API_KEY is not configured") ||
    lower.includes("gemini_api_key is not configured")
  ) {
    return "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 키를 추가하세요.";
  }

  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted")
  ) {
    return "Gemini API 사용 한도에 도달했거나 요청이 제한되었습니다. 잠시 후 다시 시도하거나 Google Cloud/AI Studio에서 할당량·결제를 확인하세요.";
  }

  if (lower.includes("permission denied") || lower.includes("403")) {
    return "Gemini API 접근이 거부되었습니다. API 키 권한·조직 정책·결제 설정을 확인하세요.";
  }

  /* 너무 긴 SDK/JSON 본문은 잘라서 표시 */
  if (raw.length > 480) {
    const head = raw.slice(0, 320).trim();
    return `${head}… (전체 오류는 서버 로그를 확인하세요)`;
  }

  return raw;
}
