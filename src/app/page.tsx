import { PipelineShell } from "@/components/pipeline-shell";
import { SpecPipelineProvider } from "@/context/spec-pipeline-context";

export default function Home() {
  return (
    <SpecPipelineProvider>
      <PipelineShell />
    </SpecPipelineProvider>
  );
}
