import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../../../shared/components/Dialog/Modal";

describe("Modal", () => {
  test("renders title, description, children, and footer when open; unmounts children when closed", () => {
    const { rerender } = render(
      <Modal
        isOpen={true}
        onClose={jest.fn()}
        title="Create Item"
        description="Fill in the details below."
        footer={<button type="button">Save</button>}
      >
        <p>Modal Body Content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("open");

    const heading = screen.getByRole("heading", { name: "Create Item", hidden: true });
    const desc = screen.getByText("Fill in the details below.");
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
    expect(dialog).toHaveAttribute("aria-describedby", desc.id);
    expect(dialog).not.toHaveAttribute("aria-label");

    expect(screen.getByText("Modal Body Content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save", hidden: true })).toBeInTheDocument();

    rerender(
      <Modal
        isOpen={false}
        onClose={jest.fn()}
        title="Create Item"
        description="Fill in the details below."
        footer={<button type="button">Save</button>}
      >
        <p>Modal Body Content</p>
      </Modal>
    );

    expect(screen.queryByText("Modal Body Content")).not.toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("open");
  });

  test("sets aria-label when title is omitted", () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} ariaLabel="Quick Dialog">
        <p>Content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-label", "Quick Dialog");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  test("has no hardcoded my_modal_2 id and supports multiple independent instances with distinct ARIA IDs", () => {
    function TwoModals() {
      const [firstOpen, setFirstOpen] = useState(false);
      const [secondOpen, setSecondOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setFirstOpen(true)}>
            Open First
          </button>
          <button type="button" onClick={() => setSecondOpen(true)}>
            Open Second
          </button>
          <Modal
            isOpen={firstOpen}
            onClose={() => setFirstOpen(false)}
            title="First Modal"
            description="First description"
          >
            <p>First body</p>
          </Modal>
          <Modal
            isOpen={secondOpen}
            onClose={() => setSecondOpen(false)}
            title="Second Modal"
            description="Second description"
          >
            <p>Second body</p>
          </Modal>
        </div>
      );
    }

    const { container } = render(<TwoModals />);
    expect(container.querySelector("#my_modal_2")).toBeNull();

    const dialogs = container.querySelectorAll("dialog");
    expect(dialogs).toHaveLength(2);

    const title1 = screen.getByText("First Modal");
    const title2 = screen.getByText("Second Modal");
    const desc1 = screen.getByText("First description");
    const desc2 = screen.getByText("Second description");

    expect(title1.id).not.toBe("");
    expect(title2.id).not.toBe("");
    expect(title1.id).not.toBe(title2.id);
    expect(desc1.id).not.toBe(desc2.id);

    expect(screen.queryByText("First body")).not.toBeInTheDocument();
    expect(screen.queryByText("Second body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open First" }));
    expect(screen.getByText("First body")).toBeInTheDocument();
    expect(screen.queryByText("Second body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Second" }));
    expect(screen.getByText("First body")).toBeInTheDocument();
    expect(screen.getByText("Second body")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: "Close", hidden: true });
    fireEvent.click(closeButtons[0]);
    expect(screen.queryByText("First body")).not.toBeInTheDocument();
    expect(screen.getByText("Second body")).toBeInTheDocument();
  });

  test("handles native cancel event according to closeOnEsc and syncs on native close event", () => {
    const onClose = jest.fn();
    const { container, rerender } = render(
      <Modal isOpen={true} onClose={onClose} title="Esc Test" closeOnEsc={true}>
        <p>Body</p>
      </Modal>
    );

    const dialog = container.querySelector("dialog");
    const cancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(
      <Modal isOpen={true} onClose={onClose} title="Esc Test" closeOnEsc={false}>
        <p>Body</p>
      </Modal>
    );

    const blockedCancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(dialog, blockedCancelEvent);

    expect(blockedCancelEvent.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // Native close event (e.g. browser close watcher on double-Esc) syncs React state when isOpen is true
    fireEvent(dialog, new Event("close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Native close event does not trigger onClose again if already closed
    onClose.mockClear();
    rerender(
      <Modal isOpen={false} onClose={onClose} title="Esc Test" closeOnEsc={false}>
        <p>Body</p>
      </Modal>
    );
    fireEvent(dialog, new Event("close"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("backdrop click respects closeOnBackdrop", () => {
    const onClose = jest.fn();
    const { container, rerender } = render(
      <Modal isOpen={true} onClose={onClose} title="Backdrop Test" closeOnBackdrop={true}>
        <p>Body</p>
      </Modal>
    );

    const backdrop = container.querySelector(".modal-backdrop");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(
      <Modal isOpen={true} onClose={onClose} title="Backdrop Test" closeOnBackdrop={false}>
        <p>Body</p>
      </Modal>
    );

    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("traps Tab and Shift+Tab focus inside modal-box and restores focus to trigger on close", () => {
    function FocusHarness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open Trigger
          </button>
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Focus Trap"
            footer={
              <button type="button" onClick={() => setIsOpen(false)}>
                Confirm
              </button>
            }
          >
            <input aria-label="First Input" type="text" />
          </Modal>
        </div>
      );
    }

    const { container } = render(<FocusHarness />);
    const trigger = screen.getByRole("button", { name: "Open Trigger" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    const box = container.querySelector(".modal-box");
    const closeBtn = screen.getByRole("button", { name: "Close", hidden: true });
    const input = screen.getByLabelText("First Input");
    const confirmBtn = screen.getByRole("button", { name: "Confirm", hidden: true });

    // First focusable element receives focus when opened
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first focusable wraps to last focusable
    fireEvent.keyDown(box, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);

    // Tab from last focusable wraps to first focusable
    fireEvent.keyDown(box, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);

    // Move focus to middle input and verify normal Tab is not blocked
    input.focus();
    const middleTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    box.dispatchEvent(middleTabEvent);
    expect(middleTabEvent.defaultPrevented).toBe(false);

    // Closing restores focus back to trigger
    fireEvent.click(closeBtn);
    expect(document.activeElement).toBe(trigger);
  });
});
