import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatePicker } from "../src";

describe("createDatePicker", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("mounts a date picker with a hidden popover by default", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ label: "Start date", value: "2026-07-04" }).mount(host);

    expect(host.querySelector("input")?.value).toBe("2026-07-04");
    expect(host.querySelector("label")?.getAttribute("for")).toBe(host.querySelector("input")?.id);
    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("opens the popover on focus and shows the month containing the current value", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("July 2026");
    expect(host.querySelector("[data-date='2026-07-04']")?.getAttribute("data-selected")).toBe("true");
  });

  it("closes the popover with Escape without changing the value", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the popover when clicking outside", () => {
    const host = document.createElement("div");
    const outside = document.createElement("button");
    document.body.append(host, outside);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("commits a day selection, updates the input, and closes the popover", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    host.querySelector<HTMLButtonElement>("[data-date='2026-07-15']")?.click();

    expect(onChange).toHaveBeenCalledWith("2026-07-15");
    expect(host.querySelector("input")?.value).toBe("2026-07-15");
    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("does not open the popover when disabled", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ disabled: true, value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("normalizes typed values on blur", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.focus();
    input!.value = "2026-08-01";
    input?.dispatchEvent(new Event("input", { bubbles: true }));
    input?.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(onChange).toHaveBeenLastCalledWith("2026-08-01");
    expect(input?.value).toBe("2026-08-01");
  });

  it("reverts to the last valid value on blur when the typed text does not parse, without emitting onChange", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.focus();
    input!.value = "not a date";
    input?.dispatchEvent(new Event("input", { bubbles: true }));
    input?.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(onChange).not.toHaveBeenCalled();
    expect(input?.value).toBe("2026-07-04");
  });

  it("disables out-of-range days and a custom isDateDisabled predicate", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({
      isDateDisabled: (date) => date === "2026-07-10",
      maxDate: "2026-07-20",
      minDate: "2026-07-05",
      value: "2026-07-04"
    }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-04']")?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-10']")?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-21']")?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-15']")?.disabled).toBe(false);
  });

  it("jumps to today via the today button", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2020-01-01" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    host.querySelector<HTMLButtonElement>(".ssp-date-picker__today-button")?.click();

    const today = new Date();
    const label = `${["January","February","March","April","May","June","July","August","September","October","November","December"][today.getMonth()]} ${today.getFullYear()}`;
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain(label);
  });

  it("keeps the popover open when a real pointer sequence switches to next month, and still commits a subsequent selection", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    const nextButton = host.querySelector<HTMLButtonElement>("[data-nav='next-month']");
    nextButton?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("August 2026");

    const dayButton = host.querySelector<HTMLButtonElement>("[data-date='2026-08-10']");
    dayButton?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    dayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith("2026-08-10");
    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("prevents the default mousedown action on popover controls so they never steal focus from the input", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    const nextButton = host.querySelector<HTMLButtonElement>("[data-nav='next-month']");
    const mousedown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    nextButton?.dispatchEvent(mousedown);

    expect(mousedown.defaultPrevented).toBe(true);
  });

  it("reopens the popover when clicking the still-focused input again after a selection closed it", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    host.querySelector<HTMLButtonElement>("[data-date='2026-07-15']")?.click();

    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");

    input?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
  });

  it("closes an open popover when disabled via setDisabled, and ignores an unparseable setValue", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const picker = createDatePicker({ value: "2026-07-04" });
    picker.mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    picker.setDisabled(true);
    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
    expect(host.querySelector("input")?.disabled).toBe(true);

    picker.setDisabled(false);
    picker.setValue("garbage");
    expect(host.querySelector("input")?.value).toBe("2026-07-04");
  });

  it("updates the displayed value via setValue without closing an open popover", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const picker = createDatePicker({ value: "2026-07-04" });
    picker.mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    picker.setValue("2026-07-20");

    expect(host.querySelector("input")?.value).toBe("2026-07-20");
    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
  });

  it("updates which days are disabled via setRange without closing the popover or losing the displayed value", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const picker = createDatePicker({ value: "2026-07-04" });
    picker.mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-10']")?.disabled).toBe(false);

    picker.setRange("2026-07-08", "2026-07-20");

    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-05']")?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-10']")?.disabled).toBe(false);
    expect(host.querySelector<HTMLButtonElement>("[data-date='2026-07-25']")?.disabled).toBe(true);
    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector("input")?.value).toBe("2026-07-04");
  });

  it("does not rebuild the shell when calling setRange, unlike a re-mount", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const picker = createDatePicker({ value: "2026-07-04" });
    picker.mount(host);
    const inputBefore = host.querySelector("input");

    picker.setRange("2026-07-01", "2026-07-31");

    expect(host.querySelector("input")).toBe(inputBefore);
  });

  it("moves the keyboard focus cursor with arrow keys without closing the popover", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));

    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector("[data-date='2026-07-05']")?.getAttribute("data-focused")).toBe("true");
  });

  it("moves the focus cursor by a week with ArrowDown and navigates months automatically", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-28" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }));

    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("August 2026");
    expect(host.querySelector("[data-date='2026-08-04']")?.getAttribute("data-focused")).toBe("true");
  });

  it("moves the focus cursor to the start/end of the week with Home/End", () => {
    const host = document.createElement("div");
    document.body.append(host);

    // 2026-07-08 is a Wednesday; week (Sun-Sat) is 2026-07-05..2026-07-11.
    createDatePicker({ value: "2026-07-08" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }));
    expect(host.querySelector("[data-date='2026-07-05']")?.getAttribute("data-focused")).toBe("true");

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }));
    expect(host.querySelector("[data-date='2026-07-11']")?.getAttribute("data-focused")).toBe("true");
  });

  it("respects weekStartsOn when computing Home/End", () => {
    const host = document.createElement("div");
    document.body.append(host);

    // With weekStartsOn=1 (Monday), 2026-07-08's (Wednesday) week is 2026-07-06..2026-07-12.
    createDatePicker({ value: "2026-07-08", weekStartsOn: 1 }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }));
    expect(host.querySelector("[data-date='2026-07-06']")?.getAttribute("data-focused")).toBe("true");

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }));
    expect(host.querySelector("[data-date='2026-07-12']")?.getAttribute("data-focused")).toBe("true");
  });

  it("moves the focus cursor by a month with PageUp/PageDown and by a year with Shift+PageUp/PageDown", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "PageDown" }));
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("August 2026");

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "PageDown", shiftKey: true }));
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("August 2027");
  });

  it("commits the focused date with Enter, closing the popover", () => {
    const host = document.createElement("div");
    const onChange = vi.fn();
    document.body.append(host);

    createDatePicker({ onChange, value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }));

    expect(onChange).toHaveBeenCalledWith("2026-07-05");
    expect(host.querySelector(".ssp-date-picker__popover")?.getAttribute("hidden")).toBe("");
  });

  it("does not move the focus cursor onto a disabled day", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ maxDate: "2026-07-05", value: "2026-07-04" }).mount(host);
    const input = host.querySelector("input");
    input?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }));

    // Second ArrowRight would move to 2026-07-06, past maxDate — should clamp/stay at 2026-07-05.
    expect(host.querySelector("[data-date='2026-07-05']")?.getAttribute("data-focused")).toBe("true");
  });

  it("drills down into a month grid when the header is clicked, and picks a month", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    host.querySelector<HTMLButtonElement>(".ssp-date-picker__header-button")?.click();

    expect(host.querySelector(".ssp-date-picker__month-grid")).not.toBeNull();
    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);

    host.querySelector<HTMLButtonElement>("[data-month='2026-03-01']")?.click();

    expect(host.querySelector(".ssp-date-picker__day-view")).not.toBeNull();
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("March 2026");
    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
  });

  it("drills down from month grid into a year grid, and picks a year", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    host.querySelector<HTMLButtonElement>(".ssp-date-picker__header-button")?.click();
    host.querySelector<HTMLButtonElement>(".ssp-date-picker__header-button")?.click();

    expect(host.querySelector(".ssp-date-picker__year-grid")).not.toBeNull();

    host.querySelector<HTMLButtonElement>("[data-year='2020']")?.click();

    expect(host.querySelector(".ssp-date-picker__month-grid")).not.toBeNull();
    expect(host.querySelector(".ssp-date-picker__header")?.textContent).toContain("2020");
  });

  it("does not steal input focus when drilling down (mousedown prevented on month/year controls too)", () => {
    const host = document.createElement("div");
    document.body.append(host);

    createDatePicker({ value: "2026-07-04" }).mount(host);
    host.querySelector("input")?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

    const headerButton = host.querySelector<HTMLButtonElement>(".ssp-date-picker__header-button");
    headerButton?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    headerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.querySelector(".ssp-date-picker__popover")?.hasAttribute("hidden")).toBe(false);
    expect(host.querySelector(".ssp-date-picker__month-grid")).not.toBeNull();
  });
});
