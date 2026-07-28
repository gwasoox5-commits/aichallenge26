import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = "app/gm/page.tsx";
const transcriptRoot = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "c-Users-USER-Desktop-project",
  "agent-transcripts",
);

function normPath(p) {
  return p.replace(/\\/g, "/").replace(/^.*\/project\//i, "");
}

function collectJsonlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsonlFiles(full));
    else if (entry.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

const writes = [];
for (const file of collectJsonlFiles(transcriptRoot)) {
  const stat = fs.statSync(file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      return;
    }
    const ts = row.timestamp ? Date.parse(row.timestamp) : stat.mtimeMs + idx * 0.001;
    const parts = row.message?.content;
    if (!Array.isArray(parts)) return;
    for (const part of parts) {
      const p = part.input?.path;
      if (!p) continue;
      if (normPath(p) !== target) continue;
      if (part.name === "Write" && typeof part.input.contents === "string") {
        writes.push({ ts, file, contents: part.input.contents });
      }
    }
  });
}

writes.sort((a, b) => a.ts - b.ts);
const best =
  [...writes].reverse().find((w) => w.contents.includes("GmCommandCenter")) ??
  writes[writes.length - 1];

if (!best) {
  console.error("No Write found");
  process.exit(1);
}

console.log("Using Write from", best.file, new Date(best.ts).toISOString(), best.contents.length);
fs.writeFileSync(path.join(__dirname, "..", target), best.contents, "utf8");
