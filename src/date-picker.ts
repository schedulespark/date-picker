/* eslint-disable jsdoc/require-jsdoc, max-lines -- Private DOM builders stay in one file so the vanilla widget structure is easy to follow. */
import {
  addDays,
  addMonths,
  addYears,
  generateDecadeYears,
  generateMonthGrid,
  generateYearMonths,
  isDateInRange,
  monthLabel,
  normalizeDate,
  orderedWeekdayLabels,
  parseDate,
  startOfMonth,
  todayString,
  weekdayOf
} from "./utils/date-utils";

import type { DatePickerInstance, DatePickerOptions } from "./types";
import type { CalendarDayCell } from "./utils/date-utils";

export interface PickerState {
  disabled: boolean;
  focusedDate: string;
  open: boolean;
  value: string;
  view: "day" | "month" | "year";
  viewMonth: string;
}

interface BuiltShell {
  input: HTMLInputElement;
  popover: HTMLElement;
  root: HTMLElement;
}

/**
 * Creates a framework-free month-grid calendar/date picker.
 *
 * Mirrors `@schedulespark/time-picker`'s architecture: the root/label/input/popover shell is
 * built once on mount and never replaced. Only the popover's own contents (header, weekday row,
 * day grid) are rebuilt in place when the displayed month, selection, or disabled state changes.
 */
// eslint-disable-next-line max-lines-per-function -- Closure state and its mutators must stay colocated.
export function createDatePicker(options: DatePickerOptions = {}): DatePickerInstance {
  let host: HTMLElement | null = null;
  let input: HTMLInputElement | null = null;
  let popover: HTMLElement | null = null;
  const initialValue = normalizeDate(options.value ?? "", options.minDate, options.maxDate) ?? "";
  let state: PickerState = {
    disabled: options.disabled ?? false,
    focusedDate: initialValue !== "" ? initialValue : todayString(),
    open: false,
    value: initialValue,
    view: "day",
    viewMonth: startOfMonth(initialValue !== "" ? initialValue : todayString())
  };

  const setState = (patch: Partial<PickerState>): void => {
    const next = { ...state, ...patch };
    state = { ...next, open: next.disabled ? false : next.open };
  };

  const isDayDisabled = (date: string): boolean => {
    if (!isDateInRange(date, options.minDate, options.maxDate)) return true;
    return options.isDateDisabled?.(date) ?? false;
  };

  const moveFocus = (nextDate: string): void => {
    if (isDayDisabled(nextDate)) return;
    setState({ focusedDate: nextDate, viewMonth: startOfMonth(nextDate) });
    refreshPopoverContent();
  };

  const refreshPopoverContent = (): void => {
    if (popover === null) return;
    const actions: PopoverActions = {
      commitSelection,
      goToMonthAndDayView,
      goToYearAndMonthView,
      jumpToToday,
      moveFocus,
      openMonthView: () => { setView("month"); },
      openYearView: () => { setView("year"); }
    };
    if (state.view === "month") {
      popover.replaceChildren(buildMonthView(state, actions));
    } else if (state.view === "year") {
      popover.replaceChildren(buildYearView(state, actions));
    } else {
      popover.replaceChildren(buildDayView(options, state, actions));
    }
  };

  const setDisplayedValue = (value: string): void => {
    if (input !== null) input.value = value;
  };

  const applyValue = (normalized: string): void => {
    setState({ value: normalized, viewMonth: startOfMonth(normalized) });
    setDisplayedValue(normalized);
    options.onChange?.(normalized);
  };

  const commitSelection = (nextValue: string): void => {
    if (isDayDisabled(nextValue)) return;
    const normalized = normalizeDate(nextValue, options.minDate, options.maxDate);
    if (normalized === null) return;
    applyValue(normalized);
    setState({ open: false, view: "day" });
    if (popover !== null) popover.hidden = true;
    refreshPopoverContent();
  };

  const commitTyped = (nextValue: string): void => {
    const normalized = normalizeDate(nextValue, options.minDate, options.maxDate);
    if (normalized === null || isDayDisabled(normalized)) {
      setDisplayedValue(state.value);
    } else {
      applyValue(normalized);
    }
    setState({ open: false, view: "day" });
    if (popover !== null) popover.hidden = true;
    refreshPopoverContent();
  };

  const setViewMonth = (monthValue: string): void => {
    setState({ viewMonth: startOfMonth(monthValue) });
    refreshPopoverContent();
  };

  const jumpToToday = (): void => {
    setViewMonth(todayString());
  };

  const setView = (view: PickerState["view"]): void => {
    setState({ view });
    refreshPopoverContent();
  };

  const goToMonthAndDayView = (monthValue: string): void => {
    setState({ view: "day", viewMonth: startOfMonth(monthValue) });
    refreshPopoverContent();
  };

  const goToYearAndMonthView = (year: number): void => {
    setState({ view: "month", viewMonth: startOfMonth(`${String(year)}-01-01`) });
    refreshPopoverContent();
  };

  const openPopover = (): void => {
    if (state.disabled || state.open) return;
    const anchor = state.value !== "" ? state.value : todayString();
    setState({ focusedDate: anchor, open: true, view: "day", viewMonth: startOfMonth(anchor) });
    refreshPopoverContent();
    if (popover !== null) popover.hidden = false;
  };

  const closePopover = (): void => {
    if (!state.open) return;
    setState({ open: false, view: "day" });
    if (popover !== null) popover.hidden = true;
  };

  const handleDocumentPointerDown = (event: PointerEvent): void => {
    if (host === null) return;
    if (event.target instanceof Node && host.contains(event.target)) return;
    closePopover();
  };

  return {
    destroy: () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      host?.replaceChildren();
      host = null;
      input = null;
      popover = null;
    },
    mount: (nextHost: HTMLElement) => {
      host = nextHost;
      const built = buildShell(
        options,
        state,
        commitTyped,
        openPopover,
        closePopover,
        () => state,
        moveFocus,
        commitSelection
      );
      input = built.input;
      popover = built.popover;
      host.replaceChildren(built.root);
      refreshPopoverContent();
      document.addEventListener("pointerdown", handleDocumentPointerDown);
    },
    setDisabled: (disabled: boolean) => {
      setState({ disabled });
      if (input !== null) input.disabled = disabled;
      if (popover !== null) popover.hidden = !state.open;
      refreshPopoverContent();
    },
    setRange: (minDate: string | undefined, maxDate: string | undefined) => {
      options.minDate = minDate;
      options.maxDate = maxDate;
      refreshPopoverContent();
    },
    setValue: (value: string) => {
      const normalized = normalizeDate(value, options.minDate, options.maxDate);
      if (normalized === null) return;
      setState({ value: normalized, viewMonth: startOfMonth(normalized) });
      setDisplayedValue(normalized);
      refreshPopoverContent();
    }
  };
}

