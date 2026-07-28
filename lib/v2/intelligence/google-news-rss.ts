import { expandKeywordsForGNews } from "./gnews-query";

export type GoogleNewsRssLocale = { hl: string; gl: string; ceid: string };

export const GOOGLE_NEWS_RSS_LOCALES = {
  ko: { hl: "ko", gl: "KR", ceid: "KR:ko" },
  en: { hl: "en", gl: "US", ceid: "US:en" },
} as const;

export function buildGoogleNewsRssUrl(query: string, locale: GoogleNewsRssLocale): string {
  const params = new URLSearchParams({
    q: query,
    hl: locale.hl,
    gl: locale.gl,
    ceid: locale.ceid,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export function buildGoogleNewsRssAttempts(
  keywords: string[]
): Array<{ query: string; locale: GoogleNewsRssLocale }> {
  const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
  const english = expandKeywordsForGNews(cleaned);
  const attempts: Array<{ query: string; locale: GoogleNewsRssLocale }> = [];

  if (cleaned.length > 0) {
    attempts.push({ query: cleaned.join(" "), locale: GOOGLE_NEWS_RSS_LOCALES.ko });
  }
  if (english.length > 0) {
    attempts.push({ query: english.join(" OR "), locale: GOOGLE_NEWS_RSS_LOCALES.en });
    if (english.length > 1) {
      attempts.push({ query: english.join(" "), locale: GOOGLE_NEWS_RSS_LOCALES.en });
    }
  }
  if (attempts.length === 0) {
    attempts.push({ query: "world news", locale: GOOGLE_NEWS_RSS_LOCALES.en });
  }

  return attempts.slice(0, 3);
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(re);
  return match ? decodeXml(match[1]!.trim()) : "";
}

function splitTitleSource(title: string): { title: string; source?: string } {
  const idx = title.lastIndexOf(" - ");
  if (idx <= 0) return { title };
  return { title: title.slice(0, idx).trim(), source: title.slice(idx + 3).trim() };
}

export function parseGoogleNewsRss(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source?: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
    source?: string;
  }> = [];

  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  for (const block of xml.match(itemRegex) ?? []) {
    const rawTitle = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!rawTitle || !link) continue;

    const parsedTitle = splitTitleSource(rawTitle);
    const sourceTag = extractTag(block, "source");
    items.push({
      title: parsedTitle.title,
      link,
      pubDate: extractTag(block, "pubDate") || new Date().toISOString(),
      description: extractTag(block, "description"),
      source: sourceTag || parsedTitle.source,
    });
  }

  return items;
}

export function stableGoogleRssArticleId(url: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return `google-rss-${hash.toString(16)}-${index}`;
}
