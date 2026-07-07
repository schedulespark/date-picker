# Public API Review — @schedulespark/date-picker

## Exports

- `createDatePicker(options: DatePickerOptions): DatePickerInstance` — the sole entry point.
- `DatePickerOptions` — public configuration types for picker options.
- `DatePickerInstance` — imperative lifecycle methods (`mount`, `setValue`, `setDisabled`, `setRange`, `destroy`).

## Stability

This is a pre-1.0 beta package. `DatePickerOptions`/`DatePickerInstance` are treated as a real
semver-versioned contract from the first release — options are not casually renamed or removed
even before `1.0.0`. Internal modules (`date-utils.ts`'s individual functions, `date-picker.ts`'s
DOM builders) are not exported and carry no stability guarantee.

## Review sign-off

- [ ] Public API surface reviewed for necessity — no unused or speculative options.
- [ ] All public types documented in README.
- [ ] No internal implementation details (DOM structure, class names beyond documented CSS hooks) exposed as part of the contract.
