import type { ArticleBodyStatus, ContentSourceKind } from "../types";

/** Attempt to fetch article body — best-effort, never throws */
export async function fetchArticleBody(url: string, timeoutMs = 5000): Promise<{
  bodyStatus: ArticleBodyStatus;
  contentSource: ContentSourceKind;
  text?: string;
}> {
  if (!url || !url.startsWith("http")) {
    return { bodyStatus: "FETCH_FAILED", contentSource: "TITLE_ONLY" };
  }
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "BSP-NewsBot/1.0 (Educational Simulation)" },
    });
    if (!res.ok) {
      return { bodyStatus: "FETCH_FAILED", contentSource: "TITLE_ONLY" };
    }
    const html = await res.text();
    const text = stripHtml(html).slice(0, 8000);
    if (text.length < 120) {
      return { bodyStatus: "METADATA_ONLY", contentSource: "TITLE_ONLY", text };
    }
    return { bodyStatus: "FULL_TEXT", contentSource: "FULL_ARTICLE", text };
  } catch {
    return { bodyStatus: "FETCH_FAILED", contentSource: "TITLE_ONLY" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function bodyStatusToContentSource(status: ArticleBodyStatus): ContentSourceKind {
  if (status === "FULL_TEXT") return "FULL_ARTICLE";
  if (status === "SNIPPET_ONLY") return "SEARCH_SNIPPET";
  return "TITLE_ONLY";
}
