import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const targets = new Set(process.argv.slice(2));
const transcriptRoot = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "c-Users-USER-Desktop-project",
  "agent-transcripts",
);

if (!fs.existsSync(transcriptRoot)) {
  console.error("transcript dir missing");
  process.exit(1);
}

const ops = [];

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
      const rel = normPath(p);
      if (targets.size && !targets.has(rel)) continue;
      if (part.name === "Write" && typeof part.input.contents === "string") {
        ops.push({ ts, file, line: idx + 1, kind: "Write", rel, contents: part.input.contents });
      }
      if (part.name === "StrReplace" && part.input.old_string != null && part.input.new_string != null) {
        ops.push({
          ts,
          file,
          line: idx + 1,
          kind: "StrReplace",
          rel,
          old_string: part.input.old_string,
          new_string: part.input.new_string,
        });
      }
    }
  });
}

ops.sort((a, b) => a.ts - b.ts || a.file.localeCompare(b.file) || a.line - b.line);

const files = new Map();
let applied = 0;
let skipped = 0;

for (const op of ops) {
  if (op.kind === "Write") {
    files.set(op.rel, op.contents);
    applied++;
    continue;
  }
  let content = files.get(op.rel);
  if (content == null) continue;
  if (!content.includes(op.old_string)) {
    skipped++;
    continue;
  }
  files.set(op.rel, content.replace(op.old_string, op.new_string));
  applied++;
}

for (const [rel, content] of files) {
  const out = path.join(projectRoot, rel);
  if (!content || !fs.existsSync(path.dirname(out))) continue;
  fs.writeFileSync(out, content, "utf8");
  console.log("saved", rel, content.length, "chars");
}

console.log(`ops=${ops.length} applied=${applied} skipped=${skipped}`);
