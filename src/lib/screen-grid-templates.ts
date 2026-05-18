import type { SplitDirection } from "@/types/spec";

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
    id: "split-h",
    label: "좌우 2그리드",
    text:
      "좌우 분할: 좌측=(업무A 역할·그리드), 우측=(업무B 역할·그리드). 한 화면에 두 ALV를 동시에 표시한다. 좌우는 독립 조회/입력/수정이며 선택 행 연동(마스터-디테일)은 사용하지 않는다.",
  },
  {
    id: "split-h-master-detail",
    label: "좌우 요약-상세",
    text:
      "좌우 분할: 좌측=요약/목록 그리드, 우측=선택 행의 상세 그리드. 좌측 행 선택 시 우측을 갱신한다. 연결 키 필드: (예: VBELN, POSNR 등).",
  },
  {
    id: "split-v",
    label: "상하 2그리드",
    text:
      "상하 분할: 상단=(업무A 역할·그리드), 하단=(업무B 역할·그리드). 한 화면에 두 ALV를 동시에 표시한다. 상하는 독립 조회/입력/수정이며 선택 행 연동(마스터-디테일)은 사용하지 않는다.",
  },
  {
    id: "split-v-master-detail",
    label: "상하 요약-상세",
    text:
      "상하 분할: 상단=요약/목록(마스터) 그리드, 하단=선택 행의 상세(라인) 그리드. 상단 행 선택 시 하단을 갱신한다. 연결 키 필드: (예: VBELN, POSNR 등).",
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

export type InferredAnalyzeLayout = {
  viewCount: number;
  primaryAreaSplit?: {
    direction: SplitDirection;
    gridCount: number;
  };
};

function requestsHorizontalSplit(text: string): boolean {
  return /좌우|좌측|우측/.test(text);
}

function requestsVerticalSplit(text: string): boolean {
  return /상하|상단|하단/.test(text);
}

function inferViewCountFromHint(layoutHint: string, gridCount: number): number {
  const hint = layoutHint.trim();
  if (!hint) return Math.max(1, Math.min(6, gridCount || 1));

  if (hint.includes("3") || hint.includes("A/B/C") || hint.includes("A,B,C")) {
    return 3;
  }
  if (hint.includes("2") || hint.includes("A/B") || hint.includes("A,B")) {
    return 2;
  }
  if (hint.includes("1")) return 1;
  return Math.max(1, Math.min(6, gridCount || 1));
}

/** 분석 직후 화면 구성 초안: 좌우·상하 2그리드(독립/요약-상세) vs 화면 전환(A/B) 구분 */
export function inferAnalyzeLayoutFromRequirements(args: {
  requirements: string;
  layoutHint: string;
  gridCount: number;
}): InferredAnalyzeLayout {
  const text = `${args.requirements}\n${args.layoutHint}`.trim();
  const gridCount = Math.max(0, args.gridCount);

  if (requestsHorizontalSplit(text)) {
    return {
      viewCount: 1,
      primaryAreaSplit: { direction: "horizontal", gridCount: 2 },
    };
  }

  if (requestsVerticalSplit(text)) {
    return {
      viewCount: 1,
      primaryAreaSplit: { direction: "vertical", gridCount: 2 },
    };
  }

  return {
    viewCount: Math.max(1, Math.min(6, inferViewCountFromHint(args.layoutHint, gridCount))),
  };
}