/**
 * Builds the root/label/input/popover-container shell once, at mount time.
 */
// eslint-disable-next-line max-params -- The shell wires every input interaction hook once, at mount time only.
function buildShell(
  options: DatePickerOptions,
  state: PickerState,
  commitTyped: (value: string) => void,
  openPopover: () => void,
  closePopover: () => void,
  getState: () => PickerState,
  moveFocus: (date: string) => void,
  commitSelection: (date: string) => void
): BuiltShell {
  const root = element("div", "ssp-date-picker");
  const inputId = resolveInputId(options);
  const label = element("label", "ssp-date-picker__label");
  label.textContent = options.label ?? "Date";
  label.setAttribute("for", inputId);

  const input = buildInput(options, state, commitTyped, inputId, openPopover, closePopover, getState, moveFocus, commitSelection);
  const popover = element("div", "ssp-date-picker__popover");
  popover.hidden = !state.open;
  // Prevents any control inside the popover from stealing focus away from the input on click.
  // Without this, clicking a nav/day button would blur the input first (native focus-shift
  // behavior), which would immediately close the popover via the input's own blur handler —
  // snapping it shut before the button's own click handler runs. Selections still close the
  // popover themselves, through commitSelection.
  popover.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  root.append(label, input, popover);
  return { input, popover, root };
}

