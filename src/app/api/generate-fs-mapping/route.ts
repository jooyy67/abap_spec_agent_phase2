import { NextResponse } from "next/server";
import { formatGeminiError } from "@/lib/gemini-errors";
import { runFsMappingGeneration } from "@/lib/gemini-fs-mapping";
import type { SpecFormState } from "@/types/spec";

export const maxDuration = 120;

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
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
