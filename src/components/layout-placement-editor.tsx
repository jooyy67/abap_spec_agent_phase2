"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  appendChildToGroup,
  createEmptyGridLeaf,
  depthOfPlacementTree,
  removeChildAt,
  wrapInTabsGroup,
  wrapLeafInSplit,
} from "@/lib/layout-placement";
import type { GridDefinition, LayoutPlacementNode, SplitDirection } from "@/types/spec";

const MAX_UI_DEPTH = 6;

type BlockProps = {
  node: LayoutPlacementNode;
  onChange: (n: LayoutPlacementNode) => void;
  grids: GridDefinition[];
  depth: number;
  isRoot: boolean;
};

function GridLeafBlock({
  node,
  onChange,
  grids,
  depth,
  isRoot,
  onRemove,
}: {
  node: Extract<LayoutPlacementNode, { kind: "grid" }>;
  onChange: (n: LayoutPlacementNode) => void;
  grids: GridDefinition[];
  depth: number;
  isRoot: boolean;
  onRemove?: () => void;
}) {

  const tooDeep = depth >= MAX_UI_DEPTH;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/80 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="shrink-0">
          ALV
        </Badge>
        <Select
          value={node.gridId || "__none__"}
          onValueChange={(v) => {
            const gid = !v || v === "__none__" ? "" : String(v);
            onChange({
              ...node,
              gridId: gid,
            });
          }}
        >
          <SelectTrigger className="min-w-[200px] max-w-[280px]">
            <SelectValue placeholder="Grid 선택">
              {node.gridId
                ? (grids.find((g) => g.id === node.gridId)?.name ?? "다시 선택")
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">(없음)</SelectItem>
            {grids.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isRoot && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onRemove}
            aria-label="이 칸 제거"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      {!tooDeep ? (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(wrapLeafInSplit(node, "horizontal"))}
          >
            이 칸을 상하 분할
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(wrapLeafInSplit(node, "vertical"))}
          >
            이 칸을 좌우 분할
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(wrapInTabsGroup(node))}
          >
            전환(탭)으로 묶기
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          분할 깊이 제한({MAX_UI_DEPTH})에 도달했습니다. 더 복잡한 구조는 요구사항
          텍스트에 보조 기술하세요.
        </p>
      )}
    </div>
  );
}

function SplitOrTabsBlock({
  node,
  onChange,
  grids,
  depth,
  isRoot,
}: Omit<BlockProps, "node"> & {
  node: Extract<LayoutPlacementNode, { kind: "split" | "tabs" }>;
}) {
  const isSplit = node.kind === "split";

  return (
    <div
      className={`space-y-3 rounded-md border border-dashed border-border p-3 ${
        isSplit ? "bg-muted/20" : "bg-muted/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          {isSplit ? "분할 (동시 표시)" : "전환·탭 (한 면만)"}
        </Badge>
        {isSplit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">방향</Label>
            <Select
              value={node.direction}
              onValueChange={(v) =>
                onChange({
                  ...node,
                  direction: v as SplitDirection,
                })
              }
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">상하</SelectItem>
                <SelectItem value="vertical">좌우</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            탭마다 다른 Grid(또는 그 안의 분할) — 실행 시에는 탭 하나 분량만
            보입니다.
          </span>
        )}
        {!isRoot ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => {
              if (node.children.length !== 1) return;
              onChange(node.children[0]);
            }}
            disabled={node.children.length !== 1}
          >
            그룹 해제(자식 1개일 때)
          </Button>
        ) : null}
      </div>
      <div className="space-y-3 border-l-2 border-primary/25 pl-3">
        {node.children.map((ch, i) => (
          <div key={ch.nodeId} className="space-y-2">
            {!isSplit ? (
              <span className="text-[10px] font-medium text-muted-foreground">
                단일 면 {i + 1} (탭)
              </span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">
                {node.direction === "vertical"
                  ? `좌우 분할 · ${i === 0 ? "좌" : "우"}`
                  : `상하 분할 · ${i === 0 ? "상" : "하"}`}
              </span>
            )}
            <PlacementBlock
              node={ch}
              onChange={(next) => {
                const children = [...node.children];
                children[i] = next;
                onChange({ ...node, children });
              }}
              grids={grids}
              depth={depth + 1}
              isRoot={false}
              onRemove={
                node.children.length > 2
                  ? () => onChange(removeChildAt(node, i))
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange(appendChildToGroup(node))}
      >
        {isSplit ? "분할 칸 추가" : "탭 추가"}
      </Button>
    </div>
  );
}

function PlacementBlock(
  props: BlockProps & { onRemove?: () => void },
): React.ReactElement | null {
  const { node, onChange, grids, depth, isRoot, onRemove } = props;

  if (node.kind === "grid") {
    return (
      <GridLeafBlock
        node={node}
        onChange={onChange}
        grids={grids}
        depth={depth}
        isRoot={isRoot}
        onRemove={onRemove}
      />
    );
  }
  return (
    <SplitOrTabsBlock
      node={node}
      onChange={onChange}
      grids={grids}
      depth={depth}
      isRoot={isRoot}
    />
  );
}

type EditorProps = {
  tree: LayoutPlacementNode;
  onChange: (next: LayoutPlacementNode) => void;
  grids: GridDefinition[];
};

export function LayoutPlacementEditor({ tree, onChange, grids }: EditorProps) {
  const d = depthOfPlacementTree(tree);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">이 편집기가 다루는 범위</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            <span className="text-foreground">분할</span>은{" "}
            <strong>같은 화면 면</strong>을 상·하 또는 좌·우로{" "}
            <strong>동시에</strong> 나눈 영역입니다.
          </li>
          <li>
            <span className="text-foreground">탭·전환</span>은 서로 다른
            Grid(각각 하나의 &quot;단일 면&quot;)를{" "}
            <strong>한 번에 하나만</strong> 보이게 바꿀 때 씁니다. 클래식의
            「단일」+ 영역 A/B/C 전환과 같은 류입니다.
          </li>
          <li>
            여러 <em>트랜잭션 화면</em>을 동시에 띄운다는 뜻이 아니라,{" "}
            <strong>한 화면 레이아웃</strong> 안에서 영역을 짓는 스케치입니다.
            복잡한 다중 화면은 요구사항·FS에도 적어 두세요.
          </li>
        </ul>
      </div>
      {d > MAX_UI_DEPTH ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          트리 깊이가 큽니다. 필요 시 상위 분할을 줄이거나 요구사항에 서술을 보완하세요.
        </p>
      ) : null}
      <PlacementBlock
        node={tree}
        onChange={onChange}
        grids={grids}
        depth={0}
        isRoot
      />
    </div>
  );
}
