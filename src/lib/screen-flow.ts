import type {
  InteractionTrigger,
  ScreenFlowRow,
  ScreenFlowSourceUi,
  ScreenFlowTargetKind,
} from "@/types/spec";

export const SCREEN_FLOW_ACTION_TYPE_LABELS: Record<
  NonNullable<ScreenFlowRow["actionType"]>,
  string
> = {
  row_field_click: "행/필드 클릭",
  toolbar_button: "툴바 버튼",
  multi_select: "다중 선택 처리",
  grid_linkage: "Grid 연동",
  other: "기타",
};

/** UI 나열 순서 */
export const INTERACTION_TRIGGER_ORDER: InteractionTrigger[] = [
  "double_click",
  "single_click",
  "hotspot",
  "pushbutton",
  "toolbar",
  "menu_fcode",
  "keyboard",
  "other",
];

export const INTERACTION_TRIGGER_LABELS: Record<InteractionTrigger, string> = {
  double_click: "더블클릭",
  single_click: "싱글클릭",
  hotspot: "핫스팟",
  pushbutton: "푸시버튼",
  toolbar: "툴바",
  menu_fcode: "메뉴/F-code",
  keyboard: "단축키",
  other: "기타",
};

export const SCREEN_FLOW_SOURCE_LABELS: Record<ScreenFlowSourceUi, string> = {
  alv_list: "ALV 리스트",
  report_list: "리스트(리포트)",
  selection_screen: "선택화면",
  dynpro_field: "다이나프로 필드",
  toolbar: "툴바",
  tree: "트리",
  other: "기타",
};

export const SCREEN_FLOW_TARGET_LABELS: Record<ScreenFlowTargetKind, string> = {
  tcode: "T-code 이동",
  same_program_next_screen: "동일 프로그램 다음 화면",
  call_screen_dialog: "CALL SCREEN / 다이얼로그",
  popup_modal: "모달 팝업",
  popup_modeless: "모덜리스 팝업",
  web_dynpro_url: "Web Dynpro·URL",
  refresh_peer_alv: "같은 화면·다른 ALV 갱신(연동)",
  other: "기타",
};

/** FS·매핑 LLM용 한 줄 요약 */
export function normalizeScreenFlows(raw: unknown): ScreenFlowRow[] {
  if (!Array.isArray(raw)) return [];
  const srcKeys = new Set(
    Object.keys(SCREEN_FLOW_SOURCE_LABELS) as ScreenFlowSourceUi[],
  );
  const tgtKeys = new Set(
    Object.keys(SCREEN_FLOW_TARGET_LABELS) as ScreenFlowTargetKind[],
  );
  const trigKeys = new Set(
    Object.keys(INTERACTION_TRIGGER_LABELS) as InteractionTrigger[],
  );
  const out: ScreenFlowRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    const su = o.sourceUi;
    const tk = o.targetKind;
    const triggers = Array.isArray(o.triggers)
      ? (o.triggers as unknown[]).filter(
          (t): t is InteractionTrigger =>
            typeof t === "string" && trigKeys.has(t as InteractionTrigger),
        )
      : undefined;
    const trig = o.trigger;
    const trigger =
      typeof trig === "string" && trigKeys.has(trig as InteractionTrigger)
        ? (trig as InteractionTrigger)
        : triggers?.[0];
    const sgid = o.sourceGridId;
    const tgid = o.targetGridId;
    const at = o.actionType;
    const ad = o.actionDescription;
    out.push({
      id,
      summary: typeof o.summary === "string" ? o.summary : "",
      sourceGridId:
        typeof sgid === "string" && sgid.trim() ? sgid.trim() : undefined,
      targetGridId:
        typeof tgid === "string" && tgid.trim() ? tgid.trim() : undefined,
      actionType:
        at === "row_field_click" ||
        at === "toolbar_button" ||
        at === "multi_select" ||
        at === "grid_linkage" ||
        at === "other"
          ? at
          : undefined,
      actionDescription:
        typeof ad === "string" && ad.trim() ? ad : undefined,
      sourceUi:
        typeof su === "string" && srcKeys.has(su as ScreenFlowSourceUi)
          ? (su as ScreenFlowSourceUi)
          : "other",
      targetKind:
        typeof tk === "string" && tgtKeys.has(tk as ScreenFlowTargetKind)
          ? (tk as ScreenFlowTargetKind)
          : "other",
      targetDetail:
        typeof o.targetDetail === "string" ? o.targetDetail : "",
      condition:
        typeof o.condition === "string" ? o.condition : "",
      trigger,
      triggers,
      notes: typeof o.notes === "string" ? o.notes : undefined,
    });
  }
  return out;
}

export function summarizeScreenFlowsForFs(
  rows: ScreenFlowRow[],
  gridNames?: Map<string, string>,
): string {
  if (!rows.length) return "(화면 전환·팝업 행 없음)";
  return rows
    .map((r, i) => {
      const trKey = r.trigger ?? r.triggers?.[0];
      const tr = trKey ? (INTERACTION_TRIGGER_LABELS[trKey] ?? trKey) : "";
      const gridPart =
        r.sourceGridId && gridNames?.has(r.sourceGridId)
          ? `관련Grid=${gridNames.get(r.sourceGridId)}`
          : r.sourceGridId
            ? `관련GridId=${r.sourceGridId}`
            : null;
      const targetGridPart =
        r.targetGridId && gridNames?.has(r.targetGridId)
          ? `갱신대상Grid=${gridNames.get(r.targetGridId)}`
          : r.targetGridId
            ? `갱신대상GridId=${r.targetGridId}`
            : null;
      const actionTypePart =
        r.actionType && SCREEN_FLOW_ACTION_TYPE_LABELS[r.actionType]
          ? `동작유형=${SCREEN_FLOW_ACTION_TYPE_LABELS[r.actionType]}`
          : null;
      const actionDescPart =
        r.actionDescription?.trim()
          ? `동작서술=${r.actionDescription.trim()}`
          : null;
      const parts = [
        `${i + 1}) ${r.summary || "(제목 없음)"}`,
        gridPart,
        targetGridPart,
        actionTypePart,
        `출발=${SCREEN_FLOW_SOURCE_LABELS[r.sourceUi] ?? r.sourceUi}`,
        actionDescPart ??
          `동작=${SCREEN_FLOW_TARGET_LABELS[r.targetKind ?? "other"] ?? (r.targetKind ?? "other")}`,
        r.targetDetail?.trim() ? `상세=${r.targetDetail.trim()}` : null,
        r.condition?.trim() ? `조건=${r.condition.trim()}` : null,
        tr ? `트리거=${tr}` : null,
        r.notes?.trim() ? `비고=${r.notes.trim()}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}
