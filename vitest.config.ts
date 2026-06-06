import { defineConfig } from "vitest/config";

// happy-dom gives unit tests a browser-like `window` / `localStorage`, which
// the persistence layer (lib/storage.ts) exercises.
export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts"],
  },
});
