"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/spec-helpers";
import {
  INTERACTION_TRIGGER_LABELS,
  INTERACTION_TRIGGER_ORDER,
} from "@/lib/screen-flow";
import type { GridDefinition, InteractionTrigger, ScreenFlowRow } from "@/types/spec";

type Props = {
  /** 이 Grid에만 속하는 흐름으로 편집합니다 (`sourceGridId` 고정). */
  gridId: string;
  gridName: string;
  /** 연동 대상 선택용(다른 Grid 이름). */
  grids: GridDefinition[];
  screenFlows: ScreenFlowRow[];
  setScreenFlows: React.Dispatch<React.SetStateAction<ScreenFlowRow[]>>;
};

function emptyRow(gridId: string): ScreenFlowRow {
  return {
    id: newId(),
    summary: "",
    sourceGridId: gridId,
    sourceUi: "alv_list",
    trigger: "double_click",
    actionDescription: "",
    triggers: [],
  };
}

/**
 * Grid 세부 전용: 더블클릭·핫스팟 등 → T-code / 팝업 등 목표만 정합니다.
 * (출발 Grid는 이 블록으로 고정, 별도 선택 없음.)
 */
export function ScreenFlowForGridBlock({
  gridId,
  gridName,
  grids,
  screenFlows,
  setScreenFlows,
}: Props) {
  const peerTargets = React.useMemo(
    () => grids.filter((g) => g.id !== gridId),
    [grids, gridId],
  );
  const rows = React.useMemo(
    () => screenFlows.filter((r) => r.sourceGridId === gridId),
    [screenFlows, gridId],
  );

  const patchRow = React.useCallback(
    (id: string, patch: Partial<ScreenFlowRow>) => {
      setScreenFlows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, ...patch, sourceGridId: gridId }
            : r,
        ),
      );
    },
    [setScreenFlows, gridId],
  );

  const setTrigger = React.useCallback(
    (id: string, t: InteractionTrigger) => {
      patchRow(id, { trigger: t, triggers: [t] });
    },
    [patchRow],
  );

  const addRow = React.useCallback(() => {
    setScreenFlows((prev) => [...prev, emptyRow(gridId)]);
  }, [setScreenFlows, gridId]);

  const removeRow = React.useCallback(
    (id: string) => {
      setScreenFlows((prev) => prev.filter((r) => r.id !== id));
    },
    [setScreenFlows],
  );

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            이벤트/동작 (Grid에서 무엇을 할지)
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">{gridName}</span> ALV에서
            어떤 동작을 하고 싶은지 먼저 고른 뒤, 필요한 입력만 채웁니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={addRow}
        >
          <Plus className="mr-1 size-4" />
          이벤트 추가
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          해당 없으면 그대로 두세요.
        </p>
      ) : null}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border border-border/80 bg-muted/10 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                이벤트 #{idx + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="mr-1 size-3.5" />
                삭제
              </Button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">한 줄 요약</Label>
                <Input
                  value={row.summary}
                  onChange={(e) => patchRow(row.id, { summary: e.target.value })}
                  placeholder="예: 이력 행 더블클릭 → 전표 조회"
                  className="h-9"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">트리거</Label>
                  <Select
                    value={(row.trigger ?? row.triggers?.[0] ?? "single_click") as string}
                    onValueChange={(v) =>
                      setTrigger(row.id, v as InteractionTrigger)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERACTION_TRIGGER_ORDER.map((t) => (
                        <SelectItem key={t} value={t}>
                          {INTERACTION_TRIGGER_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">
                    동작 서술 (사용자가 직접 입력)
                  </Label>
                  <Textarea
                    value={row.actionDescription ?? ""}
                    onChange={(e) =>
                      patchRow(row.id, { actionDescription: e.target.value })
                    }
                    rows={2}
                    placeholder="예: 선택 행 기준으로 상세 팝업 표시 (키: EBELN/EBELP), 또는 선택행 다건 처리 후 저장"
                    className="min-h-[52px] resize-y text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">비고 (선택)</Label>
                <Textarea
                  value={row.notes ?? ""}
                  onChange={(e) =>
                    patchRow(row.id, {
                      notes: e.target.value || undefined,
                    })
                  }
                  rows={2}
                  placeholder="파라미터, 권한 등"
                  className="min-h-[52px] resize-y text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
