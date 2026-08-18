const MS = 86400000;

export const DAY_MS = MS;

/* ---------------------------------------------------------------- dates */

export function startOfDay(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(timestamp, days) {
  const d = new Date(timestamp);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(timestamp) {
  if (!timestamp) return false;
  return startOfToday() === startOfDay(timestamp);
}

export function isTomorrow(timestamp) {
  if (!timestamp) return false;
  return addDays(startOfToday(), 1) === startOfDay(timestamp);
}

export function isPast(timestamp) {
  if (!timestamp) return false;
  return startOfDay(timestamp) < startOfToday();
}

/* --------------------------------------------------- day keys (YYYY-MM-DD)
 * The whole progress engine speaks in local day keys so a completion always
 * lands on the day the user experienced, regardless of timezone maths.       */

export function dateKey(timestamp) {
  const d = new Date(timestamp == null ? Date.now() : timestamp);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayKey() {
  return dateKey(Date.now());
}

export function keyToTs(key) {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function addDaysKey(key, days) {
  return dateKey(addDays(keyToTs(key), days));
}

export function daysBetweenKeys(fromKey, toKey) {
  return Math.round((keyToTs(toKey) - keyToTs(fromKey)) / MS);
}

export function keyWeekday(key) {
  return new Date(keyToTs(key)).getDay(); // 0 = Sunday
}

export function rangeKeys(fromKey, toKey) {
  const out = [];
  if (!fromKey || !toKey) return out;
  let cur = fromKey;
  let guard = 0;
  while (cur <= toKey && guard < 4000) {
    out.push(cur);
    cur = addDaysKey(cur, 1);
    guard += 1;
  }
  return out;
}

export function clampKey(key, minKey, maxKey) {
  if (minKey && key < minKey) return minKey;
  if (maxKey && key > maxKey) return maxKey;
  return key;
}

/* Week starts Monday — matches how people plan their week. */
export function startOfWeekKey(key) {
  const wd = keyWeekday(key);
  const back = wd === 0 ? 6 : wd - 1;
  return addDaysKey(key, -back);
}

export function endOfWeekKey(key) {
  return addDaysKey(startOfWeekKey(key), 6);
}

export function startOfMonthKey(key) {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${key.slice(0, 7)}-${`${last}`.padStart(2, '0')}`;
}

export function monthMatrix(year, month) {
  // month is 0-indexed. Returns weeks of day keys (or null padding), Mon-first.
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWd = first.getDay();
  const lead = startWd === 0 ? 6 : startWd - 1;
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(dateKey(new Date(year, month, d).getTime()));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ------------------------------------------------------------ formatting */

export function formatDueDate(timestamp) {
  if (!timestamp) return null;
  if (isToday(timestamp)) return 'Today';
  if (isTomorrow(timestamp)) return 'Tomorrow';
  const diff = Math.round((startOfDay(timestamp) - startOfToday()) / MS);
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) {
    return new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' });
  }
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** minutes-from-midnight -> "7:30 PM" */
export function formatTime(minutes) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

export function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / MS);

  if (days === 0) {
    if (diff > 0) return 'later today';
    if (diff < 0) return 'earlier today';
    return 'today';
  }
  if (days === 1) return diff > 0 ? 'tomorrow' : 'yesterday';
  if (days < 7) return diff > 0 ? `in ${days} days` : `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return diff > 0 ? `in ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  const months = Math.floor(days / 30);
  return diff > 0 ? `in ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
}

export function pluralize(n, word, plural) {
  return `${n} ${n === 1 ? word : plural || `${word}s`}`;
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}
