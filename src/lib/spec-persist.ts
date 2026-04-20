import type { MappingSheetRow } from "@/types/fs-mapping";
import { mergeRestoredBasicInfo, normalizeGemini } from "@/lib/spec-helpers";
import type {
  BasicInfo,
  CrudSettings,
  GeminiAnalysisResult,
  GridDefinition,
  PipelinePhase,
  ProgramKind,
  ScreenFlowRow,
  ScreenLayout,
  SearchConditionRow,
  UploadedFileMeta,
  UploadPurpose,
} from "@/types/spec";
import { normalizeScreenLayout } from "@/lib/layout-placement";
import { normalizeScreenFlows } from "@/lib/screen-flow";
import {
  defaultCrudSettings,
  defaultScreenFlows,
  defaultScreenLayout,
} from "@/types/spec";

export const SPEC_PERSIST_KEY = "abap-spec-agent-pipeline-v1";

export type PersistedPipelineV1 = {
  v: 1;
  phase: PipelinePhase;
  basicInfo: BasicInfo;
  programKind: ProgramKind | null;
  uploads: UploadedFileMeta[];
  geminiRaw: GeminiAnalysisResult | null;
  searchConditions: SearchConditionRow[];
  grids: GridDefinition[];
  layout: ScreenLayout;
  screenFlows: ScreenFlowRow[];
  crud: CrudSettings;
  wizardSlot: number;
  functionalSpecMarkdown: string;
  mappingSpecMarkdown?: string;
  mappingRows: MappingSheetRow[];
  fsMappingGeneratedAt: string | null;
  generatedCode: string;
};

function normalizePurpose(p: unknown): UploadPurpose {
  return p === "layout_reference" ? "layout_reference" : "ddic_table";
}

function normalizeUpload(u: unknown): UploadedFileMeta | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  if (typeof o.base64 !== "string" || typeof o.id !== "string") return null;
  return {
    id: o.id,
    name: typeof o.name === "string" ? o.name : "image",
    size: typeof o.size === "number" ? o.size : 0,
    type: typeof o.type === "string" ? o.type : "image/png",
    base64: o.base64,
    purpose: normalizePurpose(o.purpose),
  };
}

function normalizeCrudSettings(raw: unknown): CrudSettings {
  const d = defaultCrudSettings();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;

  // v2 (current)
  const hasV2Keys =
    "rowAdd" in o ||
    "cellEdit" in o ||
    "multiProcess" in o ||
    "saveTarget" in o ||
    "dbCreate" in o ||
    "targetGridId" in o;
  if (hasV2Keys) {
    return {
      targetGridId: typeof o.targetGridId === "string" ? o.targetGridId : d.targetGridId,
      rowAdd: Boolean(o.rowAdd ?? d.rowAdd),
      rowDelete: Boolean(o.rowDelete ?? d.rowDelete),
      cellEdit: Boolean(o.cellEdit ?? d.cellEdit),
      multiProcess: Boolean(o.multiProcess ?? d.multiProcess),
      saveTarget: Boolean(o.saveTarget ?? d.saveTarget),
      dbCreate: Boolean(o.dbCreate ?? d.dbCreate),
      dbUpdate: Boolean(o.dbUpdate ?? d.dbUpdate),
      dbDelete: Boolean(o.dbDelete ?? d.dbDelete),
    };
  }

  // legacy migration: old shape (create/update/delete/inputModes/singleGrid/multiGrid)
  const create = Boolean((o as any).create);
  const update = Boolean((o as any).update);
  const del = Boolean((o as any).delete);
  return {
    ...d,
    // best-effort mapping
    dbCreate: create || d.dbCreate,
    dbUpdate: update || d.dbUpdate,
    dbDelete: del || d.dbDelete,
  };
}

export function loadPersistedPipeline(): PersistedPipelineV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPEC_PERSIST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PersistedPipelineV1>;
    if (p.v !== 1) return null;
    const uploads = Array.isArray(p.uploads)
      ? p.uploads.map(normalizeUpload).filter(Boolean) as UploadedFileMeta[]
      : [];
    return {
      v: 1,
      phase:
        p.phase === "fs-mapping" || p.phase === "code" || p.phase === "input"
          ? p.phase
          : "input",
      basicInfo: mergeRestoredBasicInfo(
        p.basicInfo as Partial<BasicInfo> | undefined,
      ),
      programKind:
        p.programKind === "inquiry" || p.programKind === "crud"
          ? p.programKind
          : null,
      uploads,
      geminiRaw: p.geminiRaw
        ? normalizeGemini(p.geminiRaw as Partial<GeminiAnalysisResult>)
        : null,
      searchConditions: Array.isArray(p.searchConditions)
        ? p.searchConditions
        : [],
      grids: Array.isArray(p.grids) ? p.grids : [],
      layout: normalizeScreenLayout(
        p.layout && typeof p.layout === "object"
          ? (p.layout as ScreenLayout)
          : defaultScreenLayout(),
      ),
      screenFlows: normalizeScreenFlows(p.screenFlows ?? defaultScreenFlows()),
      crud: normalizeCrudSettings(p.crud),
      wizardSlot: typeof p.wizardSlot === "number" ? p.wizardSlot : 0,
      functionalSpecMarkdown:
        typeof p.functionalSpecMarkdown === "string"
          ? p.functionalSpecMarkdown
          : "",
      mappingSpecMarkdown:
        typeof (p as any).mappingSpecMarkdown === "string"
          ? ((p as any).mappingSpecMarkdown as string)
          : "",
      mappingRows: Array.isArray(p.mappingRows) ? p.mappingRows : [],
      fsMappingGeneratedAt:
        typeof p.fsMappingGeneratedAt === "string" ||
        p.fsMappingGeneratedAt === null
          ? p.fsMappingGeneratedAt
          : null,
      generatedCode:
        typeof p.generatedCode === "string" ? p.generatedCode : "",
    };
  } catch {
    return null;
  }
}

export function savePersistedPipeline(state: Omit<PersistedPipelineV1, "v">): void {
  try {
    const payload: PersistedPipelineV1 = { v: 1, ...state };
    localStorage.setItem(SPEC_PERSIST_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("[spec-persist] localStorage 저장 실패(용량 초과 등):", e);
  }
}
