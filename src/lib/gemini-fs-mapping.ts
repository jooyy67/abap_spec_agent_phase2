import type { FsMappingGenerationResult } from "@/types/fs-mapping";
import type { SpecFormState } from "@/types/spec";
import { buildFsMappingPayload } from "@/lib/spec-json-trim";
import {
  generateJsonWithGemini,
  getGeminiModelName,
} from "@/lib/google-gemini-client";

const DEFAULT_MODEL = "gemini-2.0-flash";

export async function runFsMappingGeneration(
  spec: SpecFormState,
): Promise<FsMappingGenerationResult> {
  const modelName = getGeminiModelName(DEFAULT_MODEL);

  const payload = buildFsMappingPayload(spec);
  const prompt = `You are an SAP ABAP functional specification author and development mapping expert.

Given the following JSON (Korean business requirements + table analysis + screen design), produce:
1) A complete **Functional Specification (FS)** document in **Markdown** (Korean headings, clear sections: 개요, 화면/프로세스, 데이터/테이블, 조회조건, 그리드, 권한, CRUD if any, 비기능 요약).
2) A **development mapping sheet** as rows: each row maps one screen element or grid column to DDIC table.field (and optional data element name if inferable).
3) A **Development Mapping Spec** document in Markdown that follows the team's template sections exactly:
   1. 프로그램 기본 정보
   2. Include 구성 (TOP/S01/C01/O01/I01 + F01_01~F01_06)
   3. 기능 매핑
   4. FORM 정의
   5. 조회 DB 매핑
   6. 저장 DB 매핑
   7. ALV 매핑
   8. 이벤트 매핑
   9. 저장 흐름
   10. 메시지
   11. 비고
   특이사항

Use **_fsGenerationHints** in the JSON: it summarizes grids (including multi-table columnBindings as TABLE.FIELD), layout pattern, screenGridRequirementsKorean, and **screenFlowsSummaryKorean** (per-grid T-code/popup flows, triggers like double-click/hotspot from Grid detail). Reflect these user flows in the FS (화면/프로세스), not only ALV areas.

Input JSON:
${JSON.stringify(payload, null, 2)}

Output MUST be a single JSON object only (no markdown fences outside JSON):
{
  "functionalSpecMarkdown": string (full Markdown FS),
  "mappingSpecMarkdown": string (Markdown that matches the team's '개발 매핑 입력서' template structure),
  "mappingRows": [
    {
      "area": string,
      "uiLabel": string,
      "tableName": string,
      "fieldName": string,
      "dataElement": string | null,
      "notes": string | null
    }
  ]
}

Rules:
- mappingRows must cover search conditions and **each displayed grid column** where table/field can be inferred. If **grids[].columnBindings** exists, map each selected column (fields may be "TABLENAME.FIELDNAME"); include one mapping row per column where possible.
- For search conditions, if **searchConditions[].notes** explains mode-to-table mapping (radio/list), reflect it in FS (조회/프로세스) and in mappingRows notes or area where appropriate.
- geminiRaw.fieldsByTable may be truncated for size; infer missing technical fields from joinCandidates, tables, and FS context when needed.
- If a field is unknown, use empty string and explain in notes.
- mappingSpecMarkdown MUST contain the same tables/headings as the team's template, and should be internally consistent with functionalSpecMarkdown and mappingRows.
- Use Korean for FS and labels where appropriate.`;

  const text = await generateJsonWithGemini({
    model: modelName,
    parts: [{ text: `${prompt}\n\nOutput JSON only (no markdown fences).` }],
    temperature: 0.25,
  });
  if (!text) throw new Error("Empty response from Gemini");

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as FsMappingGenerationResult;

  if (
    typeof parsed.functionalSpecMarkdown !== "string" ||
    typeof parsed.mappingSpecMarkdown !== "string" ||
    !Array.isArray(parsed.mappingRows)
  ) {
    throw new Error("Invalid FS/mapping response shape");
  }

  return {
    functionalSpecMarkdown: parsed.functionalSpecMarkdown,
    mappingSpecMarkdown: parsed.mappingSpecMarkdown,
    mappingRows: parsed.mappingRows,
  };
}
