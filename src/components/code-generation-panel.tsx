"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
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

export function CodeGenerationPanel() {
  const {
    buildSpecFormState,
    functionalSpecMarkdown,
    mappingRows,
    generatedCode,
    setGeneratedCode,
    setPhase,
  } = useSpecPipeline();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "done" | "error">(
    "idle",
  );

  const copyAllCode = React.useCallback(async () => {
    const text = generatedCode.trim();
    if (!text) return;

    const selectAll = () => {
      const el = document.querySelector<HTMLTextAreaElement>(
        "textarea[data-codegen-output]",
      );
      if (!el) return;
      el.focus();
      el.select();
    };

    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyState("done");
      selectAll();
    } catch {
      selectAll();
      try {
        const ok = document.execCommand("copy");
        setCopyState(ok ? "done" : "error");
      } catch {
        setCopyState("error");
      }
    } finally {
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [generatedCode]);

  const runGenerateCode = React.useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const spec = buildSpecFormState();
      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          functionalSpecMarkdown,
          mappingRows: mappingRows.map(
            ({ id: _id, ...rest }) => rest,
          ) as Omit<MappingSheetRow, "id">[],
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { generatedCode: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "코드 생성에 실패했습니다.");
      }
      setGeneratedCode(json.data.generatedCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [buildSpecFormState, functionalSpecMarkdown, mappingRows, setGeneratedCode]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-12">
      <h2 className="text-xl font-semibold tracking-tight">코드 생성</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        2단계에서 확정한 기능명세(FS)·매핑입력서를 기준으로 ABAP 코드 스켈레톤을
        생성합니다. (코드 품질은 매핑 행의 정확도에 크게 좌우됩니다.)
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setPhase("code-fix")}
        >
          SAP 오류 반영(4단계)
        </Button>
        <Button
          type="button"
          onClick={runGenerateCode}
          disabled={
            loading ||
            !functionalSpecMarkdown.trim() ||
            mappingRows.length === 0
          }
        >
          {loading ? "생성 중…" : "ABAP 코드 생성"}
        </Button>
        {!functionalSpecMarkdown.trim() && (
          <span className="text-xs text-muted-foreground">
            FS가 비어 있습니다. 2단계에서 먼저 생성해 주세요.
          </span>
        )}
        {mappingRows.length === 0 && (
          <span className="text-xs text-muted-foreground">
            매핑 행이 없습니다. 2단계에서 생성/입력해 주세요.
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div className="min-w-0">
            <CardTitle>생성 코드</CardTitle>
            <CardDescription>
              REPORT/CLASS 스켈레톤이 생성됩니다. 필요에 따라 수정하세요.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            onClick={copyAllCode}
            disabled={!generatedCode.trim()}
          >
            {copyState === "done" ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copyState === "done"
              ? "복사됨"
              : copyState === "error"
                ? "복사 실패"
                : "전체 복사"}
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            data-codegen-output=""
            className="min-h-[320px] font-mono text-sm"
            placeholder="// 2단계에서 FS·매핑을 만든 뒤, 상단의 「ABAP 코드 생성」을 누르세요."
            value={generatedCode}
            onChange={(e) => setGeneratedCode(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
