"use client";

import { useEffect, useMemo, useRef } from "react";

export function FirstUserTelemetryEvent({ eventType, metadata }: { eventType: string; metadata?: Record<string, unknown> }) {
  const didSend = useRef(false);
  const metadataKey = useMemo(() => JSON.stringify(metadata ?? {}), [metadata]);

  useEffect(() => {
    if (didSend.current) return;
    didSend.current = true;
    void fetch("/api/telemetry/first-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata: metadata ? JSON.parse(metadataKey) : undefined }),
    });
  }, [eventType, metadata, metadataKey]);

  return null;
}
