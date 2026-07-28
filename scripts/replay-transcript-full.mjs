import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const target = process.argv[2] ?? "app/gm/page.tsx";
const transcriptRoot = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "c-Users-USER-Desktop-project",
  "agent-transcripts",
);

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
      if (rel !== target) continue;
      if (part.name === "Write" && typeof part.input.contents === "string") {
        ops.push({ ts, kind: "Write", contents: part.input.contents });
      }
      if (part.name === "StrReplace" && part.input.old_string != null && part.input.new_string != null) {
        ops.push({
          ts,
          kind: "StrReplace",
          old_string: part.input.old_string,
          new_string: part.input.new_string,
        });
      }
    }
  });
}

ops.sort((a, b) => a.ts - b.ts);

let content = null;
let applied = 0;
let skipped = 0;

for (const op of ops) {
  if (op.kind === "Write") {
    content = op.contents;
    applied++;
    continue;
  }
  if (content == null) continue;
  if (!content.includes(op.old_string)) {
    skipped++;
    continue;
  }
  content = content.replace(op.old_string, op.new_string);
  applied++;
}

if (!content) {
  console.error("No content reconstructed for", target);
  process.exit(1);
}

const out = path.join(projectRoot, target);
fs.writeFileSync(out, content, "utf8");
console.log(`saved ${target} (${content.length} chars, ops=${ops.length} applied=${applied} skipped=${skipped})`);
