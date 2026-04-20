import { newId } from "@/lib/spec-helpers";
import type {
  GridDefinition,
  LayoutPlacementNode,
  ScreenLayout,
  SplitDirection,
} from "@/types/spec";
import { defaultScreenLayout as specDefaultScreenLayout } from "@/types/spec";

const MAX_PLACEMENT_DEPTH = 8;

const AREA_KEYS = ["A", "B", "C", "D", "E", "F"] as const;

/** 전위 순회로 처음 만나는 Grid id(비어 있으면 "") */
export function firstGridIdInTree(
  node: LayoutPlacementNode | undefined | null,
): string {
  if (!node) return "";
  if (node.kind === "grid") return (node.gridId ?? "").trim();
  for (const ch of node.children) {
    const g = firstGridIdInTree(ch);
    if (g) return g;
  }
  return "";
}

/** 영역별 서브트리 병합·누락분 기본 Grid 리프 생성 */
export function ensureAreaSubtreesRecord(
  mergedAreas: ScreenLayout["areas"],
  existing:
    | Partial<
        Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>
      >
    | undefined,
): Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode> {
  const out = {
    ...existing,
  } as Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>;
  for (const id of AREA_KEYS) {
    if (!out[id]) {
      const gid = mergedAreas.find((a) => a.id === id)?.gridId ?? "";
      out[id] = { kind: "grid", nodeId: newId(), gridId: gid };
    }
  }
  return out;
}

/** 한 영역의 서브트리를 바꾸고 areas[].gridId를 첫 Grid에 맞춥니다. */
export function setAreaSubtreeAndSyncAreas(
  layout: ScreenLayout,
  areaId: "A" | "B" | "C" | "D" | "E" | "F",
  subtree: LayoutPlacementNode,
): ScreenLayout {
  const merged = canonicalAreas(layout);
  const nextPartial: Partial<
    Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>
  > = {
    ...layout.areaSubtrees,
    [areaId]: stripPlacementGridContainers(subtree),
  };
  const full = ensureAreaSubtreesRecord(merged, nextPartial);
  const areas = syncAreasFromAreaSubtrees(merged, full);
  return { ...layout, areaSubtrees: full, areas, layoutMode: "classic" };
}

function syncAreasFromAreaSubtrees(
  areas: ScreenLayout["areas"],
  subtrees: Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>,
): ScreenLayout["areas"] {
  return areas.map((area) => {
    const t = subtrees[area.id as "A" | "B" | "C" | "D" | "E" | "F"];
    const gid = t ? firstGridIdInTree(t) : "";
    return { ...area, gridId: gid };
  });
}

export function normalizeScreenLayout(layout: ScreenLayout): ScreenLayout {
  const areas =
    Array.isArray(layout.areas) && layout.areas.length
      ? layout.areas
      : specDefaultScreenLayout().areas;
  const byId = new Map(areas.map((a) => [a.id, a] as const));
  const mergedAreas = (["A", "B", "C", "D", "E", "F"] as const).map((id) => {
    const a = byId.get(id);
    return { id, gridId: a?.gridId ?? "" };
  });
  const placementTree =
    layout.placementTree === undefined || layout.placementTree === null
      ? null
      : stripPlacementGridContainers(layout.placementTree);

  const strippedPartial: Partial<
    Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>
  > = {};
  if (layout.areaSubtrees) {
    for (const id of AREA_KEYS) {
      const raw = layout.areaSubtrees[id];
      if (raw) strippedPartial[id] = stripPlacementGridContainers(raw);
    }
  }
  const fullSubtrees = ensureAreaSubtreesRecord(mergedAreas, strippedPartial);
  const mergedWithSubtrees = syncAreasFromAreaSubtrees(mergedAreas, fullSubtrees);

  const inferredCount = (() => {
    const flags = AREA_KEYS.map((k) => Boolean(firstGridIdInTree(fullSubtrees[k])));
    const last = flags.lastIndexOf(true);
    return last >= 0 ? last + 1 : 1;
  })();

  const rawPat = layout.pattern ?? "single";
  /**
   * 바깥 패턴은 단일(전환)만 사용.
   * 예전 split/tab 저장분은 단일로 통일(영역 내부 분할은 areaSubtrees에서 처리).
   */
  const pattern: ScreenLayout["pattern"] = "single";

  return {
    ...layout,
    pattern,
    splitDirection:
      layout.splitDirection === "vertical" || layout.splitDirection === "horizontal"
        ? layout.splitDirection
        : "horizontal",
    layoutMode: layout.layoutMode === "custom" ? "custom" : "classic",
    placementTree,
    areas: mergedWithSubtrees,
    areaSubtrees: fullSubtrees,
    viewCount:
      typeof layout.viewCount === "number" && Number.isFinite(layout.viewCount)
        ? Math.max(1, Math.min(6, Math.trunc(layout.viewCount)))
        : Math.max(1, Math.min(6, inferredCount)),
    viewSwitchConditionId:
      typeof layout.viewSwitchConditionId === "string" && layout.viewSwitchConditionId.trim()
        ? layout.viewSwitchConditionId
        : undefined,
  };
}

