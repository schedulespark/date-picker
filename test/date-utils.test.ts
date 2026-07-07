import { describe, expect, it, vi } from "vitest";

import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  compareDates,
  formatDate,
  generateDecadeYears,
  generateMonthGrid,
  generateYearMonths,
  isDateInRange,
  monthLabel,
  normalizeDate,
  orderedWeekdayLabels,
  parseDate,
  startOfMonth,
  weekdayOf
} from "../src/utils/date-utils";

describe("parseDate", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    expect(parseDate("2026-07-04")).toEqual({ year: 2026, month: 6, day: 4 });
  });

  it("rejects malformed strings", () => {
    expect(parseDate("07/04/2026")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("handles leap years correctly", () => {
    expect(parseDate("2024-02-29")).toEqual({ year: 2024, month: 1, day: 29 });
    expect(parseDate("2023-02-29")).toBeNull();
  });

  it("handles the century leap-year exception (divisible by 100 but not 400)", () => {
    expect(parseDate("2000-02-29")).toEqual({ year: 2000, month: 1, day: 29 });
    expect(parseDate("1900-02-29")).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats parts back to YYYY-MM-DD", () => {
    expect(formatDate({ year: 2026, month: 6, day: 4 })).toBe("2026-07-04");
    expect(formatDate({ year: 2026, month: 0, day: 1 })).toBe("2026-01-01");
  });
});

describe("compareDates", () => {
  it("orders dates lexicographically", () => {
    expect(compareDates("2026-07-04", "2026-07-05")).toBeLessThan(0);
    expect(compareDates("2026-07-05", "2026-07-04")).toBeGreaterThan(0);
    expect(compareDates("2026-07-04", "2026-07-04")).toBe(0);
  });
});

describe("isDateInRange / clampDate", () => {
  it("reports whether a date is within min/max bounds", () => {
    expect(isDateInRange("2026-07-04", "2026-07-01", "2026-07-31")).toBe(true);
    expect(isDateInRange("2026-06-30", "2026-07-01", "2026-07-31")).toBe(false);
    expect(isDateInRange("2026-08-01", "2026-07-01", "2026-07-31")).toBe(false);
  });

  it("clamps a date to the nearest bound", () => {
    expect(clampDate("2026-06-30", "2026-07-01", "2026-07-31")).toBe("2026-07-01");
    expect(clampDate("2026-08-01", "2026-07-01", "2026-07-31")).toBe("2026-07-31");
    expect(clampDate("2026-07-15", "2026-07-01", "2026-07-31")).toBe("2026-07-15");
  });
});

describe("normalizeDate", () => {
  it("normalizes and clamps a parseable value", () => {
    expect(normalizeDate("2026-07-04")).toBe("2026-07-04");
    expect(normalizeDate("2026-06-30", "2026-07-01", "2026-07-31")).toBe("2026-07-01");
  });

  it("returns null for unparseable input", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});

describe("weekdayOf", () => {
  it("returns 0=Sunday..6=Saturday", () => {
    expect(weekdayOf("2026-07-05")).toBe(0); // Sunday
    expect(weekdayOf("2026-07-06")).toBe(1); // Monday
    expect(weekdayOf("2026-07-11")).toBe(6); // Saturday
  });
});

describe("addDays / addMonths / addYears", () => {
  it("adds and subtracts days across month/year boundaries", () => {
    expect(addDays("2026-07-04", 1)).toBe("2026-07-05");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("adds and subtracts months, clamping the day when the target month is shorter", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", -2)).toBe("2026-01-15");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("adds and subtracts years", () => {
    expect(addYears("2026-07-04", 1)).toBe("2027-07-04");
    expect(addYears("2026-07-04", -1)).toBe("2025-07-04");
  });
});

describe("startOfMonth", () => {
  it("returns the first day of the given date's month", () => {
    expect(startOfMonth("2026-07-15")).toBe("2026-07-01");
  });
});

describe("generateMonthGrid", () => {
  it("produces a 42-cell grid starting on the configured weekStartsOn", () => {
    // July 2026: 1st is a Wednesday. weekStartsOn=0 (Sunday) means the grid starts Sun 2026-06-28.
    const cells = generateMonthGrid("2026-07-01", 0);
    expect(cells).toHaveLength(42);
    expect(cells[0]?.date).toBe("2026-06-28");
    expect(cells[0]?.isCurrentMonth).toBe(false);
    const july1 = cells.find((cell) => cell.date === "2026-07-01");
    expect(july1?.isCurrentMonth).toBe(true);
    expect(july1?.day).toBe(1);
  });

  it("respects a non-Sunday weekStartsOn", () => {
    // weekStartsOn=1 (Monday): July 1 2026 is Wednesday, grid should start Mon 2026-06-29.
    const cells = generateMonthGrid("2026-07-01", 1);
    expect(cells[0]?.date).toBe("2026-06-29");
  });

  it("marks today's cell as isToday and every other cell as not", () => {
    // Pin the system clock instead of relying on whatever date the suite happens to run on —
    // otherwise this test silently stops verifying anything once the real date moves past 2026-07-04.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 4));

    const cells = generateMonthGrid("2026-07-01", 0);
    const today = cells.find((cell) => cell.date === "2026-07-04");
    const notToday = cells.find((cell) => cell.date === "2026-07-05");
    expect(today?.isToday).toBe(true);
    expect(notToday?.isToday).toBe(false);

    vi.useRealTimers();
  });
});

describe("monthLabel", () => {
  it("formats a month value as 'Month YYYY'", () => {
    expect(monthLabel("2026-07-01")).toBe("July 2026");
  });
});

describe("orderedWeekdayLabels", () => {
  it("rotates weekday labels to start on the configured day", () => {
    expect(orderedWeekdayLabels(0)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(orderedWeekdayLabels(1)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});

describe("generateYearMonths", () => {
  it("returns all 12 months for a year with short labels", () => {
    const months = generateYearMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ label: "Jan", monthValue: "2026-01-01" });
    expect(months[11]).toEqual({ label: "Dec", monthValue: "2026-12-01" });
  });
});

describe("generateDecadeYears", () => {
  it("returns a 12-year page aligned to a 12-year boundary", () => {
    expect(generateDecadeYears(2026)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027
    ]);
  });
});
