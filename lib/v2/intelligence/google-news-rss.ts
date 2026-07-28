import { expandKeywordsForEnglishSearch, hasHangul } from "./gnews-query";

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
  const english = expandKeywordsForEnglishSearch(cleaned);
  const koAttempts: Array<{ query: string; locale: GoogleNewsRssLocale }> = [];
  const enAttempts: Array<{ query: string; locale: GoogleNewsRssLocale }> = [];

  if (cleaned.length > 0) {
    koAttempts.push({ query: cleaned.join(" "), locale: GOOGLE_NEWS_RSS_LOCALES.ko });
    if (cleaned.length > 1) {
      koAttempts.push({ query: cleaned.join(" OR "), locale: GOOGLE_NEWS_RSS_LOCALES.ko });
    }
    for (const kw of cleaned.slice(0, 2)) {
      koAttempts.push({ query: kw, locale: GOOGLE_NEWS_RSS_LOCALES.ko });
    }
  }

  if (english.length > 0) {
    enAttempts.push({ query: english.join(" OR "), locale: GOOGLE_NEWS_RSS_LOCALES.en });
    enAttempts.push({ query: english.join(" "), locale: GOOGLE_NEWS_RSS_LOCALES.en });
    enAttempts.push({ query: english[0]!, locale: GOOGLE_NEWS_RSS_LOCALES.en });
  }

  // Korean input: try mapped English RSS first (more reliable on server), then Korean RSS
  const ordered = hasHangul(cleaned) ? [...enAttempts, ...koAttempts] : [...koAttempts, ...enAttempts];
  if (ordered.length === 0) {
    ordered.push({ query: "world news", locale: GOOGLE_NEWS_RSS_LOCALES.en });
  }

  const seen = new Set<string>();
  return ordered.filter((attempt) => {
    const key = `${attempt.locale.hl}:${attempt.query}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
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

const TITLE_SOURCE_SEPARATORS = [" - ", " – ", " — ", " | "] as const;

function stripKnownSourceSuffix(title: string, source?: string): string {
  if (!source) return title;
  for (const sep of TITLE_SOURCE_SEPARATORS) {
    const suffix = `${sep}${source}`;
    if (title.endsWith(suffix)) {
      return title.slice(0, -suffix.length).trim();
    }
  }
  return title;
}

function splitTitleSource(title: string): { title: string; source?: string } {
  for (const sep of TITLE_SOURCE_SEPARATORS) {
    const idx = title.lastIndexOf(sep);
    if (idx > 0) {
      return {
        title: title.slice(0, idx).trim(),
        source: title.slice(idx + sep.length).trim(),
      };
    }
  }
  return { title };
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

    const sourceTag = extractTag(block, "source");
    let title = rawTitle;
    let source = sourceTag || undefined;

    if (sourceTag) {
      title = stripKnownSourceSuffix(rawTitle, sourceTag);
    } else {
      const parsed = splitTitleSource(rawTitle);
      title = parsed.title;
      source = parsed.source;
    }

    items.push({
      title,
      link,
      pubDate: extractTag(block, "pubDate") || new Date().toISOString(),
      description: extractTag(block, "description"),
      source,
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

export function rssRequestHeaders(locale: GoogleNewsRssLocale): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Accept-Language": locale.hl === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
  };
}

export function isLikelyRssXml(xml: string): boolean {
  const trimmed = xml.trimStart();
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<rss") || trimmed.includes("<channel");
}
