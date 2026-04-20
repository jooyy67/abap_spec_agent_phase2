import type { MappingSheetRow } from "@/types/fs-mapping";
import type { SpecFormState } from "@/types/spec";

export type CodeGenerationRequest = {
  spec: SpecFormState;
  functionalSpecMarkdown: string;
  mappingRows: Omit<MappingSheetRow, "id">[];
};

export type CodeGenerationResult = {
  generatedCode: string;
};

