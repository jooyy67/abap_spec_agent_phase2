import {
  getEffectivePlacementTree,
  summarizePlacementTreeKorean,
} from "@/lib/layout-placement";
import { summarizeScreenFlowsForFs } from "@/lib/screen-flow";
import type { GeminiAnalysisResult } from "@/types/spec";
import type { SpecFormState } from "@/types/spec";
import type { GridDefinition } from "@/types/spec";

const MAX_TABLES =
  Number(process.env.SPEC_FS_MAX_TABLES_IN_FIELDS_BY_TABLE) || 32;
const MAX_FIELDS_PER_TABLE =
  Number(process.env.SPEC_FS_MAX_FIELDS_PER_TABLE) || 50;
const MAX_COLUMN_BINDINGS_IN_SUMMARY = 48;

/** FS/매핑 LLM용: fieldsByTable 용량 축소(토큰 절감). 앱 상태의 원본은 그대로 둔다. */
export function trimGeminiRawForLlm(
  g: GeminiAnalysisResult,
): GeminiAnalysisResult {
  const ft = g.fieldsByTable || {};
  const names = Object.keys(ft).slice(0, MAX_TABLES);
  const next: GeminiAnalysisResult["fieldsByTable"] = {};
  for (const t of names) {
    const rows = ft[t];
    if (!Array.isArray(rows)) continue;
    next[t] =
      rows.length > MAX_FIELDS_PER_TABLE
        ? rows.slice(0, MAX_FIELDS_PER_TABLE)
        : rows;
  }
  return {
    ...g,
    fieldsByTable: next,
  };
}

/** Grid·레이아웃을 FS 프롬프트용 짧은 텍스트로 요약 */
export function summarizeGridsForFs(grids: GridDefinition[]): string {
  if (!grids.length) return "(그리드 정의 없음)";
  return grids
    .map((g, i) => {
      const parts: string[] = [
        `${i + 1}) "${g.name}"`,
        `주테이블=${g.tableName || "(미정)"}`,
        `clickAction=${g.clickAction || "(미정)"}`,
      ];
      if (g.columnBindings?.length) {
        const list = g.columnBindings
          .map((c) => `${c.tableName}.${c.fieldName}`)
          .slice(0, MAX_COLUMN_BINDINGS_IN_SUMMARY);
        const more =
          g.columnBindings.length > MAX_COLUMN_BINDINGS_IN_SUMMARY
            ? ` …외 ${g.columnBindings.length - MAX_COLUMN_BINDINGS_IN_SUMMARY}개`
            : "";
        parts.push(`다중테이블 컬럼 후보: ${list.join(", ")}${more}`);
        parts.push(`표시 선택 필드(fields): ${g.fields.join(", ") || "(없음)"}`);
      } else {
        parts.push(`표시 필드: ${g.fields.join(", ") || "(없음)"}`);
      }
      if (g.alvOnlyFields?.length) {
        parts.push(
          `ALV전용(비DDIC): ${g.alvOnlyFields.map((v) => `${v.fieldKey}="${v.caption}"`).join(", ")}`,
        );
      }
      return parts.join(" | ");
    })
    .join("\n");
}

function stripUploadsBase64(s: SpecFormState): Omit<SpecFormState, "uploads"> & {
  uploads: {
    id: string;
    name: string;
    size: number;
    type: string;
    purpose: SpecFormState["uploads"][0]["purpose"];
  }[];
} {
  return {
    ...s,
    uploads: s.uploads.map((u) => ({
      id: u.id,
      name: u.name,
      size: u.size,
      type: u.type,
      purpose: u.purpose,
    })),
  };
}

/**
 * FS·매핑 생성 API에 넣을 JSON (업로드 base64 제거 + fieldsByTable 축소 + 힌트)
 */
export function buildFsMappingPayload(spec: SpecFormState): unknown {
  const base = stripUploadsBase64(spec);
  const hints = {
    screenGridRequirementsKorean:
      spec.basicInfo.screenGridRequirements?.trim() || "",
    gridsSummary: summarizeGridsForFs(spec.grids),
    searchConditionsNotesSummary: spec.searchConditions
      .filter((r) => (r.notes ?? "").trim())
      .map(
        (r) =>
          `[${r.label || r.fieldId}] ${(r.notes ?? "").trim()} (table=${r.tableName})`,
      )
      .join("\n"),
    layout: spec.layout,
    layoutEditorMode: spec.layout.layoutMode ?? "classic",
    layoutPlacementKoreanSummary: summarizePlacementTreeKorean(
      getEffectivePlacementTree(spec.layout),
      spec.grids,
    ),
    screenFlowsSummaryKorean: summarizeScreenFlowsForFs(
      spec.screenFlows ?? [],
      new Map(spec.grids.map((g) => [g.id, g.name])),
    ),
    searchConditionCount: spec.searchConditions.length,
    gridCount: spec.grids.length,
    note:
      "geminiRaw.fieldsByTable may be truncated per table for token limits; use joinCandidates, tables, and business text for gaps. For grids with columnBindings, mappingRows must list TABLE.FIELD style mappings where applicable.",
  };
  return {
    ...base,
    geminiRaw: spec.geminiRaw ? trimGeminiRawForLlm(spec.geminiRaw) : null,
    _fsGenerationHints: hints,
  };
}
