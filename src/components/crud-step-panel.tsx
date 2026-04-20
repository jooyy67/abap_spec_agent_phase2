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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrudSettings, GridDefinition, ScreenLayout } from "@/types/spec";

type Props = {
  crud: CrudSettings;
  setCrud: React.Dispatch<React.SetStateAction<CrudSettings>>;
  layout: ScreenLayout;
  grids: GridDefinition[];
};

export function CrudStepPanel({ crud, setCrud, layout: _layout, grids }: Props) {
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
          <div className="grid gap-2 sm:max-w-sm">
            <Select
              value={crud.targetGridId ?? ""}
              onValueChange={(v) =>
                setCrud((c) => ({ ...c, targetGridId: v ?? "" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="수정 대상 Grid 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Grid</SelectLabel>
                  {grids.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              선택한 Grid에 대해서만 아래 수정 기능이 적용됩니다.
            </p>
          </div>
        </section>

        <Separator />

        <section
          className={`space-y-3 ${!(crud.targetGridId ?? "").trim() ? "opacity-60" : ""}`}
        >
          <h3 className="text-sm font-semibold text-foreground">
            2) 수정 기능 (Grid UI)
          </h3>
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
                  id={`crud-ui-${key}`}
                  disabled={!(crud.targetGridId ?? "").trim()}
                  checked={crud[key]}
                  onCheckedChange={(c) =>
                    setCrud((crd) => ({ ...crd, [key]: Boolean(c) }))
                  }
                />
                <Label htmlFor={`crud-ui-${key}`} className="font-normal">
                  {label}
                </Label>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Checkbox
                id="crud-saveTarget"
                disabled={!(crud.targetGridId ?? "").trim()}
                checked={crud.saveTarget}
                onCheckedChange={(c) =>
                  setCrud((crd) => ({ ...crd, saveTarget: Boolean(c) }))
                }
              />
              <Label htmlFor="crud-saveTarget" className="font-normal">
                저장 대상 여부
              </Label>
            </div>
          </div>
        </section>

        <Separator />

        <section
          className={`space-y-3 ${!(crud.targetGridId ?? "").trim() ? "opacity-60" : ""}`}
        >
          <h3 className="text-sm font-semibold text-foreground">
            3) DB 반영 작업
          </h3>
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
                  id={`crud-db-${key}`}
                  disabled={!(crud.targetGridId ?? "").trim() || !crud.saveTarget}
                  checked={crud[key]}
                  onCheckedChange={(c) =>
                    setCrud((crd) => ({ ...crd, [key]: Boolean(c) }))
                  }
                />
                <Label htmlFor={`crud-db-${key}`} className="font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
          {!crud.saveTarget && (
            <p className="text-xs text-muted-foreground">
              「저장 대상 여부」가 꺼져 있으면 DB 반영 작업은 비활성화됩니다.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
