/** 앱 상단 파이프라인 탭 */
export type PipelinePhase = "input" | "fs-mapping" | "code";

/** 프로그램 유형 */
export type ProgramKind = "inquiry" | "crud";

/** 조회조건 입력 방식 */
export type SearchInputMode =
  | "single"
  | "range"
  | "radio"
  | "list"
  | "checkbox";

/** 업로드 이미지 용도 — 레이아웃 참조는 UI 구조만, DDIC는 테이블·필드 추출 */
export type UploadPurpose = "ddic_table" | "layout_reference";

/** SAP 모듈(업무 구분) */
export const BUSINESS_MODULES = [
  "SD",
  "PS",
  "PP",
  "MM",
  "LE",
  "QM",
  "FI",
  "CO",
  "HR",
  "기타",
] as const;
export type BusinessModuleCode = (typeof BUSINESS_MODULES)[number];

/** Step 1 기본 정보 */
export interface BasicInfo {
  programName: string;
  requestDept: string;
  requester: string;
  /** 업무 구분(모듈). 기타 선택 시 businessCategoryOther 사용 */
  businessModule: BusinessModuleCode;
  /** businessModule이 기타일 때 직접 입력 */
  businessCategoryOther: string;
  authScope: string;
  problem: string;
  improvement: string;
  expectedEffect: string;
  remarks: string;
  /** 분석 시 Grid 초안·화면 구조에 반영할 추가 요구 (그리드 개수, 마스터-디테일, 필수 컬럼 등) */
  screenGridRequirements: string;
}

/** 업로드 파일 (클라이언트 상태) */
export interface UploadedFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  /** 분석 요청 시 전송 */
  base64: string;
  purpose: UploadPurpose;
}

/** 조회조건 행 */
export interface SearchConditionRow {
  id: string;
  label: string;
  fieldId: string;
  /** 소속 테이블 */
  tableName: string;
  inputMode: SearchInputMode;
  required: boolean;
  /** 라디오/리스트일 때 선택값에 따라 결과가 달라지는지 */
  affectsResult: boolean;
  /** 모드별 결과 테이블·옵션값 설명 등 (FS·개발 참고) */
  notes?: string;
}

/** Grid 클릭/동작 (UI 단순화) */
export type GridClickAction =
  | "none"
  | "tcode"
  | "popup"
  | "same_screen_detail"
  | "grid_linkage"
  | "other";

/**
 * Step 전환·팝업: T-code 이동·화면 전환·팝업 등 (ALV 전용 아님).
 * 트리거는 복수 선택 가능.
 */
export type InteractionTrigger =
  | "double_click"
  | "single_click"
  | "hotspot"
  | "pushbutton"
  | "toolbar"
  | "menu_fcode"
  | "keyboard"
  | "other";

/** 출발 UI — 리스트/선택화면/툴바 등 */
export type ScreenFlowSourceUi =
  | "alv_list"
  | "report_list"
  | "selection_screen"
  | "dynpro_field"
  | "toolbar"
  | "tree"
  | "other";

/** 목표 — T-code, 팝업, 다음 화면 등 */
export type ScreenFlowTargetKind =
  | "tcode"
  | "same_program_next_screen"
  | "call_screen_dialog"
  | "popup_modal"
  | "popup_modeless"
  | "web_dynpro_url"
  /** 같은 화면 내 다른 ALV(예: 상단 행 선택 → 하단 목록 재조회) */
  | "refresh_peer_alv"
  | "other";

export interface ScreenFlowRow {
  id: string;
  /** 한 줄 제목 */
  summary: string;
  /** 어떤 Grid에서 출발하는지(선택). T-code 등을 Grid와 연결할 때 사용 */
  sourceGridId?: string;
  sourceUi: ScreenFlowSourceUi;
  /** 사용자가 무엇을 하고 싶은지(동작 유형) */
  actionType?:
    | "row_field_click"
    | "toolbar_button"
    | "multi_select"
    | "grid_linkage"
    | "other";
  /**
   * 동작 서술(사용자 자유 입력) — 트리거만 선택하고 동작은 글로 적는 간단 UX용.
   * 예: "선택 행 기준으로 전표 팝업 표시(필수 파라미터: BELNR/GJAHR)"
   */
  actionDescription?: string;

