import type {
  FsMappingGenerationResult,
  MappingSheetRow,
} from "@/types/fs-mapping";
import type { SpecFormState } from "@/types/spec";
import { buildFsMappingPayload } from "@/lib/spec-json-trim";
import {
  generateJsonWithGemini,
  getGeminiModelName,
} from "@/lib/google-gemini-client";
import { readFile } from "node:fs/promises";
import path from "node:path";


// Fallback template to keep generation working even if file missing at runtime.
const FS_TEMPLATE_FALLBACK = `# Functional Specification

---

## 1. 프로그램 기본정보
사용자 입력서 [1. 기본 정보] 기반

| 항목 | 내용 |
|------|------|
| Program ID |  |
| Program Name |  |
| 요청 부서 / 담당자 |  |
| 업무 구분 | 구매 / 영업 / 생산 / 재고 / 회계 / 기타 |
| 참조 T-Code |  |
| 사용 권한 범위 |  |

---

## 2. 프로그램 유형
사용자 입력서 [2. 프로그램 유형] 기반

| 항목 | 내용 |
|------|------|
| Program Type | 조회 전용 / 저장 전용 / 조회 + 저장 |

---

## 3. 화면 구조 (UI Layout)
사용자 입력서 [3. 화면 구조 및 동작] 기반

### 3.1 기본 구조
- 단일 화면
- 2분할 (위/아래)
- 2분할 (좌/우)
- 다중 영역

### 3.2 화면 기능
- 탭(Tab)
- 팝업 조회
- 팝업 입력

### 3.3 편집 권한
- 조회 전용
- 수정 가능

### 3.4 Main Screen 정의

| 항목 | 값 |
|------|------|
| Main Screen No | 0100 |
| Popup Screen 후보 | 0200 / 0300 |
| Subscreen 필요 여부 | Y / N |

---

## 4. 조회 조건 정의 (Selection Screen)
사용자 입력서 [4. 조회 조건] 기반

| 순서 | 섹션명 | 필드ID | 항목명 | 입력방식 | 필수 | F4 | 화면 제어 규칙 |
|------|--------|--------|--------|----------|------|----|----------------|
| 1 |  |  |  | PARAMETERS / SELECT-OPTIONS / RADIO / LISTBOX / CHECKBOX | Y/N | Y/N |  |

### 4.1 조회 조건 파생 정보

| 항목 | 내용 |
|------|------|
| Selection Screen 사용 여부 | Y / N |
| MODIF ID 필요 여부 | Y / N |
| Search Help 필요 여부 | Y / N |

---

## 5. 조회 결과 정의 (ALV Grid)
사용자 입력서 [5. 조회 결과 리스트] 기반

### 5.1 영역 정의

| 영역 ID | 영역명 | 설명 |
|---------|--------|------|
| AREA_MAIN | 메인 목록 | 상단 / 메인 조회 영역 |
| AREA_DETAIL | 상세 목록 | 하단 / 팝업 / 탭 영역 |

### 5.2 결과 필드 정의

| 영역 ID | 순서 | 필드ID | 항목명 | KEY | 합계 | 수정 | 속성/동작 |
|---------|------|--------|--------|-----|------|------|------------|
| AREA_MAIN | 1 | BELNR | 전표번호 | Y | N | N | hotspot |

### 5.3 ALV 파생 정보

| 항목 | 내용 |
|------|------|
| ALV 사용 여부 | Y / N |
| 편집 ALV 여부 | Y / N |
| 합계 / 소계 필요 여부 | Y / N |
| 색상 / 아이콘 사용 여부 | Y / N |
| 이벤트 필요 여부 | Y / N |

---

## 6. 업무 처리 규칙 (Processing Logic)
사용자 입력서 [6. 업무 처리 및 데이터 규칙] 기반

### 6.1 업무 흐름
- (예: 조회 → 선택 → 저장 → 알림)

### 6.2 Validation 규칙

| Rule ID | 조건 | 처리 | 메시지 |
|---------|------|------|--------|
| RULE_01 |  |  |  |

### 6.3 자동 처리 규칙

| Rule ID | 조건 | 처리 |
|---------|------|------|
| AUTO_01 |  |  |

### 6.4 저장 / 삭제 / 중복 규칙

| 항목 | 내용 |
|------|------|
| 반영 위치 | Z-Table / SAP 표준 문서 / 파일 생성 |
| 삭제 방식 | 완전 삭제 / 삭제 마킹 |
| 중복 체크 | 필요 / 불필요 |

### 6.5 파생 정보

| 항목 | 내용 |
|------|------|
| Save 기능 사용 여부 | Y / N |
| DB 반영 필요 여부 | Y / N |
| Message 처리 필요 여부 | Y / N |

---

## 7. 부가 기능 (Additional Features)
사용자 입력서 [2. 상세 기능] 기반

| 기능 구분 | 기능명 | 사용 여부 | 비고 |
|-----------|--------|-----------|------|
| 데이터 처리 | 행 추가 | Y / N |  |
| 데이터 처리 | 행 삭제 | Y / N |  |
| 데이터 처리 | 선택 행 처리 | Y / N |  |
| 데이터 처리 | 일괄 처리 | Y / N |  |
| 파일 기능 | 엑셀 업로드 | Y / N |  |
| 파일 기능 | 엑셀 다운로드 | Y / N |  |
| 파일 기능 | 템플릿 제공 | Y / N |  |
| 파일 기능 | 파일 첨부 | Y / N |  |
| 출력/기타 | 합계 / 소계 표시 | Y / N |  |
| 출력/기타 | 변경 로그 기록 | Y / N |  |
| 출력/기타 | 승인 / 결재 연동 | Y / N |  |
| 출력/기타 | 메일 알림 | Y / N |  |

---

## 8. 세부 기능 리스트 (AI 생성 영역)
FS 전체를 기반으로 자동 생성

| 기능 ID | 기능 명칭 | 상세 정의 | 입력서 연결 | 중요도 | 생성 블록 |
|---------|------------|------------|--------------|--------|------------|
| SCR_01 | 조회 조건 제어 | 회사코드 고정 및 필드 제어 | Selection | 상 | S01_MODIF |

---

## 9. DB 처리 정의 (Data Handling)

### 9.1 조회 정의

| DB ID | 테이블 | JOIN | WHERE 조건 | ORDER BY | 결과 ITAB |
|-------|--------|------|-------------|-----------|------------|
| DB_01 |  |  |  |  | GT_DATA |

### 9.2 저장 정의

| DB ID | 대상 | 방식 | KEY 기준 | 저장 ITAB |
|-------|------|------|----------|------------|
| DB_02 |  | MODIFY / INSERT / UPDATE / DELETE / BAPI |  | GT_SAVE |

### 9.3 트랜잭션 처리

| 항목 | 내용 |
|------|------|
| COMMIT WORK 사용 여부 | Y / N |
| ROLLBACK WORK 사용 여부 | Y / N |

---

## 10. 메시지 정의

| MSG_ID | TYPE | TEXT | 발생 위치 |
|--------|------|------|------------|
| MSG_001 | E |  | check_data |

---

## 11. 기타

| 항목 | 내용 |
|------|------|
| 참고 화면 |  |
| 참고 파일 |  |
| 특이사항 |  |`;

