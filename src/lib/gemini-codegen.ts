import type { CodeGenerationRequest, CodeGenerationResult } from "@/types/codegen";
import { createOpenAIClient } from "@/lib/openai-client";
import {
  CODE_SPEC_TEMPLATE_MD,
  INCLUDE_MAPPING_SPEC_MD,
} from "@/lib/codegen-templates";

const DEFAULT_MODEL = "gpt-4o-mini";

export async function runCodeGeneration(
  req: CodeGenerationRequest,
): Promise<CodeGenerationResult> {
  const modelName =
    process.env.OPENAI_MODEL || process.env.GPT_MODEL || DEFAULT_MODEL;
  const openai = createOpenAIClient();

  const prompt = `You are an SAP ABAP developer who strictly follows the team's standard templates.

You MUST generate output according to these two templates:

1) Code Template Specification (TPL library)
${CODE_SPEC_TEMPLATE_MD}

2) Include Mapping Specification (Include structure & block mapping)
${INCLUDE_MAPPING_SPEC_MD}

Goal:
Generate ABAP code in a consistent structure (Includes TOP/S01/C01/O01/I01/F01_01~F01_06),
from (1) functional spec markdown and (2) development mapping sheet.

Inputs:
- functionalSpecMarkdown: a Korean FS in Markdown
- mappingRows: array of mappings of UI elements/grid columns/search conditions to DDIC table.field (and optional data element)
- spec: structured wizard JSON (program kind, grids, search conditions, screen flows, layout)

Hard requirements:
- mappingRows is the PRIMARY technical truth for DDIC table/field mapping. Never ignore it.
- Use the Include structure & generation order from the Include Mapping Specification.
- Use BLOCK_ID/TEMPLATE_ID naming conventions in the templates (e.g., TOP_PROGRAM -> TPL_TOP_PROGRAM).
- If a block is not applicable (e.g., no save), omit the corresponding F01_06 blocks.
- Keep variable/method names consistent and predictable.
- Use placeholders when unknown, but DO declare everything you reference.

Output formatting requirement (single string in JSON):
- Put the output as ONE concatenated text that clearly separates each include file using headers exactly like:
  "===== INCLUDE: {program_id}_TOP ====="
  "===== INCLUDE: {program_id}_S01 ====="
  ...
- Inside each include, lay out code blocks aligned with the TEMPLATE_ID sections when possible.
- Also include a short "Generated Include Manifest" at the top (which includes which includes are generated Y/N).

Return a single JSON object only:
{ "generatedCode": string }

Data:
functionalSpecMarkdown:
${JSON.stringify(req.functionalSpecMarkdown)}

mappingRows:
${JSON.stringify(req.mappingRows, null, 2)}

spec:
${JSON.stringify(req.spec, null, 2)}
`;

  const result = await openai.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: "system",
        content:
          "You are an SAP ABAP developer. Always respond with a single valid JSON object only.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const text = result.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const parsed = JSON.parse(cleaned) as Partial<CodeGenerationResult>;
  if (typeof parsed.generatedCode !== "string") {
    throw new Error("Invalid code generation response shape");
  }

  return { generatedCode: parsed.generatedCode };
}

