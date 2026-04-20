"use client";

import * as React from "react";
import { FileCode2, FileText, FormInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpecPipeline } from "@/context/spec-pipeline-context";
import type { PipelinePhase } from "@/context/spec-pipeline-context";
import { SpecWizard } from "@/components/spec-wizard";
import { FsMappingWorkbench } from "@/components/fs-mapping-workbench";
import { CodeGenerationPanel } from "@/components/code-generation-panel";

const TABS: {
  id: PipelinePhase;
  label: string;
  short: string;
  icon: React.ElementType;
}[] = [
  { id: "input", label: "1. 사용자 입력", short: "입력", icon: FormInput },
  { id: "fs-mapping", label: "2. FS · 매핑입력서", short: "FS/매핑", icon: FileText },
  { id: "code", label: "3. 코드 생성", short: "코드", icon: FileCode2 },
];

export function PipelineShell() {
  const { phase, setPhase } = useSpecPipeline();

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            ABAP Spec Agent
          </div>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="파이프라인 단계"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = phase === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPhase(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {phase === "input" && <SpecWizard />}
        {phase === "fs-mapping" && <FsMappingWorkbench />}
        {phase === "code" && <CodeGenerationPanel />}
      </div>
    </div>
  );
}
