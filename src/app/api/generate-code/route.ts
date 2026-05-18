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

    const prevGen =
      typeof body.previousGeneratedCode === "string"
        ? body.previousGeneratedCode.trim()
        : "";
    const errLog =
      typeof body.sapActivationErrorLog === "string"
        ? body.sapActivationErrorLog.trim()
        : "";
    const shot = body.sapErrorScreenshot;
    const hasShot =
      shot &&
      typeof shot === "object" &&
      typeof (shot as { data?: unknown }).data === "string" &&
      String((shot as { data: string }).data).trim().length > 0 &&
      typeof (shot as { mimeType?: unknown }).mimeType === "string" &&
      String((shot as { mimeType: string }).mimeType).trim().length > 0;

    const wantsSapFix = errLog.length > 0 || hasShot;
    if (wantsSapFix && !prevGen) {
      return NextResponse.json(
        {
          error:
            "SAP 오류를 반영하려면 이전에 생성된 ABAP이 필요합니다. 3단계에서 코드를 생성하거나, 생성 코드 영역에 붙여 넣은 뒤 다시 시도해 주세요.",
        },
        { status: 400 },
      );
    }

    let screenshotPayload:
      | { mimeType: string; data: string }
      | undefined;
    if (hasShot && shot) {
      const mime = String((shot as { mimeType: string }).mimeType)
        .trim()
        .toLowerCase();
      if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime)) {
        return NextResponse.json(
          { error: "스크린샷은 PNG, JPEG, WebP만 지원합니다." },
          { status: 400 },
        );
      }
      const normalizedMime = mime === "image/jpg" ? "image/jpeg" : mime;
      screenshotPayload = {
        mimeType: normalizedMime,
        data: String((shot as { data: string }).data).trim(),
      };
    }

    const data = await runCodeGeneration({
      spec: body.spec,
      functionalSpecMarkdown: body.functionalSpecMarkdown,
      mappingRows: body.mappingRows,
      previousGeneratedCode: prevGen || undefined,
      sapActivationErrorLog: errLog || undefined,
      sapErrorScreenshot: screenshotPayload,
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

