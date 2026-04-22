import type {
  BasicInfo,
  GeminiAnalysisResult,
  ProgramKind,
  UploadPurpose,
} from "@/types/spec";
import { formatBusinessAreaLabel } from "@/lib/spec-helpers";
import {
  generateJsonWithGemini,
  getGeminiModelName,
} from "@/lib/google-gemini-client";

const DEFAULT_MODEL = "gemini-2.0-flash";

export interface AnalyzePayload {
  basicInfo: BasicInfo;
  programKind: ProgramKind;
  /** 이미지 — Vision 멀티모달 (순서는 아래 manifest와 동일) */
  files: {
    name: string;
    mimeType: string;
    base64: string;
    purpose: UploadPurpose;
  }[];
  /** 이미지 없을 때만 사용되는 텍스트 힌트 */
  fileMetadataOnly: {
    name: string;
    size: number;
    type: string;
    purpose: UploadPurpose;
  }[];
}

function purposeLabel(p: UploadPurpose): string {
  return p === "layout_reference"
    ? "layout_reference (similar screen — UI layout only)"
    : "ddic_table (SE11/DDIC/table-field extraction)";
}

function buildPrompt(
  basicInfo: BasicInfo,
  programKind: ProgramKind,
  files: AnalyzePayload["files"],
  fileMetadataOnly: AnalyzePayload["fileMetadataOnly"],
): string {
  const manifestLines =
    files.length > 0
      ? files
          .map(
            (f, i) =>
              `  ${i + 1}. [${purposeLabel(f.purpose)}] ${f.name}`,
          )
          .join("\n")
      : "  (no images attached)";

  const metaLines =
    fileMetadataOnly.length > 0
      ? fileMetadataOnly
          .map(
            (f) =>
              `- ${f.name} (${f.type}, ${f.size} bytes) [${purposeLabel(f.purpose)}]`,
          )
          .join("\n")
      : "(no files)";

  return `You are an SAP ABAP functional analyst. Combine the user's Korean requirements with attached images. Images are tagged by purpose — follow each tag strictly.

User program type: ${programKind === "inquiry" ? "조회형 (read-only inquiry)" : "CRUD형 (create/update/delete included)"}

Basic info (Korean):
- Program name: ${basicInfo.programName}
- Dept / Requester: ${basicInfo.requestDept} / ${basicInfo.requester}
- Business module / area: ${formatBusinessAreaLabel(basicInfo)}
- Authorization scope: ${basicInfo.authScope}
- Current problem: ${basicInfo.problem}
- Improvement request: ${basicInfo.improvement}
- Expected effect: ${basicInfo.expectedEffect || "(none)"}
- Remarks: ${basicInfo.remarks || "(none)"}

User-specified screen & grid requirements (Korean; if non-empty, prioritize for gridDrafts, joinCandidates, and recommendedStructure):
${basicInfo.screenGridRequirements?.trim() || "(none — infer from requirements and screenshots)"}

Attached images (same order as vision inputs below):
${manifestLines}

Uploaded file metadata (when images omitted from request, metadata only):
${metaLines}

Image purpose rules:
- ddic_table: Extract real SAP table and field names from SE11/DDIC/table listings. Use these for tables, fieldsByTable, keys, joins when present. **IMPORTANT: fieldsByTable must include ALL fields visible in the DDIC screenshots (do NOT sample or truncate to a few).** If there are many fields, you may omit type/description but keep field names.
- layout_reference: Use ONLY for screen layout similarity — selection screen blocks, number/placement of grids (ALV areas), splitters, tabs, toolbars, approximate column order as UI hints. Put human-readable column titles in gridDrafts.fields where helpful; do NOT invent technical DDIC names from generic ALV headers alone. Prefer recommendedStructure.layoutHint and grid structure (count, clickAction) from these images. If DDIC images also exist, align layout with layout_reference and data model with ddic_table.

Rules:
1. When both layout_reference and ddic_table images exist: merge — layout from former, table/field names from latter.
2. **Multiple screens / modes (e.g. "N개 화면 분리", 계좌 체크 vs 이력 조회):** Reflect in (a) **multiple gridDrafts** (one per functional screen or ALV block), and/or (b) **searchConditionDrafts** rows with inputMode **"radio"** or **"list"** where the user switches mode, label in Korean, fieldId a synthetic name (e.g. SCREEN_MODE), tableName the driving table if any, **required: false** unless the requirement explicitly says mandatory, **affectsResult: true**. Do NOT model technical JOIN keys as user-facing required search fields unless the business asks for them as filters.
3. **joinCandidates vs searchConditionDrafts:** Put table-to-table links in **joinCandidates** for backend/ALV SQL. **searchConditionDrafts** = what the user types on the selection screen (dates, plant, account, mode switches). Do not dump join pairs into searchConditionDrafts as mandatory by default.
3b. **Radio/list with different logical tables per value:** Keep one **tableName** as primary/default if needed; put **notes** (Korean) describing mapping e.g. "옵션1→테이블A 조회, 옵션2→테이블B 조회" or which grid/screen is shown per value.
4. **gridDrafts.fields:** Only include **columns useful on screen** (typically 8–25), not every DDIC field. Prefer keys + business attributes + status; omit rarely used technical fields unless needed.
   **This limit applies ONLY to gridDrafts.fields. Do NOT truncate fieldsByTable for DDIC extraction.**
5. **Multi-table single ALV:** If one grid shows columns from several tables, set **columnBindings** to the full candidate list: [{ "tableName", "fieldName" }, ...]. Then **fields** = subset to display first (same names as fieldName, or "TABLE.FIELD" if ambiguous). **tableName** on the grid = primary row table (e.g. header table). If only one table, omit columnBindings and use fields + tableName only.
6. For gridDrafts: respect "User-specified screen & grid requirements". If requirements conflict with images, prefer ddic_table for field names and layout_reference for structure; note conflicts in recommendedStructure.notes.
7. Output MUST be a single JSON object only — no markdown fences, no commentary.
8. JSON must match this TypeScript-like shape:
{
  "tables": { "name": string, "description"?: string }[],
  "fieldsByTable": Record<string, { "name": string, "type"?: string, "description"?: string }[]>,
  "keyCandidates": { "table": string, "fields": string[], "reason"?: string }[],
  "joinCandidates": { "fromTable": string, "fromField": string, "toTable": string, "toField": string, "reason"?: string }[],
  "searchConditionDrafts": {
    "label": string,
    "fieldId": string,
    "tableName": string,
    "inputMode": "single"|"range"|"radio"|"list"|"checkbox",
    "required": boolean,
    "affectsResult": boolean,
    "notes"?: string
  }[],
  "gridDrafts": {
    "name": string,
    "tableName": string,
    "fields": string[],
    "columnBindings"?: { "tableName": string, "fieldName": string }[],
    "clickAction"?: "none"|"tcode"|"popup"|"same_screen_detail"|"grid_linkage"|"other"
  }[],
  "recommendedStructure": { "summary": string, "notes"?: string, "layoutHint"?: string }
}

Use Korean for labels and summaries where appropriate. Ensure valid JSON.`;
}

function parseJsonResponse(text: string): GeminiAnalysisResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as GeminiAnalysisResult;
  return parsed;
}

export async function runGeminiAnalysis(
  payload: AnalyzePayload,
): Promise<GeminiAnalysisResult> {
  const modelName = getGeminiModelName(DEFAULT_MODEL);

  const prompt = buildPrompt(
    payload.basicInfo,
    payload.programKind,
    payload.files,
    payload.fileMetadataOnly,
  );

  const parts = [
    {
      text: `${prompt}\n\nRespond with a single JSON object only (no markdown fences).`,
    },
    ...payload.files.map((f) => ({
      inlineData: {
        mimeType: f.mimeType || "image/png",
        data: f.base64,
      },
    })),
  ];

  const text = await generateJsonWithGemini({
    model: modelName,
    parts,
    temperature: 0.35,
  });

  if (!text) throw new Error("Empty response from Gemini");
  return parseJsonResponse(text);
}
