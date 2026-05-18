import type { MappingSheetRow } from "@/types/fs-mapping";
import type { SpecFormState } from "@/types/spec";

/** SAP GUI 구문·활성화 오류 캡처(선택). data는 순수 Base64(URL prefix 없음). */
export type SapErrorScreenshotPayload = {
  mimeType: string;
  data: string;
};

export type CodeGenerationRequest = {
  spec: SpecFormState;
  functionalSpecMarkdown: string;
  mappingRows: Omit<MappingSheetRow, "id">[];
  /** 3단계에서 생성·편집한 ABAP 전체. 오류 반영 재생성 시 필수. */
  previousGeneratedCode?: string;
  /** 사용자가 SAP에서 복사한 오류 목록(텍스트). */
  sapActivationErrorLog?: string;
  /** SAP 오류 화면 스크린샷(선택). */
  sapErrorScreenshot?: SapErrorScreenshotPayload | null;
};

export type CodeGenerationResult = {
  generatedCode: string;
};

