/**
 * Quick Add parsing - deliberately deterministic.
 *
 * There is no AI here and no network call: a fixed set of matchers pulls dates,
 * times, repetition and duration out of the typed line, and whatever they find
 * is shown back as removable chips. The manual flow is always the source of
 * truth; parsing only pre-fills it, so a miss costs the user one tap.
 */
import { startOfToday, addDays, startOfDay } from '../utils';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const WEEKDAY_WORDS = [
  { names: ['sunday', 'sun'], id: 0 },
  { names: ['monday', 'mon'], id: 1 },
  { names: ['tuesday', 'tues', 'tue'], id: 2 },
  { names: ['wednesday', 'weds', 'wed'], id: 3 },
  { names: ['thursday', 'thurs', 'thu'], id: 4 },
  { names: ['friday', 'fri'], id: 5 },
  { names: ['saturday', 'sat'], id: 6 },
];

function nextWeekday(targetId, { allowToday = false } = {}) {
  const today = startOfToday();
  const current = new Date(today).getDay();
  let delta = (targetId - current + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  return addDays(today, delta);
}

function monthDayDate(monthIndex, day) {
  const now = new Date();
  let candidate = new Date(now.getFullYear(), monthIndex, day);
  if (startOfDay(candidate.getTime()) < startOfToday()) {
    candidate = new Date(now.getFullYear() + 1, monthIndex, day);
  }
  return startOfDay(candidate.getTime());
}

function cleanTitle(text) {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/^[\s,\-]+|[\s,\-]+$/g, '')
    .replace(/\b(by|on|at|for|starting|from|every|in)\s*$/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .trim();
}

/**
 * @returns {{
 *   title: string, type: 'task'|'habit'|'challenge'|'commitment'|'goal',
 *   dueDate: ?number, dueTime: ?number, startDate: ?number,
 *   durationDays: ?number, recurrence: ?object, schedule: ?object,
 *   priority: string, labels: string[], projectName: ?string,
 *   chips: {label: string, kind: string}[]
 * }}
 */
export function parseQuickAdd(rawInput) {
  const input = ` ${rawInput || ''} `;
  let rest = input;
  const chips = [];
  const result = {
    title: '',
    type: null,
    dueDate: null,
    dueTime: null,
    startDate: null,
    durationDays: null,
    recurrence: null,
    schedule: null,
    priority: 'none',
    labels: [],
    projectName: null,
    chips,
  };

  const consume = (regex, handler) => {
    const match = rest.match(regex);
    if (!match) return false;
    const replacement = handler(match);
    rest = rest.replace(match[0], replacement === undefined ? ' ' : replacement);
    return true;
  };

  /* ------------------------------------------------------------- priority */
  consume(/\bp([1-4])\b/i, (m) => {
    result.priority = ['high', 'medium', 'low', 'none'][Number(m[1]) - 1];
    chips.push({ label: `${result.priority} priority`, kind: 'priority' });
  });
  if (result.priority === 'none') {
    consume(/(!{1,3})(\s|$)/, (m) => {
      result.priority = ['low', 'medium', 'high'][m[1].length - 1];
      chips.push({ label: `${result.priority} priority`, kind: 'priority' });
      return ' ';
    });
  }

  /* --------------------------------------------------------------- labels */
  let labelMatch = rest.match(/@([\w-]+)/);
  while (labelMatch) {
    result.labels.push(labelMatch[1]);
    chips.push({ label: `@${labelMatch[1]}`, kind: 'label' });
    rest = rest.replace(labelMatch[0], ' ');
    labelMatch = rest.match(/@([\w-]+)/);
  }

  consume(/#([\w-]+)/, (m) => {
    result.projectName = m[1];
    chips.push({ label: `#${m[1]}`, kind: 'project' });
  });

  /* ----------------------------------------------------------------- time */
  consume(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i, (m) => {
    let hour = Number(m[1]);
    const minutes = Number(m[2] || 0);
    const suffix = (m[3] || '').toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    if (!suffix && hour <= 7) hour += 12; // "at 7" almost always means evening
    result.dueTime = hour * 60 + minutes;
    chips.push({ label: formatChipTime(result.dueTime), kind: 'time' });
  });
  if (result.dueTime == null) {
    consume(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
      let hour = Number(m[1]);
      const minutes = Number(m[2] || 0);
      const suffix = m[3].toLowerCase();
      if (suffix === 'pm' && hour < 12) hour += 12;
      if (suffix === 'am' && hour === 12) hour = 0;
      result.dueTime = hour * 60 + minutes;
      chips.push({ label: formatChipTime(result.dueTime), kind: 'time' });
    });
  }

  /* ----------------------------------------------------------- repetition */
  const setSchedule = (schedule, recurrence, label) => {
    result.schedule = schedule;
    result.recurrence = recurrence;
    chips.push({ label, kind: 'repeat' });
  };

  const repeats =
    consume(/\bevery\s+weekday\b|\bweekdays\b/i, () =>
      setSchedule({ type: 'weekdays' }, { type: 'weekdays' }, 'Every weekday')
    ) ||
    consume(/\b(\d+)\s*(?:x|times)\s*(?:a|per)\s*(week|month)\b/i, (m) => {
      const times = Number(m[1]);
      const period = m[2].toLowerCase() === 'week' ? 'timesPerWeek' : 'timesPerMonth';
      setSchedule({ type: period, times }, null, `${times}x per ${m[2].toLowerCase()}`);
    }) ||
    consume(/\bevery\s+(\d+)\s+(day|week|month)s?\b/i, (m) => {
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      if (unit === 'day') {
        setSchedule({ type: 'everyNDays', interval: n }, { type: 'daily', interval: n }, `Every ${n} days`);
      } else if (unit === 'week') {
        setSchedule(
          { type: 'timesPerWeek', times: 1 },
          { type: n === 2 ? 'biweekly' : 'weekly', interval: n },
          `Every ${n} weeks`
        );
      } else {
        setSchedule({ type: 'timesPerMonth', times: 1 }, { type: 'monthly', interval: n }, `Every ${n} months`);
      }
    }) ||
    consumeWeekdayRepeat(rest, (matchText, days, label) => {
      rest = rest.replace(matchText, ' ');
      setSchedule({ type: 'specificDays', days }, { type: 'weekly', weekdays: days }, label);
    }) ||
    consume(/\bevery\s+day\b|\bdaily\b|\beach\s+day\b/i, () =>
      setSchedule({ type: 'daily' }, { type: 'daily' }, 'Every day')
    ) ||
    consume(/\bevery\s+week\b|\bweekly\b/i, () =>
      setSchedule({ type: 'timesPerWeek', times: 1 }, { type: 'weekly' }, 'Every week')
    ) ||
    consume(/\bevery\s+month\b|\bmonthly\b/i, () =>
      setSchedule({ type: 'timesPerMonth', times: 1 }, { type: 'monthly' }, 'Every month')
    );

  /* ------------------------------------------------------------- duration */
  const startWord = /\b(starting|starts|from|beginning)\s+/i;
  const isStartPhrase = startWord.test(rest);

  /* "in 3 days" is a deadline, not a duration - claim it before the duration
   * matcher can mistake it for the length of a challenge. */
  consume(/\bin\s+(\d{1,3})\s+(day|week|month)s?\b/i, (m) => {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const mult = unit === 'day' ? 1 : unit === 'week' ? 7 : 30;
    const ts = addDays(startOfToday(), n * mult);
    if (isStartPhrase) result.startDate = ts;
    else result.dueDate = ts;
    chips.push({
      label: `In ${n} ${unit}${n > 1 ? 's' : ''}`,
      kind: isStartPhrase ? 'start' : 'date',
    });
  });

  consume(/\b(\d{1,3})[-\s]?days?\s+(?:of|without|no)\b/i, (m) => {
    result.durationDays = Number(m[1]);
    result.type = 'challenge';
    chips.push({ label: `${m[1]} days`, kind: 'duration' });
    return ` ${m[0].replace(/\b\d{1,3}[-\s]?days?\s+/i, '')} `;
  });
  if (!result.durationDays) {
    consume(/\b(?:for\s+)?(\d{1,3})[-\s]?days?\b/i, (m) => {
      result.durationDays = Number(m[1]);
      chips.push({ label: `${m[1]} days`, kind: 'duration' });
    });
  }

  /* ---------------------------------------------------------------- dates */
  const applyDate = (ts, label, isStart) => {
    if (isStart) result.startDate = ts;
    else result.dueDate = ts;
    chips.push({ label, kind: isStart ? 'start' : 'date' });
  };

  const findDate = () => {
    const isStart = startWord.test(rest);

    if (
      consume(/\btoday\b/i, () => applyDate(startOfToday(), 'Today', isStart)) ||
      consume(/\btonight\b/i, () => {
        if (result.dueTime == null) result.dueTime = 20 * 60;
        applyDate(startOfToday(), 'Tonight', isStart);
      }) ||
      consume(/\btomorrow\b/i, () => applyDate(addDays(startOfToday(), 1), 'Tomorrow', isStart)) ||
      consume(/\bnext\s+week\b/i, () => applyDate(addDays(startOfToday(), 7), 'Next week', isStart)) ||
      consume(/\bnext\s+month\b/i, () => applyDate(addDays(startOfToday(), 30), 'Next month', isStart))
    ) {
      return true;
    }

    // "September 15" / "sep 15" / "15 september"
    const monthNames = MONTHS.map((m) => `${m.slice(0, 3)}[a-z]*`).join('|');
    if (
      consume(new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'), (m) => {
        const idx = MONTHS.findIndex((name) => name.startsWith(m[1].slice(0, 3).toLowerCase()));
        applyDate(monthDayDate(idx, Number(m[2])), `${MONTHS[idx].slice(0, 3)} ${m[2]}`, isStart);
      }) ||
      consume(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\b`, 'i'), (m) => {
        const idx = MONTHS.findIndex((name) => name.startsWith(m[2].slice(0, 3).toLowerCase()));
        applyDate(monthDayDate(idx, Number(m[1])), `${MONTHS[idx].slice(0, 3)} ${m[1]}`, isStart);
      })
    ) {
      return true;
    }

    // A bare weekday only counts as a date when repetition did not claim it.
    if (!repeats || isStart) {
      for (const day of WEEKDAY_WORDS) {
        const pattern = new RegExp(`\\b(?:next\\s+|on\\s+)?(${day.names.join('|')})\\b`, 'i');
        const match = rest.match(pattern);
        if (match) {
          const ts = nextWeekday(day.id, { allowToday: false });
          rest = rest.replace(match[0], ' ');
          const label = match[0].trim().replace(/^(next|on)\s+/i, '');
          applyDate(ts, capitalize(label), isStart);
          return true;
        }
      }
    }
    return false;
  };

  if (findDate()) {
    rest = rest.replace(startWord, ' ');
  }
  rest = rest.replace(/\bby\b/i, ' ');

  /* ------------------------------------------------------------ item type */
  if (!result.type) {
    if (/\bchallenge\b/i.test(rest)) result.type = 'challenge';
    else if (/\b(i want to become|commit to|commitment|become a|become an)\b/i.test(rest))
      result.type = 'commitment';
    else if (/\bgoal\b/i.test(rest)) result.type = 'goal';
    else if (result.schedule) result.type = 'habit';
    else result.type = 'task';
  }
  if (result.type === 'challenge' && !result.durationDays) result.durationDays = 30;

  result.title = cleanTitle(rest);
  return result;
}

function consumeWeekdayRepeat(text, apply) {
  const names = WEEKDAY_WORDS.flatMap((d) => d.names).join('|');
  const pattern = new RegExp(
    `\\bevery\\s+((?:${names})(?:\\s*(?:,|and|&|\\+)\\s*(?:${names}))*)\\b`,
    'i'
  );
  const match = text.match(pattern);
  if (!match) return false;
  const days = [];
  const labels = [];
  for (const token of match[1].split(/\s*(?:,|and|&|\+)\s*/)) {
    const found = WEEKDAY_WORDS.find((d) => d.names.includes(token.trim().toLowerCase()));
    if (found && !days.includes(found.id)) {
      days.push(found.id);
      labels.push(capitalize(found.names[0]).slice(0, 3));
    }
  }
  if (!days.length) return false;
  apply(match[0], days, `Every ${labels.join(', ')}`);
  return true;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatChipTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${`${m}`.padStart(2, '0')}` : ''} ${suffix}`;
}