async function loadFsTemplate(): Promise<string> {
  // Put the template in /public so it's shipped as a plain file.
  const p = path.join(process.cwd(), "public", "templates", "Functional_Spec.md");
  try {
    const txt = await readFile(p, "utf8");
    return txt.trim() || FS_TEMPLATE_FALLBACK;
  } catch {
    return FS_TEMPLATE_FALLBACK;
  }
}

const DEV_MAPPING_TEMPLATE_FALLBACK = `# 개발 매핑 입력서

---

## 1. 프로그램 기본 정보
FS 1, 2, 3, 5, 6, 8 기반 자동 생성

| 항목 | 값 | 생성 규칙 |
|------|----|-----------|
| Program ID |  | FS 1. 프로그램 기본정보 |
| Program Name |  | FS 1. 프로그램 기본정보 |
| Program Type | 조회 / 저장 / 조회+저장 | FS 2 |
| Main Screen | 0100 | FS 3 |
| ALV 사용 여부 | Y / N | FS 5 |
| Event Class 사용 여부 | Y / N | FS 8 |
| Save 기능 사용 여부 | Y / N | FS 6 |

---

## 2. Include 구성
FS 전체 구조 기반 자동 결정

| Include ID | 설명 | 생성 여부 | 생성 규칙 |
|------------|------|-----------|-----------|
| TOP | 전역 선언 | Y | 항상 |
| S01 | Selection Screen |  | 조회조건 존재시 |
| C01 | 이벤트 클래스 |  | Event 기능 존재 시 |
| O01 | PBO |  | Dynpro 화면 사용 시 |
| I01 | PAI |  | Dynpro 화면 사용 시 |
| F01_01 | 구조 | Y | 항상 |
| F01_02 | 제어 |  | 분기/제어 존재 시 |
| F01_03 | 조회 |  | DB 조회 존재 시 |
| F01_04 | 데이터 처리 |  | 가공/계산 존재 시 |
| F01_05 | ALV |  | ALV 존재 시 |
| F01_06 | 저장 |  | Save 기능 존재 시 |

---

## 3. 기능 매핑
FS 8. 세부 기능 리스트 기반 자동 생성

| 기능 ID | 기능명 | 상세 정의 | 입력서 연결 | 중요도 | BLOCK_ID | Include | TEMPLATE_ID | 생성 여부 | 비고 |
|---------|--------|------------|--------------|--------|-----------|----------|--------------|------------|------|

---

## 4. FORM 정의
기능 매핑 및 규칙 기반 생성

| FORM_NAME | BLOCK_ID | Include | TEMPLATE_ID | 순서 | 설명 |
|-----------|-----------|----------|--------------|------|------|

---

## 5. 조회 DB 매핑
FS 9.1 기반

| FORM | 테이블 | JOIN | WHERE 조건 | ORDER BY | 대상 ITAB |
|------|--------|------|-------------|-----------|------------|

---

## 6. 저장 DB 매핑
FS 9.2 기반

| FORM | 테이블 | 방식 | KEY 기준 | 대상 ITAB |
|------|--------|------|----------|------------|

---

## 7. ALV 매핑
FS 5 기반

| 영역 | 필드ID | 속성 | BLOCK_ID | 비고 |
|------|--------|------|-----------|------|

---

## 8. 이벤트 매핑
자동 생성 영역

| 이벤트 | BLOCK_ID | 클래스 | FORM | 후처리 FORM |
|--------|-----------|--------|------|--------------|

---

## 9. 저장 흐름
자동 생성 영역

| 단계 | FORM | BLOCK_ID |
|------|------|-----------|

---

## 10. 메시지
FS 10 기반

| MSG_ID | TYPE | TEXT | FORM |
|--------|------|------|------|

---

## 11. 비고

| 항목 | 내용 |
|------|------|
| 참고 화면 |  |
| 참고 파일 |  |
| 특이사항 |  |`;