// eslint-disable-next-line max-params -- The input wires every interaction hook it needs once, at build time.
function buildInput(
  options: DatePickerOptions,
  state: PickerState,
  commitTyped: (value: string) => void,
  inputId: string,
  openPopover: () => void,
  closePopover: () => void,
  getState: () => PickerState,
  moveFocus: (date: string) => void,
  commitSelection: (date: string) => void
): HTMLInputElement {
  const input = document.createElement("input");
  input.className = "ssp-date-picker__input";
  input.disabled = state.disabled;
  input.id = inputId;
  input.name = options.name ?? "";
  input.placeholder = options.placeholder ?? "YYYY-MM-DD";
  input.required = options.required ?? false;
  input.type = "text";
  input.value = state.value;
  input.addEventListener("focus", () => {
    openPopover();
  });
  input.addEventListener("click", () => {
    // The input never actually blurs on internal popover interaction (mousedown prevents that),
    // so re-clicking a still-focused input after a selection fires no further 'focus' event —
    // without this, the popover could only be reopened by tabbing away and back.
    openPopover();
  });
  input.addEventListener("blur", () => {
    commitTyped(input.value);
  });
  input.addEventListener("keydown", (event) => {
    handleInputKeydown(event, getState(), options.weekStartsOn ?? 0, closePopover, moveFocus, commitSelection);
  });
  return input;
}

const ARROW_DAY_DELTA: Record<string, number> = {
  ArrowDown: 7,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7
};

// eslint-disable-next-line max-params, complexity -- Dispatches every keyboard interaction the popover supports in one place.
function handleInputKeydown(
  event: KeyboardEvent,
  state: PickerState,
  weekStartsOn: number,
  closePopover: () => void,
  moveFocus: (date: string) => void,
  commitSelection: (date: string) => void
): void {
  if (event.key === "Escape") {
    closePopover();
    return;
  }
  if (!state.open) return;

  if (event.key in ARROW_DAY_DELTA) {
    event.preventDefault();
    moveFocus(addDays(state.focusedDate, ARROW_DAY_DELTA[event.key] ?? 0));
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    // Offset relative to weekStartsOn, matching generateMonthGrid's own leading-day math —
    // using the raw weekday (0=Sunday) here would land Home/End one or more days off the
    // real start/end of the visible week row whenever weekStartsOn isn't Sunday.
    const weekday = weekdayOf(state.focusedDate);
    const offset = (weekday - weekStartsOn + 7) % 7;
    const delta = event.key === "Home" ? -offset : 6 - offset;
    moveFocus(addDays(state.focusedDate, delta));
    return;
  }
  if (event.key === "PageUp" || event.key === "PageDown") {
    event.preventDefault();
    const direction = event.key === "PageDown" ? 1 : -1;
    moveFocus(event.shiftKey ? addYears(state.focusedDate, direction) : addMonths(state.focusedDate, direction));
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    commitSelection(state.focusedDate);
  }
}