function stripPlacementGridContainers(
  node: LayoutPlacementNode,
): LayoutPlacementNode {
  if (node.kind === "grid") {
    return { kind: "grid", nodeId: node.nodeId, gridId: node.gridId };
  }
  return {
    ...node,
    children: node.children.map(stripPlacementGridContainers),
  };
}

export function createEmptyGridLeaf(): LayoutPlacementNode {
  return { kind: "grid", nodeId: newId(), gridId: "" };
}

export function createSplitNode(
  direction: SplitDirection,
  children: LayoutPlacementNode[],
): LayoutPlacementNode {
  return {
    kind: "split",
    nodeId: newId(),
    direction,
    children: children.length ? children : [createEmptyGridLeaf(), createEmptyGridLeaf()],
  };
}

export function createTabsNode(children: LayoutPlacementNode[]): LayoutPlacementNode {
  return {
    kind: "tabs",
    nodeId: newId(),
    children: children.length ? children : [createEmptyGridLeaf(), createEmptyGridLeaf()],
  };
}

/** 그리드 한 칸을 분할 컨테이너로 바꿈(첫 칸은 기존 그리드, 둘째는 빈 칸) */
export function wrapLeafInSplit(
  leaf: LayoutPlacementNode,
  direction: SplitDirection,
): LayoutPlacementNode {
  if (leaf.kind !== "grid") return leaf;
  return {
    kind: "split",
    nodeId: newId(),
    direction,
    children: [leaf, createEmptyGridLeaf()],
  };
}

/** 한 덩어리를 탭 그룹의 첫 탭으로 넣고 빈 탭을 추가 */
export function wrapInTabsGroup(first: LayoutPlacementNode): LayoutPlacementNode {
  return {
    kind: "tabs",
    nodeId: newId(),
    children: [first, createEmptyGridLeaf()],
  };
}

export function removePlacementNodeSafe(
  root: LayoutPlacementNode,
  nodeId: string,
): LayoutPlacementNode {
  const r = removeNodeById(root, nodeId);
  return r ?? createEmptyGridLeaf();
}

export function removeChildAt(
  node: Extract<LayoutPlacementNode, { kind: "split" | "tabs" }>,
  index: number,
): LayoutPlacementNode {
  const children = node.children.filter((_, i) => i !== index);
  if (children.length === 0) return createEmptyGridLeaf();
  if (children.length === 1) return children[0];
  return { ...node, children };
}

export function appendChildToGroup(
  node: Extract<LayoutPlacementNode, { kind: "split" | "tabs" }>,
  child: LayoutPlacementNode = createEmptyGridLeaf(),
): LayoutPlacementNode {
  return { ...node, children: [...node.children, child] };
}

export function canonicalAreas(layout: ScreenLayout): ScreenLayout["areas"] {
  const byId = new Map(layout.areas.map((a) => [a.id, a]));
  return (["A", "B", "C", "D", "E", "F"] as const).map((id) => ({
    id,
    gridId: byId.get(id)?.gridId ?? "",
  }));
}

/** 편집기용: 영역 서브트리(없으면 areas로부터 생성) */
export function getAreaSubtreeForEditor(
  layout: ScreenLayout,
  areaId: "A" | "B" | "C" | "D" | "E" | "F",
): LayoutPlacementNode {
  const merged = canonicalAreas(layout);
  const full = ensureAreaSubtreesRecord(merged, layout.areaSubtrees);
  return full[areaId];
}

/** 클래식: 화면 A/B/C 각각의 서브트리를 바깥 패턴(단일·분할)으로 조합 */
export function classicToPlacementTree(layout: ScreenLayout): LayoutPlacementNode {
  const merged = canonicalAreas(layout);
  const partial: Partial<
    Record<"A" | "B" | "C" | "D" | "E" | "F", LayoutPlacementNode>
  > = {};
  if (layout.areaSubtrees) {
    for (const id of AREA_KEYS) {
      const raw = layout.areaSubtrees[id];
      if (raw) partial[id] = stripPlacementGridContainers(raw);
    }
  }
  const subtrees = ensureAreaSubtreesRecord(merged, partial);
  const n =
    typeof layout.viewCount === "number" && Number.isFinite(layout.viewCount)
      ? Math.max(1, Math.min(6, Math.trunc(layout.viewCount)))
      : 1;
  const keys = AREA_KEYS.slice(0, n);
  const children = keys.map((k) => subtrees[k]);
  if (children.length === 1) return children[0]!;
  return createTabsNode(children);
}

/** 자유 배치 → 클래식(손실 가능): 전위 순회 첫 3개 그리드만 A/B/C, 패턴 단일 */
export function placementTreeToClassicFallback(tree: LayoutPlacementNode): Pick<
  ScreenLayout,
  "pattern" | "splitDirection" | "areas"
> {
  const ids = collectLeafGridIdsPreOrder(tree).filter(Boolean).slice(0, 3);
  return {
    pattern: "single",
    splitDirection: "horizontal",
    areas: [
      { id: "A", gridId: ids[0] ?? "" },
      { id: "B", gridId: ids[1] ?? "" },
      { id: "C", gridId: ids[2] ?? "" },
    ],
  };
}

