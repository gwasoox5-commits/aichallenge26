#!/usr/bin/env node
/**
 * Repository secret scan — run before commit
 * Usage: node scripts/secret-scan.mjs
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const patterns = [
  { name: "OpenAI key (sk-)", regex: /sk-[A-Za-z0-9]{10,}/ },
  { name: "OPENAI_API_KEY assignment", regex: /OPENAI_API_KEY\s*=\s*['"]?[A-Za-z0-9_-]{10,}/ },
  { name: "GNews key assignment", regex: /BSP_GNEWS_API_KEY\s*=\s*['"]?[A-Za-z0-9]{10,}/ },
  { name: "DATABASE_URL with password", regex: /postgresql:\/\/[^:]+:[^@]+@/ },
  { name: "BSP_AUTH_SECRET assignment", regex: /BSP_AUTH_SECRET\s*=\s*['"]?[A-Za-z0-9!]{16,}/ },
];

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (e) {
    return e.stdout?.toString?.() ?? "";
  }
}

console.log("=== Git Secret Scan ===\n");

const hasGit = run("git rev-parse --is-inside-work-tree") === "true";
if (!hasGit) {
  console.warn("WARN: Not a git repository — skipping git grep checks");
} else {
  console.log("git status --short:\n", run("git status --short") || "(clean)");
  console.log("\ngit check-ignore .env.local:", run("git check-ignore -v .env.local") || "(not ignored or missing)");

  for (const p of patterns) {
    const hits = run(`git grep -n "${p.regex.source}" -- . ":(exclude)node_modules" ":(exclude).next" ":(exclude)*.md" 2>nul || git grep -n "${p.regex.source}" 2>/dev/null`);
    if (hits) {
      console.error(`FAIL: ${p.name}\n${hits}\n`);
      process.exitCode = 1;
    } else {
      console.log(`PASS: ${p.name}`);
    }
  }
}

for (const f of [".env", ".env.local"]) {
  const path = join(root, f);
  if (existsSync(path)) {
    const tracked = hasGit ? run(`git ls-files --error-unmatch ${f} 2>nul`) : "";
    if (tracked) {
      console.error(`FAIL: ${f} is tracked by git — run: git rm --cached ${f}`);
      process.exitCode = 1;
    } else {
      console.log(`PASS: ${f} exists locally but not tracked`);
    }
  }
}

console.log("\n=== Manual commands (run locally) ===");
console.log("git status");
console.log("git ls-files");
console.log("git diff --check");
console.log('git grep -n "sk-"');
console.log('git grep -n "OPENAI_API_KEY="');
console.log("git check-ignore -v .env.local");
console.log("\nIf .env.local was tracked: git rm --cached .env.local && git commit -m \"chore: stop tracking .env.local\"");

if (process.exitCode) {
  console.error("\nSecret scan FAILED");
  process.exit(process.exitCode);
}
console.log("\nSecret scan PASSED (automated checks)");
