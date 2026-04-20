"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  GridDefinition,
  LayoutEditorMode,
  LayoutPattern,
  LayoutPlacementNode,
  ScreenLayout,
  SearchConditionRow,
} from "@/types/spec";

type WireframeContext = {
  layoutMode: LayoutEditorMode;
  classic: Pick<ScreenLayout, "pattern" | "splitDirection" | "areas">;
  areaSubtrees?: ScreenLayout["areaSubtrees"];
  searchConditions: SearchConditionRow[];
  viewCount?: number;
  viewSwitchLabel?: string;
};

type Props = {
  tree: LayoutPlacementNode;
  grids: GridDefinition[];
  /** 클래식일 때 패턴·조회조건 기반(단일=모드 전환, 분할=2컷). 자유 배치는 트리 사용. */
  wireframeContext?: WireframeContext;
};

function gname(grids: GridDefinition[], gridId: string): string {
  if (!gridId.trim()) return "빈 칸";
  return grids.find((g) => g.id === gridId)?.name ?? "(미연결)";
}

/** 조회조건 중 라디오+결과영향 → 모드 라벨 후보(영역 순서와 매칭) */
function radioModeLabels(searchConditions: SearchConditionRow[]): string[] {
  return searchConditions
    .filter((r) => r.inputMode === "radio" && r.affectsResult)
    .map((r) => {
      const t = (r.label ?? "").trim();
      return t || (r.fieldId ?? "").trim() || "선택";
    });
}

type Slot = {
  areaId: "A" | "B" | "C";
  gridId: string;
  subtree?: LayoutPlacementNode;
};

function slotsFromAreas(
  areas: ScreenLayout["areas"],
  areaSubtrees?: ScreenLayout["areaSubtrees"],
): Slot[] {
  return (["A", "B", "C"] as const).map((id) => {
    const a = areas.find((x) => x.id === id);
    return {
      areaId: id,
      gridId: a?.gridId?.trim() ?? "",
      subtree: areaSubtrees?.[id],
    };
  });
}

