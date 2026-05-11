/**
 * Calendar-aware elapsed breakdown from `start` to `end` (inclusive of partial units at end).
 * Months advance with `setMonth` (same edge cases as manual date math).
 */
export type ElapsedTogether = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
};

export function elapsedTogether(start: Date, end: Date): ElapsedTogether {
  if (end.getTime() < start.getTime()) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
  }

  let cursor = new Date(start.getTime());
  let years = 0;
  for (;;) {
    const next = new Date(cursor);
    next.setFullYear(next.getFullYear() + 1);
    if (next.getTime() <= end.getTime()) {
      years += 1;
      cursor = next;
    } else {
      break;
    }
  }

  let months = 0;
  for (;;) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next.getTime() <= end.getTime()) {
      months += 1;
      cursor = next;
    } else {
      break;
    }
  }

  const ms = end.getTime() - cursor.getTime();
  const DAY = 86400000;
  const days = Math.floor(ms / DAY);
  let rem = ms - days * DAY;
  const hours = Math.floor(rem / 3600000);
  rem -= hours * 3600000;
  const minutes = Math.floor(rem / 60000);

  return { years, months, days, hours, minutes };
}
