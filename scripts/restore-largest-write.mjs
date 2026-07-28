import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const target = process.argv[2] ?? "app/play/page.tsx";
const transcriptRoots = [
  path.join(projectRoot, "..", ".cursor", "projects", "c-Users-USER-Desktop-project", "agent-transcripts"),
  path.join(process.env.USERPROFILE ?? "", ".cursor", "projects", "c-Users-USER-Desktop-project", "agent-transcripts"),
].filter((d) => fs.existsSync(d));

const writes = [];

function collectJsonlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsonlFiles(full));
    else if (entry.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

for (const transcriptRoot of transcriptRoots) {
for (const file of collectJsonlFiles(transcriptRoot)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      return;
    }
    const parts = row.message?.content;
    if (!Array.isArray(parts)) return;
    for (const part of parts) {
      const p = part.input?.path?.replace(/\\/g, "/");
      if (!p) continue;
      const normalized = p.replace(/^.*\/project\//i, "").replace(/\\/g, "/");
      if (normalized !== target) continue;
      if (part.name === "Write" && typeof part.input.contents === "string") {
        writes.push({
          file,
          line: idx + 1,
          kind: "Write",
          len: part.input.contents.length,
          contents: part.input.contents,
        });
      }
    }
  });
}
}

writes.sort((a, b) => a.len - b.len);
console.log(`Found ${writes.length} writes for ${target}`);
for (const w of writes.slice(-5)) {
  console.log(`${w.len} chars @ ${path.basename(w.file)}:${w.line}`);
}
if (writes.length) {
  const best = writes[writes.length - 1];
  const out = path.join(projectRoot, target);
  fs.writeFileSync(out, best.contents, "utf8");
  console.log(`Restored ${best.len} chars to ${target}`);
}
