import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfettiLayer } from "./ConfettiLayer";

afterEach(() => {
  vi.useRealTimers();
});

describe("ConfettiLayer", () => {
  it("renders 34 deterministic pieces and removes them after 1400ms", () => {
    vi.useFakeTimers();
    const onFinished = vi.fn();
    render(<ConfettiLayer active random={() => 0.5} onFinished={onFinished} />);

    expect(screen.getAllByTestId("confetti-piece")).toHaveLength(34);
    expect(screen.getAllByTestId("confetti-piece")[0]).toHaveStyle({ left: "50%" });

    act(() => vi.advanceTimersByTime(1399));
    expect(screen.getAllByTestId("confetti-piece")).toHaveLength(34);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryAllByTestId("confetti-piece")).toHaveLength(0);
    expect(onFinished).toHaveBeenCalledOnce();
  });

  it("renders nothing when inactive", () => {
    render(<ConfettiLayer active={false} />);
    expect(screen.queryAllByTestId("confetti-piece")).toHaveLength(0);
  });
});
