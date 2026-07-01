import { saveOperationalMemory, type OperationalDomain } from "@/lib/operational-memory";
import { classifyOperationalInput, type InputHubMode } from "@/lib/operational-classifier";
import { buildSourceTrace } from "@/lib/source-trace";

export type InputRoutingRequest = {
  companyId: string;
  projectId: string | null;
  mode: InputHubMode;
  title: string;
  text: string;
  sourceRef: string;
  contextNote?: string;
  fileName?: string;
  mimeType?: string;
};

export async function routeOperationalInput(request: InputRoutingRequest) {
  const classification = classifyOperationalInput(request.mode, request.text);
  const trace = buildSourceTrace({
    mode: request.mode,
    sourceRef: request.sourceRef,
    contextNote: request.contextNote,
    fileName: request.fileName,
    mimeType: request.mimeType,
    sourceType: request.fileName ? "upload" : "manual_input",
  });

  const savedRecords = [] as Array<{ id: string; domain: OperationalDomain }>;
  for (const domain of classification.domains) {
    const record = await saveOperationalMemory({
      companyId: request.companyId,
      projectId: request.projectId,
      domain,
      title: `${request.title} · ${domain}`,
      text: `${request.text}\n\n[trace:${trace.traceId}]`,
      sourceRef: trace.sourceRef,
    });
    savedRecords.push({ id: record.id, domain });
  }

  return {
    classification,
    trace,
    savedRecords,
    affectedSummary: classification.signalTypes.map((signalType) => signalType.replaceAll("_", " ")),
    timestamp: trace.submittedAt,
  };
}
