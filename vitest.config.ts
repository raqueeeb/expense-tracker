import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * tsconfig.json sets "jsx": "preserve" because Next.js owns the JSX transform
 * for the application build. The test runner's transform (oxc, via
 * rolldown-vite) cannot parse TSX under that setting, so it is overridden here.
 * This affects the test run only; `next build` is unchanged.
 */
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
