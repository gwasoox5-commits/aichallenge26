import fs from "fs";
import path from "path";

const pairs = [
  ["bg-slate-950/60", "bg-slate-100"],
  ["bg-slate-950/50", "bg-slate-50"],
  ["bg-slate-950/30", "bg-slate-50"],
  ["bg-slate-950/20", "bg-slate-50"],
  ["bg-slate-900/80", "bg-white/95"],
  ["bg-slate-900/60", "bg-slate-50"],
  ["from-slate-900 via-slate-900 to-sky-950/30", "from-white via-slate-50 to-sky-50"],
  ["from-slate-900 to-violet-950/20", "from-white to-violet-50"],
  ["bg-slate-950", "bg-white"],
  ["bg-slate-900", "bg-white"],
  ["bg-slate-800/60", "bg-slate-100"],
  ["hover:bg-slate-800", "hover:bg-slate-100"],
  ["hover:bg-slate-700", "hover:bg-slate-200"],
  ["bg-slate-800", "bg-slate-200"],
  ["border-slate-800", "border-slate-200"],
  ["border-slate-700", "border-slate-300"],
  ["border-slate-600", "border-slate-300"],
  ["text-slate-100", "text-slate-900"],
  ["text-slate-200", "text-slate-800"],
  ["text-slate-300", "text-slate-700"],
  ["text-slate-400", "text-slate-600"],
  ["text-slate-50", "text-slate-900"],
  ["bg-emerald-950/30", "bg-emerald-50"],
  ["bg-emerald-950/20", "bg-emerald-50"],
  ["bg-amber-950/30", "bg-amber-50"],
  ["bg-amber-950/20", "bg-amber-50"],
  ["bg-violet-950/40", "bg-violet-50"],
  ["bg-violet-950/30", "bg-violet-50"],
  ["bg-violet-950/20", "bg-violet-50"],
  ["bg-sky-950/30", "bg-sky-50"],
  ["bg-orange-950/20", "bg-orange-50"],
  ["text-emerald-300", "text-emerald-700"],
  ["text-emerald-400", "text-emerald-700"],
  ["text-amber-300", "text-amber-800"],
  ["text-amber-400", "text-amber-700"],
  ["text-violet-200", "text-violet-800"],
  ["text-violet-300", "text-violet-700"],
  ["text-violet-400", "text-violet-700"],
  ["text-sky-300", "text-sky-700"],
  ["text-orange-300", "text-orange-800"],
  ["text-orange-200/80", "text-orange-700"],
  ["text-orange-200", "text-orange-800"],
  ["border-emerald-800/50", "border-emerald-200"],
  ["border-emerald-800/40", "border-emerald-200"],
  ["border-emerald-700/50", "border-emerald-300"],
  ["border-amber-800/50", "border-amber-200"],
  ["border-amber-700/60", "border-amber-300"],
  ["border-violet-800/50", "border-violet-200"],
  ["border-violet-800/40", "border-violet-200"],
  ["border-violet-700/60", "border-violet-300"],
  ["border-sky-800/50", "border-sky-200"],
  ["border-orange-800/50", "border-orange-200"],
  ["ring-violet-800/40", "ring-violet-200"],
  ["bg-emerald-900/30", "bg-emerald-100"],
  ["bg-amber-900/50", "bg-amber-100"],
  ["bg-sky-800/60", "bg-sky-100"],
  ["bg-amber-800/60", "bg-amber-100"],
  ["text-amber-200/90", "text-amber-800"],
  ["text-amber-200", "text-amber-800"],
  ["min-h-screen bg-slate-50 text-slate-900", "min-h-screen bg-white text-slate-900"],
].sort((a, b) => b[0].length - a[0].length);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx")) {
      let content = fs.readFileSync(full, "utf8");
      const original = content;
      for (const [from, to] of pairs) {
        const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        content = content.replace(new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "g"), to);
      }
      if (content !== original) {
        fs.writeFileSync(full, content);
        console.log("updated", full);
      }
    }
  }
}

walk("app");
walk("components");
