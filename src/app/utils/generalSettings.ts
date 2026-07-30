export interface GeneralSettingsConfig {
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  fiscalYearStart: string;
  language: string;
}

const defaultGeneralSettings: GeneralSettingsConfig = {
  // Nigerian defaults: BuildOS is deployed for a Nigerian construction group.
  // These are only the fallback for a fresh install — Admin → General Settings
  // overrides them, and every formatter reads the configured value, not these.
  currency: "NGN",
  currencySymbol: "₦",
  timezone: "Africa/Lagos",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24",
  numberFormat: "1,234.56",
  fiscalYearStart: "01",
  language: "en",
};

function getNumberLocale(numberFormat: string): string {
  if (numberFormat === "1.234,56") return "de-DE";
  if (numberFormat === "1 234.56") return "en-US";
  return "en-US";
}

export function getGeneralSettings(): GeneralSettingsConfig {
  if (typeof window === "undefined") return { ...defaultGeneralSettings };

  try {
    const raw = localStorage.getItem("buildos_general_settings");
    if (!raw) return { ...defaultGeneralSettings };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...defaultGeneralSettings };
    }
    return { ...defaultGeneralSettings, ...parsed };
  } catch {
    return { ...defaultGeneralSettings };
  }
}

export function formatCurrencyByGeneralSettings(
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const settings = getGeneralSettings();
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 0;
  const locale = getNumberLocale(settings.numberFormat);

  try {
    let formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(safeAmount);

    if (settings.numberFormat === "1 234.56") {
      formatted = formatted.replace(/,/g, " ");
    }

    return formatted;
  } catch {
    const absolute = Math.abs(safeAmount).toLocaleString();
    const sign = safeAmount < 0 ? "-" : "";
    return `${sign}${settings.currencySymbol}${absolute}`;
  }
}

export function getCurrencySymbol(): string {
  return getGeneralSettings().currencySymbol || "$";
}

/** ISO currency code (e.g. "NGN"), for contexts where a symbol won't do. */
export function getCurrencyCode(): string {
  return getGeneralSettings().currency || "USD";
}

/**
 * Column header for a money column in a CSV export, e.g. "Amount (NGN)".
 * Exports must carry raw numbers so spreadsheets can total them, which means the
 * currency has to live in the header rather than in every cell.
 */
export function csvAmountHeader(label: string): string {
  return `${label} (${getCurrencyCode()})`;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date according to the configured dateFormat
 * (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, or DD-MMM-YYYY).
 * Returns an empty string for invalid/empty input.
 */
export function formatDateByGeneralSettings(
  value: string | number | Date | null | undefined,
): string {
  const d = toDate(value);
  if (!d) return "";
  const { dateFormat } = getGeneralSettings();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = d.toLocaleString("en-US", { month: "short" });

  switch (dateFormat) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "DD-MMM-YYYY":
      return `${dd}-${mmm}-${yyyy}`;
    case "MM/DD/YYYY":
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}

/**
 * Formats a time according to the configured timeFormat ("12" or "24")
 * and the configured timezone.
 */
export function formatTimeByGeneralSettings(
  value: string | number | Date | null | undefined,
): string {
  const d = toDate(value);
  if (!d) return "";
  const { timeFormat, timezone } = getGeneralSettings();
  const hour12 = timeFormat !== "24";
  try {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
      timeZone: timezone || undefined,
    });
  } catch {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    });
  }
}

/**
 * Formats a combined date + time according to the configured settings.
 */
export function formatDateTimeByGeneralSettings(
  value: string | number | Date | null | undefined,
): string {
  const date = formatDateByGeneralSettings(value);
  if (!date) return "";
  const time = formatTimeByGeneralSettings(value);
  return time ? `${date} ${time}` : date;
}

/**
 * Formats a plain number according to the configured numberFormat
 * (thousands/decimal separators), without a currency symbol.
 */
export function formatNumberByGeneralSettings(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const safe = Number.isFinite(value) ? value : 0;
  const settings = getGeneralSettings();
  const locale = getNumberLocale(settings.numberFormat);
  let formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(safe);

  if (settings.numberFormat === "1 234.56") {
    formatted = formatted.replace(/,/g, " ");
  }
  return formatted;
}

/** Storage keys + the event fired whenever general settings change. */
export const GENERAL_SETTINGS_STORAGE_KEY = "buildos_general_settings";
export const CURRENCY_OPTIONS_STORAGE_KEY = "buildos_currency_options";
export const GENERAL_SETTINGS_CHANGED_EVENT =
  "buildos:general-settings-changed";

/**
 * Returns a time-of-day greeting ("Good morning" / "Good afternoon" /
 * "Good evening") based on the hour in the configured timezone, so the
 * greeting reflects the organisation's timezone rather than the browser's.
 */
