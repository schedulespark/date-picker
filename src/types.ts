/**
 * Configuration for a vanilla date picker instance.
 */
export interface DatePickerOptions {
  disabled?: boolean;
  id?: string;
  isDateDisabled?: (date: string) => boolean;
  label?: string;
  maxDate?: string;
  minDate?: string;
  name?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value?: string;
  weekStartsOn?: number;
}

/**
 * Imperative controls returned by createDatePicker.
 */
export interface DatePickerInstance {
  destroy: () => void;
  mount: (host: HTMLElement) => void;
  setDisabled: (disabled: boolean) => void;
  setRange: (minDate: string | undefined, maxDate: string | undefined) => void;
  setValue: (value: string) => void;
}
