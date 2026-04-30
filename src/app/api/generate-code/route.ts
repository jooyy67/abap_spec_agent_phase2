import { NextResponse } from "next/server";
import { formatGeminiError } from "@/lib/gemini-errors";
import { runCodeGeneration } from "@/lib/gemini-codegen";
import type { CodeGenerationRequest } from "@/types/codegen";

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
    const body = (await request.json()) as Partial<CodeGenerationRequest>;
    if (!body.spec) {
      return NextResponse.json({ error: "spec 객체가 필요합니다." }, { status: 400 });
    }
    if (!body.functionalSpecMarkdown?.trim()) {
      return NextResponse.json(
        { error: "functionalSpecMarkdown가 비어 있습니다. 2단계에서 생성해 주세요." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.mappingRows) || body.mappingRows.length === 0) {
      return NextResponse.json(
        { error: "mappingRows가 비어 있습니다. 2단계에서 매핑을 생성/입력해 주세요." },
        { status: 400 },
      );
    }

    const data = await runCodeGeneration({
      spec: body.spec,
      functionalSpecMarkdown: body.functionalSpecMarkdown,
      mappingRows: body.mappingRows,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[api/generate-code]", e);
    const message = formatGeminiError(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: geminiHttpStatus(message) },
    );
  }
}

