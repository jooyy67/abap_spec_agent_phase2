import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Include/BLOCK 단위 규칙 문서 기본 로드 순서 (F01_rule.md는 F01_01~06과 중복). */
const CODEGEN_RULE_FILE_ORDER = [
  "TOP_rule.md",
  "S01_rule.md",
  "C01_rule.md",
  "O01_rule.md",
  "I01_rule.md",
  "F01_01_rule.md",
  "F01_02_rule.md",
  "F01_03_DB_rule.md",
  "F01_04_data_rule.md",
  "F01_05_alv_rule.md",
  "F01_06_DB_save_msg_rule.md",
] as const;

const EXCLUDED_RULE_FILES = new Set(["F01_rule.md"]);

export type CodegenRuleFile = {
  fileName: string;
  includeId: string;
  markdown: string;
};

export type CodegenRulesBundle = {
  rules: CodegenRuleFile[];
};

function includeIdFromRuleFileName(fileName: string): string {
  if (fileName === "TOP_rule.md") return "TOP";
  if (fileName === "S01_rule.md") return "S01";
  if (fileName === "C01_rule.md") return "C01";
  if (fileName === "O01_rule.md") return "O01";
  if (fileName === "I01_rule.md") return "I01";
  if (fileName.startsWith("F01_")) {
    const match = /^F01_\d{2}/.exec(fileName);
    if (match) return match[0];
  }
  return fileName.replace(/_rule\.md$/i, "");
}

function sortCodegenRuleFileNames(fileNames: string[]): string[] {
  const order = new Map<string, number>(
    CODEGEN_RULE_FILE_ORDER.map((fileName, index) => [fileName, index]),
  );

  return [...fileNames].sort((left, right) => {
    const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.localeCompare(right);
  });
}

async function listCodegenRuleFileNames(base: string): Promise<string[]> {
  try {
    const entries = await readdir(base);
    return sortCodegenRuleFileNames(
      entries.filter(
        (name) =>
          name.toLowerCase().endsWith("_rule.md") &&
          !EXCLUDED_RULE_FILES.has(name),
      ),
    );
  } catch {
    return [...CODEGEN_RULE_FILE_ORDER];
  }
}

export async function loadCodegenRules(): Promise<CodegenRulesBundle> {
  const base = path.join(process.cwd(), "public", "rules");
  const rules: CodegenRuleFile[] = [];

  for (const fileName of await listCodegenRuleFileNames(base)) {
    try {
      const markdown = (await readFile(path.join(base, fileName), "utf8")).trim();
      if (!markdown) continue;
      rules.push({
        fileName,
        includeId: includeIdFromRuleFileName(fileName),
        markdown,
      });
    } catch {
      // optional rule file
    }
  }

  return { rules };
}

export function buildCodegenRulesPrompt(bundle: CodegenRulesBundle): string {
  if (bundle.rules.length === 0) {
    return "(public/rules 규칙 문서 없음)";
  }

  const sections = bundle.rules.map(
    (rule) => `### ${rule.includeId} — ${rule.fileName}
${rule.markdown}`,
  );

  return `## Include / BLOCK 코드 작성 규칙 (public/rules)

각 문서는 [BLOCK: ...] 단위로 purpose, use_when, output, 작성 규칙을 정의합니다.
TPL 본문과 Include Mapping을 적용할 때 아래 규칙을 함께 따릅니다.

${sections.join("\n\n---\n\n")}`;
}
