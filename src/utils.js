const MS = 86400000;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(timestamp, days) {
  return timestamp + days * MS;
}

export function isToday(timestamp) {
  if (!timestamp) return false;
  return startOfToday() === startOfDate(timestamp);
}

export function isTomorrow(timestamp) {
  if (!timestamp) return false;
  return startOfToday() + MS === startOfDate(timestamp);
}

export function isPast(timestamp) {
  if (!timestamp) return false;
  return startOfDate(timestamp) < startOfToday();
}

function startOfDate(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDueDate(timestamp) {
  if (!timestamp) return null;
  if (isToday(timestamp)) return 'Today';
  if (isTomorrow(timestamp)) return 'Tomorrow';
  const diff = Math.ceil((startOfDate(timestamp) - startOfToday()) / MS);
  if (diff > 0 && diff <= 7) {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
