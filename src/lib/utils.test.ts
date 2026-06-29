import { describe, expect, it } from "vitest";
import { clamp, formatDuration, todayKey, uid } from "./utils";

describe("formatDuration", () => {
  it("handles zero seconds", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("handles seconds only", () => {
    expect(formatDuration(45)).toBe("00:45");
  });

  it("handles minutes and seconds", () => {
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(125)).toBe("02:05");
  });

  it("handles large values", () => {
    expect(formatDuration(1500)).toBe("25:00");
    expect(formatDuration(3661)).toBe("61:01");
    expect(formatDuration(7200)).toBe("120:00");
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it("clamps above maximum", () => {
    expect(clamp(20, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it("handles edge case where min equals max", () => {
    expect(clamp(5, 7, 7)).toBe(7);
    expect(clamp(9, 7, 7)).toBe(7);
  });
});

describe("todayKey", () => {
  it("returns YYYY-MM-DD format from a date", () => {
    expect(todayKey(new Date("2025-01-15T12:00:00Z"))).toBe("2025-01-15");
  });

  it("pads single-digit month and day", () => {
    expect(todayKey(new Date("2025-03-05T00:00:00Z"))).toBe("2025-03-05");
  });

  it("defaults to current date", () => {
    const result = todayKey();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("uid", () => {
  it("includes the given prefix", () => {
    const id = uid("task");
    expect(id.startsWith("task_")).toBe(true);
  });

  it("defaults to id prefix", () => {
    const id = uid();
    expect(id.startsWith("id_")).toBe(true);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("generates different values with different prefixes", () => {
    const a = uid("a");
    const b = uid("b");
    expect(a).not.toBe(b);
  });
});
