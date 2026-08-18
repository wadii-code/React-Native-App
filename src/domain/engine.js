/**
 * The progress engine.
 *
 * Nothing in the app stores its own progress. Every number the user sees -
 * habit streaks, challenge days, goal bars, commitment percentages, today's
 * score - is derived here from two things: the entities and the activity log.
 *
 * That is what makes one action serve four systems: completing "Study German"
 * writes a single activity record, and this file lets the habit, the challenge,
 * the goal and the commitment all read their progress out of it.
 */
import {
  todayKey,
  dateKey,
  addDaysKey,
  daysBetweenKeys,
  startOfWeekKey,
  endOfWeekKey,
  startOfMonthKey,
  endOfMonthKey,
  rangeKeys,
  startOfDay,
  pct,
} from '../utils';
import {
  isScheduledOn,
  isFlexibleSchedule,
  normalizeSchedule,
  scheduledKeysBetween,
} from './recurrence';

/* ----------------------------------------------------------------- index */

export function buildIndex(state) {
  const habitAmounts = new Map(); // habitId -> Map(dateKey -> amount)
  const taskDoneDates = new Map(); // taskId -> dateKey
  const activityByDate = new Map(); // dateKey -> activity[]

  for (const a of state.activities) {
    if (!activityByDate.has(a.date)) activityByDate.set(a.date, []);
    activityByDate.get(a.date).push(a);

    if (a.type === 'habit') {
      if (!habitAmounts.has(a.refId)) habitAmounts.set(a.refId, new Map());
      const byDate = habitAmounts.get(a.refId);
      byDate.set(a.date, (byDate.get(a.date) || 0) + a.amount);
    } else if (a.type === 'task') {
      taskDoneDates.set(a.refId, a.date);
    }
  }

  const byId = (arr) => {
    const m = new Map();
    for (const item of arr) m.set(item.id, item);
    return m;
  };

  const milestonesByParent = new Map();
  for (const m of state.milestones) {
    const key = `${m.parentType}:${m.parentId}`;
    if (!milestonesByParent.has(key)) milestonesByParent.set(key, []);
    milestonesByParent.get(key).push(m);
  }
  for (const list of milestonesByParent.values()) {
    list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt - b.createdAt);
  }

  return {
    habitAmounts,
    taskDoneDates,
    activityByDate,
    habitsById: byId(state.habits),
    tasksById: byId(state.tasks),
    goalsById: byId(state.goals),
    commitmentsById: byId(state.commitments),
    challengesById: byId(state.challenges),
    milestonesByParent,
  };
}

export const milestonesOf = (index, parentType, parentId) =>
  index.milestonesByParent.get(`${parentType}:${parentId}`) || [];

/* ---------------------------------------------------------------- habits */

export function habitAmountOn(index, habitId, key) {
  const byDate = index.habitAmounts.get(habitId);
  if (!byDate) return 0;
  return byDate.get(key) || 0;
}

export function isHabitDoneOn(habit, index, key) {
  return habitAmountOn(index, habit.id, key) >= (habit.target || 1);
}

function habitStartKey(habit) {
  return dateKey(habit.startDate || habit.createdAt || Date.now());
}

function habitEndKey(habit) {
  return habit.endDate ? dateKey(habit.endDate) : null;
}

function withinHabitWindow(habit, key) {
  if (key < habitStartKey(habit)) return false;
  const end = habitEndKey(habit);
  if (end && key > end) return false;
  return true;
}

/** Completions inside an arbitrary window (used by flexible schedules). */
export function habitCompletionsBetween(habit, index, fromKey, toKey) {
  const byDate = index.habitAmounts.get(habit.id);
  if (!byDate) return 0;
  let count = 0;
  for (const [key, amount] of byDate.entries()) {
    if (key >= fromKey && key <= toKey && amount >= (habit.target || 1)) count += 1;
  }
  return count;
}

/** For "3x per week" style habits: how the current period is going. */
export function habitPeriodProgress(habit, index, key) {
  const s = normalizeSchedule(habit.schedule);
  if (s.type === 'timesPerWeek') {
    const from = startOfWeekKey(key);
    const to = endOfWeekKey(key);
    return { done: habitCompletionsBetween(habit, index, from, to), target: s.times, from, to };
  }
  if (s.type === 'timesPerMonth') {
    const from = startOfMonthKey(key);
    const to = endOfMonthKey(key);
    return { done: habitCompletionsBetween(habit, index, from, to), target: s.times, from, to };
  }
  return null;
}

