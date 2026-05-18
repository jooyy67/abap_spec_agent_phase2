"use client";

import * as React from "react";
import type { MappingSheetRow } from "@/types/fs-mapping";
import type { SapErrorScreenshotPayload } from "@/types/codegen";
import { newId } from "@/lib/spec-helpers";
import type {
  BasicInfo,
  CrudSettings,
  GeminiAnalysisResult,
  GridDefinition,
  PipelinePhase,
  ProgramKind,
  ScreenFlowRow,
  ScreenLayout,
  SearchConditionRow,
  SpecFormState,
  UploadedFileMeta,
} from "@/types/spec";
import {
  defaultBasicInfo,
  defaultCrudSettings,
  defaultScreenFlows,
  defaultScreenLayout,
} from "@/types/spec";
import {
  clearPersistedPipeline,
  loadPersistedPipeline,
  savePersistedPipeline,
} from "@/lib/spec-persist";

export type { PipelinePhase };

type SpecPipelineContextValue = {
  phase: PipelinePhase;
  setPhase: React.Dispatch<React.SetStateAction<PipelinePhase>>;

  basicInfo: BasicInfo;
  setBasicInfo: React.Dispatch<React.SetStateAction<BasicInfo>>;
  programKind: ProgramKind | null;
  setProgramKind: React.Dispatch<React.SetStateAction<ProgramKind | null>>;
  uploads: UploadedFileMeta[];
  setUploads: React.Dispatch<React.SetStateAction<UploadedFileMeta[]>>;
  geminiRaw: GeminiAnalysisResult | null;
  setGeminiRaw: React.Dispatch<
    React.SetStateAction<GeminiAnalysisResult | null>
  >;
  searchConditions: SearchConditionRow[];
  setSearchConditions: React.Dispatch<
    React.SetStateAction<SearchConditionRow[]>
  >;
  grids: GridDefinition[];
  setGrids: React.Dispatch<React.SetStateAction<GridDefinition[]>>;
  layout: ScreenLayout;
  setLayout: React.Dispatch<React.SetStateAction<ScreenLayout>>;
  screenFlows: ScreenFlowRow[];
  setScreenFlows: React.Dispatch<React.SetStateAction<ScreenFlowRow[]>>;
  crud: CrudSettings;
  setCrud: React.Dispatch<React.SetStateAction<CrudSettings>>;

  wizardSlot: number;
  setWizardSlot: React.Dispatch<React.SetStateAction<number>>;

  analyzeLoading: boolean;
  setAnalyzeLoading: React.Dispatch<React.SetStateAction<boolean>>;
  analyzeError: string | null;
  setAnalyzeError: React.Dispatch<React.SetStateAction<string | null>>;

  functionalSpecMarkdown: string;
  setFunctionalSpecMarkdown: React.Dispatch<React.SetStateAction<string>>;
  mappingSpecMarkdown: string;
  setMappingSpecMarkdown: React.Dispatch<React.SetStateAction<string>>;
  mappingRows: MappingSheetRow[];
  setMappingRows: React.Dispatch<React.SetStateAction<MappingSheetRow[]>>;
  fsMappingLoading: boolean;
  setFsMappingLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fsMappingError: string | null;
  setFsMappingError: React.Dispatch<React.SetStateAction<string | null>>;
  fsMappingGeneratedAt: string | null;
  setFsMappingGeneratedAt: React.Dispatch<
    React.SetStateAction<string | null>
  >;

  generatedCode: string;
  sapActivationErrorLog: string;
  sapErrorScreenshot: SapErrorScreenshotPayload | null;
  setGeneratedCode: React.Dispatch<React.SetStateAction<string>>;
  setSapActivationErrorLog: React.Dispatch<React.SetStateAction<string>>;
  setSapErrorScreenshot: React.Dispatch<
    React.SetStateAction<SapErrorScreenshotPayload | null>
  >;

  buildSpecFormState: () => SpecFormState;
  resetPipeline: () => void;
};

const SpecPipelineContext = React.createContext<SpecPipelineContextValue | null>(
  null,
);

