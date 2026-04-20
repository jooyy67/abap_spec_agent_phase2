"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileImage,
  GripVertical,
  LayoutTemplate,
  Loader2,
  Search,
  Sparkles,
  Table2,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Textarea } from "@/components/ui/textarea";
import {
  buildColumnBindingsFromTables,
  draftsToEditable,
  newId,
  normalizeGemini,
} from "@/lib/spec-helpers";
import {
  SCREEN_GRID_QUICK_TEMPLATES,
  appendScreenGridLine,
} from "@/lib/screen-grid-templates";
import { BUSINESS_MODULES } from "@/types/spec";
import type {
  AlvVirtualField,
  BasicInfo,
  BusinessModuleCode,
  CrudSettings,
  GeminiAnalysisResult,
  GridDefinition,
  LayoutPattern,
  ProgramKind,
  ScreenFlowRow,
  ScreenLayout,
  SearchConditionRow,
  SearchInputMode,
  SpecFormState,
  SplitDirection,
  UploadPurpose,
  UploadedFileMeta,
} from "@/types/spec";
import { CrudStepPanel } from "@/components/crud-step-panel";
import { DdicReviewPanel } from "@/components/ddic-review-panel";
import { LayoutPlacementEditor } from "@/components/layout-placement-editor";
import { LayoutWireframePreview } from "@/components/layout-wireframe-preview";
import { ScreenFlowForGridBlock } from "@/components/screen-flow-step-panel";
import { useSpecPipeline } from "@/context/spec-pipeline-context";
import {
  clearInvalidGridIdsInTree,
  createSplitNode,
  firstGridIdInTree,
  getAreaSubtreeForEditor,
  getEffectivePlacementTree,
  normalizeScreenLayout,
  placementTreeHasInvalidGridId,
  placementTreeToClassicFallback,
  setAreaSubtreeAndSyncAreas,
  summarizePlacementTreeKorean,
} from "@/lib/layout-placement";

const STEPS: { id: number; title: string; short: string }[] = [
  { id: 1, title: "기본 정보", short: "기본" },
  { id: 2, title: "프로그램 유형", short: "유형" },
  { id: 3, title: "캡처 업로드", short: "업로드" },
  { id: 4, title: "AI 분석", short: "분석" },
  { id: 5, title: "조회조건", short: "조회" },
  { id: 6, title: "Grid 목록", short: "Grid" },
  { id: 7, title: "Grid 세부", short: "컬럼" },
  { id: 8, title: "화면 구성", short: "레이아웃" },
  { id: 9, title: "CRUD 설정", short: "CRUD" },
  { id: 10, title: "미리보기", short: "미리보기" },
];

const INPUT_MODES: { value: SearchInputMode; label: string }[] = [
  { value: "single", label: "단일값" },
  { value: "range", label: "범위" },
  { value: "radio", label: "라디오" },
  { value: "list", label: "리스트" },
  { value: "checkbox", label: "체크박스" },
];

const UPLOAD_PURPOSE_OPTIONS: { value: UploadPurpose; label: string }[] = [
  { value: "ddic_table", label: "테이블·DDIC" },
  { value: "layout_reference", label: "레이아웃 참조" },
];

/** Step7: 패턴 한 줄 힌트 (gridCount = Step 6 Grid 개수) */
function layoutPatternHint(
  pattern: LayoutPattern,
  splitDirection: SplitDirection | null,
  gridCount: number,
): string {
  if (gridCount < 2) return "단일: 영역 A만 쓰는 구성이 보통입니다.";
  switch (pattern) {
    case "single":
      return "바깥 레이아웃은 단일(전환)만 사용합니다. A/B/C는 화면 전환 슬롯이고, 각 슬롯(화면) 안에서 분할·전환을 설정합니다.";
    case "split":
      return "바깥 레이아웃은 단일(전환)만 사용합니다. 분할은 영역 내부에서만 설정합니다.";
    case "tab":
      return "단일(모드 전환)과 동일하게 취급합니다.";
    default:
      return "";
  }
}

function areaRoleLabel(
  areaId: "A" | "B" | "C" | "D" | "E" | "F",
  pattern: LayoutPattern,
  splitDirection: SplitDirection | null,
): string {
  if (pattern === "single") {
    const n =
      areaId === "A"
        ? 1
        : areaId === "B"
          ? 2
          : areaId === "C"
            ? 3
            : areaId === "D"
              ? 4
              : areaId === "E"
                ? 5
                : 6;
    return `화면(View) ${n}`;
  }
  if (pattern === "split") return "화면(View)";
  return "";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("read failed"));
        return;
      }
      const idx = r.indexOf("base64,");
      resolve(idx >= 0 ? r.slice(idx + 7) : r);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function filesToUploads(
  files: FileList | File[],
  purpose: UploadPurpose,
): Promise<UploadedFileMeta[]> {
  const list = Array.from(files);
  const out: UploadedFileMeta[] = [];
  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 2 * 1024 * 1024) continue;
    const base64 = await readFileAsBase64(file);
    out.push({
      id: newId(),
      name: file.name,
      size: file.size,
      type: file.type,
      base64,
      purpose,
    });
  }
  return out;
}

/** 클립보드(캡처·복사 이미지)에서 이미지 File 목록 추출 */
function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data?.items?.length) return [];
  const files: File[] = [];
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}

function buildFullState(
  basicInfo: BasicInfo,
  programKind: ProgramKind | null,
  uploads: UploadedFileMeta[],
  geminiRaw: GeminiAnalysisResult | null,
  searchConditions: SearchConditionRow[],
  grids: GridDefinition[],
  layout: ScreenLayout,
  screenFlows: ScreenFlowRow[],
  crud: CrudSettings,
): SpecFormState {
  return {
    basicInfo,
    programKind,
    uploads,
    geminiRaw,
    searchConditions,
    grids,
    layout,
    screenFlows,
    crud,
  };
}

