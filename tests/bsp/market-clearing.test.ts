import { describe, expect, it } from "vitest";
import {
  clearMaterialRegionBids,
  clearSalesRegionBids,
  collectMaterialBids,
  collectSalesBids,
} from "@/src/bsp/domain/market/market-clearing";

describe("MarketClearing", () => {
  it("allocates material to higher bid first within regional supply", () => {
    const bids = [
      ...collectMaterialBids("team-a", {
        lines: [{ regionCode: "EUROPE", qty: 40, unitPriceBidManwon: 30 }],
      }),
      ...collectMaterialBids("team-b", {
        lines: [{ regionCode: "EUROPE", qty: 20, unitPriceBidManwon: 40 }],
      }),
    ];
    const awards = clearMaterialRegionBids(bids, 50);
    const aAward = awards.get("team-a")?.[0];
    const bAward = awards.get("team-b")?.[0];
    expect(bAward?.awardedQty).toBe(20);
    expect(aAward?.awardedQty).toBe(30);
  });

  it("allocates sales to lower bid first within regional demand", () => {
    const bids = [
      ...collectSalesBids("team-a", {
        lines: [{ regionCode: "EUROPE", unitPriceManwon: 120, qty: 30 }],
      }),
      ...collectSalesBids("team-b", {
        lines: [{ regionCode: "EUROPE", unitPriceManwon: 100, qty: 30 }],
      }),
    ];
    const awards = clearSalesRegionBids(bids, 50);
    const aAward = awards.get("team-a")?.[0];
    const bAward = awards.get("team-b")?.[0];
    expect(bAward?.awardedQty).toBe(30);
    expect(aAward?.awardedQty).toBe(20);
  });
});
