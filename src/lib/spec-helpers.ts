import type {
  AlvVirtualField,
  BasicInfo,
  GeminiAnalysisResult,
  GridDefinition,
  SearchConditionRow,
} from "@/types/spec";
import { defaultBasicInfo } from "@/types/spec";

/** localStorage 등에서 복원 시 누락 필드 보정 */
export function mergeRestoredBasicInfo(
  partial: Partial<BasicInfo> | undefined,
): BasicInfo {
  const d = defaultBasicInfo();
  if (!partial || typeof partial !== "object") return d;
  return {
    ...d,
    ...partial,
    businessModule: partial.businessModule ?? d.businessModule,
    businessCategoryOther:
      typeof partial.businessCategoryOther === "string"
        ? partial.businessCategoryOther
        : d.businessCategoryOther,
    screenGridRequirements:
      typeof partial.screenGridRequirements === "string"
        ? partial.screenGridRequirements
        : d.screenGridRequirements,
  };
}

/** 선택한 테이블들의 DDIC 필드로 columnBindings 후보 생성 */
export function buildColumnBindingsFromTables(
  tables: string[],
  fieldsByTable: Record<string, { name: string }[]>,
): { tableName: string; fieldName: string }[] {
  const out: { tableName: string; fieldName: string }[] = [];
  for (const t of tables) {
    const rows = fieldsByTable[t];
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      const n = r?.name?.trim();
      if (n) out.push({ tableName: t, fieldName: n });
    }
  }
  return out;
}

/** 업무 구분 — 분석·FS 프롬프트용 문자열 */
export function formatBusinessAreaLabel(b: BasicInfo): string {
  if (b.businessModule === "기타") {
    const t = b.businessCategoryOther?.trim();
    return t ? `기타 (${t})` : "기타";
  }
  return b.businessModule;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeGemini(
  data: Partial<GeminiAnalysisResult>,
): GeminiAnalysisResult {
  return {
    tables: Array.isArray(data.tables) ? data.tables : [],
    fieldsByTable:
      data.fieldsByTable && typeof data.fieldsByTable === "object"
        ? data.fieldsByTable
        : {},
    keyCandidates: Array.isArray(data.keyCandidates) ? data.keyCandidates : [],
    joinCandidates: Array.isArray(data.joinCandidates)
      ? data.joinCandidates
      : [],
    searchConditionDrafts: Array.isArray(data.searchConditionDrafts)
      ? data.searchConditionDrafts
      : [],
    gridDrafts: Array.isArray(data.gridDrafts) ? data.gridDrafts : [],
    recommendedStructure: {
      summary: data.recommendedStructure?.summary ?? "",
      notes: data.recommendedStructure?.notes,
      layoutHint: data.recommendedStructure?.layoutHint,
    },
  };
}

function normalizeAlvOnlyFields(raw: unknown): AlvVirtualField[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: AlvVirtualField[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const v = x as Partial<AlvVirtualField>;
    const fieldKey = String(v.fieldKey ?? "").trim();
    const caption = String(v.caption ?? "").trim();
    if (!fieldKey || !caption) continue;
    const kind =
      v.kind === "row_selection" ||
      v.kind === "icon" ||
      v.kind === "action" ||
      v.kind === "calculated" ||
      v.kind === "text" ||
      v.kind === "other"
        ? v.kind
        : "other";
    out.push({
      id:
        typeof v.id === "string" && v.id.trim()
          ? v.id.trim()
          : newId(),
      fieldKey,
      caption,
      kind,
    });
  }
  return out.length ? out : undefined;
}

function normalizeGridDraft(
  d: Omit<GridDefinition, "id">,
): Omit<GridDefinition, "id"> {
  const alvOnlyFieldsNorm = normalizeAlvOnlyFields(d.alvOnlyFields);
  const virtualKeys = new Set(
    (alvOnlyFieldsNorm ?? []).map((x) => x.fieldKey),
  );

  const bindings =
    Array.isArray(d.columnBindings) && d.columnBindings.length
      ? d.columnBindings.filter(
          (b) =>
            b &&
            typeof b.tableName === "string" &&
            b.tableName.trim() !== "" &&
            typeof b.fieldName === "string" &&
            b.fieldName.trim() !== "",
        )
      : undefined;
  const legacyRowClick = d.rowClick ?? "none";
  const clickAction =
    d.clickAction ??
    (legacyRowClick === "popup"
      ? "popup"
      : legacyRowClick === "navigate" || legacyRowClick === "drilldown"
        ? "tcode"
        : "other");
  if (!bindings?.length) {
    const tn = d.tableName?.trim() ?? "";
    let sourceTableNames: string[] | undefined;
    if (Array.isArray(d.sourceTableNames)) {
      sourceTableNames = [
        ...new Set(
          d.sourceTableNames.map((x) => String(x).trim()).filter(Boolean),
        ),
      ].sort();
    } else if (tn) {
      sourceTableNames = [tn];
    } else {
      sourceTableNames = undefined;
    }
    const rawF = Array.isArray(d.fields) ? d.fields : [];
    const fields = [...new Set(rawF.filter((x) => typeof x === "string"))] as string[];
    return {
      name: d.name ?? "",
      sourceTableNames,
      tableName: tn,
      fields,
      clickAction,
      columnBindings: undefined,
      alvOnlyFields: alvOnlyFieldsNorm,
    };
  }
  const keys = new Set(
    bindings.map((b) => `${b.tableName}.${b.fieldName}`),
  );
  const raw = Array.isArray(d.fields) ? d.fields : [];
  const resolved: string[] = [];
  for (const f of raw) {
    if (typeof f !== "string") continue;
    if (virtualKeys.has(f)) {
      resolved.push(f);
      continue;
    }
    if (f.includes(".")) {
      if (keys.has(f)) resolved.push(f);
      continue;
    }
    const hit = bindings.find((b) => b.fieldName === f);
    if (hit) resolved.push(`${hit.tableName}.${hit.fieldName}`);
  }
  let fields = [...new Set(resolved)].filter(
    (x) => keys.has(x) || virtualKeys.has(x),
  );
  if (!fields.length) {
    const vfOnly = raw.filter(
      (f): f is string => typeof f === "string" && virtualKeys.has(f),
    );
    fields = vfOnly.length
      ? [...new Set(vfOnly)]
      : [...keys].slice(0, 18);
  }
  const uniqTables = [...new Set(bindings.map((b) => b.tableName))];
  return {
    name: d.name ?? "",
    sourceTableNames:
      Array.isArray(d.sourceTableNames) && d.sourceTableNames.length
        ? d.sourceTableNames
        : uniqTables,
    tableName: (d.tableName?.trim() || bindings[0].tableName) ?? "",
    fields,
    clickAction,
    columnBindings: bindings,
    alvOnlyFields: alvOnlyFieldsNorm,
  };
}

export function draftsToEditable(
  data: GeminiAnalysisResult,
): {
  searchConditions: SearchConditionRow[];
  grids: GridDefinition[];
} {
  return {
    searchConditions: data.searchConditionDrafts.map((d) => ({
      id: newId(),
      label: d.label ?? "",
      fieldId: d.fieldId ?? "",
      tableName: d.tableName ?? "",
      inputMode: d.inputMode ?? "single",
      required: Boolean(d.required),
      affectsResult: Boolean(d.affectsResult),
      notes: typeof d.notes === "string" ? d.notes : "",
    })),
    grids: data.gridDrafts.map((d) => {
      const normalized = normalizeGridDraft(d);
      return {
        id: newId(),
        ...normalized,
      };
    }),
  };
}