export function getGreeting(value?: string | number | Date): string {
  const { timezone } = getGeneralSettings();
  const base = toDate(value ?? new Date()) ?? new Date();

  let hour: number;
  try {
    const hourPart = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone || undefined,
    })
      .formatToParts(base)
      .find((part) => part.type === "hour")?.value;
    hour = Number.parseInt(hourPart ?? "", 10);
    if (!Number.isFinite(hour)) hour = base.getHours();
  } catch {
    hour = base.getHours();
  }
  // Intl can return "24" for midnight in 24-hour mode.
  hour %= 24;

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Returns the current fiscal quarter label (e.g. "Q2 2026") derived from
 * the "Fiscal Year Start" month configured in Admin → General Settings
 * (fiscalYearStart: "01"–"12"). The year shown is the calendar year in
 * which the current fiscal year started.
 */
export function getCurrentFiscalQuarterLabel(
  value?: string | number | Date,
): string {
  return getFiscalQuarterRange(0, value).label;
}

/** A labelled date range (ISO YYYY-MM-DD, inclusive) for a fiscal period. */
export interface FiscalPeriodRange {
  label: string;
  from: string;
  to: string;
}

function fiscalYearStartMonth(): number {
  const { fiscalYearStart } = getGeneralSettings();
  return Math.min(12, Math.max(1, Number.parseInt(fiscalYearStart, 10) || 1));
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the fiscal quarter range `offset` quarters away from the current
 * one (0 = current quarter, -1 = previous quarter, …), based on the
 * configured fiscal year start month.
 */
export function getFiscalQuarterRange(
  offset = 0,
  value?: string | number | Date,
): FiscalPeriodRange {
  const startMonth = fiscalYearStartMonth();
  const now = toDate(value ?? new Date()) ?? new Date();

  const monthsSinceFYStart = (now.getMonth() + 1 - startMonth + 12) % 12;
  const fiscalYear =
    now.getMonth() + 1 >= startMonth
      ? now.getFullYear()
      : now.getFullYear() - 1;

  // Absolute quarter index so offsets roll across fiscal-year boundaries.
  const absoluteQuarter =
    fiscalYear * 4 + Math.floor(monthsSinceFYStart / 3) + offset;
  const fy = Math.floor(absoluteQuarter / 4);
  const quarter = ((absoluteQuarter % 4) + 4) % 4; // 0-based

  const start = new Date(fy, startMonth - 1 + quarter * 3, 1);
  const end = new Date(fy, startMonth - 1 + quarter * 3 + 3, 0);
  return {
    label: `Q${quarter + 1} ${fy}`,
    from: isoDate(start),
    to: isoDate(end),
  };
}

/**
 * Returns the current fiscal year range (e.g. "FY2026"), based on the
 * configured fiscal year start month.
 */
export function getFiscalYearRange(
  value?: string | number | Date,
): FiscalPeriodRange {
  const startMonth = fiscalYearStartMonth();
  const now = toDate(value ?? new Date()) ?? new Date();
  const fy =
    now.getMonth() + 1 >= startMonth
      ? now.getFullYear()
      : now.getFullYear() - 1;
  const start = new Date(fy, startMonth - 1, 1);
  const end = new Date(fy, startMonth - 1 + 12, 0);
  return { label: `FY${fy}`, from: isoDate(start), to: isoDate(end) };
}

/**
 * Applies the configured language to the document so the browser and
 * assistive tech render in the correct language/locale. Full UI string
 * translation is layered on top of this elsewhere.
 */
export function applyLanguageToDocument(): void {
  if (typeof document === "undefined") return;
  const { language } = getGeneralSettings();
  if (language) {
    document.documentElement.lang = language;
  }
}

/**
 * Persists newly-resolved general settings to localStorage, applies the
 * language to the document, and notifies the rest of the app so anything
 * that depends on the settings (currency symbols, date/number formatting,
 * greetings, language) updates immediately.
 */
export function hydrateGeneralSettings(
  generalSettings?: Partial<GeneralSettingsConfig> | null,
  currencyOptions?: unknown,
): void {
  if (typeof window === "undefined") return;

  let changed = false;

  if (generalSettings && typeof generalSettings === "object") {
    const merged = { ...defaultGeneralSettings, ...generalSettings };
    const nextStr = JSON.stringify(merged);
    if (localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY) !== nextStr) {
      localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, nextStr);
      changed = true;
    }
  }

  if (Array.isArray(currencyOptions)) {
    const nextStr = JSON.stringify(currencyOptions);
    if (localStorage.getItem(CURRENCY_OPTIONS_STORAGE_KEY) !== nextStr) {
      localStorage.setItem(CURRENCY_OPTIONS_STORAGE_KEY, nextStr);
      changed = true;
    }
  }

  applyLanguageToDocument();

  // Only notify when something actually changed so returning users whose
  // cached settings already match the server don't trigger needless re-renders.
  if (changed) {
    window.dispatchEvent(new Event(GENERAL_SETTINGS_CHANGED_EVENT));
  }
}
