/** Map common Korean Intelligence keywords to English news search terms */

export const KO_TO_EN: Record<string, string> = {
  미국: "United States",
  usa: "United States",
  이란: "Iran",
  전쟁: "war",
  분쟁: "conflict",
  반도체: "semiconductor",
  chip: "semiconductor",
  ai: "artificial intelligence",
  관세: "tariff",
  환율: "exchange rate",
  달러: "US dollar",
  중국: "China",
  러시아: "Russia",
  우크라이나: "Ukraine",
  이스라엘: "Israel",
  가자: "Gaza",
  북한: "North Korea",
  eu: "European Union",
  유럽: "Europe",
  esg: "ESG",
  "supply chain": "supply chain",
  공급망: "supply chain",
  원유: "oil",
  유가: "oil price",
  금리: "interest rate",
  인플레: "inflation",
  inflation: "inflation",
  수출: "export",
  수입: "import",
  규제: "regulation",
  제재: "sanctions",
  협상: "negotiation",
  정상회담: "summit",
};

export function hasHangul(keywords: string[]): boolean {
  return keywords.some((k) => /[\uAC00-\uD7A3]/.test(k));
}

/** English-only terms for en locale RSS — never pass untranslated Korean to English feed */
export function expandKeywordsForEnglishSearch(keywords: string[]): string[] {
  const expanded: string[] = [];
  for (const raw of keywords) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    const mapped = KO_TO_EN[trimmed] ?? KO_TO_EN[lower];
    if (mapped) {
      expanded.push(mapped);
    } else if (/^[a-z0-9\s\-]+$/i.test(trimmed)) {
      expanded.push(trimmed);
    }
  }
  return [...new Set(expanded)];
}

export function expandKeywordsForGNews(keywords: string[]): string[] {
  const expanded: string[] = [];
  for (const raw of keywords) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    const mapped = KO_TO_EN[trimmed] ?? KO_TO_EN[lower];
    if (mapped) {
      expanded.push(mapped);
    } else if (/^[a-z0-9\s\-]+$/i.test(trimmed)) {
      expanded.push(trimmed);
    } else {
      expanded.push(trimmed);
    }
  }
  return [...new Set(expanded)];
}

export function buildGNewsSearchQueries(keywords: string[]): string[] {
  const terms = expandKeywordsForGNews(keywords);
  if (terms.length === 0) return ["world news"];

  const queries: string[] = [];
  if (terms.length === 1) {
    queries.push(terms[0]!);
    return queries;
  }

  queries.push(terms.join(" OR "));
  queries.push(terms.join(" "));
  queries.push(terms[0]!);
  return [...new Set(queries)];
}
