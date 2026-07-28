import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/bsp/**/*.ts"],
      exclude: ["src/bsp/infrastructure/prisma/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      ".prisma/bsp-client": path.resolve(__dirname, "node_modules/.prisma/bsp-client"),
    },
  },
});