async function loadDevMappingTemplate(): Promise<string> {
  const p = path.join(process.cwd(), "public", "templates", "Dev_Mapping.md");
  try {
    const txt = (await readFile(p, "utf8")).trim();
    return txt || DEV_MAPPING_TEMPLATE_FALLBACK;
  } catch {
    return DEV_MAPPING_TEMPLATE_FALLBACK;
  }
}

function cleanGeminiJsonText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNullableString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeMappingRows(raw: unknown): Omit<MappingSheetRow, "id">[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const record =
      row && typeof row === "object"
        ? (row as Record<string, unknown>)
        : {};
    return {
      area: String(record.area ?? ""),
      uiLabel: String(record.uiLabel ?? record.ui_label ?? ""),
      tableName: String(record.tableName ?? record.table_name ?? ""),
      fieldName: String(record.fieldName ?? record.field_name ?? ""),
      dataElement: pickNullableString(record.dataElement ?? record.data_element),
      notes: pickNullableString(record.notes),
    };
  });
}

function parseFsMappingGenerationResponse(
  text: string,
  fallbackMappingSpecMarkdown: string,
): FsMappingGenerationResult {
  const cleaned = cleanGeminiJsonText(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("FS/매핑 JSON 파싱에 실패했습니다.");
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const root =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const functionalSpecMarkdown = pickString(data, [
    "functionalSpecMarkdown",
    "functional_spec_markdown",
    "functionalSpec",
    "fsMarkdown",
  ]);
  if (!functionalSpecMarkdown) {
    throw new Error(
      "functionalSpecMarkdown가 비어 있습니다. FS 생성 응답 형식이 올바르지 않습니다.",
    );
  }

  const mappingSpecMarkdown =
    pickString(data, ["mappingSpecMarkdown", "mapping_spec_markdown"]) ??
    fallbackMappingSpecMarkdown;

  const mappingRowsRaw = data.mappingRows ?? data.mapping_rows;
  if (mappingRowsRaw !== undefined && !Array.isArray(mappingRowsRaw)) {
    throw new Error("mappingRows는 배열이어야 합니다.");
  }

  return {
    functionalSpecMarkdown,
    mappingSpecMarkdown,
    mappingRows: normalizeMappingRows(mappingRowsRaw ?? []),
  };
}

export async function runFsMappingGeneration(
  spec: SpecFormState,
): Promise<FsMappingGenerationResult> {
  const modelName = getGeminiModelName();

  const payload = buildFsMappingPayload(spec);
  const fsTemplate = await loadFsTemplate();
  const devMappingTemplate = await loadDevMappingTemplate();
  const prompt = `You are an SAP ABAP functional specification author and development mapping expert.

Given the following JSON (Korean business requirements + table analysis + screen design), produce:
1) A complete **Functional Specification (FS)** document in **Markdown** that strictly follows the given FS template.
2) A **development mapping sheet** as rows: each row maps one screen element or grid column to DDIC table.field (and optional data element name if inferable).
3) A **Development Mapping Spec** document in Markdown that strictly follows the given Development Mapping template.
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

FS TEMPLATE (MUST FOLLOW THIS EXACT HEADING ORDER AND TABLE STRUCTURES):
${fsTemplate}

DEVELOPMENT MAPPING TEMPLATE (MUST FOLLOW THIS EXACT HEADING ORDER AND TABLE STRUCTURES):
${devMappingTemplate}

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
- functionalSpecMarkdown MUST follow the FS TEMPLATE exactly:
  - Keep all headings (## 1..11 and subheadings) in the same order.
  - Keep tables with the same columns. Fill the "내용" or cells using the Input JSON.
  - Do NOT add/remove template sections. You may add extra rows inside template tables when needed (e.g., multiple selection conditions, multiple ALV fields, multiple rules), but keep the table headers unchanged.
  - If something is unknown, leave the cell blank and explain briefly in the nearest "비고" cell or in section 11 "특이사항".
- Use user inputs first: basicInfo, searchConditions, grids, layout, screenFlows, uploads-derived hints. Avoid inventing business facts not present.
- mappingSpecMarkdown MUST follow the DEVELOPMENT MAPPING TEMPLATE exactly:
  - Keep all headings (## 1..11) in the same order.
  - Keep tables with the same columns. You may add rows but must not change header columns.
  - The "생성 규칙" column should remain consistent with the template meaning; fill "값" primarily from FS + Input JSON.
- mappingRows must cover search conditions and **each displayed grid column** where table/field can be inferred. If **grids[].columnBindings** exists, map each selected column (fields may be "TABLENAME.FIELDNAME"); include one mapping row per column where possible.
- For search conditions, if **searchConditions[].notes** explains mode-to-table mapping (radio/list), reflect it in FS (조회/프로세스) and in mappingRows notes or area where appropriate.
- geminiRaw.fieldsByTable may be truncated for size; infer missing technical fields from joinCandidates, tables, and FS context when needed.
- If a field is unknown, use empty string and explain in notes.
- mappingSpecMarkdown MUST be internally consistent with functionalSpecMarkdown and mappingRows.
- Use Korean for FS and labels where appropriate.`;

  const text = await generateJsonWithGemini({
    model: modelName,
    parts: [{ text: `${prompt}\n\nOutput JSON only (no markdown fences).` }],
    temperature: 0.25,
  });
  if (!text) throw new Error("Empty response from Gemini");

  return parseFsMappingGenerationResponse(text, devMappingTemplate);
}
