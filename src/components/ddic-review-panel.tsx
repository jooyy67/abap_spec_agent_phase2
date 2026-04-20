"use client";

import * as React from "react";
import { Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  GeminiAnalysisResult,
  GridDefinition,
  SearchConditionRow,
  SpecFormState,
  UploadedFileMeta,
} from "@/types/spec";

type Props = {
  geminiRaw: GeminiAnalysisResult;
  setGeminiRaw: React.Dispatch<React.SetStateAction<GeminiAnalysisResult | null>>;
  /** 연결된 곳도 같이 바꿔야 해서 같이 받음 */
  searchConditions: SearchConditionRow[];
  setSearchConditions: React.Dispatch<React.SetStateAction<SearchConditionRow[]>>;
  grids: GridDefinition[];
  setGrids: React.Dispatch<React.SetStateAction<GridDefinition[]>>;
  basicInfo: SpecFormState["basicInfo"];
  programKind: SpecFormState["programKind"];
  uploads: UploadedFileMeta[];
};

function uniqUpper(s: string): string {
  return (s ?? "").trim().toUpperCase();
}

function renameTableEverywhere(args: {
  prev: GeminiAnalysisResult;
  from: string;
  to: string;
  searchConditions: SearchConditionRow[];
  grids: GridDefinition[];
}): { next: GeminiAnalysisResult; sc: SearchConditionRow[]; grids: GridDefinition[] } {
  const { prev, from, to } = args;
  if (!from || !to || from === to) {
    return { next: prev, sc: args.searchConditions, grids: args.grids };
  }

  const fb = prev.fieldsByTable ?? {};
  const nextFb: GeminiAnalysisResult["fieldsByTable"] = {};
  for (const [k, v] of Object.entries(fb)) {
    nextFb[k === from ? to : k] = v;
  }

  const nextTables = (prev.tables ?? []).map((t) =>
    t.name === from ? { ...t, name: to } : t,
  );
  if (!nextTables.some((t) => t.name === to)) {
    // tables 배열에 없던 경우에도 넣어 줌
    nextTables.push({ name: to });
  }

  const sc = args.searchConditions.map((r) =>
    r.tableName === from ? { ...r, tableName: to } : r,
  );

  const grids = args.grids.map((g) => {
    const sourceTableNames = g.sourceTableNames?.map((x) => (x === from ? to : x));
    const tableName = g.tableName === from ? to : g.tableName;
    const columnBindings = g.columnBindings?.map((b) =>
      b.tableName === from ? { ...b, tableName: to } : b,
    );
    const fields = g.fields.map((f) =>
      f.startsWith(from + ".") ? to + f.slice(from.length) : f,
    );
    return { ...g, sourceTableNames, tableName, columnBindings, fields };
  });

  return {
    next: {
      ...prev,
      tables: nextTables,
      fieldsByTable: nextFb,
    },
    sc,
    grids,
  };
}

