import { describe, expect, it } from "vitest";
import {
  extractOpenAiResponseText,
  extractOpenAiStructuredPayload,
  parseModelJsonText,
} from "@/lib/integrations/openai-json";

describe("extractOpenAiResponseText", () => {
  it("reads output_text blocks from Responses API message items", () => {
    const text = extractOpenAiResponseText({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"ok":true}' }],
        },
      ],
    });
    expect(text).toBe('{"ok":true}');
  });

  it("skips non-message output items such as reasoning", () => {
    const text = extractOpenAiResponseText({
      output: [
        { type: "reasoning", content: [{ type: "output_text", text: "ignore" }] },
        {
          type: "message",
          content: [{ type: "output_text", text: '{"eventSummary":"test"}' }],
        },
      ],
    });
    expect(text).toBe('{"eventSummary":"test"}');
  });

  it("uses top-level output_text when present", () => {
    expect(extractOpenAiResponseText({ output_text: '{"a":1}' })).toBe('{"a":1}');
  });

  it("concatenates multiple output_text chunks", () => {
    const text = extractOpenAiResponseText({
      output: [
        {
          type: "message",
          content: [
            { type: "output_text", text: '{"eventSummary":"' },
            { type: "output_text", text: 'hello"}' },
          ],
        },
      ],
    });
    expect(text).toBe('{"eventSummary":"hello"}');
  });

  it("reads output_json blocks directly", () => {
    const payload = extractOpenAiStructuredPayload({
      output: [{ type: "message", content: [{ type: "output_json", json: { ok: true } }] }],
    });
    expect(payload).toEqual({ ok: true });
  });
});

describe("parseModelJsonText", () => {
  it("parses markdown fenced JSON", () => {
    expect(parseModelJsonText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON embedded in prose", () => {
    expect(parseModelJsonText('Here is the result: {"a":1} end')).toEqual({ a: 1 });
  });
});
