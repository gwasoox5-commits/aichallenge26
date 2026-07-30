import path from "path";

export type OperationManual = {
  slug: "participant" | "instructor";
  title: string;
  subtitle: string;
  sourceFile: string;
  downloadBaseName: string;
  audience: "participant" | "instructor";
};

const DOCS_DIR = path.join(process.cwd(), "docs", "operations");
const PUBLIC_PDF_DIR = path.join(process.cwd(), "public", "manuals");

export const OPERATION_MANUALS: OperationManual[] = [
  {
    slug: "participant",
    title: "제조 경영 시뮬레이션 — 참가자 운영 설명서",
    subtitle: "CEO(팀 대표) 및 팀원용 · 시뮬레이션 목적 · Step별 규칙 · 화면 구성",
    sourceFile: "participant-manual-ko.md",
    downloadBaseName: "participant-manual-ko",
    audience: "participant",
  },
  {
    slug: "instructor",
    title: "제조 경영 시뮬레이션 — 강사(GM) 운영 설명서",
    subtitle: "강사·GM용 · 세션 운영 · 게임 진행 · 디브리프",
    sourceFile: "instructor-manual-ko.md",
    downloadBaseName: "instructor-manual-ko",
    audience: "instructor",
  },
];

export function getOperationManual(slug: string): OperationManual | undefined {
  return OPERATION_MANUALS.find((m) => m.slug === slug);
}

export function getManualSourcePath(manual: OperationManual): string {
  return path.join(DOCS_DIR, manual.sourceFile);
}

export function getManualPdfPath(manual: OperationManual): string {
  return path.join(PUBLIC_PDF_DIR, `${manual.downloadBaseName}.pdf`);
}

export function getManualPdfPublicUrl(manual: OperationManual): string {
  return `/manuals/${manual.downloadBaseName}.pdf`;
}

export function getManualDownloadApiUrl(manual: OperationManual, format: "pdf" | "md"): string {
  return `/api/docs/manuals/${manual.slug}?format=${format}`;
}