function resolveInputId(options: DatePickerOptions): string {
  const source = options.id ?? options.name ?? options.label ?? "date";
  return `ssp-date-picker-${source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

interface PopoverActions {
  commitSelection: (date: string) => void;
  goToMonthAndDayView: (monthValue: string) => void;
  goToYearAndMonthView: (year: number) => void;
  jumpToToday: () => void;
  moveFocus: (date: string) => void;
  openMonthView: () => void;
  openYearView: () => void;
}

function buildDayView(options: DatePickerOptions, state: PickerState, actions: PopoverActions): HTMLElement {
  const fragment = element("div", "ssp-date-picker__day-view");
  fragment.append(
    buildHeader(state, actions),
    buildWeekdayRow(options.weekStartsOn ?? 0),
    buildDayGrid(options, state, actions),
    buildTodayButton(actions)
  );
  return fragment;
}

function buildMonthView(state: PickerState, actions: PopoverActions): HTMLElement {
  const fragment = element("div", "ssp-date-picker__month-grid");
  const yearParts = parseDate(startOfMonth(state.viewMonth));
  const year = yearParts?.year ?? Number(todayString().slice(0, 4));

  const header = element("div", "ssp-date-picker__header-row");
  const prevButton = navButton("prev-year", "‹", () => {
    actions.goToYearAndMonthView(year - 1);
  });
  const label = document.createElement("button");
  label.className = "ssp-date-picker__header ssp-date-picker__header-button";
  label.type = "button";
  label.textContent = String(year);
  label.addEventListener("click", () => {
    actions.openYearView();
  });
  const nextButton = navButton("next-year", "›", () => {
    actions.goToYearAndMonthView(year + 1);
  });
  header.append(prevButton, label, nextButton);

  const grid = element("div", "ssp-date-picker__month-options");
  for (const month of generateYearMonths(year)) {
    const button = document.createElement("button");
    button.className = "ssp-date-picker__month-option";
    button.dataset.month = month.monthValue;
    button.type = "button";
    button.textContent = month.label;
    button.addEventListener("click", () => {
      actions.goToMonthAndDayView(month.monthValue);
    });
    grid.append(button);
  }

  fragment.append(header, grid);
  return fragment;
}

function buildYearView(state: PickerState, actions: PopoverActions): HTMLElement {
  const fragment = element("div", "ssp-date-picker__year-grid");
  const yearParts = parseDate(startOfMonth(state.viewMonth));
  const year = yearParts?.year ?? Number(todayString().slice(0, 4));
  const years = generateDecadeYears(year);

  const header = element("div", "ssp-date-picker__header-row");
  const prevButton = navButton("prev-decade", "‹", () => {
    actions.goToYearAndMonthView((years[0] ?? year) - 12);
  });
  const label = element("span", "ssp-date-picker__header");
  label.textContent = `${String(years[0])} – ${String(years[years.length - 1])}`;
  const nextButton = navButton("next-decade", "›", () => {
    actions.goToYearAndMonthView((years[0] ?? year) + 12);
  });
  header.append(prevButton, label, nextButton);

  const grid = element("div", "ssp-date-picker__year-options");
  for (const yearOption of years) {
    const button = document.createElement("button");
    button.className = "ssp-date-picker__year-option";
    button.dataset.year = String(yearOption);
    button.type = "button";
    button.textContent = String(yearOption);
    button.addEventListener("click", () => {
      actions.goToYearAndMonthView(yearOption);
    });
    grid.append(button);
  }

  fragment.append(header, grid);
  return fragment;
}

function buildHeader(state: PickerState, actions: PopoverActions): HTMLElement {
  const header = element("div", "ssp-date-picker__header-row");
  const prevButton = navButton("prev-month", "‹", () => {
    actions.goToMonthAndDayView(addMonths(state.viewMonth, -1));
  });
  const label = document.createElement("button");
  label.className = "ssp-date-picker__header ssp-date-picker__header-button";
  label.type = "button";
  label.textContent = monthLabel(state.viewMonth);
  label.addEventListener("click", () => {
    actions.openMonthView();
  });
  const nextButton = navButton("next-month", "›", () => {
    actions.goToMonthAndDayView(addMonths(state.viewMonth, 1));
  });
  header.append(prevButton, label, nextButton);
  return header;
}

function navButton(navKey: string, symbol: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "ssp-date-picker__nav";
  button.dataset.nav = navKey;
  button.type = "button";
  button.textContent = symbol;
  button.addEventListener("click", onClick);
  return button;
}

function buildWeekdayRow(weekStartsOn: number): HTMLElement {
  const row = element("div", "ssp-date-picker__weekdays");
  for (const label of orderedWeekdayLabels(weekStartsOn)) {
    const cell = element("span", "ssp-date-picker__weekday");
    cell.textContent = label;
    row.append(cell);
  }
  return row;
}

function buildDayGrid(options: DatePickerOptions, state: PickerState, actions: PopoverActions): HTMLElement {
  const grid = element("div", "ssp-date-picker__grid");
  const cells = generateMonthGrid(state.viewMonth, options.weekStartsOn ?? 0);
  for (const cell of cells) {
    grid.append(buildDayButton(cell, options, state, actions));
  }
  return grid;
}

function buildDayButton(
  cell: CalendarDayCell,
  options: DatePickerOptions,
  state: PickerState,
  actions: PopoverActions
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "ssp-date-picker__day";
  button.dataset.date = cell.date;
  button.dataset.selected = String(cell.date === state.value);
  button.dataset.today = String(cell.isToday);
  button.dataset.focused = String(cell.date === state.focusedDate);
  button.dataset.outsideMonth = String(!cell.isCurrentMonth);
  button.disabled = !cell.isCurrentMonth || !isDateInRange(cell.date, options.minDate, options.maxDate) || (options.isDateDisabled?.(cell.date) ?? false);
  button.textContent = String(cell.day);
  button.type = "button";
  button.addEventListener("click", () => {
    actions.moveFocus(cell.date);
    actions.commitSelection(cell.date);
  });
  return button;
}

function buildTodayButton(actions: PopoverActions): HTMLElement {
  const footer = element("div", "ssp-date-picker__footer");
  const button = document.createElement("button");
  button.className = "ssp-date-picker__today-button";
  button.type = "button";
  button.textContent = "Today";
  button.addEventListener("click", () => {
    actions.jumpToToday();
  });
  footer.append(button);
  return footer;
}

function element(tagName: "div" | "label" | "span", className: string): HTMLElement {
  const node = document.createElement(tagName);
  node.className = className;
  return node;
}
