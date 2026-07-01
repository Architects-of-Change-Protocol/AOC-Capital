import crypto from "node:crypto";

export type SourceTrace = {
  traceId: string;
  sourceType: "manual_input" | "upload";
  sourceRef: string;
  mode: string;
  contextNote?: string;
  fileName?: string;
  mimeType?: string;
  submittedAt: string;
};

export function buildSourceTrace(input: {
  mode: string;
  sourceRef: string;
  contextNote?: string;
  fileName?: string;
  mimeType?: string;
  sourceType: "manual_input" | "upload";
}): SourceTrace {
  return {
    traceId: crypto.randomUUID(),
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    mode: input.mode,
    contextNote: input.contextNote,
    fileName: input.fileName,
    mimeType: input.mimeType,
    submittedAt: new Date().toISOString(),
  };
}
