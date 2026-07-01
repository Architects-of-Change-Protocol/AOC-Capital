import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

export const updateSession = async (request: NextRequest) => {
  // Build initial request headers including x-pathname so server components
  // and layouts can read the current path without inspecting the URL directly.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!hasSupabaseEnv) {
    return { response, user: null };
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mutate request.cookies first — this updates request.headers (Cookie header)
        // in Next.js, so the snapshot taken after will include the refreshed values.
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set({ name, value, ...(options ?? {}) })
        );
        // Rebuild headers from the now-updated request and re-add x-pathname.
        const updatedHeaders = new Headers(request.headers);
        updatedHeaders.set("x-pathname", request.nextUrl.pathname);
        response = NextResponse.next({
          request: { headers: updatedHeaders },
        });
        // Also set on the response so refreshed tokens reach the browser.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set({ name, value, ...(options ?? {}) })
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
};
