/** 화면·Grid 요구사항에 한 번에 넣을 수 있는 문장 (분석·FS에 반영) */
export const SCREEN_GRID_QUICK_TEMPLATES: {
  id: string;
  label: string;
  text: string;
}[] = [
  {
    id: "tabs3",
    label: "탭 3개",
    text:
      "화면을 탭 3개로 분리한다. 탭1: (역할), 탭2: (역할), 탭3: (역할). 각 탭에 연결할 그리드/영역을 구분한다.",
  },
  {
    id: "radio-mode",
    label: "라디오 모드",
    text:
      "조회 영역 상단에 라디오(또는 세그먼트)로 모드를 전환한다. 옵션 예: 업무A / 업무B. 선택값에 따라 조회조건·결과 그리드가 달라진다.",
  },
  {
    id: "split-v",
    label: "상하 2그리드",
    text:
      "상하 분할: 상단 그리드=마스터(헤더) 목록, 하단 그리드=선택 행의 디테일(라인). 연결 키 필드: (예: VBELN, POSNR 등).",
  },
  {
    id: "split-h",
    label: "좌우 2그리드",
    text:
      "좌우 분할: 좌측=목록/요약 그리드, 우측=상세 또는 두 번째 그리드. 선택 행 변경 시 우측 갱신.",
  },
  {
    id: "multi-table-alv",
    label: "한 ALV·다중 테이블",
    text:
      "한 개의 ALV 그리드에 테이블 A, B의 컬럼을 함께 표시한다. JOIN/관계: (설명). 표시 우선 컬럼: (나열).",
  },
  {
    id: "screens-n",
    label: "화면 N개 분리",
    text:
      "기능을 별도 화면으로 나눈다. 화면1: (역할), 화면2: (역할), 화면3: (역할). 전환은 메뉴/모드/탭 중 (선호 방식)으로 한다.",
  },
];

export function appendScreenGridLine(current: string, line: string): string {
  const t = current.trim();
  return t ? `${t}\n${line}` : line;
}
