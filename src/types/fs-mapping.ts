/** 개발 매핑 입력서 행 (편집 가능) */
export interface MappingSheetRow {
  id: string;
  /** 조회조건 / Grid / 영역 등 */
  area: string;
  /** 화면 항목명 */
  uiLabel: string;
  tableName: string;
  fieldName: string;
  dataElement?: string;
  notes?: string;
}

/** AI 생성 FS + 매핑 (서버 응답) */
export interface FsMappingGenerationResult {
  functionalSpecMarkdown: string;
  /** 템플릿(개발 매핑 입력서) 형식의 문서 마크다운 */
  mappingSpecMarkdown: string;
  mappingRows: Omit<MappingSheetRow, "id">[];
}
