import { describe, expect, it, afterEach } from "vitest";
import { getAdminPasswordOrThrow } from "@/lib/bsp/runtime-config";

describe("getAdminPasswordOrThrow", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminPassword = process.env.BSP_ADMIN_PASSWORD;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAdminPassword === undefined) delete process.env.BSP_ADMIN_PASSWORD;
    else process.env.BSP_ADMIN_PASSWORD = originalAdminPassword;
  });

  it("allows admin10193 in production when set via env", () => {
    process.env.NODE_ENV = "production";
    process.env.BSP_ADMIN_PASSWORD = "admin10193";
    expect(getAdminPasswordOrThrow()).toBe("admin10193");
  });

  it("blocks known public dev defaults in production", () => {
    process.env.NODE_ENV = "production";
    process.env.BSP_ADMIN_PASSWORD = "bsp-admin-dev";
    expect(() => getAdminPasswordOrThrow()).toThrow(/known default password/i);
  });
});
