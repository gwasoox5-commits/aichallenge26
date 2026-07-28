/** Shared OpenAI instruction block — all Intelligence user-facing text must be Korean. */
export const KOREAN_OUTPUT_INSTRUCTIONS = [
  "OUTPUT LANGUAGE: Korean (한국어) only for every user-facing string field.",
  "Write summaries, bullet points, rationales, commentary, labels, and questions in natural Korean for Korean instructors.",
  "Keep English only for proper nouns (people, countries, organizations) and fixed enum tokens (LOW, MEDIUM, HIGH).",
  "Do NOT respond in English sentences even if source articles are English.",
].join("\n");
