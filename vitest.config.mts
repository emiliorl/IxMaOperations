import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["lib/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // The database suite boots an in-process Postgres (PGlite) and applies the migrations.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