  /** legacy: 이전 UI 호환용 */
  targetKind?: ScreenFlowTargetKind;
  /** legacy: 연동·갱신 대상이 되는 다른 Grid id */
  targetGridId?: string;
  /** legacy: T-code, 화면 번호, 프로그램·파라미터 등 */
  targetDetail?: string;
  /** legacy: 전환 조건(언제) */
  condition?: string;
  /**
   * 단일 트리거(간단 UI용).
   * 레거시 `triggers`가 있으면 normalize에서 첫 값을 여기에 복사합니다.
   */
  trigger?: InteractionTrigger;
  /** 레거시: 복수 트리거(이전 UI). 유지 호환용 */
  triggers?: InteractionTrigger[];
  notes?: string;
}

/** ALV·화면에만 있는 컬럼 (DDIC/DB 없음, 예: 아이콘·액션 컬럼) */
export interface AlvVirtualField {
  id: string;
  /** grid.fields 에 넣는 고유 문자열(권장: __ALV.*) */
  fieldKey: string;
  caption: string;
  kind?: "row_selection" | "icon" | "action" | "calculated" | "text" | "other";
}

/** Grid 정의 */
export interface GridDefinition {
  id: string;
  name: string;
  /**
   * legacy: 예전 UI(조회 전용/편집) 호환용.
   * 현재 UI에서는 Grid 정의에서 사용하지 않습니다. (CRUD 설정 단계로 분리)
   */
  readOnly?: boolean;
  /**
   * 업로드·분석(fieldsByTable)에서 고른 테이블(복수).
   * 있으면 이 테이블들의 필드로 columnBindings 후보를 만든다.
   */
  sourceTableNames?: string[];
  /** 주 테이블(JOIN·프로그램 기준, 보통 sourceTableNames[0]) */
  tableName: string;
  /** 표시할 컬럼. 다중 테이블일 때는 "TABLENAME.FIELDNAME" 권장 */
  fields: string[];
  /**
   * Grid의 대표 동작(사용자에게 보여주는 수준). 세부 이벤트/트리거는 screenFlows에서 정의.
   */
  clickAction?: GridClickAction;
  /** legacy: 예전 rowClick 호환용 */
  rowClick?: "none" | "navigate" | "popup" | "drilldown";
  /**
   * 한 ALV에 여러 테이블 컬럼을 올릴 때 후보 풀(체크박스 목록).
   * 있으면 UI는 이 목록에서 표시 필드를 고름.
   */
  columnBindings?: { tableName: string; fieldName: string }[];
  /** DB에 없는 ALV 전용 컬럼 (표시 필드 후보 + fields에 fieldKey로 포함) */
  alvOnlyFields?: AlvVirtualField[];
}

/** 화면 레이아웃 */
export type LayoutPattern = "single" | "split" | "tab";

export type SplitDirection = "horizontal" | "vertical";

/** Step7 자유 배치: Grid·분할·탭을 트리로 표현 (중첩 분할·탭 가능) */
export type LayoutPlacementNode =
  | {
      kind: "grid";
      /** UI 갱신용 안정 id */
      nodeId: string;
      gridId: string;
    }
  | {
      kind: "split";
      nodeId: string;
      direction: SplitDirection;
      children: LayoutPlacementNode[];
    }
  | {
      kind: "tabs";
      nodeId: string;
      children: LayoutPlacementNode[];
    };

/** classic: A/B/C 패턴 UI. custom: placementTree가 배치의 정본 */
export type LayoutEditorMode = "classic" | "custom";

export interface ScreenLayout {
  pattern: LayoutPattern;
  splitDirection: SplitDirection | null;
  areas: {
    id: "A" | "B" | "C" | "D" | "E" | "F";
    gridId: string;
  }[];
  /** 사용할 화면(View) 수: 1~6 (A~F) */
  viewCount?: number;
  /** 조회조건(라디오/리스트) 중 화면 전환에 쓸 항목 id */
  viewSwitchConditionId?: string;
  /**
   * 영역 A/B/C 각각의 내부 배치(단일 Grid 또는 분할·전환).
   * 생략 시 areas[].gridId로 단일 Grid만 있는 것으로 보고 마이그레이션합니다.
   */
  areaSubtrees?: Partial<Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>>;
  /** 생략 시 classic — 기존 저장분 호환 */
  layoutMode?: LayoutEditorMode;
  /** layoutMode가 custom일 때만 사용(레거시 루트 자유 트리) */
  placementTree?: LayoutPlacementNode | null;
}

