import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildGoogleNewsRssAttempts,
  buildGoogleNewsRssUrl,
  isLikelyRssXml,
  parseGoogleNewsRss,
} from "@/lib/v2/intelligence/google-news-rss";
import { expandKeywordsForEnglishSearch, hasHangul } from "@/lib/v2/intelligence/gnews-query";
import { GoogleNewsRssAdapter } from "@/lib/v2/intelligence/google-news-rss-adapter";

const fixtureXml = readFileSync(
  join(process.cwd(), "tests/fixtures/v2/google-news-rss.fixture.xml"),
  "utf8"
);

describe("google-news-rss", () => {
  it("builds Korean and English RSS search attempts", () => {
    const attempts = buildGoogleNewsRssAttempts(["미국", "이란", "전쟁"]);
    expect(attempts[0]?.locale.hl).toBe("en");
    expect(attempts[0]?.query).toContain("United States");
    expect(attempts.some((a) => a.locale.hl === "ko")).toBe(true);
  });

  it("prioritizes English RSS for hangul keywords", () => {
    expect(hasHangul(["미국"])).toBe(true);
    expect(expandKeywordsForEnglishSearch(["미국", "이란"])).toEqual(["United States", "Iran"]);
  });

  it("keeps Korean headline when source tag is present", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title>미국 - 이란 긴장 고조 - JTBC</title>
      <link>https://news.google.com/rss/articles/example-ko</link>
      <pubDate>Mon, 28 Jul 2025 12:00:00 GMT</pubDate>
      <source>JTBC</source>
    </item></channel></rss>`;
    const items = parseGoogleNewsRss(xml);
    expect(items[0]?.title).toBe("미국 - 이란 긴장 고조");
    expect(items[0]?.source).toBe("JTBC");
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

  it("detects non-RSS HTML responses", () => {
    expect(isLikelyRssXml("<!DOCTYPE html><html><body>blocked</body></html>")).toBe(false);
    expect(isLikelyRssXml(fixtureXml)).toBe(true);
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
