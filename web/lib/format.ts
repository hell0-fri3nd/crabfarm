export const toInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const toFirstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const FARM_TIME_ZONE = 'Asia/Manila';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: FARM_TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, month: 'short', day: 'numeric' });
const fullDateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: FARM_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: FARM_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'short' });

// Day words follow the farm's clock, not the server's, so "Today" matches what the user sees on the wall
export const toDayTimeLabel = (iso: string, now = new Date()) => {
  const at = new Date(iso);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const day = dayKey.format(at);

  if (day === dayKey.format(now)) return `Today, ${timeFormat.format(at)}`;
  if (day === dayKey.format(yesterday)) return `Yesterday, ${timeFormat.format(at)}`;
  return `${dateFormat.format(at)}, ${timeFormat.format(at)}`;
};

// Server Components must call this after a request read (e.g. a FastAPI fetch), or Cache Components rejects Date.now()
export const toTimeAgo = (iso: string, now = Date.now()) => {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const [unit, unitSeconds] = TIME_UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? ['second', 1];

  return relativeTime.format(Math.round(seconds / unitSeconds), unit);
};

// Manila has no daylight saving, so its day always starts at +08:00
export const toFarmDayStart = (now = new Date()) => `${dayKey.format(now)}T00:00:00+08:00`;

export const toFarmDayKey = (iso: string) => dayKey.format(new Date(iso));

export const toFarmTime = (iso: string) => timeFormat.format(new Date(iso));

export const toFarmShortDate = (iso: string) => dateFormat.format(new Date(iso));

export const toFarmDateTime = (iso: string) => fullDateTimeFormat.format(new Date(iso));

export const toFarmDayLabel = (iso: string, now = new Date()) => {
  const day = toFarmDayKey(iso);
  if (day === dayKey.format(now)) return 'Today';
  if (day === dayKey.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
  return weekdayFormat.format(new Date(iso));
};
