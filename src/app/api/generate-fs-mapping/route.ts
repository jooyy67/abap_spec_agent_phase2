import { NextResponse } from "next/server";
import { formatGeminiError } from "@/lib/gemini-errors";
import { runFsMappingGeneration } from "@/lib/gemini-fs-mapping";
import type { SpecFormState } from "@/types/spec";

export const maxDuration = 120;

function geminiHttpStatus(message: string): number {
  const lower = message.toLowerCase();
  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted")
  )
    return 429;
  if (
    lower.includes("permission denied") ||
    lower.includes("403") ||
    lower.includes("access is denied")
  )
    return 403;
  if (
    lower.includes("api key") ||
    lower.includes("gemini_api_key is not configured") ||
    lower.includes("not configured")
  )
    return 400;
  return 500;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { spec?: SpecFormState };
    if (!body.spec) {
      return NextResponse.json(
        { error: "spec 객체가 필요합니다." },
        { status: 400 },
      );
    }

    if (!body.spec.programKind) {
      return NextResponse.json(
        { error: "프로그램 유형이 없습니다. 1단계에서 입력해 주세요." },
        { status: 400 },
      );
    }

    const data = await runFsMappingGeneration(body.spec);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[api/generate-fs-mapping]", e);
    const message = formatGeminiError(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: geminiHttpStatus(message) },
    );
  }
}
