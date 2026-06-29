import { describe, expect, it } from "vitest";
import { formatDuration } from "../../lib/utils";

describe("timer utilities", () => {
  it("formats duration as mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(1500)).toBe("25:00");
  });
});
