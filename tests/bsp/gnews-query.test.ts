import { describe, expect, it } from "vitest";
import { buildGNewsSearchQueries, expandKeywordsForGNews } from "@/lib/v2/intelligence/gnews-query";

describe("gnews-query", () => {
  it("maps Korean keywords to English for GNews", () => {
    expect(expandKeywordsForGNews(["미국", "이란"])).toEqual(["United States", "Iran"]);
  });

  it("builds OR query for multiple keywords", () => {
    expect(buildGNewsSearchQueries(["미국", "이란"])).toContain("United States OR Iran");
  });

  it("passes through English keywords", () => {
    expect(expandKeywordsForGNews(["semiconductor", "tariff"])).toEqual(["semiconductor", "tariff"]);
  });
});
