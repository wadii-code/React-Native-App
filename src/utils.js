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

export function getNextRecurrenceDate(currentDueDate, recurrence) {
  if (!currentDueDate || !recurrence) return null;
  switch (recurrence) {
    case 'daily':
      return addDays(currentDueDate, 1);
    case 'weekly':
      return addDays(currentDueDate, 7);
    case 'monthly': {
      const d = new Date(currentDueDate);
      d.setMonth(d.getMonth() + 1);
      return d.getTime();
    }
    default:
      return null;
  }
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
