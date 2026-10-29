/**
 * Diagnostics only. With PORTAL_TIMING=1 every Supabase request the server
 * makes is logged with when it started and how long it took, so serial chains
 * and slow calls are easy to spot. Unset (the default) it does nothing.
 */
export const timingFetch: typeof fetch | undefined =
  process.env.PORTAL_TIMING === "1"
    ? async (input, init) => {
        const started = Date.now();
        try {
          return await fetch(input, init);
        } finally {
          const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
          const what = url.pathname.replace(/^\/(rest|auth)\/v1\//, "$1:");
          console.log(`[timing] start=${started % 100000} ${String(Date.now() - started).padStart(4)}ms ${init?.method ?? "GET"} ${what}`);
        }
      }
    : undefined;
