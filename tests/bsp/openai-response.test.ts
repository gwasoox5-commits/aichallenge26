import { describe, expect, it } from "vitest";
import { extractOpenAiResponseText } from "@/lib/integrations/openai-client";

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
});
