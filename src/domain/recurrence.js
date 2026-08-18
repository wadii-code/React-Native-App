/**
 * Recurrence (tasks) and schedules (habits) share the same weekday vocabulary,
 * so they live together. Legacy task recurrence was the string 'daily' |
 * 'weekly' | 'monthly'; normalizeRecurrence keeps those working forever.
 */
import { keyWeekday, addDaysKey, daysBetweenKeys, startOfDay, addDays } from '../utils';

export const WEEKDAYS = [
  { id: 1, short: 'Mon', letter: 'M' },
  { id: 2, short: 'Tue', letter: 'T' },
  { id: 3, short: 'Wed', letter: 'W' },
  { id: 4, short: 'Thu', letter: 'T' },
  { id: 5, short: 'Fri', letter: 'F' },
  { id: 6, short: 'Sat', letter: 'S' },
  { id: 0, short: 'Sun', letter: 'S' },
];

export const RECURRENCE_PRESETS = [
  { type: null, label: 'No repeat' },
  { type: 'daily', label: 'Every day' },
  { type: 'weekdays', label: 'Every weekday' },
  { type: 'weekly', label: 'Every week' },
  { type: 'biweekly', label: 'Every 2 weeks' },
  { type: 'monthly', label: 'Every month' },
  { type: 'yearly', label: 'Every year' },
];

/** Accepts legacy strings, objects, or null. Always returns an object or null. */
export function normalizeRecurrence(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    switch (value) {
      case 'daily':
        return { type: 'daily', interval: 1, weekdays: [] };
      case 'weekly':
        return { type: 'weekly', interval: 1, weekdays: [] };
      case 'monthly':
        return { type: 'monthly', interval: 1, weekdays: [] };
      case 'weekdays':
        return { type: 'weekdays', interval: 1, weekdays: [1, 2, 3, 4, 5] };
      case 'yearly':
        return { type: 'yearly', interval: 1, weekdays: [] };
      default:
        return null;
    }
  }
  if (!value.type) return null;
  return {
    type: value.type,
    interval: value.interval || 1,
    weekdays: Array.isArray(value.weekdays) ? value.weekdays : [],
  };
}

export function recurrenceLabel(value) {
  const r = normalizeRecurrence(value);
  if (!r) return null;
  const names = (ids) =>
    WEEKDAYS.filter((w) => ids.includes(w.id))
      .map((w) => w.short)
      .join(', ');
  switch (r.type) {
    case 'daily':
      return r.interval > 1 ? `Every ${r.interval} days` : 'Every day';
    case 'weekdays':
      return 'Every weekday';
    case 'weekly':
      if (r.weekdays.length) return `Every ${names(r.weekdays)}`;
      return r.interval > 1 ? `Every ${r.interval} weeks` : 'Every week';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return r.interval > 1 ? `Every ${r.interval} months` : 'Every month';
    case 'yearly':
      return 'Every year';
    case 'custom':
      return r.weekdays.length ? `Every ${names(r.weekdays)}` : `Every ${r.interval} days`;
    default:
      return 'Repeats';
  }
}

/** Next due timestamp after completing an occurrence due at `currentDueDate`. */
export function getNextRecurrenceDate(currentDueDate, recurrence) {
  const r = normalizeRecurrence(recurrence);
  if (!r) return null;
  const base = startOfDay(currentDueDate || Date.now());
  switch (r.type) {
    case 'daily':
      return addDays(base, r.interval || 1);
    case 'weekdays': {
      let next = addDays(base, 1);
      let guard = 0;
      while (guard < 10) {
        const wd = new Date(next).getDay();
        if (wd !== 0 && wd !== 6) return next;
        next = addDays(next, 1);
        guard += 1;
      }
      return next;
    }
    case 'weekly':
    case 'custom': {
      if (r.weekdays && r.weekdays.length) {
        for (let i = 1; i <= 7; i += 1) {
          const cand = addDays(base, i);
          if (r.weekdays.includes(new Date(cand).getDay())) return cand;
        }
        return addDays(base, 7);
      }
      return addDays(base, 7 * (r.interval || 1));
    }
    case 'biweekly':
      return addDays(base, 14);
    case 'monthly': {
      const d = new Date(base);
      d.setMonth(d.getMonth() + (r.interval || 1));
      return startOfDay(d.getTime());
    }
    case 'yearly': {
      const d = new Date(base);
      d.setFullYear(d.getFullYear() + (r.interval || 1));
      return startOfDay(d.getTime());
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------- schedules */

export const SCHEDULE_TYPES = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'specificDays', label: 'Certain days' },
  { id: 'timesPerWeek', label: 'X times / week' },
  { id: 'timesPerMonth', label: 'X times / month' },
  { id: 'everyNDays', label: 'Every N days' },
];

export function normalizeSchedule(schedule) {
  const s = schedule || {};
  return {
    type: s.type || 'daily',
    days: Array.isArray(s.days) ? s.days : [1, 2, 3, 4, 5, 6, 0],
    times: s.times || 3,
    interval: s.interval || 2,
  };
}

export function scheduleLabel(schedule) {
  const s = normalizeSchedule(schedule);
  const names = WEEKDAYS.filter((w) => s.days.includes(w.id)).map((w) => w.short);
  switch (s.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Mon – Fri';
    case 'specificDays':
      return names.length ? names.join(', ') : 'No days selected';
    case 'timesPerWeek':
      return `${s.times}× per week`;
    case 'timesPerMonth':
      return `${s.times}× per month`;
    case 'everyNDays':
      return `Every ${s.interval} days`;
    default:
      return 'Every day';
  }
}

/**
 * Is this habit *required* on that day?
 * Flexible schedules (timesPerWeek / timesPerMonth) have no fixed day, so they
 * are never "required" on a given date — the engine judges them per period.
 */
export function isScheduledOn(schedule, key, startKey) {
  const s = normalizeSchedule(schedule);
  switch (s.type) {
    case 'daily':
      return true;
    case 'weekdays': {
      const wd = keyWeekday(key);
      return wd >= 1 && wd <= 5;
    }
    case 'specificDays':
      return s.days.includes(keyWeekday(key));
    case 'everyNDays': {
      if (!startKey) return true;
      const diff = daysBetweenKeys(startKey, key);
      return diff >= 0 && diff % Math.max(1, s.interval) === 0;
    }
    case 'timesPerWeek':
    case 'timesPerMonth':
      return false;
    default:
      return true;
  }
}

export function isFlexibleSchedule(schedule) {
  const t = normalizeSchedule(schedule).type;
  return t === 'timesPerWeek' || t === 'timesPerMonth';
}

/** Days in [fromKey, toKey] on which the habit is required. */
export function scheduledKeysBetween(schedule, startKey, fromKey, toKey) {
  const out = [];
  let cur = fromKey;
  let guard = 0;
  while (cur <= toKey && guard < 2000) {
    if (isScheduledOn(schedule, cur, startKey)) out.push(cur);
    cur = addDaysKey(cur, 1);
    guard += 1;
  }
  return out;
}
