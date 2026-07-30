import { readFile } from "fs/promises";
import { existsSync } from "fs";
import {
  getManualPdfPath,
  getManualSourcePath,
  getOperationManual,
} from "@/lib/docs/operation-manuals";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;
  const manual = getOperationManual(slug);
  if (!manual) {
    return Response.json({ error: "Manual not found" }, { status: 404 });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "pdf";

  if (format === "md") {
    try {
      const markdown = await readFile(getManualSourcePath(manual), "utf8");
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${manual.downloadBaseName}.md"`,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return Response.json({ error: "Manual source missing" }, { status: 404 });
    }
  }

  if (format !== "pdf") {
    return Response.json({ error: "Unsupported format. Use pdf or md." }, { status: 400 });
  }

  const pdfPath = getManualPdfPath(manual);
  if (!existsSync(pdfPath)) {
    return Response.json(
      {
        error: "PDF not generated yet. Run: npm run docs:manuals",
        code: "ERR_MANUAL_PDF_MISSING",
      },
      { status: 503 }
    );
  }

  const pdf = await readFile(pdfPath);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${manual.downloadBaseName}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