/** 단일: 한 번에 하나의 Grid만 표시(조회 라디오·영역과 연계 스케치) */
function ClassicSinglePreview({
  grids,
  areas,
  areaSubtrees,
  searchConditions,
  viewCount,
  viewSwitchLabel,
}: {
  grids: GridDefinition[];
  areas: ScreenLayout["areas"];
  areaSubtrees?: ScreenLayout["areaSubtrees"];
  searchConditions: SearchConditionRow[];
  viewCount?: number;
  viewSwitchLabel?: string;
}) {
  const count = Math.max(1, Math.min(6, Math.trunc(viewCount ?? 3)));
  const allowed = (["A", "B", "C", "D", "E", "F"] as const).slice(0, count);
  const slots = slotsFromAreas(areas, areaSubtrees)
    .filter((s) => allowed.includes(s.areaId))
    .filter((s) => s.gridId);
  const [active, setActive] = React.useState(0);
  const slotSig = slots.map((s) => `${s.areaId}:${s.gridId}`).join("|");
  React.useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, slots.length - 1)));
  }, [slotSig, slots.length]);

  const modeLabels = radioModeLabels(searchConditions);
  const hasRadioHints = modeLabels.length > 0;

  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-[11px] text-muted-foreground">
        영역 A/B/C에 Grid를 연결하면, 단일 화면에서는 그중 하나만 보이는 스케치가
        나옵니다.
      </p>
    );
  }

  if (slots.length === 1) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">
          단일 화면 — 현재 연결된 Grid 한 개만 표시되는 형태입니다.
        </p>
        {slots[0].subtree ? (
          <NodeView node={slots[0].subtree} grids={grids} />
        ) : (
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-primary/35 bg-primary/[0.06] px-2 py-4 text-center text-[11px] font-medium">
            {gname(grids, slots[0].gridId)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-snug text-muted-foreground">
        단일 화면(모드 전환) — 실제 실행 시에는 아래 중{" "}
        <span className="font-medium text-foreground">하나</span>만 화면에
        보입니다.
        {viewSwitchLabel?.trim()
          ? ` 조회조건 「${viewSwitchLabel.trim()}」 선택값으로 화면 A/B/C 전환을 연결하는 방식이 흔합니다.`
          : hasRadioHints
          ? " 조회조건에서 「선택값에 따라 결과가 달라짐」이 켜진 라디오 항목과 순서를 맞추면 이해하기 쉽습니다."
          : " 조회조건에 라디오(결과 영향)가 있으면 스케치 라벨로 쓸 수 있습니다."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {slots.map((s, idx) => {
          const labelFromRadio = modeLabels[idx];
          const caption =
            labelFromRadio ??
            `영역 ${s.areaId} · ${gname(grids, s.gridId)}`;
          const selected = active === idx;
          return (
            <button
              key={s.areaId}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-left text-[10px] leading-tight transition-colors",
                selected
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
              )}
            >
              {labelFromRadio ? (
                <>
                  <span className="text-muted-foreground">선택 시 · </span>
                  {labelFromRadio}
                  <span className="mt-0.5 block font-normal text-foreground">
                    → {gname(grids, s.gridId)}
                  </span>
                </>
              ) : (
                <>
                  영역 {s.areaId}
                  <span className="mt-0.5 block text-foreground">
                    {gname(grids, s.gridId)}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
          현재 화면(스케치)
        </p>
        {slots[active].subtree ? (
          <NodeView node={slots[active].subtree} grids={grids} />
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-primary/35 bg-primary/[0.06] px-3 py-6 text-center text-[12px] font-medium leading-snug">
            {gname(grids, slots[active].gridId)}
          </div>
        )}
      </div>
    </div>
  );
}

// 바깥 분할 패턴은 더 이상 사용하지 않습니다(영역 내부 분할로 통일).

/** 트리 상의 tabs: 한 번에 하나만 (스크롤에 쌓이지 않음) */
function TabsAsSwitcher({
  node,
  grids,
}: {
  node: Extract<LayoutPlacementNode, { kind: "tabs" }>;
  grids: GridDefinition[];
}) {
  const valid = Math.max(1, node.children.length);
  const [active, setActive] = React.useState(0);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        탭/모드 전환 — 화면에는 아래 중 하나만 표시됩니다.
      </p>
      <div className="flex flex-wrap gap-1">
        {node.children.map((ch, i) => (
          <button
            key={ch.nodeId}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded border px-2 py-1 text-[10px] transition-colors",
              active === i
                ? "border-primary bg-primary/10 font-medium"
                : "border-border bg-background text-muted-foreground hover:bg-muted/40",
            )}
          >
            슬롯 {i + 1}
          </button>
        ))}
      </div>
      <div className="min-h-[100px] rounded-lg border border-border/80 bg-muted/15 p-2">
        <NodeView node={node.children[active]!} grids={grids} />
      </div>
    </div>
  );
}

function NodeView({
  node,
  grids,
}: {
  node: LayoutPlacementNode;
  grids: GridDefinition[];
}) {
  if (node.kind === "grid") {
    return (
      <div className="flex min-h-[76px] w-full min-w-[96px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-primary/35 bg-primary/[0.06] px-2 py-3 text-center text-[11px] font-medium leading-snug text-foreground">
        {gname(grids, node.gridId)}
      </div>
    );
  }
  if (node.kind === "split") {
    const vert = node.direction === "vertical";
    return (
      <div
        className={cn(
          "flex min-h-[88px] gap-2 rounded-lg border border-border/90 bg-muted/25 p-2",
          vert ? "flex-row" : "flex-col",
        )}
      >
        {node.children.map((ch) => (
          <div key={ch.nodeId} className="min-h-[72px] min-w-0 flex-1">
            <NodeView node={ch} grids={grids} />
          </div>
        ))}
      </div>
    );
  }
  return <TabsAsSwitcher node={node} grids={grids} />;
}

export function LayoutWireframePreview({
  tree,
  grids,
  wireframeContext,
}: Props) {
  const ctx = wireframeContext;
  const classic =
    ctx && (ctx.layoutMode ?? "classic") === "classic" ? ctx.classic : null;

  let body: React.ReactNode;

  if (classic) {
    const pat: LayoutPattern = classic.pattern ?? "single";
    body = (
      <ClassicSinglePreview
        grids={grids}
        areas={classic.areas}
        areaSubtrees={ctx!.areaSubtrees}
        searchConditions={ctx!.searchConditions}
        viewCount={ctx!.viewCount}
        viewSwitchLabel={ctx!.viewSwitchLabel}
      />
    );
  } else {
    body = <NodeView node={tree} grids={grids} />;
  }

  return (
    <div className="max-h-[min(360px,50vh)] overflow-auto rounded-lg border border-border/60 bg-background/80 p-3">
      {body}
    </div>
  );
}
