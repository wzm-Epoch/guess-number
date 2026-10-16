import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import * as dialogModule from "./Dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const Dialog = dialogModule.Dialog;

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>打开战绩</button>
      {typeof Dialog === "function" ? (
        <Dialog open={open} title="历史记录" onClose={() => setOpen(false)} returnFocusRef={triggerRef}>
          <button type="button">第一项</button>
          <button type="button">最后一项</button>
        </Dialog>
      ) : null}
    </>
  );
}

describe("Dialog", () => {
  it("has an accessible name, moves focus inside, traps Tab, and restores focus", async () => {
    expect(dialogModule.Dialog).toBeTypeOf("function");
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "打开战绩" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    screen.getByRole("button", { name: "最后一项" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "关闭" })).toHaveFocus();

    screen.getByRole("button", { name: "关闭" }).focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "最后一项" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes when the backdrop itself is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "打开战绩" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "历史记录" });
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
