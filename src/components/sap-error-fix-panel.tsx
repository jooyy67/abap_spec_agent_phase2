"use client";

import * as React from "react";
import { ImagePlus, Trash2, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpecPipeline } from "@/context/spec-pipeline-context";
import type { MappingSheetRow } from "@/types/fs-mapping";
import { cn } from "@/lib/utils";

const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === "string") resolve(r.result);
      else reject(new Error("파일을 읽지 못했습니다."));
    };
    r.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    r.readAsDataURL(file);
  });
}

function dataUrlToPayload(dataUrl: string): { mimeType: string; data: string } {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!m) {
    return { mimeType: "image/png", data: dataUrl.replace(/\s/g, "") };
  }
  return { mimeType: m[1].trim(), data: m[2].replace(/\s/g, "") };
}

export function SapErrorFixPanel() {
  const {
    buildSpecFormState,
    functionalSpecMarkdown,
    mappingRows,
    generatedCode,
    setGeneratedCode,
    sapActivationErrorLog,
    setSapActivationErrorLog,
    sapErrorScreenshot,
    setSapErrorScreenshot,
    setPhase,
  } = useSpecPipeline();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasBaseline = generatedCode.trim().length > 0;
  const hasTextErrors = sapActivationErrorLog.trim().length > 0;
  const hasImage = Boolean(sapErrorScreenshot?.data?.trim());

  const runRegenerateWithSapErrors = React.useCallback(async () => {
    setError(null);
    if (!hasBaseline) {
      setError("3단계에서 먼저 ABAP을 생성하거나, 생성 코드를 붙여 넣어 주세요.");
      return;
    }
    if (!hasTextErrors && !hasImage) {
      setError("SAP 오류 텍스트를 붙여 넣거나, 오류 화면 스크린샷을 첨부해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const spec = buildSpecFormState();
      const shot =
        sapErrorScreenshot?.data?.trim() && sapErrorScreenshot.mimeType
          ? {
              mimeType: sapErrorScreenshot.mimeType,
              data: sapErrorScreenshot.data.replace(
                /^data:[^;]+;base64,/i,
                "",
              ),
            }
          : undefined;

      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          functionalSpecMarkdown,
          mappingRows: mappingRows.map(
            ({ id: _id, ...rest }) => rest,
          ) as Omit<MappingSheetRow, "id">[],
          previousGeneratedCode: generatedCode,
          sapActivationErrorLog: sapActivationErrorLog.trim() || undefined,
          sapErrorScreenshot: shot,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { generatedCode: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "코드 재생성에 실패했습니다.");
      }
      setGeneratedCode(json.data.generatedCode);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    buildSpecFormState,
    functionalSpecMarkdown,
    generatedCode,
    mappingRows,
    sapActivationErrorLog,
    sapErrorScreenshot,
    setGeneratedCode,
  ]);

  const ingestImageFile = React.useCallback(
    async (file: File) => {
      setError(null);
      const mime =
        file.type === "image/jpg" ? "image/jpeg" : file.type || "image/png";
      if (!mime.startsWith("image/") || !ALLOWED_IMAGE_MIME.has(mime)) {
        setError("PNG, JPEG, WebP 이미지만 붙여 넣거나 첨부할 수 있습니다.");
        return;
      }
      if (file.size > MAX_SCREENSHOT_BYTES) {
        setError("스크린샷은 2MB 이하로 줄인 뒤 다시 붙여 넣어 주세요.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const { mimeType, data } = dataUrlToPayload(dataUrl);
        setSapErrorScreenshot({ mimeType, data });
      } catch {
        setError("이미지를 읽지 못했습니다.");
      }
    },
    [setSapErrorScreenshot],
  );

  const onPickScreenshot = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      void ingestImageFile(file);
    },
    [ingestImageFile],
  );

  const onPasteCaptureImage = React.useCallback(
    (e: React.ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;

      const take = (file: File | null) => {
        if (!file || !file.type.startsWith("image/")) return false;
        e.preventDefault();
        void ingestImageFile(file);
        return true;
      };

      for (const item of Array.from(dt.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          if (take(item.getAsFile())) return;
        }
      }
      if (dt.files?.length) {
        for (const f of Array.from(dt.files)) {
          if (take(f)) return;
        }
      }
    },
    [ingestImageFile],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-12">
      <h2 className="text-xl font-semibold tracking-tight">SAP 오류 반영</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        SAP GUI에서 활성화·구문 검사 후 나온 오류 목록을 붙여 넣거나, 오류
        화면을 캡처해 첨부한 뒤 코드를 다시 생성합니다. 결과는 3단계와 동일한
        생성 코드 영역에 반영됩니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setPhase("code")}
        >
          3단계(코드)로 이동
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4" />
            기준 코드
          </CardTitle>
          <CardDescription>
            현재 저장된 생성 ABAP 전체가 재생성의 기준입니다. 3단계 텍스트
            영역에서 수정한 내용이 있으면 그대로 사용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!hasBaseline ? (
            <p className="text-sm text-amber-700 dark:text-amber-500">
              생성 코드가 비어 있습니다. 3단계에서 「ABAP 코드 생성」을 실행하거나
              오류가 난 소스를 붙여 넣어 주세요.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              기준 코드 길이: {generatedCode.length.toLocaleString()}자
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">SAP 오류 텍스트</CardTitle>
          <CardDescription>
            SAP 리스트·상세 메시지를 그대로 복사해 붙여 넣으면 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[160px] font-mono text-sm"
            placeholder="예: 프로그램 ZNMM_TEST 줄 26 — TABSTRIP or TABLEVIEW expected after TYPE. (클립보드에 이미지가 있으면 여기서 Ctrl+V로 스크린샷을 넣을 수 있습니다.)"
            value={sapActivationErrorLog}
            onChange={(e) => setSapActivationErrorLog(e.target.value)}
            onPaste={onPasteCaptureImage}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="size-4" />
            오류 화면 스크린샷(선택)
          </CardTitle>
          <CardDescription>
            텍스트만으로 부족할 때 첨부합니다. PNG·JPEG·WebP, 2MB 이하. 아래
            영역이나 오류 텍스트 칸에서{" "}
            <span className="font-medium text-foreground">Ctrl+V</span>로
            클립보드 이미지를 바로 붙여 넣을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            tabIndex={0}
            onPaste={onPasteCaptureImage}
            className={cn(
              "flex min-h-[100px] cursor-text flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground outline-none transition-colors",
              "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
              hasImage && "border-solid border-border bg-background",
            )}
          >
            {hasImage && sapErrorScreenshot ? (
              <img
                src={`data:${sapErrorScreenshot.mimeType};base64,${sapErrorScreenshot.data}`}
                alt="첨부된 SAP 오류 스크린샷"
                className="max-h-48 max-w-full rounded-md border object-contain"
              />
            ) : (
              <>
                <span className="font-medium text-foreground">
                  여기를 클릭한 뒤 Ctrl+V
                </span>
                <span>윈도우 캡처·Snipping Tool 등으로 복사한 이미지를 붙여 넣으세요.</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={onPickScreenshot}
            />
            <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => fileInputRef.current?.click()}
            >
              이미지 첨부
            </Button>
            {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground"
              onClick={() => setSapErrorScreenshot(null)}
            >
              <Trash2 className="size-3.5" />
              첨부 제거
            </Button>
            )}
            {hasImage && sapErrorScreenshot && (
            <span className="text-xs text-muted-foreground">
              {sapErrorScreenshot.mimeType}
            </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={runRegenerateWithSapErrors}
          disabled={
            loading ||
            !functionalSpecMarkdown.trim() ||
            mappingRows.length === 0 ||
            !hasBaseline ||
            (!hasTextErrors && !hasImage)
          }
        >
          {loading ? "재생성 중…" : "오류 반영하여 코드 재생성"}
        </Button>
        {!functionalSpecMarkdown.trim() && (
          <span className="text-xs text-muted-foreground">
            FS가 비어 있습니다. 2단계를 먼저 완료해 주세요.
          </span>
        )}
        {mappingRows.length === 0 && (
          <span className="text-xs text-muted-foreground">
            매핑 행이 없습니다. 2단계를 먼저 완료해 주세요.
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        재생성 후에는 3단계 탭에서 수정·복사할 수 있습니다. 오류 입력은
        텍스트만 로컬에 저장되며, 스크린샷은 새로고침 시 사라질 수 있습니다.
      </p>
    </div>
  );
}
