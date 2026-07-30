import { describe, expect, it } from "vitest";
import { validateHiring } from "@/src/bsp/domain/validation/step-validators";

const currentHeads = { headPurchase: 3, headProduction: 3, headSales: 2 };

describe("validateHiring restructuring", () => {
  it("rejects Y1 restructuring (H04)", () => {
    const { validation } = validateHiring(
      {
        headPurchase: 2,
        headProduction: 3,
        headSales: 2,
        transfers: [{ from: "PURCHASE", to: "PRODUCTION", headcount: 1 }],
        resignations: { purchase: 0, production: 0, sales: 0 },
      },
      1,
      currentHeads
    );
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.ruleId === "H04" && !r.passed)).toBe(true);
  });

  it("rejects resignation exceeding current headcount (H03)", () => {
    const { validation } = validateHiring(
      {
        headPurchase: 2,
        headProduction: 3,
        headSales: 2,
        resignations: { purchase: 0, production: 0, sales: 3 },
      },
      2,
      currentHeads
    );
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.ruleId === "H03" && !r.passed)).toBe(true);
  });

  it("rejects zero transfer headcount (H02)", () => {
    const { validation } = validateHiring(
      {
        headPurchase: 2,
        headProduction: 4,
        headSales: 2,
        transfers: [{ from: "PURCHASE", to: "PRODUCTION", headcount: 0 }],
      },
      2,
      currentHeads
    );
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.ruleId === "H02" && !r.passed)).toBe(true);
  });

  it("rejects transfer with insufficient source heads (H02)", () => {
    const { validation } = validateHiring(
      {
        headPurchase: 1,
        headProduction: 5,
        headSales: 2,
        transfers: [{ from: "PURCHASE", to: "PRODUCTION", headcount: 2 }],
      },
      2,
      { headPurchase: 1, headProduction: 3, headSales: 2 }
    );
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.ruleId === "H02" && !r.passed)).toBe(true);
  });

  it("accepts single-head Y2 transfer and resignation", () => {
    const { validation } = validateHiring(
      {
        headPurchase: 2,
        headProduction: 4,
        headSales: 1,
        transfers: [{ from: "PURCHASE", to: "PRODUCTION", headcount: 1 }],
        resignations: { purchase: 0, production: 0, sales: 1 },
      },
      2,
      currentHeads
    );
    expect(validation.ok).toBe(true);
  });
});
