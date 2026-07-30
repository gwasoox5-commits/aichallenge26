import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "manuals");

const MANUALS = [
  {
    source: join(ROOT, "docs", "operations", "participant-manual-ko.md"),
    out: join(OUT_DIR, "participant-manual-ko.pdf"),
    title: "제조 경영 시뮬레이션 — 참가자 운영 설명서",
  },
  {
    source: join(ROOT, "docs", "operations", "instructor-manual-ko.md"),
    out: join(OUT_DIR, "instructor-manual-ko.pdf"),
    title: "제조 경영 시뮬레이션 — 강사(GM) 운영 설명서",
  },
];

function buildHtml(title, markdown) {
  const body = marked.parse(markdown);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      font-size: 10.5pt;
      line-height: 1.65;
      color: #1e293b;
      max-width: 100%;
    }
    h1 { font-size: 20pt; margin: 0 0 12pt; color: #0f172a; page-break-after: avoid; }
    h2 { font-size: 14pt; margin: 20pt 0 8pt; color: #1e3a8a; page-break-after: avoid; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; }
    h3 { font-size: 12pt; margin: 14pt 0 6pt; color: #334155; page-break-after: avoid; }
    p { margin: 0 0 8pt; }
    ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
    li { margin-bottom: 4pt; }
    blockquote {
      margin: 10pt 0;
      padding: 8pt 12pt;
      border-left: 3px solid #6366f1;
      background: #f8fafc;
      color: #475569;
    }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16pt 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0 14pt;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-weight: 600; }
    code {
      font-family: Consolas, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 1pt 4pt;
      border-radius: 3pt;
    }
    strong { color: #0f172a; }
    em { color: #475569; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const manual of MANUALS) {
    if (!existsSync(manual.source)) {
      console.error(`Missing source: ${manual.source}`);
      process.exitCode = 1;
      continue;
    }
    const markdown = readFileSync(manual.source, "utf8");
    const page = await browser.newPage();
    await page.setContent(buildHtml(manual.title, markdown), { waitUntil: "load" });
    await page.pdf({
      path: manual.out,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    await page.close();
    console.log(`Wrote ${manual.out}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
