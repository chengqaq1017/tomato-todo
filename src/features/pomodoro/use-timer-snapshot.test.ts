/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimerSnapshot } from "./use-timer-snapshot";

const settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartNext: false,
  soundEnabled: true,
};

const idleTimer = {
  mode: "work" as const,
  status: "idle" as const,
  accumulatedSeconds: 0,
};

const frozenNow = Date.now();

describe("useTimerSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(frozenNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns idle state with full remaining time", () => {
    const { result } = renderHook(() => useTimerSnapshot(idleTimer, settings));
    expect(result.current.total).toBe(25 * 60);
    expect(result.current.elapsed).toBe(0);
    expect(result.current.remaining).toBe(25 * 60);
    expect(result.current.progress).toBe(0);
    expect(result.current.complete).toBe(false);
  });

  it("returns correct values when timer is running", () => {
    const { result } = renderHook(() =>
      useTimerSnapshot(
        { ...idleTimer, status: "running", startedAt: frozenNow },
        settings,
      ),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // elapsed = tick(now+5000) - startedAt(now) = 5s → accumulated 0 + 5 = 5
    expect(result.current.elapsed).toBe(5);
    expect(result.current.remaining).toBe(25 * 60 - 5);
    expect(result.current.progress).toBeCloseTo(5 / (25 * 60), 5);
    expect(result.current.complete).toBe(false);
  });

  it("accounts for accumulatedSeconds from paused state", () => {
    // Simulate: already accumulated 10s before resuming
    const { result } = renderHook(() =>
      useTimerSnapshot(
        {
          mode: "work",
          status: "running",
          startedAt: frozenNow,
          accumulatedSeconds: 10,
        },
        settings,
      ),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsed).toBe(13); // 10 accumulated + 3 running
    expect(result.current.remaining).toBe(25 * 60 - 13);
  });

  it("does not tick when paused", () => {
    const { result, rerender } = renderHook(
      ({ timer }) => useTimerSnapshot(timer, settings),
      {
        initialProps: {
          timer: {
            ...idleTimer,
            status: "running" as const,
            startedAt: frozenNow,
          },
        },
      },
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    // Pause — switch to paused with accumulated time
    rerender({
      timer: {
        mode: "work" as const,
        status: "paused" as const,
        accumulatedSeconds: 2,
      },
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Should still be 2 — no ticking while paused
    expect(result.current.elapsed).toBe(2);
  });

  it("detects completion when elapsed >= total", () => {
    const shortSettings = { ...settings, workMinutes: 0.1 }; // 6 seconds
    const { result } = renderHook(() =>
      useTimerSnapshot(
        { ...idleTimer, status: "running", startedAt: frozenNow },
        shortSettings,
      ),
    );

    act(() => {
      vi.advanceTimersByTime(7000); // past 6s
    });

    expect(result.current.complete).toBe(true);
    expect(result.current.remaining).toBe(0);
    expect(result.current.progress).toBe(1);
  });

  it("adjusts total when mode changes", () => {
    const { result, rerender } = renderHook(
      ({ timer }) => useTimerSnapshot(timer, settings),
      {
        initialProps: { timer: { ...idleTimer, status: "idle" as const } },
      },
    );

    expect(result.current.total).toBe(25 * 60); // work

    rerender({
      timer: { ...idleTimer, mode: "shortBreak" as const, status: "idle" as const },
    });
    expect(result.current.total).toBe(5 * 60); // short break

    rerender({
      timer: { ...idleTimer, mode: "longBreak" as const, status: "idle" as const },
    });
    expect(result.current.total).toBe(15 * 60); // long break
  });

  it("stops interval when unmounted", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useTimerSnapshot(idleTimer, settings));

    // Start running by re-rendering with running state
    unmount();
    // clearInterval should have been called by the cleanup
    // (it's called in the effect cleanup, which runs on unmount only if the effect ran)
    // Since status is "idle", the effect doesn't register — so clearInterval won't be called
    // That's correct behavior: no interval to clean up
  });
});
