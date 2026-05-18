"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CrudSettings, GridDefinition, ScreenLayout } from "@/types/spec";

type Props = {
  crud: CrudSettings;
  setCrud: React.Dispatch<React.SetStateAction<CrudSettings>>;
  layout: ScreenLayout;
  grids: GridDefinition[];
};

export function CrudStepPanel({ crud, setCrud, layout: _layout, grids }: Props) {
  const targets = crud.targets ?? {};
  const selectedIds = React.useMemo(() => Object.keys(targets), [targets]);
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasTargets = selectedIds.length > 0;

  const ensureTarget = React.useCallback((gridId: string) => {
    setCrud((prev) => {
      if (prev.targets?.[gridId]) return prev;
      return {
        ...prev,
        targets: {
          ...(prev.targets ?? {}),
          [gridId]: {
            rowAdd: true,
            rowDelete: true,
            cellEdit: true,
            multiProcess: true,
            saveTarget: true,
            dbCreate: true,
            dbUpdate: true,
            dbDelete: false,
          },
        },
      };
    });
  }, [setCrud]);

  const removeTarget = React.useCallback((gridId: string) => {
    setCrud((prev) => {
      if (!prev.targets?.[gridId]) return prev;
      const next = { ...(prev.targets ?? {}) };
      delete next[gridId];
      return { ...prev, targets: next };
    });
  }, [setCrud]);

  const patchTarget = React.useCallback(
    (gridId: string, patch: Partial<(CrudSettings["targets"][string])>) => {
      setCrud((prev) => {
        const cur = prev.targets?.[gridId];
        if (!cur) return prev;
        return {
          ...prev,
          targets: {
            ...(prev.targets ?? {}),
            [gridId]: { ...cur, ...patch },
          },
        };
      });
    },
    [setCrud],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>CRUD 설정 (3.4-B · CRUD형 전용)</CardTitle>
        <CardDescription>
          CRUD형일 때만, 실제로 수정이 발생하는{" "}
          <span className="font-medium text-foreground">수정 대상 ALV Grid</span>
          를 고르고 해당 Grid에 허용할 입력/저장/DB반영 범위를 지정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Grid의 표시 구조(필드/동작)와 화면 배치는 「Grid 목록/화면 구성」에서,
            CRUD 단계에서는 “수정 대상 Grid”와 “수정 기능 범위”만 다룹니다.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            1) 수정 대상 ALV Grid
          </h3>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                CRUD가 필요한 Grid를 선택하고, 선택된 Grid마다 옵션을 다르게 설정할 수 있습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() =>
                  setCrud((c) => {
                    const allSelected = Object.keys(c.targets ?? {}).length === grids.length;
                    if (allSelected) return { ...c, targets: {} };
                    const next: CrudSettings["targets"] = { ...(c.targets ?? {}) };
                    for (const g of grids) {
                      if (next[g.id]) continue;
                      next[g.id] = {
                        rowAdd: true,
                        rowDelete: true,
                        cellEdit: true,
                        multiProcess: true,
                        saveTarget: true,
                        dbCreate: true,
                        dbUpdate: true,
                        dbDelete: false,
                      };
                    }
                    return { ...c, targets: next };
                  })
                }
                disabled={grids.length === 0}
              >
                {selectedIds.length === grids.length ? "전체 해제" : "전체 선택"}
              </Button>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 sm:max-w-xl">
              {grids.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Grid가 없습니다. 먼저 「Grid 목록」에서 Grid를 추가하세요.
                </p>
              ) : (
                grids.map((g) => {
                  const on = selectedSet.has(g.id);
                  return (
                    <div key={g.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`crud-target-${g.id}`}
                        checked={on}
                        onCheckedChange={(c) => {
                          if (c) ensureTarget(g.id);
                          else removeTarget(g.id);
                        }}
                      />
                      <Label
                        htmlFor={`crud-target-${g.id}`}
                        className="font-normal"
                      >
                        {g.name}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <Separator />

        <section className={`space-y-3 ${!hasTargets ? "opacity-60" : ""}`}>
          <h3 className="text-sm font-semibold text-foreground">
            2) Grid별 CRUD 옵션
          </h3>

          {!hasTargets ? (
            <p className="text-xs text-muted-foreground">
              먼저 위에서 CRUD가 필요한 Grid를 선택하세요.
            </p>
          ) : (
            <div className="space-y-4">
              {grids
                .filter((g) => selectedSet.has(g.id))
                .map((g) => {
                  const cfg = targets[g.id];
                  const saveOn = Boolean(cfg?.saveTarget);
                  return (
                    <div key={g.id} className="rounded-lg border bg-muted/10 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {g.name}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => removeTarget(g.id)}
                        >
                          대상에서 제외
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-2">
                          <p className="text-xs font-medium text-foreground">
                            수정 기능 (Grid UI)
                          </p>
                          <div className="flex flex-wrap gap-6">
                            {(
                              [
                                ["rowAdd", "행 추가"],
                                ["rowDelete", "행 삭제"],
                                ["cellEdit", "셀 수정"],
                                ["multiProcess", "다건 처리"],
                              ] as const
                            ).map(([key, label]) => (
                              <div key={key} className="flex items-center gap-2">
                                <Checkbox
                                  id={`crud-${g.id}-ui-${key}`}
                                  checked={Boolean((cfg as any)?.[key])}
                                  onCheckedChange={(c) =>
                                    patchTarget(g.id, { [key]: Boolean(c) } as any)
                                  }
                                />
                                <Label
                                  htmlFor={`crud-${g.id}-ui-${key}`}
                                  className="font-normal"
                                >
                                  {label}
                                </Label>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`crud-${g.id}-saveTarget`}
                                checked={saveOn}
                                onCheckedChange={(c) =>
                                  patchTarget(g.id, { saveTarget: Boolean(c) })
                                }
                              />
                              <Label
                                htmlFor={`crud-${g.id}-saveTarget`}
                                className="font-normal"
                              >
                                저장 대상 여부
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <p className="text-xs font-medium text-foreground">
                            DB 반영 작업
                          </p>
                          <div className="flex flex-wrap gap-6">
                            {(
                              [
                                ["dbCreate", "신규(INSERT)"],
                                ["dbUpdate", "수정(UPDATE/MODIFY)"],
                                ["dbDelete", "삭제(DELETE)"],
                              ] as const
                            ).map(([key, label]) => (
                              <div key={key} className="flex items-center gap-2">
                                <Checkbox
                                  id={`crud-${g.id}-db-${key}`}
                                  disabled={!saveOn}
                                  checked={Boolean((cfg as any)?.[key])}
                                  onCheckedChange={(c) =>
                                    patchTarget(g.id, { [key]: Boolean(c) } as any)
                                  }
                                />
                                <Label
                                  htmlFor={`crud-${g.id}-db-${key}`}
                                  className="font-normal"
                                >
                                  {label}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {!saveOn && (
                            <p className="text-xs text-muted-foreground">
                              「저장 대상 여부」가 꺼져 있으면 DB 반영 작업은 비활성화됩니다.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
