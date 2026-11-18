/** Timezone-aware bucketing helpers. All analytics accept an IANA timezone so a
 * trader's "day" matches their session, not the server's clock. */

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const partFormatters = new Map<string, Intl.DateTimeFormat>();

const dateFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
};

const partFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    });
    partFormatters.set(timeZone, formatter);
  }
  return formatter;
};

/** "YYYY-MM-DD" in the given timezone. */
export const dayKeyOf = (iso: string, timeZone = "UTC"): string =>
  dateFormatter(timeZone).format(new Date(iso));

/** "YYYY-MM" in the given timezone. */
export const monthKeyOf = (iso: string, timeZone = "UTC"): string =>
  dayKeyOf(iso, timeZone).slice(0, 7);

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const weekdayOf = (iso: string, timeZone = "UTC"): Weekday => {
  const parts = partFormatter(timeZone).formatToParts(new Date(iso));
  return (parts.find((p) => p.type === "weekday")?.value ?? "Sun") as Weekday;
};

/** Hour of day 0-23 in the given timezone. */
export const hourOf = (iso: string, timeZone = "UTC"): number => {
  const parts = partFormatter(timeZone).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
};

export const TRADING_SESSIONS = [
  "Asian",
  "London_Open",
  "NY_AM_Open",
  "London_Close",
  "NY_PM_Close",
  "Off_Hours",
] as const;

export type TradingSession = (typeof TRADING_SESSIONS)[number];

/** Institutional killzones and trading sessions categorized by UTC timestamp. */
export const getTradingSession = (iso: string): TradingSession => {
  const d = new Date(iso);
  const utcHour = d.getUTCHours();
  const utcMinute = d.getUTCMinutes();
  const timeMinutes = utcHour * 60 + utcMinute;

  // Asian: 00:00 - 07:00 UTC
  if (timeMinutes >= 0 && timeMinutes < 7 * 60) return "Asian";
  // London Open / Killzone: 07:00 - 10:00 UTC
  if (timeMinutes >= 7 * 60 && timeMinutes < 10 * 60) return "London_Open";
  // NY AM / Open Killzone: 13:30 - 16:00 UTC
  if (timeMinutes >= 13 * 60 + 30 && timeMinutes < 16 * 60) return "NY_AM_Open";
  // London Close Killzone: 16:00 - 17:00 UTC
  if (timeMinutes >= 16 * 60 && timeMinutes < 17 * 60) return "London_Close";
  // NY PM / Close (Power Hour): 19:00 - 21:00 UTC
  if (timeMinutes >= 19 * 60 && timeMinutes <= 21 * 60) return "NY_PM_Close";

  return "Off_Hours";
};