export function SpecPipelineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = React.useState<PipelinePhase>("input");

  const [basicInfo, setBasicInfo] = React.useState<BasicInfo>(defaultBasicInfo);
  const [programKind, setProgramKind] = React.useState<ProgramKind | null>(
    null,
  );
  const [uploads, setUploads] = React.useState<UploadedFileMeta[]>([]);
  const [geminiRaw, setGeminiRaw] = React.useState<GeminiAnalysisResult | null>(
    null,
  );
  const [searchConditions, setSearchConditions] = React.useState<
    SearchConditionRow[]
  >([]);
  const [grids, setGrids] = React.useState<GridDefinition[]>([]);
  const [layout, setLayout] = React.useState<ScreenLayout>(defaultScreenLayout);
  const [screenFlows, setScreenFlows] =
    React.useState<ScreenFlowRow[]>(defaultScreenFlows);
  const [crud, setCrud] = React.useState<CrudSettings>(defaultCrudSettings);

  const [wizardSlot, setWizardSlot] = React.useState(0);

  const [analyzeLoading, setAnalyzeLoading] = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);

  const [functionalSpecMarkdown, setFunctionalSpecMarkdown] =
    React.useState("");
  const [mappingSpecMarkdown, setMappingSpecMarkdown] = React.useState("");
  const [mappingRows, setMappingRows] = React.useState<MappingSheetRow[]>([]);
  const [fsMappingLoading, setFsMappingLoading] = React.useState(false);
  const [fsMappingError, setFsMappingError] = React.useState<string | null>(
    null,
  );
  const [fsMappingGeneratedAt, setFsMappingGeneratedAt] = React.useState<
    string | null
  >(null);

  const [generatedCode, setGeneratedCode] = React.useState("");
  const [sapActivationErrorLog, setSapActivationErrorLog] =
    React.useState("");
  const [sapErrorScreenshot, setSapErrorScreenshot] =
    React.useState<SapErrorScreenshotPayload | null>(null);

  const [canPersist, setCanPersist] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "1") {
        clearPersistedPipeline();
        params.delete("reset");
        const qs = params.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${qs ? `?${qs}` : ""}`,
        );
        setCanPersist(true);
        return;
      }
    }

    const snap = loadPersistedPipeline();
    if (snap) {
      setPhase(snap.phase);
      setBasicInfo(snap.basicInfo);
      setProgramKind(snap.programKind);
      setUploads(snap.uploads);
      setGeminiRaw(snap.geminiRaw);
      setSearchConditions(snap.searchConditions);
      setGrids(snap.grids);
      setLayout(snap.layout);
      setScreenFlows(snap.screenFlows ?? defaultScreenFlows());
      setCrud(snap.crud);
      setWizardSlot(snap.wizardSlot);
      setFunctionalSpecMarkdown(snap.functionalSpecMarkdown);
      setMappingSpecMarkdown((snap as any).mappingSpecMarkdown ?? "");
      setMappingRows(snap.mappingRows);
      setFsMappingGeneratedAt(snap.fsMappingGeneratedAt);
      setGeneratedCode(snap.generatedCode);
      setSapActivationErrorLog(
        typeof snap.sapActivationErrorLog === "string"
          ? snap.sapActivationErrorLog
          : "",
      );
      setSapErrorScreenshot(null);
    }
    setCanPersist(true);
  }, []);

  const persistTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!canPersist) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      savePersistedPipeline({
        phase,
        basicInfo,
        programKind,
        uploads,
        geminiRaw,
        searchConditions,
        grids,
        layout,
        screenFlows,
        crud,
        wizardSlot,
        functionalSpecMarkdown,
        mappingSpecMarkdown,
        mappingRows,
        fsMappingGeneratedAt,
        generatedCode,
        sapActivationErrorLog,
      });
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [
    canPersist,
    phase,
    basicInfo,
    programKind,
    uploads,
    geminiRaw,
    searchConditions,
    grids,
    layout,
    screenFlows,
    crud,
    wizardSlot,
    functionalSpecMarkdown,
    mappingSpecMarkdown,
    mappingRows,
    fsMappingGeneratedAt,
    generatedCode,
    sapActivationErrorLog,
  ]);

  const buildSpecFormState = React.useCallback((): SpecFormState => {
    return {
      basicInfo,
      programKind,
      uploads,
      geminiRaw,
      searchConditions,
      grids,
      layout,
      screenFlows,
      crud,
    };
  }, [
    basicInfo,
    programKind,
    uploads,
    geminiRaw,
    searchConditions,
    grids,
    layout,
    screenFlows,
    crud,
  ]);

  const resetPipeline = React.useCallback(() => {
    clearPersistedPipeline();
    setPhase("input");
    setBasicInfo(defaultBasicInfo);
    setProgramKind(null);
    setUploads([]);
    setGeminiRaw(null);
    setSearchConditions([]);
    setGrids([]);
    setLayout(defaultScreenLayout());
    setScreenFlows(defaultScreenFlows());
    setCrud(defaultCrudSettings());
    setWizardSlot(0);
    setAnalyzeLoading(false);
    setAnalyzeError(null);
    setFunctionalSpecMarkdown("");
    setMappingSpecMarkdown("");
    setMappingRows([]);
    setFsMappingLoading(false);
    setFsMappingError(null);
    setFsMappingGeneratedAt(null);
    setGeneratedCode("");
    setSapActivationErrorLog("");
    setSapErrorScreenshot(null);
  }, []);

  const value = React.useMemo(
    (): SpecPipelineContextValue => ({
      phase,
      setPhase,
      basicInfo,
      setBasicInfo,
      programKind,
      setProgramKind,
      uploads,
      setUploads,
      geminiRaw,
      setGeminiRaw,
      searchConditions,
      setSearchConditions,
      grids,
      setGrids,
      layout,
      setLayout,
      screenFlows,
      setScreenFlows,
      crud,
      setCrud,
      wizardSlot,
      setWizardSlot,
      analyzeLoading,
      setAnalyzeLoading,
      analyzeError,
      setAnalyzeError,
      functionalSpecMarkdown,
      setFunctionalSpecMarkdown,
      mappingSpecMarkdown,
      setMappingSpecMarkdown,
      mappingRows,
      setMappingRows,
      fsMappingLoading,
      setFsMappingLoading,
      fsMappingError,
      setFsMappingError,
      fsMappingGeneratedAt,
      setFsMappingGeneratedAt,
      generatedCode,
      sapActivationErrorLog,
      sapErrorScreenshot,
      setGeneratedCode,
      setSapActivationErrorLog,
      setSapErrorScreenshot,
      buildSpecFormState,
      resetPipeline,
    }),
    [
      phase,
      basicInfo,
      programKind,
      uploads,
      geminiRaw,
      searchConditions,
      grids,
      layout,
      screenFlows,
      crud,
      wizardSlot,
      analyzeLoading,
      analyzeError,
      functionalSpecMarkdown,
      mappingRows,
      fsMappingLoading,
      fsMappingError,
      fsMappingGeneratedAt,
      generatedCode,
      sapActivationErrorLog,
      sapErrorScreenshot,
      buildSpecFormState,
      resetPipeline,
    ],
  );

  return (
    <SpecPipelineContext.Provider value={value}>
      {children}
    </SpecPipelineContext.Provider>
  );
}

export function useSpecPipeline(): SpecPipelineContextValue {
  const ctx = React.useContext(SpecPipelineContext);
  if (!ctx) {
    throw new Error("useSpecPipeline must be used within SpecPipelineProvider");
  }
  return ctx;
}

export function rowsWithIds(
  rows: (Omit<MappingSheetRow, "id"> & {
    dataElement?: string | null;
    notes?: string | null;
  })[],
): MappingSheetRow[] {
  return rows.map((r) => ({
    id: newId(),
    area: r.area ?? "",
    uiLabel: r.uiLabel ?? "",
    tableName: r.tableName ?? "",
    fieldName: r.fieldName ?? "",
    dataElement: r.dataElement ?? undefined,
    notes: r.notes ?? undefined,
  }));
}
