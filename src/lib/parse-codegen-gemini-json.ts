import type { CodeGenerationResult } from "@/types/codegen";

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** 첫 번째 최상위 `{ ... }` 구간을 문자열/이스케이프를 고려해 잘라낸다. */
function sliceFirstBalancedJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i]!;
    if (inString) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function repairTrailingCommasInJson(s: string): string {
  return s.replace(/,(\s*[}\]])/g, "$1");
}

/** s[i]가 `"`일 때, 닫는 `"`까지 JSON 이스케이프 규칙으로 읽어 문자열 값을 반환한다. */
function readJsonStringValue(
  s: string,
  i: number,
): { end: number; value: string } | null {
  if (s[i] !== '"') return null;
  let p = i + 1;
  let out = "";
  while (p < s.length) {
    const c = s[p]!;
    if (c === "\\") {
      if (p + 1 >= s.length) return null;
      const e = s[p + 1]!;
      if (e === '"' || e === "\\" || e === "/") out += e;
      else if (e === "n") out += "\n";
      else if (e === "r") out += "\r";
      else if (e === "t") out += "\t";
      else if (e === "b") out += "\b";
      else if (e === "f") out += "\f";
      else if (e === "u" && p + 5 < s.length) {
        const hex = s.slice(p + 2, p + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
        out += String.fromCharCode(parseInt(hex, 16));
        p += 6;
        continue;
      } else {
        out += e;
      }
      p += 2;
      continue;
    }
    if (c === '"') return { end: p + 1, value: out };
    out += c;
    p++;
  }
  return null;
}

function extractStringValueForJsonKey(raw: string, key: string): string | null {
  const keyToken = `"${key}"`;
  const idx = raw.indexOf(keyToken);
  if (idx < 0) return null;
  let j = raw.indexOf(":", idx + keyToken.length);
  if (j < 0) return null;
  j += 1;
  while (j < raw.length && /\s/.test(raw[j]!)) j++;
  const read = readJsonStringValue(raw, j);
  if (!read) return null;
  return read.value;
}

const B64_KEYS = ["generatedCodeB64", "generated_code_b64"] as const;
const PLAIN_KEYS = ["generatedCode", "generated_code"] as const;

function tryDecodeB64(b64Raw: string): string | null {
  const compact = b64Raw.replace(/\s/g, "");
  if (!compact) return null;
  try {
    const code = Buffer.from(compact, "base64").toString("utf8");
    return code.trim() ? code : null;
  } catch {
    return null;
  }
}

function pickB64FromObject(obj: Record<string, unknown>): string | null {
  for (const k of B64_KEYS) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) {
      const decoded = tryDecodeB64(v);
      if (decoded) return decoded;
    }
  }
  return null;
}

function tryJsonParseCandidates(cleaned: string): unknown | null {
  const balanced = sliceFirstBalancedJsonObject(cleaned);
  const legacySlice = (() => {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return cleaned.slice(start, end + 1);
  })();

  const candidates = [
    cleaned,
    balanced,
    legacySlice,
    balanced ? repairTrailingCommasInJson(balanced) : null,
    legacySlice ? repairTrailingCommasInJson(legacySlice) : null,
  ].filter((x): x is string => Boolean(x && x.trim()));

  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return null;
}

function extractB64FromBrokenRaw(raw: string): string | null {
  for (const key of B64_KEYS) {
    const b64Raw = extractStringValueForJsonKey(raw, key);
    if (b64Raw) {
      const decoded = tryDecodeB64(b64Raw);
      if (decoded) return decoded;
    }
  }
  return null;
}

function extractPlainFromBrokenRaw(raw: string): string | null {
  for (const key of PLAIN_KEYS) {
    const v = extractStringValueForJsonKey(raw, key);
    if (v && v.trim()) return v;
  }
  return null;
}

/**
 * Gemini `application/json` 응답에서 ABAP 코드를 꺼낸다.
 * - 선호: `generatedCodeB64` (UTF-8 Base64, JSON에 안전)
 * - 호환: `generatedCode` (평문 문자열)
 */
export function parseCodeGenerationGeminiJson(raw: string): CodeGenerationResult {
  const cleaned = stripJsonFences(raw);

  const parsed = tryJsonParseCandidates(cleaned);

  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const fromB64 = pickB64FromObject(obj);
    if (fromB64) return { generatedCode: fromB64 };

    for (const k of PLAIN_KEYS) {
      const plain = obj[k];
      if (typeof plain === "string" && plain.trim()) {
        return { generatedCode: plain };
      }
    }
  }

  const b64Fallback = extractB64FromBrokenRaw(cleaned);
  if (b64Fallback) return { generatedCode: b64Fallback };

  const plainFallback = extractPlainFromBrokenRaw(cleaned);
  if (plainFallback) return { generatedCode: plainFallback };

  const hasBrace = cleaned.includes("{");
  if (!hasBrace) {
    throw new Error(
      "코드 생성 응답에 JSON 객체가 없습니다. Gemini 응답이 비었거나 형식이 잘못되었을 수 있습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  throw new Error(
    "코드 생성 응답 JSON을 파싱할 수 없습니다. 출력이 잘렸거나(토큰 한도), generatedCodeB64 필드가 없을 수 있습니다. GEMINI_MAX_OUTPUT_TOKENS를 올리거나 잠시 후 다시 시도해 주세요.",
  );
}
