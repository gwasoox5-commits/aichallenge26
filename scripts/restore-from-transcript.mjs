import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const transcriptDirs = [
  path.join(projectRoot, "..", ".cursor", "projects", "c-Users-USER-Desktop-project", "agent-transcripts"),
  path.join(process.env.USERPROFILE ?? "", ".cursor", "projects", "c-Users-USER-Desktop-project", "agent-transcripts"),
].filter((d) => fs.existsSync(d));

const restored = new Map();

function collectJsonlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsonlFiles(full));
    else if (entry.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

for (const dir of transcriptDirs) {
  for (const file of collectJsonlFiles(dir)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      const parts = row.message?.content;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (part.type !== "tool_use" || part.name !== "Write") continue;
        const p = part.input?.path?.replace(/\\/g, "/");
        const contents = part.input?.contents;
        if (!p || typeof contents !== "string") continue;
        if (!p.toLowerCase().includes("/project/") && !p.toLowerCase().endsWith(".tsx")) continue;
        const normalized = p.replace(/^.*\/project\//i, "").replace(/\\/g, "/");
        if (!normalized.startsWith("app/") && !normalized.startsWith("components/")) continue;
        if (!normalized.endsWith(".tsx")) continue;
        restored.set(normalized, contents);
      }
    }
  }
}

let count = 0;
for (const [rel, contents] of restored) {
  const full = path.join(projectRoot, rel);
  if (!fs.existsSync(path.dirname(full))) continue;
  fs.writeFileSync(full, contents, "utf8");
  console.log("restored", rel);
  count++;
}
console.log(`done: ${count} files`);