/**
 * Should this habit appear in the user's day?
 * Fixed schedules: only on their scheduled days.
 * Flexible schedules: every day until the period target is met - then it stops
 * nagging, which is the whole point of "4 times a week".
 */
export function isHabitDueOn(habit, index, key) {
  if (habit.archived) return false;
  if (!withinHabitWindow(habit, key)) return false;
  if (isFlexibleSchedule(habit.schedule)) {
    const period = habitPeriodProgress(habit, index, key);
    if (!period) return true;
    return period.done < period.target || isHabitDoneOn(habit, index, key);
  }
  return isScheduledOn(habit.schedule, key, habitStartKey(habit));
}

/**
 * Streaks that understand the schedule.
 * Fixed schedules count scheduled days only, so a Tue/Thu habit is not broken
 * by "missing" a Wednesday. Flexible schedules count whole periods, so a
 * 4x-per-week habit survives any single missed day.
 */
export function habitStreaks(habit, index, today = todayKey()) {
  const startKey = habitStartKey(habit);
  const endKey = habitEndKey(habit);
  const lastKey = endKey && endKey < today ? endKey : today;
  if (lastKey < startKey) return { current: 0, best: 0, unit: 'day' };

  if (isFlexibleSchedule(habit.schedule)) {
    const s = normalizeSchedule(habit.schedule);
    const monthly = s.type === 'timesPerMonth';
    const periodStart = (key) => (monthly ? startOfMonthKey(key) : startOfWeekKey(key));
    const periodEnd = (key) => (monthly ? endOfMonthKey(key) : endOfWeekKey(key));
    const prevPeriod = (key) => addDaysKey(periodStart(key), -1);

    let current = 0;
    let best = 0;
    let run = 0;
    // Walk every period from the habit start to now, oldest first.
    const periods = [];
    let cursor = periodStart(startKey);
    let guard = 0;
    while (cursor <= lastKey && guard < 600) {
      periods.push(cursor);
      cursor = addDaysKey(periodEnd(cursor), 1);
      guard += 1;
    }
    for (const p of periods) {
      const met = habitCompletionsBetween(habit, index, p, periodEnd(p)) >= s.times;
      if (met) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    // The period in progress must not be judged a failure before it ends.
    const thisPeriod = periodStart(lastKey);
    const thisMet =
      habitCompletionsBetween(habit, index, thisPeriod, periodEnd(thisPeriod)) >= s.times;
    if (thisMet) {
      current = run;
    } else {
      let back = prevPeriod(lastKey);
      current = 0;
      let g = 0;
      while (back >= startKey && g < 600) {
        const p = periodStart(back);
        if (habitCompletionsBetween(habit, index, p, periodEnd(p)) >= s.times) {
          current += 1;
          back = prevPeriod(p);
        } else break;
        g += 1;
      }
    }
    return { current, best: Math.max(best, current), unit: 'week' };
  }

  const days = scheduledKeysBetween(habit.schedule, startKey, startKey, lastKey);
  let best = 0;
  let run = 0;
  for (const key of days) {
    if (isHabitDoneOn(habit, index, key)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // Current streak: walk backwards, but today still being open is not a miss.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const key = days[i];
    if (isHabitDoneOn(habit, index, key)) current += 1;
    else if (key === today) continue; // today is not over yet
    else break;
  }

  return { current, best: Math.max(best, current), unit: 'day' };
}

export function habitStats(habit, index, today = todayKey()) {
  const startKey = habitStartKey(habit);
  const endKey = habitEndKey(habit);
  const lastKey = endKey && endKey < today ? endKey : today;
  const streaks = habitStreaks(habit, index, today);

  let expected = 0;
  let completed = 0;
  if (isFlexibleSchedule(habit.schedule)) {
    const s = normalizeSchedule(habit.schedule);
    const monthly = s.type === 'timesPerMonth';
    const periodLen = monthly ? 30 : 7;
    const elapsed = Math.max(0, daysBetweenKeys(startKey, lastKey) + 1);
    expected = Math.max(1, Math.round((elapsed / periodLen) * s.times));
    completed = habitCompletionsBetween(habit, index, startKey, lastKey);
  } else {
    const days = scheduledKeysBetween(habit.schedule, startKey, startKey, lastKey);
    expected = days.length;
    completed = days.filter((k) => isHabitDoneOn(habit, index, k)).length;
  }

  const byDate = index.habitAmounts.get(habit.id);
  let totalCompletions = 0;
  if (byDate) {
    for (const amount of byDate.values()) {
      if (amount >= (habit.target || 1)) totalCompletions += 1;
    }
  }

  const weekFrom = startOfWeekKey(today);
  const monthFrom = startOfMonthKey(today);

  return {
    current: streaks.current,
    best: streaks.best,
    streakUnit: streaks.unit,
    consistency: pct(completed, expected),
    completed,
    expected,
    totalCompletions,
    doneToday: isHabitDoneOn(habit, index, today),
    amountToday: habitAmountOn(index, habit.id, today),
    dueToday: isHabitDueOn(habit, index, today),
    week: {
      done: habitCompletionsBetween(habit, index, weekFrom, endOfWeekKey(today)),
      target: weeklyTarget(habit),
    },
    month: {
      done: habitCompletionsBetween(habit, index, monthFrom, endOfMonthKey(today)),
      target: monthlyTarget(habit, today),
    },
    period: habitPeriodProgress(habit, index, today),
  };
}

export function weeklyTarget(habit) {
  const s = normalizeSchedule(habit.schedule);
  switch (s.type) {
    case 'daily':
      return 7;
    case 'weekdays':
      return 5;
    case 'specificDays':
      return s.days.length;
    case 'timesPerWeek':
      return s.times;
    case 'timesPerMonth':
      return Math.max(1, Math.round(s.times / 4));
    case 'everyNDays':
      return Math.max(1, Math.round(7 / Math.max(1, s.interval)));
    default:
      return 7;
  }
}

export function monthlyTarget(habit, today = todayKey()) {
  const s = normalizeSchedule(habit.schedule);
  if (s.type === 'timesPerMonth') return s.times;
  const from = startOfMonthKey(today);
  const to = endOfMonthKey(today);
  if (isFlexibleSchedule(habit.schedule)) {
    return Math.round((daysBetweenKeys(from, to) + 1) / 7) * s.times;
  }
  return scheduledKeysBetween(habit.schedule, habitStartKey(habit), from, to).length;
}

/** Heatmap data: one entry per day, newest last. */
export function habitHistory(habit, index, days = 119, today = todayKey()) {
  const from = addDaysKey(today, -(days - 1));
  const startKey = habitStartKey(habit);
  return rangeKeys(from, today).map((key) => {
    const amount = habitAmountOn(index, habit.id, key);
    const target = habit.target || 1;
    const scheduled = isFlexibleSchedule(habit.schedule)
      ? key >= startKey
      : key >= startKey && isScheduledOn(habit.schedule, key, startKey);
    return {
      key,
      amount,
      done: amount >= target,
      partial: amount > 0 && amount < target,
      scheduled,
      missed: scheduled && amount === 0 && key < today,
      intensity: target > 0 ? Math.min(1, amount / target) : 0,
    };
  });
}

/** The current Monday-to-Sunday week, for the strip shown on habit cards. */
export function habitWeekCells(habit, index, today = todayKey()) {
  const start = startOfWeekKey(today);
  const startKey = habitStartKey(habit);
  return rangeKeys(start, addDaysKey(start, 6)).map((key) => {
    const done = isHabitDoneOn(habit, index, key);
    const scheduled = isFlexibleSchedule(habit.schedule)
      ? key >= startKey
      : key >= startKey && isScheduledOn(habit.schedule, key, startKey);
    return {
      key,
      done,
      scheduled,
      missed: scheduled && !done && key < today,
      today: key === today,
      future: key > today,
    };
  });
}

/* ----------------------------------------------------------------- tasks */

export function isTaskDueOn(task, key) {
  if (!task.dueDate) return false;
  return dateKey(task.dueDate) === key;
}

export function isTaskOverdue(task, today = todayKey()) {
  if (!task.dueDate || task.done) return false;
  return dateKey(task.dueDate) < today;
}

/** Tasks that belong in a given day: due that day, plus anything overdue. */
export function tasksForDay(state, key, { includeOverdue = true, today = todayKey() } = {}) {
  return state.tasks.filter((t) => {
    if (isTaskDueOn(t, key)) return true;
    if (includeOverdue && key === today && isTaskOverdue(t, today)) return true;
    if (t.done && t.completedAt && dateKey(t.completedAt) === key) return true;
    return false;
  });
}

/* ------------------------------------------------------------ challenges */

export function challengeStartKey(challenge) {
  return dateKey(challenge.startDate);
}

export function challengeEndKey(challenge) {
  return addDaysKey(challengeStartKey(challenge), Math.max(1, challenge.durationDays) - 1);
}

function challengeRequiredHabits(challenge, index) {
  return challenge.requirements.habitIds
    .map((id) => index.habitsById.get(id))
    .filter(Boolean);
}

function challengeLinkedTasks(challenge, state) {
  const explicit = new Set(challenge.requirements.taskIds);
  return state.tasks.filter(
    (t) => explicit.has(t.id) || t.links.challengeIds.includes(challenge.id)
  );
}

/** Was the challenge's daily bar cleared on that day? */
export function isChallengeDayComplete(challenge, index, key, habits) {
  const required = habits || challengeRequiredHabits(challenge, index);
  if (!required.length) return false;
  const doneCount = required.filter((h) => isHabitDoneOn(h, index, key)).length;
  const min = challenge.requirements.minPerDay;
  if (min && min > 0) return doneCount >= Math.min(min, required.length);
  return doneCount === required.length;
}

export function challengeStats(challenge, state, index, today = todayKey()) {
  const startKey = challengeStartKey(challenge);
  const endKey = challengeEndKey(challenge);
  const totalDays = Math.max(1, challenge.durationDays);
  const habits = challengeRequiredHabits(challenge, index);
  const tasks = challengeLinkedTasks(challenge, state);
  const hasDaily = habits.length > 0;

  const elapsedKey = today > endKey ? endKey : today;
  const dayIndex = Math.min(totalDays, Math.max(0, daysBetweenKeys(startKey, elapsedKey) + 1));

  let daysComplete = 0;
  let missedDays = 0;
  const dayMap = [];
  if (hasDaily && today >= startKey) {
    for (const key of rangeKeys(startKey, elapsedKey)) {
      const done = isChallengeDayComplete(challenge, index, key, habits);
      if (done) daysComplete += 1;
      else if (key < today) missedDays += 1;
      dayMap.push({ key, done, future: false });
    }
  }
  for (const key of rangeKeys(addDaysKey(elapsedKey, 1), endKey)) {
    dayMap.push({ key, done: false, future: true });
  }

  const tasksDone = tasks.filter((t) => t.done).length;
  const milestones = milestonesOf(index, 'challenge', challenge.id);
  const milestonesDone = milestones.filter((m) => m.done).length;

  const unitsTotal = (hasDaily ? totalDays : 0) + tasks.length + milestones.length;
  const unitsDone = (hasDaily ? daysComplete : 0) + tasksDone + milestonesDone;
  const percent = unitsTotal ? pct(unitsDone, unitsTotal) : 0;

  // Streak: consecutive cleared days ending today (an open today does not break it).
  let streak = 0;
  if (hasDaily) {
    let cursor = elapsedKey;
    let guard = 0;
    while (cursor >= startKey && guard < 400) {
      if (isChallengeDayComplete(challenge, index, cursor, habits)) streak += 1;
      else if (cursor === today) {
        cursor = addDaysKey(cursor, -1);
        guard += 1;
        continue;
      } else break;
      cursor = addDaysKey(cursor, -1);
      guard += 1;
    }
  }

  const status = deriveChallengeStatus(challenge, {
    today,
    startKey,
    endKey,
    percent,
    missedDays,
    daysComplete,
    totalDays,
    hasDaily,
    tasksDone,
    tasksTotal: tasks.length,
  });

  const todayRequirements = [
    ...habits.map((h) => ({
      kind: 'habit',
      id: h.id,
      title: h.name,
      icon: h.icon,
      done: isHabitDoneOn(h, index, today),
    })),
    ...tasks
      .filter((t) => !t.done)
      .slice(0, 4)
      .map((t) => ({ kind: 'task', id: t.id, title: t.text, icon: '☑', done: false })),
  ];

  return {
    status,
    startKey,
    endKey,
    totalDays,
    dayIndex,
    daysComplete,
    missedDays,
    daysRemaining: Math.max(0, daysBetweenKeys(today, endKey)),
    percent,
    streak,
    hasDaily,
    habits,
    tasks,
    tasksDone,
    milestones,
    milestonesDone,
    dayMap,
    todayRequirements,
    todayDone: hasDaily ? isChallengeDayComplete(challenge, index, today, habits) : false,
  };
}

function deriveChallengeStatus(challenge, ctx) {
  if (challenge.manualStatus === 'paused') return 'paused';
  if (challenge.manualStatus === 'failed') return 'failed';
  if (challenge.completedAt) return 'completed';
  if (ctx.today < ctx.startKey) return 'upcoming';
  if (ctx.today > ctx.endKey) {
    if (!ctx.hasDaily) {
      return ctx.tasksTotal && ctx.tasksDone === ctx.tasksTotal ? 'completed' : 'failed';
    }
    const needed = ctx.totalDays - (challenge.allowedSkips || 0);
    return ctx.daysComplete >= needed ? 'completed' : 'failed';
  }
  if (challenge.allowedSkips > 0 && ctx.missedDays > challenge.allowedSkips) return 'failed';
  return 'active';
}

/* ------------------------------------------------------- goals & commitments */

function averageParts(parts) {
  const usable = parts.filter((p) => p.weight > 0);
  if (!usable.length) return 0;
  const totalWeight = usable.reduce((sum, p) => sum + p.weight, 0);
  const score = usable.reduce((sum, p) => sum + p.percent * p.weight, 0);
  return Math.round(score / totalWeight);
}

export function goalProgress(goal, state, index, today = todayKey()) {
  const milestones = milestonesOf(index, 'goal', goal.id);
  const tasks = state.tasks.filter((t) => t.links.goalIds.includes(goal.id));
  const habits = state.habits.filter((h) => h.links.goalIds.includes(goal.id));
  const challenges = state.challenges.filter(
    (c) => c.links.goalIds.includes(goal.id)
  );

  const parts = [];
  if (goal.metric.type === 'count' && goal.metric.target > 0) {
    parts.push({
      label: 'Progress',
      percent: pct(goal.metric.current, goal.metric.target),
      weight: 3,
      detail: `${goal.metric.current}/${goal.metric.target} ${goal.metric.unit || ''}`.trim(),
    });
  }
  if (milestones.length) {
    const done = milestones.filter((m) => m.done).length;
    parts.push({
      label: 'Milestones',
      percent: pct(done, milestones.length),
      weight: 3,
      detail: `${done}/${milestones.length}`,
    });
  }
  if (tasks.length) {
    const done = tasks.filter((t) => t.done).length;
    parts.push({
      label: 'Tasks',
      percent: pct(done, tasks.length),
      weight: 2,
      detail: `${done}/${tasks.length}`,
    });
  }
  if (habits.length) {
    const avg = Math.round(
      habits.reduce((sum, h) => sum + habitStats(h, index, today).consistency, 0) / habits.length
    );
    parts.push({ label: 'Habits', percent: avg, weight: 2, detail: `${avg}% consistency` });
  }
  if (challenges.length) {
    const avg = Math.round(
      challenges.reduce((sum, c) => sum + challengeStats(c, state, index, today).percent, 0) /
        challenges.length
    );
    parts.push({ label: 'Challenges', percent: avg, weight: 1, detail: `${challenges.length} linked` });
  }

  return {
    percent: goal.status === 'achieved' ? 100 : averageParts(parts),
    parts,
    milestones,
    tasks,
    habits,
    challenges,
  };
}

export function commitmentProgress(commitment, state, index, today = todayKey()) {
  const goals = state.goals.filter((g) => g.commitmentId === commitment.id);
  const milestones = milestonesOf(index, 'commitment', commitment.id);
  const tasks = state.tasks.filter((t) => t.links.commitmentIds.includes(commitment.id));
  const habits = state.habits.filter((h) => h.links.commitmentIds.includes(commitment.id));
  const challenges = state.challenges.filter((c) =>
    c.links.commitmentIds.includes(commitment.id)
  );

  const parts = [];
  if (goals.length) {
    const avg = Math.round(
      goals.reduce((sum, g) => sum + goalProgress(g, state, index, today).percent, 0) / goals.length
    );
    parts.push({ label: 'Goals', percent: avg, weight: 4, detail: `${goals.length} goals` });
  }
  if (milestones.length) {
    const done = milestones.filter((m) => m.done).length;
    parts.push({
      label: 'Milestones',
      percent: pct(done, milestones.length),
      weight: 3,
      detail: `${done}/${milestones.length}`,
    });
  }
  if (habits.length) {
    const avg = Math.round(
      habits.reduce((sum, h) => sum + habitStats(h, index, today).consistency, 0) / habits.length
    );
    parts.push({ label: 'Habits', percent: avg, weight: 3, detail: `${avg}% consistency` });
  }
  if (tasks.length) {
    const done = tasks.filter((t) => t.done).length;
    parts.push({
      label: 'Tasks',
      percent: pct(done, tasks.length),
      weight: 2,
      detail: `${done}/${tasks.length}`,
    });
  }
  if (challenges.length) {
    const avg = Math.round(
      challenges.reduce((sum, c) => sum + challengeStats(c, state, index, today).percent, 0) /
        challenges.length
    );
    parts.push({
      label: 'Challenges',
      percent: avg,
      weight: 2,
      detail: `${challenges.length} linked`,
    });
  }

  const consistency = habits.length
    ? Math.round(
        habits.reduce((sum, h) => sum + habitStats(h, index, today).consistency, 0) / habits.length
      )
    : null;

  return {
    percent: commitment.status === 'achieved' ? 100 : averageParts(parts),
    parts,
    goals,
    milestones,
    tasks,
    habits,
    challenges,
    consistency,
    /** Did today's work move this commitment at all? */
    movedToday: didCommitmentMoveOn(commitment, { tasks, habits, challenges }, index, today),
  };
}

function didCommitmentMoveOn(commitment, related, index, key) {
  for (const h of related.habits) {
    if (habitAmountOn(index, h.id, key) > 0) return true;
  }
  for (const t of related.tasks) {
    if (t.done && t.completedAt && dateKey(t.completedAt) === key) return true;
  }
  return false;
}

/* --------------------------------------------------------- daily summary */

/**
 * Working out which challenges are live costs a full pass over each challenge's
 * run. Anything that summarises many days (the streak walk, the analytics
 * range) should do that once and hand the result back in.
 */
export function prepareDayContext(state, index, today = todayKey()) {
  const challenges = state.challenges
    .map((c) => ({ challenge: c, stats: challengeStats(c, state, index, today) }))
    .filter((row) => row.stats.hasDaily && row.stats.status === 'active')
    .map((row) => ({
      challenge: row.challenge,
      startKey: row.stats.startKey,
      endKey: row.stats.endKey,
      habits: row.stats.habits,
    }));
  return { challenges };
}

export function dailySummary(state, index, key = todayKey(), today = todayKey(), ctx) {
  const dayContext = ctx || prepareDayContext(state, index, today);
  const dayTasks = state.tasks.filter((t) => {
    if (t.done) return t.completedAt ? dateKey(t.completedAt) === key : false;
    if (isTaskDueOn(t, key)) return true;
    return key === today && isTaskOverdue(t, today);
  });
  const tasksDone = dayTasks.filter(
    (t) => t.done && t.completedAt && dateKey(t.completedAt) === key
  ).length;

  const dayHabits = state.habits.filter(
    (h) => !h.archived && (isHabitDueOn(h, index, key) || habitAmountOn(index, h.id, key) > 0)
  );
  const habitsDone = dayHabits.filter((h) => isHabitDoneOn(h, index, key)).length;

  const dayRows = dayContext.challenges.filter(
    (row) => key >= row.startKey && key <= row.endKey
  );
  const dayChallenges = dayRows.map((row) => row.challenge);
  const challengesDone = dayRows.filter((row) =>
    isChallengeDayComplete(row.challenge, index, key, row.habits)
  ).length;

  const total = dayTasks.length + dayHabits.length + dayChallenges.length;
  const done = tasksDone + habitsDone + challengesDone;

  return {
    key,
    tasks: { done: tasksDone, total: dayTasks.length, items: dayTasks },
    habits: { done: habitsDone, total: dayHabits.length, items: dayHabits },
    challenges: { done: challengesDone, total: dayChallenges.length, items: dayChallenges },
    done,
    total,
    percent: total ? pct(done, total) : 0,
    hasPlan: total > 0,
  };
}

/** A day "counts" for the productivity streak when the plan was mostly met. */
export function dayQualifies(summary, threshold = 60) {
  if (!summary.hasPlan) return false;
  return summary.percent >= threshold;
}

export function productivityStreak(state, index, today = todayKey()) {
  const threshold = state.settings.streakThreshold ?? 60;
  const ctx = prepareDayContext(state, index, today);
  let streak = 0;
  let cursor = today;
  let guard = 0;
  while (guard < 400) {
    const summary = dailySummary(state, index, cursor, today, ctx);
    if (dayQualifies(summary, threshold)) {
      streak += 1;
    } else if (cursor === today) {
      // Today is still open - it cannot break a streak yet.
      cursor = addDaysKey(cursor, -1);
      guard += 1;
      continue;
    } else break;
    cursor = addDaysKey(cursor, -1);
    guard += 1;
  }
  return streak;
}

/* -------------------------------------------------------------- analytics */

export function rangeSummary(state, index, days = 30, today = todayKey()) {
  const from = addDaysKey(today, -(days - 1));
  const keys = rangeKeys(from, today);
  const ctx = prepareDayContext(state, index, today);
  const daily = keys.map((key) => {
    const s = dailySummary(state, index, key, today, ctx);
    return { key, percent: s.percent, done: s.done, total: s.total, hasPlan: s.hasPlan };
  });
  const planned = daily.filter((d) => d.hasPlan);
  const avg = planned.length
    ? Math.round(planned.reduce((sum, d) => sum + d.percent, 0) / planned.length)
    : 0;
  const totalDone = daily.reduce((sum, d) => sum + d.done, 0);
  const totalPlanned = daily.reduce((sum, d) => sum + d.total, 0);

  // Trend: second half vs first half, so the user sees direction, not noise.
  const half = Math.floor(daily.length / 2);
  const avgOf = (arr) => {
    const p = arr.filter((d) => d.hasPlan);
    return p.length ? p.reduce((sum, d) => sum + d.percent, 0) / p.length : 0;
  };
  const trend = Math.round(avgOf(daily.slice(half)) - avgOf(daily.slice(0, half)));

  return { daily, avg, totalDone, totalPlanned, trend, from, to: today };
}

export function activityCountsByDay(state, days = 119, today = todayKey()) {
  const from = addDaysKey(today, -(days - 1));
  const counts = new Map();
  for (const a of state.activities) {
    if (a.date >= from && a.date <= today) counts.set(a.date, (counts.get(a.date) || 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  return rangeKeys(from, today).map((key) => ({
    key,
    count: counts.get(key) || 0,
    intensity: (counts.get(key) || 0) / max,
  }));
}

/* ----------------------------------------------------------------- xp */

export const XP_RULES = { task: 10, habit: 15, challengeDay: 25, milestone: 50, goal: 200, commitment: 500 };

export function computeXp(state, index, today = todayKey()) {
  let xp = 0;
  for (const a of state.activities) {
    xp += a.type === 'habit' ? XP_RULES.habit : XP_RULES.task;
  }
  xp += state.milestones.filter((m) => m.done).length * XP_RULES.milestone;
  xp += state.goals.filter((g) => g.status === 'achieved').length * XP_RULES.goal;
  xp += state.commitments.filter((c) => c.status === 'achieved').length * XP_RULES.commitment;
  for (const c of state.challenges) {
    const stats = challengeStats(c, state, index, today);
    xp += stats.daysComplete * XP_RULES.challengeDay;
    if (stats.status === 'completed') {
      const diff = { easy: 150, medium: 300, hard: 600, extreme: 1000 }[c.difficulty] || 300;
      xp += diff;
    }
  }
  return xp;
}

/** Level curve: each level costs a little more than the last, no cliff edges. */
export function levelFromXp(xp) {
  let level = 1;
  let needed = 300;
  let remaining = xp;
  while (remaining >= needed && level < 200) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.18);
  }
  return { level, intoLevel: remaining, levelSize: needed, percent: pct(remaining, needed) };
}
