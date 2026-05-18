"use client";

import * as React from "react";
import { Copy, Loader2, Maximize2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  rowsWithIds,
  useSpecPipeline,
} from "@/context/spec-pipeline-context";
import { newId } from "@/lib/spec-helpers";
import type { MappingSheetRow } from "@/types/fs-mapping";
import { buildTocFromMarkdown, MarkdownViewer } from "@/components/markdown-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FsMappingWorkbench() {
  const {
    buildSpecFormState,
    functionalSpecMarkdown,
    setFunctionalSpecMarkdown,
    mappingSpecMarkdown,
    setMappingSpecMarkdown,
    mappingRows,
    setMappingRows,
    fsMappingLoading,
    setFsMappingLoading,
    fsMappingError,
    setFsMappingError,
    fsMappingGeneratedAt,
    setFsMappingGeneratedAt,
    geminiRaw,
  } = useSpecPipeline();

  const [manualTable, setManualTable] = React.useState<Record<string, boolean>>(
    {},
  );
  const [manualField, setManualField] = React.useState<Record<string, boolean>>(
    {},
  );

  const ddicTables = React.useMemo(() => {
    const names = Object.keys(geminiRaw?.fieldsByTable ?? {});
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [geminiRaw]);

  const ddicFieldsByTable = React.useMemo(() => {
    const map = geminiRaw?.fieldsByTable ?? {};
    return map;
  }, [geminiRaw]);

  const runGenerate = React.useCallback(async () => {
    const spec = buildSpecFormState();
    if (!spec.programKind) {
      setFsMappingError("1단계에서 프로그램 유형을 선택해 주세요.");
      return;
    }
    if (!spec.basicInfo.programName.trim()) {
      setFsMappingError("프로그램 이름을 입력해 주세요.");
      return;
    }
    setFsMappingError(null);
    setFsMappingLoading(true);
    try {
      const res = await fetch("/api/generate-fs-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          functionalSpecMarkdown: string;
          mappingSpecMarkdown: string;
          mappingRows: Omit<MappingSheetRow, "id">[];
        };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "생성에 실패했습니다.");
      }
      setFunctionalSpecMarkdown(json.data.functionalSpecMarkdown);
      setMappingSpecMarkdown(json.data.mappingSpecMarkdown);
      setMappingRows(rowsWithIds(json.data.mappingRows));
      setFsMappingGeneratedAt(new Date().toISOString());
    } catch (e) {
      setFsMappingError(
        e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setFsMappingLoading(false);
    }
  }, [
    buildSpecFormState,
    setFsMappingError,
    setFsMappingLoading,
    setFsMappingGeneratedAt,
    setFunctionalSpecMarkdown,
    setMappingRows,
  ]);

  const updateRow = (
    id: string,
    patch: Partial<Omit<MappingSheetRow, "id">>,
  ) => {
    setMappingRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const deleteRow = (id: string) =>
    setMappingRows((rows) => rows.filter((x) => x.id !== id));

  const duplicateRow = (row: MappingSheetRow) =>
    setMappingRows((rows) => [
      ...rows,
      { ...row, id: newId() },
    ]);

  const fieldMeta = React.useCallback(
    (table: string, field: string) => {
      const fields = (ddicFieldsByTable as any)?.[table] as
        | { name: string; type?: string; description?: string }[]
        | undefined;
      const f = fields?.find((x) => x.name === field);
      return f;
    },
    [ddicFieldsByTable],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 pb-12">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          FS · 매핑입력서
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          1단계 입력값을 바탕으로 AI가 기능명세(FS) 초안과 개발 매핑 입력서를
          생성합니다. FS는 읽기 전용이며, 매핑 입력서는 수정할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={runGenerate}
          disabled={fsMappingLoading}
          className="gap-2"
        >
          {fsMappingLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {fsMappingLoading ? "생성 중…" : "FS · 매핑입력서 생성"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runGenerate}
          disabled={fsMappingLoading}
          className="gap-1"
        >
          <RefreshCw className="size-3.5" />
          다시 생성
        </Button>
        {fsMappingGeneratedAt && (
          <span className="text-xs text-muted-foreground">
            마지막 생성:{" "}
            {new Date(fsMappingGeneratedAt).toLocaleString("ko-KR")}
          </span>
        )}
      </div>

      {fsMappingError && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{fsMappingError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[420px] lg:min-h-[560px]">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div className="min-w-0">
              <CardTitle>기능명세 (FS)</CardTitle>
            <CardDescription>
              읽기 전용입니다. 매핑/코드 생성의 기준 문서로 사용됩니다.
            </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                  />
                }
              >
                <Maximize2 className="size-3.5" />
                확대
              </DialogTrigger>
              <DialogContent className="h-[92vh] w-[95vw] max-w-none sm:h-[90vh] sm:w-[90vw] sm:max-w-6xl">
                <DialogHeader>
                  <DialogTitle>기능명세 (FS)</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[calc(92vh-5rem)] w-full rounded-md border p-4 sm:h-[calc(90vh-5rem)]">
                  {functionalSpecMarkdown.trim() ? (
                    <div className="space-y-4">
                      <MarkdownViewer markdown={functionalSpecMarkdown} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      아직 생성된 FS가 없습니다. 상단의 생성 버튼을 눌러주세요.
                    </p>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)]">
            <div className="flex h-[min(520px,55vh)] flex-col gap-3">
              {functionalSpecMarkdown.trim() ? (
                <div className="flex flex-wrap gap-1.5">
                  {buildTocFromMarkdown(functionalSpecMarkdown).slice(0, 10).map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className="rounded-full border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      {h.depth === 3 ? "· " : ""}
                      {h.text}
                    </a>
                  ))}
                </div>
              ) : null}
              <ScrollArea className="min-h-0 flex-1 rounded-md border p-4">
                {functionalSpecMarkdown.trim() ? (
                  <div className="space-y-4">
                    <MarkdownViewer markdown={functionalSpecMarkdown} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    상단의 「FS · 매핑입력서 생성」을 누르면 FS가 표시됩니다.
                  </p>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[420px] lg:min-h-[560px]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>개발 매핑 입력서</CardTitle>
              <CardDescription>
                템플릿 문서 보기(읽기 전용) + 매핑 행 편집(사용자 수정)을 제공합니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                    />
                  }
                >
                  <Maximize2 className="size-3.5" />
                  확대
                </DialogTrigger>
                <DialogContent className="h-[92vh] w-[95vw] max-w-none sm:h-[90vh] sm:w-[90vw] sm:max-w-6xl">
                  <DialogHeader>
                    <DialogTitle>개발 매핑 입력서</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="doc" className="w-full">
                    <TabsList>
                      <TabsTrigger value="doc">문서 보기(템플릿)</TabsTrigger>
                      <TabsTrigger value="rows">행 편집</TabsTrigger>
                    </TabsList>
                    <TabsContent value="doc">
                      <ScrollArea className="h-[calc(92vh-8rem)] w-full rounded-md border p-4 sm:h-[calc(90vh-8rem)]">
                        {mappingSpecMarkdown.trim() ? (
                          <MarkdownViewer markdown={mappingSpecMarkdown} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            아직 생성된 템플릿 문서가 없습니다. 상단의 생성 버튼을 눌러주세요.
                          </p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="rows">
                      <ScrollArea className="h-[calc(92vh-8rem)] w-full rounded-md border sm:h-[calc(90vh-8rem)]">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                              <TableHead className="w-[90px] bg-background">영역</TableHead>
                              <TableHead className="min-w-[180px] bg-background">
                                화면 항목
                              </TableHead>
                              <TableHead className="min-w-[160px] bg-background">테이블</TableHead>
                              <TableHead className="min-w-[180px] bg-background">필드</TableHead>
                              <TableHead className="min-w-[110px] bg-background">요소</TableHead>
                              <TableHead className="min-w-[220px] bg-background">비고</TableHead>
                              <TableHead className="w-[92px] bg-background text-right">
                                작업
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappingRows.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center text-muted-foreground"
                                >
                                  생성 버튼을 누르거나 「행 추가」로 입력하세요.
                                </TableCell>
                              </TableRow>
                            ) : (
                              mappingRows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className={
                                    !row.tableName.trim() || !row.fieldName.trim()
                                      ? "bg-destructive/5"
                                      : ""
                                  }
                                >
                                  <TableCell className="p-1 align-top">
                                    <Input
                                      className="h-8 min-w-0 text-xs"
                                      value={row.area}
                                      onChange={(e) =>
                                        updateRow(row.id, { area: e.target.value })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    <Input
                                      className="h-8 min-w-0 text-xs"
                                      value={row.uiLabel}
                                      onChange={(e) =>
                                        updateRow(row.id, { uiLabel: e.target.value })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    <div className="flex items-center gap-1">
                                      {manualTable[row.id] ? (
                                        <Input
                                          className="h-8 min-w-0 flex-1 text-xs"
                                          value={row.tableName}
                                          onChange={(e) =>
                                            updateRow(row.id, {
                                              tableName: e.target.value,
                                              fieldName: "",
                                            })
                                          }
                                        />
                                      ) : (
                                        <Select
                                          value={row.tableName}
                                          onValueChange={(v) =>
                                            updateRow(row.id, {
                                              tableName: v ?? "",
                                              fieldName: "",
                                            })
                                          }
                                        >
                                          <SelectTrigger
                                            className="h-8 w-full min-w-0"
                                            aria-invalid={!row.tableName.trim()}
                                          >
                                            <SelectValue placeholder="테이블 선택" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectLabel>DDIC 테이블</SelectLabel>
                                              {ddicTables.length === 0 ? (
                                                <SelectItem value="">
                                                  (DDIC 분석 결과 없음)
                                                </SelectItem>
                                              ) : null}
                                              {ddicTables.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                  {t}
                                                </SelectItem>
                                              ))}
                                            </SelectGroup>
                                          </SelectContent>
                                        </Select>
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setManualTable((m) => ({
                                            ...m,
                                            [row.id]: !m[row.id],
                                          }))
                                        }
                                      >
                                        {manualTable[row.id] ? "선택" : "직접"}
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1">
                                        {manualField[row.id] ? (
                                          <Input
                                            className="h-8 min-w-0 flex-1 text-xs"
                                            value={row.fieldName}
                                            onChange={(e) =>
                                              updateRow(row.id, { fieldName: e.target.value })
                                            }
                                          />
                                        ) : (
                                          <Select
                                            value={row.fieldName}
                                            onValueChange={(v) =>
                                              updateRow(row.id, { fieldName: v ?? "" })
                                            }
                                          >
                                            <SelectTrigger
                                              className="h-8 w-full min-w-0"
                                              aria-invalid={!row.fieldName.trim()}
                                              disabled={!row.tableName.trim()}
                                            >
                                              <SelectValue
                                                placeholder={
                                                  row.tableName.trim()
                                                    ? "필드 선택"
                                                    : "테이블 먼저 선택"
                                                }
                                              />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectGroup>
                                                <SelectLabel>
                                                  {row.tableName || "필드"}
                                                </SelectLabel>
                                                {(ddicFieldsByTable as any)?.[row.tableName]?.map(
                                                  (f: any) => (
                                                    <SelectItem key={f.name} value={f.name}>
                                                      {f.name}
                                                    </SelectItem>
                                                  ),
                                                )}
                                              </SelectGroup>
                                            </SelectContent>
                                          </Select>
                                        )}
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() =>
                                            setManualField((m) => ({
                                              ...m,
                                              [row.id]: !m[row.id],
                                            }))
                                          }
                                        >
                                          {manualField[row.id] ? "선택" : "직접"}
                                        </Button>
                                      </div>
                                      {row.tableName.trim() && row.fieldName.trim() ? (
                                        <p className="text-[11px] text-muted-foreground">
                                          {fieldMeta(row.tableName, row.fieldName)?.description ||
                                            ""}
                                        </p>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    <Input
                                      className="h-8 min-w-0 text-xs"
                                      value={row.dataElement}
                                      onChange={(e) =>
                                        updateRow(row.id, { dataElement: e.target.value })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="p-1 align-top">
                                    <Input
                                      className="h-8 min-w-0 text-xs"
                                      value={row.notes}
                                      onChange={(e) =>
                                        updateRow(row.id, { notes: e.target.value })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="p-1 align-top text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => duplicateRow(row)}
                                        aria-label="복제"
                                      >
                                        <Copy className="size-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => deleteRow(row.id)}
                                        aria-label="삭제"
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setMappingRows((r) => [
                    ...r,
                    {
                      id: newId(),
                      area: "",
                      uiLabel: "",
                      tableName: "",
                      fieldName: "",
                      dataElement: "",
                      notes: "",
                    },
                  ])
                }
              >
                행 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="doc" className="w-full">
              <TabsList>
                <TabsTrigger value="doc">문서 보기(템플릿)</TabsTrigger>
                <TabsTrigger value="rows">행 편집</TabsTrigger>
              </TabsList>
              <TabsContent value="doc">
                <ScrollArea className="h-[min(480px,50vh)] w-full rounded-md border p-4">
                  {mappingSpecMarkdown.trim() ? (
                    <MarkdownViewer markdown={mappingSpecMarkdown} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      상단의 생성 버튼을 누르면 템플릿 형식의 개발 매핑 입력서 문서가 표시됩니다.
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="rows">
                <ScrollArea className="h-[min(480px,50vh)] w-full rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-[90px] bg-background">영역</TableHead>
                        <TableHead className="min-w-[180px] bg-background">화면 항목</TableHead>
                        <TableHead className="min-w-[160px] bg-background">테이블</TableHead>
                        <TableHead className="min-w-[180px] bg-background">필드</TableHead>
                        <TableHead className="min-w-[110px] bg-background">요소</TableHead>
                        <TableHead className="min-w-[220px] bg-background">비고</TableHead>
                        <TableHead className="w-[92px] bg-background text-right">
                          작업
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                          >
                            생성 버튼을 누르거나 「행 추가」로 입력하세요.
                          </TableCell>
                        </TableRow>
                      ) : (
                        mappingRows.map((row) => (
                          <TableRow
                            key={row.id}
                            className={
                              !row.tableName.trim() || !row.fieldName.trim()
                                ? "bg-destructive/5"
                                : ""
                            }
                          >
                            <TableCell className="p-1 align-top">
                              <Input
                                className="h-8 min-w-0 text-xs"
                                value={row.area}
                                onChange={(e) =>
                                  updateRow(row.id, { area: e.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <Input
                                className="h-8 min-w-0 text-xs"
                                value={row.uiLabel}
                                onChange={(e) =>
                                  updateRow(row.id, { uiLabel: e.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <div className="flex items-center gap-1">
                                {manualTable[row.id] ? (
                                  <Input
                                    className="h-8 min-w-0 flex-1 text-xs"
                                    value={row.tableName}
                                    onChange={(e) =>
                                      updateRow(row.id, {
                                        tableName: e.target.value,
                                        fieldName: "",
                                      })
                                    }
                                  />
                                ) : (
                                  <Select
                                    value={row.tableName}
                                    onValueChange={(v) =>
                                      updateRow(row.id, {
                                        tableName: v ?? "",
                                        fieldName: "",
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-8 w-full min-w-0"
                                      aria-invalid={!row.tableName.trim()}
                                    >
                                      <SelectValue placeholder="테이블 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>DDIC 테이블</SelectLabel>
                                        {ddicTables.length === 0 ? (
                                          <SelectItem value="">
                                            (DDIC 분석 결과 없음)
                                          </SelectItem>
                                        ) : null}
                                        {ddicTables.map((t) => (
                                          <SelectItem key={t} value={t}>
                                            {t}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() =>
                                    setManualTable((m) => ({
                                      ...m,
                                      [row.id]: !m[row.id],
                                    }))
                                  }
                                >
                                  {manualTable[row.id] ? "선택" : "직접"}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  {manualField[row.id] ? (
                                    <Input
                                      className="h-8 min-w-0 flex-1 text-xs"
                                      value={row.fieldName}
                                      onChange={(e) =>
                                        updateRow(row.id, { fieldName: e.target.value })
                                      }
                                    />
                                  ) : (
                                    <Select
                                      value={row.fieldName}
                                      onValueChange={(v) =>
                                        updateRow(row.id, { fieldName: v ?? "" })
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-8 w-full min-w-0"
                                        aria-invalid={!row.fieldName.trim()}
                                        disabled={!row.tableName.trim()}
                                      >
                                        <SelectValue
                                          placeholder={
                                            row.tableName.trim()
                                              ? "필드 선택"
                                              : "테이블 먼저 선택"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          <SelectLabel>
                                            {row.tableName || "필드"}
                                          </SelectLabel>
                                          {(ddicFieldsByTable as any)?.[row.tableName]?.map(
                                            (f: any) => (
                                              <SelectItem key={f.name} value={f.name}>
                                                {f.name}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() =>
                                      setManualField((m) => ({
                                        ...m,
                                        [row.id]: !m[row.id],
                                      }))
                                    }
                                  >
                                    {manualField[row.id] ? "선택" : "직접"}
                                  </Button>
                                </div>
                                {row.tableName && row.fieldName ? (
                                  (() => {
                                    const meta = fieldMeta(row.tableName, row.fieldName);
                                    if (!meta?.type && !meta?.description) return null;
                                    return (
                                      <div className="text-[11px] text-muted-foreground">
                                        {meta.type ? <span>{meta.type}</span> : null}
                                        {meta.type && meta.description ? (
                                          <span> · </span>
                                        ) : null}
                                        {meta.description ? (
                                          <span>{meta.description}</span>
                                        ) : null}
                                      </div>
                                    );
                                  })()
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <Input
                                className="h-8 min-w-0 text-xs"
                                value={row.dataElement ?? ""}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    dataElement: e.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <Input
                                className="h-8 min-w-0 text-xs"
                                value={row.notes ?? ""}
                                onChange={(e) =>
                                  updateRow(row.id, { notes: e.target.value })
                                }
                              />
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => duplicateRow(row)}
                                  title="행 복제"
                                >
                                  <Copy className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => deleteRow(row.id)}
                                  title="행 삭제"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-muted-foreground">매핑 JSON (미리보기)</Label>
        <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
          {JSON.stringify(mappingRows, null, 2)}
        </pre>
      </div>
    </div>
  );
}