/** 3.4-B-2 데이터 입력 방식 (신규 추가 선택 시) */
export type CrudInputMode =
  | "excel"
  | "grid_inline"
  | "popup"
  | "new_screen";

/**
 * 3.4-B-3 그리드 제어 — 단일 그리드(연결된 Grid 1개)일 때
 * 화면 구성 Step 7에서 하나의 영역에만 Grid가 연결된 경우
 */
export interface SingleGridCrudControl {
  rowAdd: boolean;
  rowDelete: boolean;
  /** 조회/수정 모드 전환 */
  viewEditModeToggle: boolean;
  multiSelect: boolean;
}

/**
 * 3.4-B-3 다중 그리드 — 영역별 (Step 7의 A=상단·좌 / B=하단·우 등으로 매핑)
 * readOnly=true면 나머지 옵션은 무시(조회 전용)
 */
export interface MultiGridAreaCrudControl {
  readOnly: boolean;
  rowAdd: boolean;
  rowDelete: boolean;
  viewEditModeToggle: boolean;
  /** 하단 그리드에서 특히 쓰는 다건 선택 (상단은 UI에서 비활성 가능) */
  multiSelect: boolean;
}

/** CRUD 설정 (3.4-B CRUD형 전용) */
export interface CrudSettings {
  /** 수정 대상 ALV Grid (CRUD형에서만 의미) */
  targetGridId?: string;

  /** 선택된 Grid에 대해서만 활성화할 입력/수정 기능 */
  rowAdd: boolean;
  rowDelete: boolean;
  cellEdit: boolean;
  multiProcess: boolean;

  /** 저장 대상 여부(저장 로직/DB 반영 대상) */
  saveTarget: boolean;

  /** DB 반영 작업 */
  dbCreate: boolean;
  dbUpdate: boolean;
  dbDelete: boolean;
}

/** Gemini 구조화 응답 */
export interface GeminiAnalysisResult {
  tables: { name: string; description?: string }[];
  fieldsByTable: Record<string, { name: string; type?: string; description?: string }[]>;
  keyCandidates: { table: string; fields: string[]; reason?: string }[];
  joinCandidates: {
    fromTable: string;
    fromField: string;
    toTable: string;
    toField: string;
    reason?: string;
  }[];
  searchConditionDrafts: Omit<SearchConditionRow, "id">[];
  gridDrafts: Omit<GridDefinition, "id">[];
  recommendedStructure: {
    summary: string;
    notes?: string;
    layoutHint?: string;
  };
}

/** 전체 폼 상태 (미리보기용) */
export interface SpecFormState {
  basicInfo: BasicInfo;
  programKind: ProgramKind | null;
  uploads: UploadedFileMeta[];
  geminiRaw: GeminiAnalysisResult | null;
  searchConditions: SearchConditionRow[];
  grids: GridDefinition[];
  layout: ScreenLayout;
  /** 팝업·T-code·화면 전환 등 사용자 흐름 */
  screenFlows: ScreenFlowRow[];
  crud: CrudSettings;
}

export const defaultScreenFlows = (): ScreenFlowRow[] => [];

export const defaultBasicInfo = (): BasicInfo => ({
  programName: "",
  requestDept: "",
  requester: "",
  businessModule: "MM",
  businessCategoryOther: "",
  authScope: "",
  problem: "",
  improvement: "",
  expectedEffect: "",
  remarks: "",
  screenGridRequirements: "",
});

export const defaultScreenLayout = (): ScreenLayout => ({
  pattern: "single",
  splitDirection: "horizontal",
  layoutMode: "classic",
  placementTree: null,
  viewCount: 1,
  viewSwitchConditionId: undefined,
  areaSubtrees: undefined,
  areas: [
    { id: "A", gridId: "" },
    { id: "B", gridId: "" },
    { id: "C", gridId: "" },
    { id: "D", gridId: "" },
    { id: "E", gridId: "" },
    { id: "F", gridId: "" },
  ],
});

export const defaultCrudSettings = (): CrudSettings => ({
  targetGridId: undefined,
  rowAdd: true,
  rowDelete: true,
  cellEdit: true,
  multiProcess: true,
  saveTarget: true,
  dbCreate: true,
  dbUpdate: true,
  dbDelete: false,
});
