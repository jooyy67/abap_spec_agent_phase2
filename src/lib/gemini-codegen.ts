import type {
  CodeGenerationRequest,
  CodeGenerationResult,
} from "@/types/codegen";
import type { GeminiPart } from "@/lib/google-gemini-client";
import {
  generateJsonWithGemini,
  getGeminiModelName,
} from "@/lib/google-gemini-client";
import {
  buildCodegenGovernancePrompt,
  loadCodegenTemplates,
} from "@/lib/codegen-templates";
import {
  buildCodegenRulesPrompt,
  loadCodegenRules,
} from "@/lib/codegen-rules";
import { parseCodeGenerationGeminiJson } from "@/lib/parse-codegen-gemini-json";

export async function runCodeGeneration(
  req: CodeGenerationRequest,
): Promise<CodeGenerationResult> {
  const modelName = getGeminiModelName();
  const [{ codeSpecMarkdown, includeMappingSpecMarkdown }, rulesBundle] =
    await Promise.all([loadCodegenTemplates(), loadCodegenRules()]);
  const governance = buildCodegenGovernancePrompt(
    codeSpecMarkdown,
    includeMappingSpecMarkdown,
  );
  const includeRules = buildCodegenRulesPrompt(rulesBundle);

  const prompt = `You are an SAP ABAP developer. Generate code ONLY by applying the team's template governance, Include mapping rules, Include/BLOCK rule documents, and TPL library below.

=== GOVERNANCE (MUST FOLLOW FIRST) ===
${governance}

Governance application rules:
- Treat "템플릿 운영 원칙" as binding: TEMPLATE_ID uses TPL_ + BLOCK_ID; templates are shared skeletons only; replace {placeholder} with concrete values from inputs; default one BLOCK_ID to one TEMPLATE_ID unless a documented sub-variant applies.
- Treat Include Mapping "문서 개요" as binding: each standard BLOCK_ID belongs in the Include named in the mapping tables; implement as the mapped FORM / CLASS / declaration shape.
- Follow "코드 생성 순서" for include file order and internal layout.
- Apply "생성 조건 / 비고" and spec.programKind: omit save blocks for inquiry-only; omit ALV blocks when ALV is unused; omit event class when events are unused; add O01/I01 for dynpro/popup/tab flows; add validation blocks with upload features.
- mappingRows is the PRIMARY technical truth for DDIC table.field mapping. Never contradict it.
- Use only TPL bodies defined under ### TPL_* in the Code Template Specification. For a required BLOCK_ID with no matching TPL, emit a minimal compliant stub and comment the BLOCK_ID — do not invent a parallel pattern.
- Do not leave unreplaced {placeholder} in final ABAP unless the value is truly unknown; note those in the commented Generated Include Manifest.

=== INCLUDE / BLOCK RULES (public/rules) ===
${includeRules}

Include rule application:
- public/rules/*.md is re-read on every generation; always apply the latest file contents together with the governance and output-format rules above.
- For each emitted include, apply the matching *_rule.md (TOP, S01, C01, O01, I01, F01_01~F01_06).
- Honor each [BLOCK: ...] purpose, use_when, output, and 작성 규칙; skip blocks whose use_when does not match the spec or 생성 조건.
- For C01, follow the current C01_rule.md: FINAL local class with lcl_ prefix, FOR EVENT methods only, each METHOD body is a single PERFORM handle_* delegation into F01 with event IMPORTING parameters passed through USING; no SELECT/UPDATE/MESSAGE/LOOP or other business logic in C01; emit only the event methods required by the spec.
- Rules govern include placement, allowed statements, naming, and delegation; mappingRows remains the source of truth for DDIC table.field mapping.
- When a rule and a TPL skeleton differ, keep the TPL structure and satisfy the rule's constraints inside it; for C01 event coverage, extend the TPL method list per C01_rule.md and the spec.

=== CODE TEMPLATE SPECIFICATION (TPL LIBRARY) ===
${codeSpecMarkdown}

=== INCLUDE MAPPING SPECIFICATION (BLOCK → INCLUDE → TEMPLATE_ID) ===
${includeMappingSpecMarkdown}

Goal:
Produce ABAP in Includes TOP / S01 / C01 / O01 / I01 / F01_01~F01_06 from functionalSpecMarkdown, mappingRows, and spec.

Inputs:
- functionalSpecMarkdown: Korean FS in Markdown
- mappingRows: UI elements / grid columns / search conditions → DDIC table.field (optional data element)
- spec: wizard JSON (program kind, grids, search conditions, screen flows, layout)

Output formatting (single string in JSON):
- The entire generatedCode value must be valid, activatable ABAP source. Every line that is not a real ABAP statement must be an ABAP comment.
- Use full-line comments with a leading * for manifest text, include separators, section titles, bullet lists, prose explanations, and any TEMPLATE_ID / BLOCK_ID grouping labels.
- Use end-of-line " comments only for short notes on the same line as an ABAP statement.
- Never emit raw Markdown, English/Korean prose, or separator lines such as ===== INCLUDE: ... ===== as uncommented text.
- Start with a short commented "Generated Include Manifest" (each include Y/N and why, per 생성 조건). Example:
  * Generated Include Manifest
  * - TOP (Y): Program declaration, global data, ALV objects
- Separate each include with commented headers exactly like:
  * ===== INCLUDE: {program_id}_TOP =====
  * ===== INCLUDE: {program_id}_S01 =====
  ...
- Inside each include, group emitted code by TEMPLATE_ID / BLOCK_ID where possible; label groups with * comments, not bare text lines.
- After commenting, the file must contain no syntax errors from non-ABAP lines.

Return a single JSON object only. The ABAP payload MUST use Base64 so the response stays valid JSON (raw ABAP contains many " characters that break JSON.parse):
{ "generatedCodeB64": "<UTF-8 ABAP encoded as standard Base64; single line inside the JSON string, no raw newlines — use \\n only if you must split, but prefer one continuous Base64 string>" }

Rules for generatedCodeB64:
- Encode the exact same full generatedCode string you would have emitted before (all includes, comments, ABAP).
- Use standard Base64 (A–Z, a–z, 0–9, +, /, =). Do NOT add a separate "generatedCode" field.
- If you cannot encode, return a minimal valid JSON error is unacceptable — always output Base64.

Data:
functionalSpecMarkdown:
${JSON.stringify(req.functionalSpecMarkdown)}

mappingRows:
${JSON.stringify(req.mappingRows, null, 2)}

spec:
${JSON.stringify(req.spec, null, 2)}
`;

  const previous = req.previousGeneratedCode?.trim() ?? "";
  const errorLog = req.sapActivationErrorLog?.trim() ?? "";
  const shot = req.sapErrorScreenshot;
  const hasScreenshot =
    Boolean(shot?.data?.trim()) && Boolean(shot?.mimeType?.trim());

  const sapFixMode =
    previous.length > 0 && (errorLog.length > 0 || hasScreenshot);

  const sapFixSection = sapFixMode
    ? `

=== SAP GUI 검증 오류 반영(재생성) ===
사용자가 아래 「이전 생성 ABAP」을 SAP GUI에 붙여 넣은 뒤 구문 검사·활성화 시 나온 오류입니다.
- 오류 메시지의 프로그램명·줄 번호·구문·블록 ID(CONTROLS, SELECTION-SCREEN 블록 등)를 반영해 수정하세요.
- governance·Include rules·mappingRows·FS와 모순되지 않게, 활성화 가능한 전체 generatedCode 한 덩어리를 다시 출력하세요.
- 무관한 기능 추가·대규모 리팩터링은 피하고, 오류 원인만 최소한으로 고칩니다.

이전 생성 ABAP:
${previous}

SAP 오류 로그(사용자 붙여넣기):
${errorLog || "(텍스트 없음 — 이미지가 있으면 이미지에서 읽는다)"}
`
    : "";

  const promptWithFix = prompt + sapFixSection;

  const parts: GeminiPart[] = [];
  if (hasScreenshot && shot) {
    const raw = shot.data
      .replace(/^data:[^;]+;base64,/i, "")
      .replace(/\s/g, "");
    parts.push({
      text: `${promptWithFix}

다음 파트는 SAP 오류 화면 스크린샷입니다. 텍스트 로그와 함께 읽고 동일한 수정을 반영하세요.`,
    });
    parts.push({
      inlineData: { mimeType: shot.mimeType, data: raw },
    });
  } else {
    parts.push({ text: promptWithFix });
  }

  const text = await generateJsonWithGemini({
    model: modelName,
    parts,
    temperature: sapFixMode ? 0.15 : 0.2,
    maxOutputTokens: 65536,
  });
  if (!text) throw new Error("Empty response from Gemini");

  return parseCodeGenerationGeminiJson(text);
}

