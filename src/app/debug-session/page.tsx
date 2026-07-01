"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function DebugSessionPage() {
  const [clientSession, setClientSession] = useState<Record<string, unknown> | null>(null);
  const [serverAuth, setServerAuth] = useState<unknown>(null);
  const [cookies, setCookies] = useState("");

  useEffect(() => {
    const run = async () => {
      const { url, anonKey } = getSupabaseEnv();
      const supabase = createBrowserClient(url, anonKey);

      const session = await supabase.auth.getSession();
      setClientSession(session.data.session ? {
        userId: session.data.session.user.id,
        email: session.data.session.user.email,
        expiresAt: session.data.session.expires_at,
      } : null);

      setCookies(document.cookie);

      const response = await fetch("/api/debug-auth");
      setServerAuth(await response.json());
    };

    void run();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Debug Session</h1>

      <h2>Client session</h2>
      <pre>{JSON.stringify(clientSession, null, 2)}</pre>

      <h2>Server auth</h2>
      <pre>{JSON.stringify(serverAuth, null, 2)}</pre>

      <h2>Browser cookies</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{cookies}</pre>
    </main>
  );
}