export function SpecWizard() {
  const {
    basicInfo,
    setBasicInfo,
    programKind,
    setProgramKind,
    uploads,
    setUploads,
    geminiRaw,
    setGeminiRaw,
    searchConditions,
    setSearchConditions,
    grids,
    setGrids,
    layout,
    setLayout,
    screenFlows,
    setScreenFlows,
    crud,
    setCrud,
    wizardSlot: slot,
    setWizardSlot: setSlot,
    analyzeLoading,
    setAnalyzeLoading,
    analyzeError,
    setAnalyzeError,
  } = useSpecPipeline();

  const [dragOverDd, setDragOverDd] = React.useState(false);
  const [dragOverLayout, setDragOverLayout] = React.useState(false);
  const fileInputDdRef = React.useRef<HTMLInputElement>(null);
  const fileInputLayoutRef = React.useRef<HTMLInputElement>(null);
  /** Step 3에서 전역 Ctrl+V 시 붙일 용도 (영역 클릭 시 갱신) */
  const pastePurposeRef = React.useRef<UploadPurpose>("ddic_table");
  /** Step 6: ALV 전용 필드 추가 임시 입력값 */
  const [alvDraftByGrid, setAlvDraftByGrid] = React.useState<
    Record<string, { caption: string; kind: AlvVirtualField["kind"]; fieldKey: string }>
  >({});

  /** 조회형에서는 CRUD 스텝(표시 순서에서 한 칸 생략) */
  const showCrudStep = programKind === "crud";
  const validStepIndices = React.useMemo(
    () =>
      showCrudStep
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [0, 1, 2, 3, 4, 5, 6, 7, 9],
    [showCrudStep],
  );

  React.useEffect(() => {
    setSlot((s) => Math.min(s, validStepIndices.length - 1));
  }, [validStepIndices.length, setSlot]);

  /** 삭제된 Grid id가 화면 구성·자유 배치 트리에 남아 있으면 제거 */
  React.useEffect(() => {
    const ids = new Set(grids.map((g) => g.id));
    setLayout((l) => {
      let changed = false;
      const areas = l.areas.map((a) => {
        if (a.gridId && !ids.has(a.gridId)) {
          changed = true;
          return { ...a, gridId: "" };
        }
        return a;
      });
      let placementTree = l.placementTree;
      if (
        l.layoutMode === "custom" &&
        placementTree &&
        placementTreeHasInvalidGridId(placementTree, ids)
      ) {
        placementTree = clearInvalidGridIdsInTree(placementTree, ids);
        changed = true;
      }
      let areaSubtrees = l.areaSubtrees;
      if (areaSubtrees) {
        let subChanged = false;
        const nextSub: typeof areaSubtrees = { ...areaSubtrees };
        for (const aid of ["A", "B", "C", "D", "E", "F"] as const) {
          const t = nextSub[aid];
          if (t && placementTreeHasInvalidGridId(t, ids)) {
            nextSub[aid] = clearInvalidGridIdsInTree(t, ids);
            subChanged = true;
          }
        }
        if (subChanged) {
          areaSubtrees = nextSub;
          changed = true;
        }
      }
      return changed ? { ...l, areas, placementTree, areaSubtrees } : l;
    });
  }, [grids, setLayout]);

  /** Grid 1개 이하 → 단일만. B·C 연결은 비움(단일 영역 A만 사용). */
  React.useEffect(() => {
    if (grids.length >= 2) return;
    setLayout((l) => {
      const areas =
        grids.length === 0
          ? l.areas.map((a) => ({ ...a, gridId: "" }))
          : l.areas.map((a) =>
              a.id === "A" ? a : { ...a, gridId: "" },
            );
      const pattern: LayoutPattern = "single";
      if (
        l.pattern === pattern &&
        areas.every((a, i) => a.gridId === l.areas[i]?.gridId)
      ) {
        return l;
      }
      return { ...l, pattern, areas };
    });
  }, [grids.length, setLayout]);

  const activeStepIdx = validStepIndices[slot] ?? 0;

  /** 화면 구성: areaSubtrees 없으면 한 번 채워 편집기 node 안정화 */
  React.useEffect(() => {
    if (activeStepIdx !== 7) return;
    setLayout((l) => {
      if (l.areaSubtrees?.A && l.areaSubtrees?.B && l.areaSubtrees?.C)
        return l;
      return normalizeScreenLayout(l);
    });
  }, [activeStepIdx, setLayout]);

  /** 화면 구성 진입 시: Grid 개수 기준으로 viewCount 추천(초기값) */
  React.useEffect(() => {
    if (activeStepIdx !== 7) return;
    setLayout((l) => {
      const cur = Math.max(1, Math.min(6, Math.trunc(l.viewCount ?? 1)));
      // 이미 사용자가 2 이상으로 늘렸으면 유지
      if (cur > 1) return l;
      const suggested = Math.max(1, Math.min(6, Math.min(3, grids.length || 1)));
      if (suggested === cur) return l;
      return { ...l, viewCount: suggested };
    });
  }, [activeStepIdx, grids.length, setLayout]);

  /** 화면 편집 대상: viewCount까지만(최대 6) */
  const visibleLayoutAreas = React.useMemo(() => {
    const n = Math.max(1, Math.min(6, Math.trunc(layout.viewCount ?? 1)));
    const keep = (["A", "B", "C", "D", "E", "F"] as const).slice(0, n);
    return layout.areas.filter((a) => keep.includes(a.id as any));
  }, [layout.areas, layout.viewCount]);

  const layoutAllowsSplitTab = grids.length >= 2;

  const placementTreeForUi = React.useMemo(
    () => getEffectivePlacementTree(layout),
    [layout],
  );

  const ensureUniqueAlvKey = React.useCallback(
    (base: string, existing: Set<string>) => {
      let k = base;
      let i = 2;
      while (existing.has(k)) {
        k = `${base}_${i}`;
        i++;
      }
      return k;
    },
    [],
  );

  const makeAlvFieldKey = React.useCallback(
    (caption: string, kind: AlvVirtualField["kind"], existing: Set<string>) => {
      const cap = (caption ?? "").trim();
      const cleaned = cap
        .replace(/[^\p{L}\p{N}]+/gu, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase()
        .slice(0, 32);
      const kindPart = (kind ?? "OTHER").toString().toUpperCase();
      const base = `__ALV.${kindPart}.${cleaned || "FIELD"}`;
      return ensureUniqueAlvKey(base, existing);
    },
    [ensureUniqueAlvKey],
  );

  const mergeUploads = React.useCallback((added: UploadedFileMeta[]) => {
    if (!added.length) return;
    setUploads((u) => [...u, ...added].slice(0, 8));
  }, []);

  const onDropZone = React.useCallback(
    (purpose: UploadPurpose) => async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverDd(false);
      setDragOverLayout(false);
      const added = await filesToUploads(e.dataTransfer.files, purpose);
      mergeUploads(added);
    },
    [mergeUploads],
  );

  const onPickFiles = React.useCallback(
    (purpose: UploadPurpose) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files;
      if (!f?.length) return;
      const added = await filesToUploads(f, purpose);
      mergeUploads(added);
      e.target.value = "";
    },
    [mergeUploads],
  );

  /** Step 3: 입력란에 포커스 없을 때 창 어디서나 Ctrl+V로 이미지 추가 */
  React.useEffect(() => {
    if (activeStepIdx !== 2) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      const files = imageFilesFromClipboard(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      void (async () => {
        const added = await filesToUploads(files, pastePurposeRef.current);
        mergeUploads(added);
      })();
    };
    window.addEventListener("paste", onPaste, true);
    return () => window.removeEventListener("paste", onPaste, true);
  }, [activeStepIdx, mergeUploads]);

  const runAnalyze = React.useCallback(async () => {
    if (!programKind) {
      setAnalyzeError("프로그램 유형(Step 2)을 먼저 선택해 주세요.");
      return;
    }
    if (!basicInfo.programName.trim()) {
      setAnalyzeError("프로그램 이름을 입력해 주세요.");
      return;
    }
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicInfo,
          programKind,
          files: uploads.map((u) => ({
            name: u.name,
            mimeType: u.type,
            base64: u.base64,
            purpose: u.purpose,
          })),
          fileMetadataOnly: uploads.map((u) => ({
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
        throw new Error(json.error || "분석 요청이 실패했습니다.");
      }
      const normalized = normalizeGemini(json.data);
      setGeminiRaw(normalized);
      const { searchConditions: sc, grids: g } = draftsToEditable(normalized);
      setSearchConditions(sc);
      setGrids(g);
      setLayout((prev) => {
        const hint = normalized.recommendedStructure?.layoutHint ?? "";
        const inferredFromHint =
          hint.includes("3") || hint.includes("A/B/C") || hint.includes("A,B,C")
            ? 3
            : hint.includes("2") || hint.includes("A/B") || hint.includes("A,B")
              ? 2
              : hint.includes("1")
                ? 1
                : null;
        const baseCount = inferredFromHint ?? (g.length || 1);
        const suggestedViewCount = Math.max(1, Math.min(6, baseCount));

        const viewSwitchCandidate =
          suggestedViewCount >= 2
            ? sc.find(
                (r) =>
                  (r.inputMode === "radio" || r.inputMode === "list") &&
                  Boolean(r.affectsResult),
              )?.id
            : undefined;

        const keep = (["A", "B", "C", "D", "E", "F"] as const).slice(
          0,
          suggestedViewCount,
        );

        const next = normalizeScreenLayout({
          ...prev,
          layoutMode: "classic",
          placementTree: null,
          viewCount: suggestedViewCount,
          viewSwitchConditionId: viewSwitchCandidate,
          areaSubtrees: Object.fromEntries(
            (["A", "B", "C", "D", "E", "F"] as const).map((id, idx) => [
              id,
              keep.includes(id)
                ? {
                    kind: "grid" as const,
                    nodeId: newId(),
                    gridId: g[idx]?.id ?? "",
                  }
                : { kind: "grid" as const, nodeId: newId(), gridId: "" },
            ]),
          ) as any,
        });
        return normalizeScreenLayout(next);
      });
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setAnalyzeLoading(false);
    }
  }, [basicInfo, programKind, uploads]);

  const fullState = React.useMemo(
    () =>
      buildFullState(
        basicInfo,
        programKind,
        uploads,
        geminiRaw,
        searchConditions,
        grids,
        layout,
        screenFlows,
        crud,
      ),
    [
      basicInfo,
      programKind,
      uploads,
      geminiRaw,
      searchConditions,
      grids,
      layout,
      screenFlows,
      crud,
    ],
  );

  const tableNames = React.useMemo(() => {
    const fromGemini = geminiRaw?.tables?.map((t) => t.name) ?? [];
    const fromFields = geminiRaw ? Object.keys(geminiRaw.fieldsByTable) : [];
    return Array.from(new Set([...fromGemini, ...fromFields])).filter(Boolean);
  }, [geminiRaw]);

  /** Grid 체크박스: 분석 추출 테이블 + 현재 그리드에만 있는 테이블(복원 시) */
  const gridTableCheckboxOptions = React.useMemo(() => {
    const s = new Set<string>(tableNames);
    for (const g of grids) {
      g.sourceTableNames?.forEach((t) => s.add(t));
      if (g.tableName?.trim()) s.add(g.tableName.trim());
    }
    return Array.from(s).filter(Boolean).sort();
  }, [tableNames, grids]);

  const fieldsForTable = React.useCallback(
    (table: string) => {
      const rows = geminiRaw?.fieldsByTable?.[table];
      return rows?.map((r) => r.name).filter(Boolean) ?? [];
    },
    [geminiRaw],
  );

  /** 한 Grid 표시 필드 후보: 소스 테이블 DDIC + ALV 전용(alvOnlyFields) */
  const fieldsForGrid = React.useCallback(
    (grid: GridDefinition) => {
      const fb = geminiRaw?.fieldsByTable ?? {};
      const analysisTableKeys = Object.keys(fb);
      const alvKeys = (grid.alvOnlyFields ?? []).map((v) => v.fieldKey);
      const selected = grid.sourceTableNames?.filter(Boolean).sort();

      if (
        grid.sourceTableNames !== undefined &&
        grid.sourceTableNames.length === 0 &&
        analysisTableKeys.length > 0
      ) {
        return Array.from(new Set(alvKeys));
      }

      let ddic: string[] = [];
      if (selected?.length) {
        const bindings = buildColumnBindingsFromTables(selected, fb);
        ddic = Array.from(
          new Set(bindings.map((c) => `${c.tableName}.${c.fieldName}`)),
        );
      } else {
        const tn = grid.tableName?.trim();
        if (tn && fb[tn]) {
          const bindings = buildColumnBindingsFromTables([tn], fb);
          ddic = Array.from(
            new Set(bindings.map((c) => `${c.tableName}.${c.fieldName}`)),
          );
        } else if (grid.columnBindings?.length) {
          ddic = Array.from(
            new Set(
              grid.columnBindings.map(
                (c) => `${c.tableName}.${c.fieldName}`,
              ),
            ),
          );
        } else if (tn) {
          ddic = fieldsForTable(tn);
        }
      }

      return Array.from(new Set([...ddic, ...alvKeys]));
    },
    [geminiRaw, fieldsForTable],
  );

  /** 체크한 소스 테이블만 columnBindings·필드 후보에 반영 */
  const rebuildGridFromSourceTables = React.useCallback(
    (grid: GridDefinition, nextTables: string[]): GridDefinition => {
      const fb = geminiRaw?.fieldsByTable ?? {};
      const sorted = [...new Set(nextTables.map((t) => t.trim()))]
        .filter(Boolean)
        .sort();

      const virtualKeys = new Set(
        (grid.alvOnlyFields ?? []).map((v) => v.fieldKey),
      );

      if (sorted.length === 0) {
        return {
          ...grid,
          sourceTableNames: [],
          columnBindings: undefined,
          fields: grid.fields.filter((f) => virtualKeys.has(f)),
        };
      }

      const pool = buildColumnBindingsFromTables(sorted, fb);
      const keys = new Set(
        pool.map((b) => `${b.tableName}.${b.fieldName}`),
      );
      const nextFields = grid.fields.filter(
        (f) => keys.has(f) || virtualKeys.has(f),
      );

      const tn = (grid.tableName ?? "").trim();
      const primary =
        tn && sorted.includes(tn) ? tn : (sorted[0] ?? "");

      return {
        ...grid,
        sourceTableNames: sorted,
        tableName: primary,
        columnBindings: pool.length ? pool : undefined,
        fields: nextFields,
      };
    },
    [geminiRaw],
  );

  const goNext = () =>
    setSlot((s) => Math.min(validStepIndices.length - 1, s + 1));
  const goPrev = () => setSlot((s) => Math.max(0, s - 1));

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Sparkles className="size-5 text-sidebar-primary" />
            ABAP Spec Agent
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            단계별 입력 · AI 분석
          </p>
          <p className="mt-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
            이 화면에서 모은 값은 이후{" "}
            <span className="font-medium text-foreground">기능명세(FS)</span> →{" "}
            <span className="font-medium text-foreground">개발 매핑</span> →{" "}
            <span className="font-medium text-foreground">ABAP 코드</span>{" "}
            생성의 입력 근거가 됩니다.
          </p>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-0.5 p-2">
            {validStepIndices.map((stepIdx, i) => {
              const s = STEPS[stepIdx];
              const active = i === slot;
              /** 조회형에서는 CRUD 단계를 건너뛰므로, 순번은 항상 1…N으로 표시 */
              const displayOrder = i + 1;
              return (
                <button
                  key={`${s.id}-${stepIdx}`}
                  type="button"
                  onClick={() => setSlot(i)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60"
                  }`}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {displayOrder}
                  </span>
                  <span className="flex flex-col">
                    <span>{s.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.short}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3 text-[10px] leading-relaxed text-muted-foreground">
          총 {validStepIndices.length}단계 · 순번은 1부터 연속입니다. 조회형은
          CRUD 단계가 생략됩니다.
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {STEPS[activeStepIdx]?.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                입력 단계 {slot + 1} / {validStepIndices.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={slot === 0}
              >
                <ChevronLeft className="size-4" />
                이전
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                disabled={slot >= validStepIndices.length - 1}
              >
                다음
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Step 1 */}
          {activeStepIdx === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>
                  프로그램 요구사항의 배경을 입력합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="programName">프로그램 이름 *</Label>
                  <Input
                    id="programName"
                    value={basicInfo.programName}
                    onChange={(e) =>
                      setBasicInfo((b) => ({ ...b, programName: e.target.value }))
                    }
                    placeholder="예: 자재 조회 및 수정"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="requestDept">요청 부서 *</Label>
                    <Input
                      id="requestDept"
                      value={basicInfo.requestDept}
                      onChange={(e) =>
                        setBasicInfo((b) => ({
                          ...b,
                          requestDept: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="requester">요청자 *</Label>
                    <Input
                      id="requester"
                      value={basicInfo.requester}
                      onChange={(e) =>
                        setBasicInfo((b) => ({ ...b, requester: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessModule">업무 구분 *</Label>
                  <Select
                    value={basicInfo.businessModule}
                    onValueChange={(v) =>
                      setBasicInfo((b) => ({
                        ...b,
                        businessModule: v as BusinessModuleCode,
                      }))
                    }
                  >
                    <SelectTrigger id="businessModule" className="w-full">
                      <SelectValue placeholder="모듈 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_MODULES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {basicInfo.businessModule === "기타" && (
                    <Input
                      id="businessCategoryOther"
                      placeholder="기타 모듈명 입력 (예: EWM, 커스텀)"
                      value={basicInfo.businessCategoryOther}
                      onChange={(e) =>
                        setBasicInfo((b) => ({
                          ...b,
                          businessCategoryOther: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="authScope">사용 권한 범위 *</Label>
                  <Textarea
                    id="authScope"
                    placeholder="예: 특정 사용자만 / 부서 단위 / 전사 공통 등"
                    value={basicInfo.authScope}
                    onChange={(e) =>
                      setBasicInfo((b) => ({ ...b, authScope: e.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="problem">문제점 *</Label>
                  <Textarea
                    id="problem"
                    value={basicInfo.problem}
                    onChange={(e) =>
                      setBasicInfo((b) => ({ ...b, problem: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="improvement">개선 요청 *</Label>
                  <Textarea
                    id="improvement"
                    value={basicInfo.improvement}
                    onChange={(e) =>
                      setBasicInfo((b) => ({
                        ...b,
                        improvement: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedEffect">기대 효과</Label>
                  <Textarea
                    id="expectedEffect"
                    value={basicInfo.expectedEffect}
                    onChange={(e) =>
                      setBasicInfo((b) => ({
                        ...b,
                        expectedEffect: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remarks">기타</Label>
                  <Textarea
                    id="remarks"
                    value={basicInfo.remarks}
                    onChange={(e) =>
                      setBasicInfo((b) => ({ ...b, remarks: e.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="screenGridRequirements">
                    화면·Grid 요구사항{" "}
                    <span className="font-normal text-muted-foreground">
                      (분석에 반영)
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SCREEN_GRID_QUICK_TEMPLATES.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                          setBasicInfo((b) => ({
                            ...b,
                            screenGridRequirements: appendScreenGridLine(
                              b.screenGridRequirements,
                              t.text,
                            ),
                          }))
                        }
                      >
                        + {t.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    id="screenGridRequirements"
                    placeholder={
                      "예: 화면 3개(탭/모드로 분리), 계좌체크 / 이력조회 전환은 라디오, 그리드별 표시 컬럼, 마스터 키 VBELN 등"
                    }
                    value={basicInfo.screenGridRequirements}
                    onChange={(e) =>
                      setBasicInfo((b) => ({
                        ...b,
                        screenGridRequirements: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    위 버튼으로 자주 쓰는 문장을 붙인 뒤 괄호 안만 고치면 됩니다.
                    그리드 개수·역할·행 클릭 등을 적을수록 초안이 구체적입니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {activeStepIdx === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                role="button"
                tabIndex={0}
                onClick={() => setProgramKind("inquiry")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setProgramKind("inquiry");
                }}
                className={`cursor-pointer transition-all hover:border-primary/40 ${
                  programKind === "inquiry"
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Search className="size-5" />
                    <CardTitle className="text-lg">조회형</CardTitle>
                  </div>
                  <CardDescription>
                    데이터 조회 중심 화면입니다. 목록·상세 조회에 적합합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {programKind === "inquiry" && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="size-3.5" /> 선택됨
                    </Badge>
                  )}
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => setProgramKind("crud")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setProgramKind("crud");
                }}
                className={`cursor-pointer transition-all hover:border-primary/40 ${
                  programKind === "crud"
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Table2 className="size-5" />
                    <CardTitle className="text-lg">CRUD형</CardTitle>
                  </div>
                  <CardDescription>
                    입력·수정·삭제가 포함됩니다. 유지보수 트랜잭션에 적합합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {programKind === "crud" && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="size-3.5" /> 선택됨
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3 */}
          {activeStepIdx === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>캡처 업로드</CardTitle>
                  <CardDescription>
                  <strong>테이블·DDIC</strong>는 필드명 추출용,{" "}
                  <strong>레이아웃 참조</strong>는 비슷한 트랜잭션 화면을
                  올려 화면 배치·그리드 구성만 맞출 때 사용합니다. 이미지 최대
                  8개, 파일당 2MB.{" "}
                  <span className="font-medium text-foreground">
                    Ctrl+V 붙여넣기
                  </span>
                  는 이 단계에서 화면 아무 곳이나 가능합니다(다른 입력칸에 포커스가
                  있을 때는 제외). 붙일 용도는{" "}
                  <strong>마지막으로 누른 업로드 영역</strong>(왼쪽=DDIC /
                  오른쪽=레이아웃)에 맞춰집니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputDdRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles("ddic_table")}
                />
                <input
                  ref={fileInputLayoutRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles("layout_reference")}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div
                    tabIndex={0}
                    onPointerDown={() => {
                      pastePurposeRef.current = "ddic_table";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDd(true);
                      setDragOverLayout(false);
                    }}
                    onDragLeave={() => setDragOverDd(false)}
                    onDrop={onDropZone("ddic_table")}
                    className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-8 text-center outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      dragOverDd
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:bg-muted/40"
                    }`}
                    onClick={() => fileInputDdRef.current?.click()}
                    role="group"
                    aria-label="테이블 DDIC 캡처 업로드"
                  >
                    <Database className="mb-2 size-9 text-muted-foreground" />
                    <p className="text-sm font-medium">테이블·DDIC</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      SE11 등 필드·테이블명 추출
                    </p>
                  </div>
                  <div
                    tabIndex={0}
                    onPointerDown={() => {
                      pastePurposeRef.current = "layout_reference";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverLayout(true);
                      setDragOverDd(false);
                    }}
                    onDragLeave={() => setDragOverLayout(false)}
                    onDrop={onDropZone("layout_reference")}
                    className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-8 text-center outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      dragOverLayout
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:bg-muted/40"
                    }`}
                    onClick={() => fileInputLayoutRef.current?.click()}
                    role="group"
                    aria-label="레이아웃 참조 화면 업로드"
                  >
                    <LayoutTemplate className="mb-2 size-9 text-muted-foreground" />
                    <p className="text-sm font-medium">레이아웃 참조</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      비슷한 화면 캡처 — 배치·그리드만
                    </p>
                  </div>
                </div>
                {uploads.length > 0 && (
                  <div className="space-y-2">
                    <Label>업로드된 파일</Label>
                    <ul className="divide-y rounded-lg border">
                      {uploads.map((u) => (
                        <li
                          key={u.id}
                          className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                        >
                          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{u.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(u.size / 1024).toFixed(0)} KB
                          </span>
                          <Select
                            value={u.purpose}
                            onValueChange={(v) =>
                              setUploads((list) =>
                                list.map((x) =>
                                  x.id === u.id
                                    ? {
                                        ...x,
                                        purpose: v as UploadPurpose,
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px] shrink-0 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UPLOAD_PURPOSE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploads((list) =>
                                list.filter((x) => x.id !== u.id),
                              );
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4 */}
          {activeStepIdx === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5" />
                    AI 분석 실행
                  </CardTitle>
                  <CardDescription>
                    기본 정보·프로그램 유형·업로드 이미지·화면·Grid 요구사항을
                    서버로 전송하고, 테이블·조회조건·Grid 초안을 생성합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="analyze-screenGrid">
                      화면·Grid 요구사항{" "}
                      <span className="font-normal text-muted-foreground">
                        (실행 직전 수정 가능)
                      </span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {SCREEN_GRID_QUICK_TEMPLATES.map((t) => (
                        <Button
                          key={`a-${t.id}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            setBasicInfo((b) => ({
                              ...b,
                              screenGridRequirements: appendScreenGridLine(
                                b.screenGridRequirements,
                                t.text,
                              ),
                            }))
                          }
                        >
                          + {t.label}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      id="analyze-screenGrid"
                      value={basicInfo.screenGridRequirements}
                      onChange={(e) =>
                        setBasicInfo((b) => ({
                          ...b,
                          screenGridRequirements: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Step 1과 동일 항목입니다. 분석 전에 보완해 주세요."
                    />
                  </div>
                  {analyzeError && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>분석 실패</AlertTitle>
                      <AlertDescription>{analyzeError}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="button"
                    disabled={analyzeLoading}
                    onClick={runAnalyze}
                    className="gap-2"
                  >
                    {analyzeLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {analyzeLoading ? "분석 중…" : "AI 분석 실행"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    API 키는 서버 환경변수 OPENAI_API_KEY(또는 GPT_API_KEY)로
                    설정됩니다. Vercel
                    프로젝트에 동일 변수를 등록하세요.
                  </p>
                </CardContent>
              </Card>

              {geminiRaw && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>분석 결과 요약</CardTitle>
                      <CardDescription>
                        이후 단계(조회조건 ~ Grid·레이아웃·미리보기)에서 아래 초안을
                        수정할 수 있습니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Database className="size-3" />
                          테이블 {geminiRaw.tables.length}개
                        </Badge>
                        <Badge variant="outline">
                          키 후보 {geminiRaw.keyCandidates.length}건
                        </Badge>
                        <Badge variant="outline">
                          JOIN 후보 {geminiRaw.joinCandidates.length}건
                        </Badge>
                        <Badge variant="outline">
                          조회조건 초안 {geminiRaw.searchConditionDrafts.length}건
                        </Badge>
                        <Badge variant="outline">
                          Grid 초안 {geminiRaw.gridDrafts.length}건
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">추천 구조</Label>
                        <p className="mt-1 rounded-md bg-muted/50 p-3 whitespace-pre-wrap">
                          {geminiRaw.recommendedStructure.summary}
                        </p>
                        {geminiRaw.recommendedStructure.layoutHint && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            레이아웃 힌트:{" "}
                            {geminiRaw.recommendedStructure.layoutHint}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <DdicReviewPanel
                    geminiRaw={geminiRaw}
                    setGeminiRaw={setGeminiRaw}
                    searchConditions={searchConditions}
                    setSearchConditions={setSearchConditions}
                    grids={grids}
                    setGrids={setGrids}
                    basicInfo={basicInfo}
                    programKind={programKind}
                    uploads={uploads}
                  />
                </>
              )}
            </div>
          )}

          {/* Step 5 */}
          {activeStepIdx === 4 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>조회조건 편집</CardTitle>
                  <CardDescription>
                    항목명, 필드 ID, 소속 테이블, 입력방식, 필수 여부를
                    설정합니다. JOIN 키는 조회조건 필수에 넣지 않는 것이
                    일반적입니다.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSearchConditions((rows) => [
                      ...rows,
                      {
                        id: newId(),
                        label: "",
                        fieldId: "",
                        tableName: tableNames[0] ?? "",
                        inputMode: "single",
                        required: false,
                        affectsResult: false,
                      },
                    ])
                  }
                >
                  행 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {searchConditions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Step 4에서 AI 분석을 실행하거나, 「행 추가」로 직접
                    입력하세요.
                  </p>
                )}
                {searchConditions.map((row, idx) => (
                  <div
                    key={row.id}
                    className="space-y-3 rounded-xl border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        조회조건 #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSearchConditions((rows) =>
                            rows.filter((r) => r.id !== row.id),
                          )
                        }
                      >
                        삭제
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>항목명</Label>
                        <Input
                          value={row.label}
                          onChange={(e) =>
                            setSearchConditions((rows) =>
                              rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, label: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>필드 ID</Label>
                        {fieldsForTable(row.tableName).length > 0 ? (
                          <>
                            <Select
                              value={row.fieldId || "__none__"}
                              onValueChange={(v) => {
                                const fid = !v || v === "__none__" ? "" : v;
                                const meta =
                                  geminiRaw?.fieldsByTable?.[row.tableName]?.find(
                                    (x) => x.name === fid,
                                  ) ?? null;
                                setSearchConditions((rows) =>
                                  rows.map((r) => {
                                    if (r.id !== row.id) return r;
                                    const next: typeof r = { ...r, fieldId: fid };
                                    if (!next.label.trim() && meta?.description?.trim()) {
                                      next.label = meta.description.trim();
                                    }
                                    return next;
                                  }),
                                );
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="필드 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">(직접 입력)</SelectItem>
                                {(
                                  geminiRaw?.fieldsByTable?.[row.tableName] ?? []
                                ).map((f) => (
                                  <SelectItem key={f.name} value={f.name}>
                                    {f.name}
                                    {f.description?.trim()
                                      ? ` — ${f.description.trim()}`
                                      : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(() => {
                              const meta =
                                geminiRaw?.fieldsByTable?.[row.tableName]?.find(
                                  (x) => x.name === row.fieldId,
                                ) ?? null;
                              if (!meta) return null;
                              const parts = [
                                meta.type?.trim() ? `타입=${meta.type.trim()}` : null,
                                meta.description?.trim()
                                  ? `설명=${meta.description.trim()}`
                                  : null,
                              ].filter(Boolean);
                              return parts.length ? (
                                <p className="text-[11px] text-muted-foreground">
                                  {parts.join(" · ")}
                                </p>
                              ) : null;
                            })()}
                          </>
                        ) : (
                          <>
                            <Input
                              value={row.fieldId}
                              onChange={(e) =>
                                setSearchConditions((rows) =>
                                  rows.map((r) =>
                                    r.id === row.id
                                      ? { ...r, fieldId: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                              placeholder="예: LIFNR"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              분석 결과(DDIC)가 있으면 필드 선택 목록이 뜹니다.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>소속 테이블</Label>
                        {tableNames.length > 0 ? (
                          <>
                            <Select
                              value={row.tableName || "__manual__"}
                              onValueChange={(v) =>
                                setSearchConditions((rows) =>
                                  rows.map((r) => {
                                    if (r.id !== row.id) return r;
                                    if (!v || v === "__manual__") {
                                      return { ...r, tableName: "" };
                                    }
                                    const tn = v;
                                    const next: typeof r = { ...r, tableName: tn };
                                    // 테이블이 바뀌면 필드가 무효가 될 수 있으므로 비움(선택 UI에서 다시 고르게)
                                    if (tn && next.fieldId) {
                                      const ok = Boolean(
                                        geminiRaw?.fieldsByTable?.[tn]?.some(
                                          (f) => f.name === next.fieldId,
                                        ),
                                      );
                                      if (!ok) next.fieldId = "";
                                    }
                                    return next;
                                  }),
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="테이블 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__manual__">
                                  (직접 입력)
                                </SelectItem>
                                {tableNames.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(!row.tableName || row.tableName === "") && (
                              <Input
                                value={row.tableName}
                                onChange={(e) =>
                                  setSearchConditions((rows) =>
                                    rows.map((r) =>
                                      r.id === row.id
                                        ? { ...r, tableName: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                                placeholder="예: ZNFITO370"
                              />
                            )}
                          </>
                        ) : (
                          <Input
                            value={row.tableName}
                            onChange={(e) =>
                              setSearchConditions((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, tableName: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            placeholder="예: ZNFITO370"
                          />
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          DDIC 업로드가 있으면 위에서 테이블을 선택할 수 있고, 없으면
                          직접 입력합니다.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label>입력방식</Label>
                        <Select
                          value={row.inputMode}
                          onValueChange={(v) =>
                            setSearchConditions((rows) =>
                              rows.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      inputMode: v as SearchInputMode,
                                    }
                                  : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {INPUT_MODES.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`req-${row.id}`}
                          checked={row.required}
                          onCheckedChange={(c) =>
                            setSearchConditions((rows) =>
                              rows.map((r) =>
                                r.id === row.id
                                  ? { ...r, required: Boolean(c) }
                                  : r,
                              ),
                            )
                          }
                        />
                        <Label htmlFor={`req-${row.id}`} className="font-normal">
                          필수
                        </Label>
                      </div>
                      {(row.inputMode === "radio" || row.inputMode === "list") && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`aff-${row.id}`}
                            checked={row.affectsResult}
                            onCheckedChange={(c) =>
                              setSearchConditions((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, affectsResult: Boolean(c) }
                                    : r,
                                ),
                              )
                            }
                          />
                          <Label
                            htmlFor={`aff-${row.id}`}
                            className="font-normal"
                          >
                            선택값에 따라 결과가 달라짐
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 6 — Grid 목록(개요) */}
          {activeStepIdx === 5 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Grid 목록</CardTitle>
                  <CardDescription>
                    Grid를 만들고 이름·주 테이블·소스 테이블을 정합니다. 이후
                    「화면 구성」에서 영역에 붙이고 배치를 본 뒤, 「Grid 세부」에서
                    표시 컬럼·행 클릭·ALV 필드를 정합니다.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setGrids((g) => {
                      const first = tableNames[0] ?? "";
                      const fb = geminiRaw?.fieldsByTable ?? {};
                      const initialTables = first ? [first] : [];
                      const pool = initialTables.length
                        ? buildColumnBindingsFromTables(initialTables, fb)
                        : undefined;
                      return [
                        ...g,
                        {
                          id: newId(),
                          name: `Grid ${g.length + 1}`,
                          sourceTableNames:
                            initialTables.length > 0 ? initialTables : undefined,
                          tableName: first,
                          fields: [],
                          clickAction: "other",
                          columnBindings:
                            pool && pool.length ? pool : undefined,
                        },
                      ];
                    })
                  }
                >
                  Grid 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {grids.map((grid) => (
                  <div key={grid.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Input
                        className="max-w-xs font-medium"
                        value={grid.name}
                        onChange={(e) =>
                          setGrids((list) =>
                            list.map((g) =>
                              g.id === grid.id
                                ? { ...g, name: e.target.value }
                                : g,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setGrids((list) =>
                            list.filter((g) => g.id !== grid.id),
                          )
                        }
                      >
                        삭제
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>주 테이블 (JOIN·프로그램 기준)</Label>
                        <Input
                          value={grid.tableName}
                          onChange={(e) =>
                            setGrids((list) =>
                              list.map((g) =>
                                g.id === grid.id
                                  ? { ...g, tableName: e.target.value }
                                  : g,
                              ),
                            )
                          }
                          placeholder="예: 헤더·기준 행 테이블"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>클릭/동작</Label>
                        <Select
                          value={grid.clickAction ?? "other"}
                          onValueChange={(v) =>
                            setGrids((list) =>
                              list.map((g) =>
                                g.id === grid.id
                                  ? { ...g, clickAction: (v ?? "other") as any }
                                  : g,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tcode">T-Code 이동</SelectItem>
                            <SelectItem value="popup">팝업 표시</SelectItem>
                            <SelectItem value="same_screen_detail">동일 화면 상세 표시</SelectItem>
                            <SelectItem value="grid_linkage">다른 Grid 연동</SelectItem>
                            <SelectItem value="other">기타</SelectItem>
                            <SelectItem value="none">없음</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>표시 필드</Label>
                      {grid.columnBindings?.length ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
                          {grid.columnBindings.slice(0, 60).map((b) => {
                            const key = `${b.tableName}.${b.fieldName}`;
                            const selected = new Set(grid.fields ?? []);
                            const checked = selected.has(key) || selected.has(b.fieldName);
                            return (
                              <div
                                key={`${grid.id}-col-${key}`}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`${grid.id}-col-${key}`}
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    const cur = new Set(
                                      (grid.fields ?? []).map((x) => String(x)),
                                    );
                                    if (c) cur.add(key);
                                    else cur.delete(key);
                                    setGrids((list) =>
                                      list.map((g) =>
                                        g.id === grid.id
                                          ? { ...g, fields: [...cur] }
                                          : g,
                                      ),
                                    );
                                  }}
                                />
                                <Label
                                  htmlFor={`${grid.id}-col-${key}`}
                                  className="cursor-pointer font-mono text-xs font-normal"
                                >
                                  {key}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          value={(grid.fields ?? []).join(", ")}
                          onChange={(e) =>
                            setGrids((list) =>
                              list.map((g) =>
                                g.id === grid.id
                                  ? {
                                      ...g,
                                      fields: e.target.value
                                        .split(",")
                                        .map((x) => x.trim())
                                        .filter(Boolean),
                                    }
                                  : g,
                              ),
                            )
                          }
                          placeholder="예: MATNR, WERKS, ... (쉼표로 구분)"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        DDIC 분석으로 컬럼 후보가 있으면 체크로 선택하고, 없으면 직접 입력합니다.
                      </p>
                    </div>
                    {gridTableCheckboxOptions.length > 0 ? (
                      <div className="grid gap-2">
                        <Label>소스 테이블 (분석 추출 — 복수 선택)</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
                          {gridTableCheckboxOptions.map((t) => {
                            const selected = new Set(
                              grid.sourceTableNames !== undefined
                                ? grid.sourceTableNames
                                : grid.tableName
                                  ? [grid.tableName.trim()].filter(Boolean)
                                  : [],
                            );
                            const checked = selected.has(t);
                            return (
                              <div
                                key={`${grid.id}-${t}`}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`grid-${grid.id}-tbl-${t}`}
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    const cur = new Set(
                                      grid.sourceTableNames !== undefined
                                        ? grid.sourceTableNames
                                        : grid.tableName
                                          ? [grid.tableName.trim()].filter(
                                              Boolean,
                                            )
                                          : [],
                                    );
                                    if (c) cur.add(t);
                                    else cur.delete(t);
                                    setGrids((list) =>
                                      list.map((g) =>
                                        g.id === grid.id
                                          ? rebuildGridFromSourceTables(g, [
                                              ...cur,
                                            ])
                                          : g,
                                      ),
                                    );
                                  }}
                                />
                                <Label
                                  htmlFor={`grid-${grid.id}-tbl-${t}`}
                                  className="cursor-pointer font-mono text-sm font-normal"
                                >
                                  {t}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          체크한 테이블은 이후 「Grid 세부」에서 표시 컬럼 후보로
                          쓰입니다.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Step 4에서 이미지 분석을 실행하면 테이블 목록이 생기고,
                        여기서 복수 선택할 수 있습니다. 그 전에는 위「주
                        테이블」만으로 단일 테이블 필드를 고를 수 있습니다.
                      </p>
                    )}
                  </div>
                ))}
                {grids.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    「Grid 추가」로 정의하거나 Step 4에서 초안을 생성하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid 세부(컬럼·이벤트) */}
          {activeStepIdx === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>Grid 세부</CardTitle>
                <CardDescription>
                  각 Grid마다 표시 컬럼·ALV 전용 필드와
                  행/핫스팟 이벤트(T-code·팝업·다른 ALV 연동)를 정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {screenFlows.some(
                  (r) =>
                    !r.sourceGridId?.trim() &&
                    ((r.summary ?? "").trim() ||
                      (r.actionDescription ?? "").trim() ||
                      (r.targetDetail ?? "").trim() ||
                      (r.triggers?.length ?? 0) > 0),
                ) && (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle className="text-sm">Grid 미지정 흐름</AlertTitle>
                    <AlertDescription className="text-xs leading-relaxed">
                      예전에 저장된 항목 중 Grid가 비어 있는 흐름은 아래 블록에
                      표시되지 않습니다. 필요하면 해당 Grid에서 같은 내용으로
                      「이벤트 추가」로 다시 넣어 주세요.
                    </AlertDescription>
                  </Alert>
                )}
                {grids.map((grid) => (
                  <div key={grid.id} className="space-y-3 rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">
                      Grid{" "}
                      <span className="font-medium text-foreground">{grid.name}</span>
                    </p>
                    <div className="grid gap-2">
                      <Label>표시 필드 (체크)</Label>
                      <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/25 p-3">
                        <div>
                          <p className="text-xs font-medium">ALV 전용 필드</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            DB/DDIC에 없고 ALV(화면)에만 쓰는 컬럼입니다. (아이콘,
                            버튼, 계산 표시 등)
                          </p>
                        </div>
                        <div className="grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-3">
                          <div className="grid gap-1">
                            <Label className="text-[11px] text-muted-foreground">
                              캡션(표시명)
                            </Label>
                            <Input
                              value={alvDraftByGrid[grid.id]?.caption ?? ""}
                              onChange={(e) =>
                                setAlvDraftByGrid((m) => ({
                                  ...m,
                                  [grid.id]: {
                                    caption: e.target.value,
                                    kind: m[grid.id]?.kind ?? "other",
                                    fieldKey: m[grid.id]?.fieldKey ?? "",
                                  },
                                }))
                              }
                              placeholder="예: 상태 아이콘 / 상세 버튼 / 계산값"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-[11px] text-muted-foreground">
                              종류
                            </Label>
                            <Select
                              value={(alvDraftByGrid[grid.id]?.kind ?? "other") as string}
                              onValueChange={(v) =>
                                setAlvDraftByGrid((m) => ({
                                  ...m,
                                  [grid.id]: {
                                    caption: m[grid.id]?.caption ?? "",
                                    kind: (v as AlvVirtualField["kind"]) ?? "other",
                                    fieldKey: m[grid.id]?.fieldKey ?? "",
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="icon">아이콘/상태</SelectItem>
                                <SelectItem value="action">버튼/액션</SelectItem>
                                <SelectItem value="calculated">계산값</SelectItem>
                                <SelectItem value="text">표시용 텍스트</SelectItem>
                                <SelectItem value="other">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-[11px] text-muted-foreground">
                              필드 키(선택)
                            </Label>
                            <Input
                              value={alvDraftByGrid[grid.id]?.fieldKey ?? ""}
                              onChange={(e) =>
                                setAlvDraftByGrid((m) => ({
                                  ...m,
                                  [grid.id]: {
                                    caption: m[grid.id]?.caption ?? "",
                                    kind: m[grid.id]?.kind ?? "other",
                                    fieldKey: e.target.value,
                                  },
                                }))
                              }
                              placeholder="미입력 시 자동 생성"
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const d = alvDraftByGrid[grid.id];
                              const caption = (d?.caption ?? "").trim();
                              const kind = (d?.kind ?? "other") as AlvVirtualField["kind"];
                              const manual = (d?.fieldKey ?? "").trim();
                              if (!caption) return;
                              setGrids((list) =>
                                list.map((g) => {
                                  if (g.id !== grid.id) return g;
                                  const existing = new Set<string>([
                                    ...(g.fields ?? []),
                                    ...(g.alvOnlyFields ?? []).map((x) => x.fieldKey),
                                  ]);
                                  const baseKey = manual
                                    ? manual
                                    : makeAlvFieldKey(caption, kind, existing);
                                  const key = ensureUniqueAlvKey(baseKey, existing);
                                  const vf: AlvVirtualField = {
                                    id: newId(),
                                    fieldKey: key,
                                    caption,
                                    kind,
                                  };
                                  return {
                                    ...g,
                                    alvOnlyFields: [...(g.alvOnlyFields ?? []), vf],
                                    fields: g.fields.includes(key) ? g.fields : [...g.fields, key],
                                  };
                                }),
                              );
                              setAlvDraftByGrid((m) => ({
                                ...m,
                                [grid.id]: { caption: "", kind: kind ?? "other", fieldKey: "" },
                              }));
                            }}
                            disabled={!(alvDraftByGrid[grid.id]?.caption ?? "").trim()}
                          >
                            + 기타 ALV 필드 추가
                          </Button>
                        </div>
                        {(grid.alvOnlyFields ?? []).length > 0 && (
                          <ul className="space-y-1.5 border-t border-border/60 pt-2">
                            {(grid.alvOnlyFields ?? []).map((v) => (
                              <li
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                              >
                                <span>
                                  <span className="font-mono text-foreground">
                                    {v.fieldKey}
                                  </span>
                                  <span className="mx-2 text-muted-foreground">
                                    — {v.caption}
                                  </span>
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={() =>
                                    setGrids((list) =>
                                      list.map((g) => {
                                        if (g.id !== grid.id) return g;
                                        return {
                                          ...g,
                                          alvOnlyFields: (
                                            g.alvOnlyFields ?? []
                                          ).filter((x) => x.id !== v.id),
                                          fields: g.fields.filter(
                                            (fk) => fk !== v.fieldKey,
                                          ),
                                        };
                                      }),
                                    )
                                  }
                                >
                                  제거
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <FieldPicker
                        key={`${grid.id}-${grid.tableName}-${(grid.sourceTableNames ?? []).join(",")}-${(grid.alvOnlyFields ?? []).length}-${grid.columnBindings?.length ?? 0}`}
                        selected={grid.fields}
                        fieldsAvailable={fieldsForGrid(grid)}
                        fieldsByTable={geminiRaw?.fieldsByTable}
                        fallbackTableName={grid.tableName}
                        virtualFieldDefs={grid.alvOnlyFields}
                        onChange={(fields) =>
                          setGrids((list) =>
                            list.map((g) =>
                              g.id === grid.id ? { ...g, fields } : g,
                            ),
                          )
                        }
                      />
                    </div>
                    <ScreenFlowForGridBlock
                      gridId={grid.id}
                      gridName={grid.name}
                      grids={grids}
                      screenFlows={screenFlows}
                      setScreenFlows={setScreenFlows}
                    />
                  </div>
                ))}
                {grids.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    「Grid 추가」로 정의하거나 Step 4에서 초안을 생성하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 화면 구성 */}
          {activeStepIdx === 7 && (
            <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">배치 미리보기</CardTitle>
                <CardDescription>
                  바깥 패턴이 단일이면 전환 스케치, 분할이면 A·B 영역 동시 표시.
                  각 영역 안의 분할은 아래 편집 내용과 합쳐집니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LayoutWireframePreview
                  tree={placementTreeForUi}
                  grids={grids}
                  wireframeContext={{
                    layoutMode: layout.layoutMode ?? "classic",
                    classic: {
                      pattern: layout.pattern,
                      splitDirection: layout.splitDirection,
                      areas: layout.areas,
                    },
                    areaSubtrees: layout.areaSubtrees,
                    searchConditions,
                    viewCount: layout.viewCount ?? 1,
                    viewSwitchLabel:
                      layout.viewSwitchConditionId
                        ? searchConditions.find(
                            (r) => r.id === layout.viewSwitchConditionId,
                          )?.label ||
                          searchConditions.find(
                            (r) => r.id === layout.viewSwitchConditionId,
                          )?.fieldId ||
                          undefined
                        : undefined,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="size-5" />
                  화면 구성
                </CardTitle>
                <CardDescription>
                  영역 A·B·C를 정한 뒤 각 영역 안에서 Grid·분할을 설정합니다.
                  행·핫스팟별 T-code·팝업은 「Grid 세부」에서 지정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    Grid {grids.length}개
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    바깥 레이아웃은 단일(전환)만 씁니다. 분할은 각 영역 내부에서만
                    설정합니다.
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>배치 방식</Label>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    화면을 <strong>영역 A·B·C</strong>로 나눈 뒤,{" "}
                    <strong>각 영역 안에서만</strong> 상·하/좌·우 분할이나 탭
                    (전환)을 둡니다. 바깥 패턴「단일」은 이 영역들을 전환하며
                    하나씩 보이게 하고, 「분할」은 보통 A와 B를 위·아래 또는
                    좌·우로 <strong>동시에</strong> 붙입니다.
                  </p>
                </div>
                {grids.length >= 3 && (
                  <p className="text-[11px] text-muted-foreground">
                    Grid 3개: 전환(한 번에 하나)은 단일+A/B/C, 같은 면을 동시에
                    여러 칸으로 나누려면 <strong>각 영역</strong> 안에서 분할을
                    쓰면 됩니다.
                  </p>
                )}
                {layout.layoutMode === "custom" && layout.placementTree ? (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertTitle className="text-sm">예전 자유 배치 트리</AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">
                        예전 저장 형식입니다. 아래 「클래식(영역 A/B/C)으로
                        전환」으로 옮기면 영역마다 편집하기 쉽습니다.
                      </AlertDescription>
                    </Alert>
                    <LayoutPlacementEditor
                      tree={placementTreeForUi}
                      onChange={(next) =>
                        setLayout((l) => ({
                          ...l,
                          layoutMode: "custom",
                          placementTree: next,
                        }))
                      }
                      grids={grids}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setLayout((prev) => {
                          if (!prev.placementTree) return prev;
                          const fb = placementTreeToClassicFallback(
                            prev.placementTree,
                          );
                          return {
                            ...prev,
                            layoutMode: "classic",
                            placementTree: null,
                            pattern: fb.pattern,
                            splitDirection: fb.splitDirection,
                            areas: fb.areas,
                            areaSubtrees: undefined,
                          };
                        })
                      }
                    >
                      클래식(영역 A/B/C)으로 전환
                    </Button>
                    <div>
                      <Label className="text-muted-foreground">
                        구조 요약 (FS·개발 참고)
                      </Label>
                      <pre className="mt-2 max-h-[220px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {summarizePlacementTreeKorean(placementTreeForUi, grids)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/10 p-4">
                      <div className="grid gap-2">
                        <Label>화면(View) 수</Label>
                        <RadioGroup
                          value={String(Math.min(3, Math.max(1, Math.trunc(layout.viewCount ?? 1))))}
                          onValueChange={(v) => {
                            const n = (Number(v) as 1 | 2 | 3) || 1;
                            setLayout((l) => {
                              const next = normalizeScreenLayout({
                                ...l,
                                viewCount: n,
                              });
                              const keep = (["A", "B", "C", "D", "E", "F"] as const).slice(0, n);
                              const clearedAreas = next.areas.map((a) =>
                                keep.includes(a.id) ? a : { ...a, gridId: "" },
                              );
                              const clearedSub = next.areaSubtrees
                                ? (Object.fromEntries(
                                    (["A", "B", "C", "D", "E", "F"] as const).map((id) => [
                                      id,
                                      keep.includes(id)
                                        ? next.areaSubtrees?.[id]
                                        : { kind: "grid", nodeId: newId(), gridId: "" },
                                    ]),
                                  ) as NonNullable<typeof next.areaSubtrees>)
                                : undefined;
                              return {
                                ...next,
                                areas: clearedAreas,
                                areaSubtrees: clearedSub,
                              };
                            });
                          }}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="1" id="viewcount-1" />
                            <Label htmlFor="viewcount-1" className="font-normal">
                              1개 화면
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="2" id="viewcount-2" />
                            <Label htmlFor="viewcount-2" className="font-normal">
                              2개 화면
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="3" id="viewcount-3" />
                            <Label htmlFor="viewcount-3" className="font-normal">
                              3개 화면
                            </Label>
                          </div>
                        </RadioGroup>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={(layout.viewCount ?? 1) >= 6}
                            onClick={() =>
                              setLayout((l) => {
                                const cur = Math.max(1, Math.min(6, Math.trunc(l.viewCount ?? 1)));
                                const next = normalizeScreenLayout({ ...l, viewCount: Math.min(6, cur + 1) });
                                return next;
                              })
                            }
                          >
                            + 화면 추가 (기타)
                          </Button>
                          <span className="text-[11px] text-muted-foreground">
                            처음은 1~3개만 선택하고, 이후는 필요할 때 화면을 추가합니다(최대 6).
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          화면 수만 정하면, 아래에서 각 화면이 단일/상하/좌우로
                          구성되는지와 Grid 연결을 개별로 설정합니다.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label>조회조건 → 화면 전환 연결 (선택)</Label>
                        <Select
                          value={layout.viewSwitchConditionId ?? "__none__"}
                          onValueChange={(v) =>
                            setLayout((l) => ({
                              ...l,
                              viewSwitchConditionId:
                                !v || v === "__none__" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="라디오/리스트 항목 선택">
                              {layout.viewSwitchConditionId
                                ? (searchConditions.find((r) => r.id === layout.viewSwitchConditionId)
                                    ?.label ||
                                    searchConditions.find((r) => r.id === layout.viewSwitchConditionId)
                                      ?.fieldId ||
                                    "(이름 없음)")
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">(미연결)</SelectItem>
                            {searchConditions
                              .filter(
                                (r) => r.inputMode === "radio" || r.inputMode === "list",
                              )
                              .map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {(r.label || r.fieldId || "(이름 없음)") + ` [${r.inputMode}]`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          라디오/리스트의 선택값에 따라 화면 A/B/C 중 어떤 화면을
                          보여줄지 연결할 때 사용합니다(선택값 순서 ↔ 화면 순서).
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {layoutPatternHint("single", layout.splitDirection, grids.length)}
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label>화면별 구성(표시 방식 + Grid 연결)</Label>
                        {grids.length <= 1 ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Grid 1개면 보통 화면 A에만 두면 됩니다.
                          </p>
                        ) : null}
                      </div>
                      {visibleLayoutAreas.map((area) => {
                        const aid = area.id as "A" | "B" | "C" | "D" | "E" | "F";
                        const subtree = getAreaSubtreeForEditor(layout, aid);
                        const mode: "single" | "split_h" | "split_v" =
                          subtree.kind === "split"
                            ? subtree.direction === "horizontal"
                              ? "split_h"
                              : "split_v"
                            : "single";
                        return (
                          <div
                            key={area.id}
                            className="space-y-3 rounded-xl border border-border/90 bg-muted/10 p-4"
                          >
                            <div className="flex flex-wrap items-baseline gap-2">
                              <Badge variant="outline" className="shrink-0">
                                화면 {area.id}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {areaRoleLabel(
                                  aid,
                                  layout.pattern,
                                  layout.splitDirection,
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              이 화면(View) 안에서 단일/상하/좌우 분할을 정하고
                              각 영역에 Grid를 연결합니다.
                            </p>
                            <div className="grid gap-2">
                              <Label className="text-xs text-muted-foreground">
                                표시 방식
                              </Label>
                              <RadioGroup
                                value={mode}
                                onValueChange={(v) => {
                                  const curFirst = firstGridIdInTree(subtree);
                                  const nextTree: import("@/types/spec").LayoutPlacementNode =
                                    v === "single"
                                      ? {
                                          kind: "grid" as const,
                                          nodeId: newId(),
                                          gridId: curFirst,
                                        }
                                      : v === "split_h"
                                        ? createSplitNode("horizontal", [
                                            {
                                              kind: "grid" as const,
                                              nodeId: newId(),
                                              gridId: curFirst,
                                            },
                                            {
                                              kind: "grid" as const,
                                              nodeId: newId(),
                                              gridId: "",
                                            },
                                          ])
                                        : createSplitNode("vertical", [
                                            {
                                              kind: "grid" as const,
                                              nodeId: newId(),
                                              gridId: curFirst,
                                            },
                                            {
                                              kind: "grid" as const,
                                              nodeId: newId(),
                                              gridId: "",
                                            },
                                          ]);
                                  setLayout((l) =>
                                    setAreaSubtreeAndSyncAreas(l, aid, nextTree),
                                  );
                                }}
                                className="flex flex-wrap gap-4"
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="single" id={`vm-${aid}-single`} />
                                  <Label htmlFor={`vm-${aid}-single`} className="font-normal">
                                    단일 Grid
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="split_h" id={`vm-${aid}-split-h`} />
                                  <Label htmlFor={`vm-${aid}-split-h`} className="font-normal">
                                    상하 분할
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="split_v" id={`vm-${aid}-split-v`} />
                                  <Label htmlFor={`vm-${aid}-split-v`} className="font-normal">
                                    좌우 분할
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <LayoutPlacementEditor
                              tree={subtree}
                              onChange={(next) =>
                                setLayout((l) =>
                                  setAreaSubtreeAndSyncAreas(l, aid, next),
                                )
                              }
                              grids={grids}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        구조 요약 (FS·개발 참고)
                      </Label>
                      <pre className="mt-2 max-h-[220px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {summarizePlacementTreeKorean(placementTreeForUi, grids)}
                      </pre>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </>
          )}

          {/* CRUD — 3.4-B (화면 구성·Grid 세부와 연결) */}
          {activeStepIdx === 8 && showCrudStep && (
            <CrudStepPanel
              crud={crud}
              setCrud={setCrud}
              layout={layout}
              grids={grids}
            />
          )}

          {/* 미리보기 — 조회형은 CRUD 생략 */}
          {activeStepIdx === 9 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>미리보기</CardTitle>
                  <CardDescription>
                    현재까지의 전체 입력값과 AI 구조화 결과입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">
                      전체 입력 상태 (JSON)
                    </Label>
                    <pre className="mt-2 max-h-[280px] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">
                      {JSON.stringify(
                        {
                          ...fullState,
                          uploads: fullState.uploads.map((u) => ({
                            id: u.id,
                            name: u.name,
                            size: u.size,
                            type: u.type,
                            purpose: u.purpose,
                          })),
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">
                      AI 구조화 결과 (JSON)
                    </Label>
                    <pre className="mt-2 max-h-[320px] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">
                      {geminiRaw
                        ? JSON.stringify(geminiRaw, null, 2)
                        : "// Step 4에서 분석을 실행하면 표시됩니다."}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function buildFieldPickerRows(
  keys: string[],
  fallbackTable: string,
  fb: GeminiAnalysisResult["fieldsByTable"] | undefined,
  virtualFieldDefs?: AlvVirtualField[],
) {
  const virt = new Map(
    (virtualFieldDefs ?? []).map((v) => [v.fieldKey, v]),
  );
  const rows = keys.map((key) => {
    const vd = virt.get(key);
    if (vd) {
      const short =
        key.startsWith("__ALV.") && key.length > 6 ? key.slice(6) : key;
      return {
        valueKey: key,
        tableName: "(ALV)",
        fieldName: short,
        type: "가상",
        description:
          vd.caption +
          (vd.kind === "row_selection" ? " · 행 선택·체크용" : ""),
      };
    }
    const dot = key.indexOf(".");
    if (dot === -1) {
      const ft = fallbackTable.trim();
      const meta = ft ? fb?.[ft]?.find((r) => r.name === key) : undefined;
      return {
        valueKey: key,
        tableName: ft || "—",
        fieldName: key,
        type: meta?.type,
        description: meta?.description,
      };
    }
    const tableName = key.slice(0, dot);
    const fieldName = key.slice(dot + 1);
    const meta = fb?.[tableName]?.find((r) => r.name === fieldName);
    return {
      valueKey: key,
      tableName,
      fieldName,
      type: meta?.type,
      description: meta?.description,
    };
  });
  rows.sort((a, b) => {
    const av = a.tableName === "(ALV)";
    const bv = b.tableName === "(ALV)";
    if (av !== bv) return av ? 1 : -1;
    const c = a.tableName.localeCompare(b.tableName);
    if (c !== 0) return c;
    return a.fieldName.localeCompare(b.fieldName);
  });
  return rows;
}

function FieldPicker({
  fieldsAvailable,
  selected,
  onChange,
  fieldsByTable,
  fallbackTableName = "",
  virtualFieldDefs,
}: {
  fieldsAvailable: string[];
  selected: string[];
  onChange: (fields: string[]) => void;
  fieldsByTable?: GeminiAnalysisResult["fieldsByTable"];
  fallbackTableName?: string;
  virtualFieldDefs?: AlvVirtualField[];
}) {
  if (!fieldsAvailable.length) {
    return (
      <Textarea
        placeholder="필드명을 쉼표로 구분 (예: MATNR, MAKTX)"
        value={selected.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        rows={2}
      />
    );
  }

  const rows = buildFieldPickerRows(
    fieldsAvailable,
    fallbackTableName ?? "",
    fieldsByTable,
    virtualFieldDefs,
  );

  return (
    <div className="max-h-[min(520px,55vh)] overflow-auto rounded-md border bg-muted/20">
      <Table>
        <TableHeader className="sticky top-0 z-[1] bg-background shadow-[0_1px_0_hsl(var(--border))]">
          <TableRow>
            <TableHead className="w-10 shrink-0" />
            <TableHead>테이블</TableHead>
            <TableHead>필드</TableHead>
            <TableHead className="hidden sm:table-cell">유형</TableHead>
            <TableHead className="min-w-[140px] max-w-[min(40vw,280px)]">
              설명
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const on = selected.includes(row.valueKey);
            return (
              <TableRow key={row.valueKey}>
                <TableCell className="w-10 py-2 pr-0">
                  <Checkbox
                    checked={on}
                    onCheckedChange={(c) => {
                      const k = row.valueKey;
                      if (c) onChange([...selected, k]);
                      else onChange(selected.filter((x) => x !== k));
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{row.tableName}</TableCell>
                <TableCell className="font-mono text-xs">{row.fieldName}</TableCell>
                <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                  {row.type ?? "—"}
                </TableCell>
                <TableCell
                  className="max-w-[min(40vw,280px)] whitespace-normal text-xs text-muted-foreground"
                  title={row.description}
                >
                  <span className="line-clamp-2">{row.description || "—"}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