export function collectLeafGridIdsPreOrder(node: LayoutPlacementNode): string[] {
  if (node.kind === "grid") {
    return node.gridId ? [node.gridId] : [];
  }
  const out: string[] = [];
  for (const ch of node.children) {
    out.push(...collectLeafGridIdsPreOrder(ch));
  }
  return out;
}

export function collectGridIdsFromPlacementTree(
  node: LayoutPlacementNode | null | undefined,
): Set<string> {
  const s = new Set<string>();
  if (!node) return s;
  const walk = (n: LayoutPlacementNode) => {
    if (n.kind === "grid") {
      if (n.gridId) s.add(n.gridId);
      return;
    }
    for (const ch of n.children) walk(ch);
  };
  walk(node);
  return s;
}

export function placementTreeHasInvalidGridId(
  node: LayoutPlacementNode,
  validIds: Set<string>,
): boolean {
  if (node.kind === "grid") {
    return Boolean(node.gridId && !validIds.has(node.gridId));
  }
  return node.children.some((c) => placementTreeHasInvalidGridId(c, validIds));
}

export function clearInvalidGridIdsInTree(
  node: LayoutPlacementNode,
  validIds: Set<string>,
): LayoutPlacementNode {
  if (node.kind === "grid") {
    if (node.gridId && !validIds.has(node.gridId)) {
      return { ...node, gridId: "" };
    }
    return node;
  }
  const children = node.children.map((c) => clearInvalidGridIdsInTree(c, validIds));
  const same =
    children.length === node.children.length &&
    children.every((c, i) => c === node.children[i]);
  if (same) return node;
  return { ...node, children };
}

export function getEffectivePlacementTree(layout: ScreenLayout): LayoutPlacementNode {
  if (layout.layoutMode === "custom" && layout.placementTree) {
    return layout.placementTree;
  }
  return classicToPlacementTree(layout);
}

export function depthOfPlacementTree(node: LayoutPlacementNode, d = 0): number {
  if (d > MAX_PLACEMENT_DEPTH) return d;
  if (node.kind === "grid") return d;
  let max = d;
  for (const ch of node.children) {
    max = Math.max(max, depthOfPlacementTree(ch, d + 1));
  }
  return max;
}

function gridLabel(grids: GridDefinition[], gridId: string): string {
  if (!gridId) return "(미연결)";
  return grids.find((g) => g.id === gridId)?.name ?? gridId;
}

/** FS/요약용 한글 설명 */
export function summarizePlacementTreeKorean(
  node: LayoutPlacementNode,
  grids: GridDefinition[],
  depth = 0,
): string {
  const pad = "  ".repeat(depth);
  if (node.kind === "grid") {
    return `${pad}- ALV: ${gridLabel(grids, node.gridId)}`;
  }
  if (node.kind === "split") {
    const dir = node.direction === "vertical" ? "좌우 분할" : "상하 분할";
    const lines = [
      `${pad}- ${dir}`,
      ...node.children.map((c) => summarizePlacementTreeKorean(c, grids, depth + 1)),
    ];
    return lines.join("\n");
  }
  const lines = [
    `${pad}- 단일·슬롯 전환(한 화면에 하나)`,
    ...node.children.map((c) => summarizePlacementTreeKorean(c, grids, depth + 1)),
  ];
  return lines.join("\n");
}

/** CRUD 다중 그리드: 트리에서 앞선 두 개의 서로 다른 그리드 id */
export function getFirstTwoDistinctGridIds(
  node: LayoutPlacementNode | null | undefined,
): [string | null, string | null] {
  const ids = node ? collectLeafGridIdsPreOrder(node).filter(Boolean) : [];
  const seen: string[] = [];
  for (const id of ids) {
    if (!seen.includes(id)) seen.push(id);
    if (seen.length >= 2) break;
  }
  return [seen[0] ?? null, seen[1] ?? null];
}

export function replaceNodeById(
  root: LayoutPlacementNode,
  nodeId: string,
  replacement: LayoutPlacementNode,
): LayoutPlacementNode {
  if (root.nodeId === nodeId) return replacement;
  if (root.kind === "grid") return root;
  return {
    ...root,
    children: root.children.map((c) =>
      replaceNodeById(c, nodeId, replacement),
    ),
  };
}

export function removeNodeById(
  root: LayoutPlacementNode,
  nodeId: string,
): LayoutPlacementNode | null {
  if (root.nodeId === nodeId) return null;
  if (root.kind === "grid") return root;
  const nextChildren: LayoutPlacementNode[] = [];
  for (const c of root.children) {
    const r = removeNodeById(c, nodeId);
    if (r) nextChildren.push(r);
  }
  if (root.kind === "split" || root.kind === "tabs") {
    if (nextChildren.length < 2) {
      return nextChildren[0] ?? createEmptyGridLeaf();
    }
    return { ...root, children: nextChildren };
  }
  return root;
}