export function DdicReviewPanel({
  geminiRaw,
  setGeminiRaw,
  searchConditions,
  setSearchConditions,
  grids,
  setGrids,
  basicInfo,
  programKind,
  uploads,
}: Props) {
  const tableKeys = React.useMemo(() => {
    const s = new Set<string>([
      ...(geminiRaw.tables ?? []).map((t) => t.name).filter(Boolean),
      ...Object.keys(geminiRaw.fieldsByTable ?? {}),
    ]);
    return Array.from(s).sort();
  }, [geminiRaw]);

  const [activeTable, setActiveTable] = React.useState<string>(tableKeys[0] ?? "");
  const [tableNameDraft, setTableNameDraft] = React.useState<string>(activeTable);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeTable && tableKeys[0]) setActiveTable(tableKeys[0]);
    if (activeTable && !tableKeys.includes(activeTable)) {
      setActiveTable(tableKeys[0] ?? "");
    }
  }, [activeTable, tableKeys]);

  React.useEffect(() => {
    setTableNameDraft(activeTable);
  }, [activeTable]);

  const fields = (geminiRaw.fieldsByTable ?? {})[activeTable] ?? [];

  const patchField = (idx: number, patch: Partial<(typeof fields)[number]>) => {
    setGeminiRaw((prev) => {
      if (!prev) return prev;
      const fb = { ...(prev.fieldsByTable ?? {}) };
      const list = [...((fb[activeTable] ?? []) as typeof fields)];
      const cur = list[idx];
      if (!cur) return prev;
      list[idx] = { ...cur, ...patch };
      fb[activeTable] = list;
      return { ...prev, fieldsByTable: fb };
    });
  };

  const removeField = (idx: number) => {
    setGeminiRaw((prev) => {
      if (!prev) return prev;
      const fb = { ...(prev.fieldsByTable ?? {}) };
      const list = [...((fb[activeTable] ?? []) as typeof fields)];
      fb[activeTable] = list.filter((_, i) => i !== idx);
      return { ...prev, fieldsByTable: fb };
    });
  };

  const addField = () => {
    setGeminiRaw((prev) => {
      if (!prev) return prev;
      const fb = { ...(prev.fieldsByTable ?? {}) };
      const list = [...((fb[activeTable] ?? []) as typeof fields)];
      list.push({ name: "", type: "", description: "" });
      fb[activeTable] = list;
      return { ...prev, fieldsByTable: fb };
    });
  };

  const onRenameTable = (nextNameRaw: string) => {
    const from = activeTable;
    const to = uniqUpper(nextNameRaw);
    if (!from || !to || from === to) return;
    if (tableKeys.includes(to)) return; // 중복 방지

    setGeminiRaw((prev) => {
      if (!prev) return prev;
      const r = renameTableEverywhere({
        prev,
        from,
        to,
        searchConditions,
        grids,
      });
      // 연동 데이터도 함께 갱신
      setSearchConditions(r.sc);
      setGrids(r.grids);
      setActiveTable(to);
      return r.next;
    });
  };

  const ddicUploads = React.useMemo(
    () => uploads.filter((u) => u.purpose === "ddic_table"),
    [uploads],
  );

  const refreshFromDdic = React.useCallback(async () => {
    if (!programKind) {
      setRefreshError("프로그램 유형(Step 2)을 먼저 선택해 주세요.");
      return;
    }
    if (ddicUploads.length === 0) {
      setRefreshError("DDIC 캡처 업로드가 없습니다. Step 3에서 DDIC 이미지를 올려 주세요.");
      return;
    }
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicInfo,
          programKind,
          files: ddicUploads.map((u) => ({
            name: u.name,
            mimeType: u.type,
            base64: u.base64,
            purpose: u.purpose,
          })),
          fileMetadataOnly: ddicUploads.map((u) => ({
            name: u.name,
            size: u.size,
            type: u.type,
            purpose: u.purpose,
          })),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: GeminiAnalysisResult;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "DDIC 재분석이 실패했습니다.");
      }

      // DDIC 결과로 fieldsByTable/type/description을 채우되, 기존 값은 최대한 보존
      const ddic = json.data;
      setGeminiRaw((prev) => {
        if (!prev) return ddic;
        const nextFb: GeminiAnalysisResult["fieldsByTable"] = {
          ...(prev.fieldsByTable ?? {}),
        };
        for (const [tn, rows] of Object.entries(ddic.fieldsByTable ?? {})) {
          const prevRows = nextFb[tn] ?? [];
          const byName = new Map(prevRows.map((r) => [r.name, r]));
          const merged = rows.map((r) => {
            const hit = byName.get(r.name);
            return {
              name: r.name,
              type: r.type ?? hit?.type,
              description: r.description ?? hit?.description,
            };
          });
          // 기존에만 있던 필드도 유지
          const extra = prevRows.filter((r) => !rows.some((x) => x.name === r.name));
          nextFb[tn] = [...merged, ...extra];
        }

        const s = new Set<string>([
          ...(prev.tables ?? []).map((t) => t.name).filter(Boolean),
          ...(ddic.tables ?? []).map((t) => t.name).filter(Boolean),
          ...Object.keys(nextFb),
        ]);

        return {
          ...prev,
          tables: Array.from(s).sort().map((name) => ({ name })),
          fieldsByTable: nextFb,
        };
      });
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setRefreshing(false);
    }
  }, [basicInfo, ddicUploads, programKind, setGeminiRaw]);

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>DDIC 테이블·필드 검수(수정 가능)</CardTitle>
        <CardDescription>
          업로드한 DDIC 캡처에서 추출된 테이블/필드명이 맞는지 확인하고 수정합니다.
          테이블명을 바꾸면 조회조건·그리드에 연결된 테이블명도 같이 갱신합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            DDIC 캡처에서 타입/설명까지 자동으로 채우려면 「DDIC만 재분석」을 실행하세요.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={refreshFromDdic}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            DDIC만 재분석
          </Button>
        </div>
        {refreshError ? (
          <p className="text-xs text-destructive">{refreshError}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>테이블 선택</Label>
            <Select
              value={activeTable}
              onValueChange={(v) => setActiveTable(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="테이블 선택" />
              </SelectTrigger>
              <SelectContent>
                {tableKeys.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>테이블명 수정</Label>
            <Input
              value={tableNameDraft}
              onChange={(e) => setTableNameDraft(e.target.value)}
              onBlur={() => onRenameTable(tableNameDraft)}
              placeholder="예: ZNFITO370"
            />
            <p className="text-[11px] text-muted-foreground">
              포커스가 빠질 때(blur) 테이블명이 적용됩니다. 대문자 기준으로 저장됩니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            필드 {fields.length}개
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={addField}>
            <Plus className="mr-1 size-4" />
            필드 추가
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          참고 예시: 타입은 <span className="font-mono">CHAR10</span>, 설명은{" "}
          <span className="text-foreground">공급업체</span> 같은 형태입니다. 아래
          입력칸에 회색으로 보이는 문구는 <strong>예시(placeholder)</strong>이고,
          실제 값이 아닙니다.
        </p>

        <div className="max-h-[420px] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-[1] bg-background shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-[200px]">필드명</TableHead>
                <TableHead className="w-[140px]">타입</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, idx) => (
                <TableRow key={`${activeTable}-${idx}`}>
                  <TableCell className="align-top">
                    <Input
                      value={f.name ?? ""}
                      onChange={(e) =>
                        patchField(idx, { name: uniqUpper(e.target.value) })
                      }
                      placeholder="예: LIFNR"
                      className="font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      value={f.type ?? ""}
                      onChange={(e) => patchField(idx, { type: e.target.value })}
                      placeholder=""
                      className="font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      value={f.description ?? ""}
                      onChange={(e) =>
                        patchField(idx, { description: e.target.value })
                      }
                      placeholder=""
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(idx)}
                      aria-label="필드 삭제"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    이 테이블의 필드가 없습니다. 「필드 추가」로 넣을 수 있습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

