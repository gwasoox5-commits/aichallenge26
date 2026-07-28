import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildGoogleNewsRssAttempts,
  buildGoogleNewsRssUrl,
  parseGoogleNewsRss,
} from "@/lib/v2/intelligence/google-news-rss";
import { GoogleNewsRssAdapter } from "@/lib/v2/intelligence/google-news-rss-adapter";

const fixtureXml = readFileSync(
  join(process.cwd(), "tests/fixtures/v2/google-news-rss.fixture.xml"),
  "utf8"
);

describe("google-news-rss", () => {
  it("builds Korean and English RSS search attempts", () => {
    const attempts = buildGoogleNewsRssAttempts(["미국", "이란", "전쟁"]);
    expect(attempts[0]?.locale.hl).toBe("ko");
    expect(attempts.some((a) => a.query.includes("United States"))).toBe(true);
  });

  it("builds Google News RSS URL", () => {
    const url = buildGoogleNewsRssUrl("Iran OR war", { hl: "en", gl: "US", ceid: "US:en" });
    expect(url).toContain("news.google.com/rss/search");
    expect(url).toContain("hl=en");
  });

  it("parses RSS items from fixture", () => {
    const items = parseGoogleNewsRss(fixtureXml);
    expect(items.length).toBe(2);
    expect(items[0]?.title).toBe("미국·이란 긴장 고조");
    expect(items[0]?.source).toBe("Reuters");
  });
});

describe("GoogleNewsRssAdapter", () => {
  it("maps RSS XML to news articles", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => fixtureXml,
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GoogleNewsRssAdapter();
    const result = await adapter.search({ keywords: ["미국", "이란"], limit: 5 });
    expect(result.provider).toBe("google-news-rss");
    expect(result.usedFixture).toBe(false);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0]?.provider).toBe("google-news-rss");

    vi.unstubAllGlobals();
  });
});
