import { NextResponse } from "next/server";
import { formatGeminiError } from "@/lib/gemini-errors";
import { runGeminiAnalysis } from "@/lib/gemini-analyze";
import type { BasicInfo, ProgramKind, UploadPurpose } from "@/types/spec";

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

function normalizePurpose(p: unknown): UploadPurpose {
  return p === "layout_reference" ? "layout_reference" : "ddic_table";
}

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      basicInfo?: BasicInfo;
      programKind?: ProgramKind;
      files?: {
        name: string;
        mimeType: string;
        base64: string;
        purpose?: UploadPurpose;
      }[];
      fileMetadataOnly?: {
        name: string;
        size: number;
        type: string;
        purpose?: UploadPurpose;
      }[];
    };

    if (!body.basicInfo || !body.programKind) {
      return NextResponse.json(
        { error: "basicInfo와 programKind는 필수입니다." },
        { status: 400 },
      );
    }

    const rawFiles = Array.isArray(body.files) ? body.files : [];
    const rawMeta = Array.isArray(body.fileMetadataOnly)
      ? body.fileMetadataOnly
      : [];

    const files = rawFiles.map((f) => ({
      ...f,
      purpose: normalizePurpose(f.purpose),
    }));
    const fileMetadataOnly = rawMeta.map((f) => ({
      ...f,
      purpose: normalizePurpose(f.purpose),
    }));

    const data = await runGeminiAnalysis({
      basicInfo: body.basicInfo,
      programKind: body.programKind,
      files,
      fileMetadataOnly,
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[api/analyze]", e);
    const message = formatGeminiError(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: geminiHttpStatus(message) },
    );
  }
}
