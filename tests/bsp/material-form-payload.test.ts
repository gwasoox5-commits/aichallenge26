import { describe, expect, it } from "vitest";
import { buildMaterialPayload, buildSalesPayload } from "@/lib/bsp/material-form-payload";

describe("buildMaterialPayload", () => {
  it("opens a branch automatically when bidding qty in a new region", () => {
    const payload = buildMaterialPayload([{ regionCode: "ASIA", qty: 12, unitPriceBidManwon: 12, openBranch: false }], []);
    expect(payload.branches).toEqual([{ regionCode: "ASIA" }]);
    expect(payload.lines[0].qty).toBe(12);
  });

  it("does not duplicate branch when checkbox and qty both set", () => {
    const payload = buildMaterialPayload([{ regionCode: "ASIA", qty: 12, unitPriceBidManwon: 12, openBranch: true }], []);
    expect(payload.branches).toEqual([{ regionCode: "ASIA" }]);
  });

  it("skips purchase branch payload when region already has a purchase branch", () => {
    const payload = buildMaterialPayload(
      [{ regionCode: "ASIA", qty: 5, unitPriceBidManwon: 12, openBranch: false }],
      ["ASIA"]
    );
    expect(payload.branches).toEqual([]);
  });

  it("opens a sales branch automatically when bidding qty in a new region", () => {
    const payload = buildSalesPayload([{ regionCode: "EUROPE", unitPriceManwon: 100, qty: 3, openBranch: false }], [], []);
    expect(payload.branchesNew).toEqual([{ regionCode: "EUROPE" }]);
  });

  it("skips sales branch when region already has a sales branch", () => {
    const payload = buildSalesPayload(
      [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 2, openBranch: false }],
      [],
      ["ASIA"]
    );
    expect(payload.branchesNew).toEqual([]);
  });

  it("skips sales branch when purchase branch already exists in region", () => {
    const payload = buildSalesPayload(
      [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 2, openBranch: false }],
      ["ASIA"],
      []
    );
    expect(payload.branchesNew).toEqual([]);
  });
});
