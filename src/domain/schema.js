/**
 * One shape for every entity in the system, plus the migration that lifts the
 * original todo-only save file into the unified model without losing a byte.
 *
 * Two rules hold the ecosystem together:
 *   1. Every entity carries a `links` bag pointing at the bigger things it
 *      serves (commitments, goals, challenges, milestones).
 *   2. Nothing stores its own progress. Progress is derived from `activities`
 *      by src/domain/engine.js, so one completion can feed four systems.
 */
import { generateId } from './ids';
import { normalizeRecurrence, normalizeSchedule } from './recurrence';
import { startOfToday, todayKey, dateKey } from '../utils';

export const SCHEMA_VERSION = 2;

export const emptyLinks = () => ({
  commitmentIds: [],
  goalIds: [],
  challengeIds: [],
  milestoneIds: [],
  habitId: null,
});

function normalizeLinks(links) {
  const l = links || {};
  return {
    commitmentIds: Array.isArray(l.commitmentIds) ? l.commitmentIds : [],
    goalIds: Array.isArray(l.goalIds) ? l.goalIds : [],
    challengeIds: Array.isArray(l.challengeIds) ? l.challengeIds : [],
    milestoneIds: Array.isArray(l.milestoneIds) ? l.milestoneIds : [],
    /* A task may be backed by a habit ("today's German session"). Completing
     * either one completes both - the user marks the work done once. */
    habitId: l.habitId || null,
  };
}

/* ----------------------------------------------------------------- tasks */

export function makeTask(input = {}) {
  return normalizeTask({
    id: generateId('t'),
    text: (input.text || '').trim(),
    done: false,
    createdAt: Date.now(),
    completedAt: null,
    ...input,
  });
}

export function normalizeTask(task) {
  return {
    id: task.id || generateId('t'),
    text: task.text || '',
    notes: task.notes || '',
    done: !!task.done,
    priority: task.priority || 'none',
    category: task.category || null,
    labels: Array.isArray(task.labels) ? task.labels : [],
    projectId: task.projectId || null,
    sectionId: task.sectionId || null,
    dueDate: task.dueDate || null,
    dueTime: task.dueTime == null ? null : task.dueTime,
    reminder: task.reminder == null ? null : task.reminder,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    recurrence: normalizeRecurrence(task.recurrence),
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    createdAt: task.createdAt || Date.now(),
    completedAt: task.completedAt || null,
    links: normalizeLinks(task.links),
  };
}

/* ---------------------------------------------------------------- habits */

export function makeHabit(input = {}) {
  return normalizeHabit({
    id: generateId('h'),
    createdAt: Date.now(),
    startDate: startOfToday(),
    ...input,
  });
}

export function normalizeHabit(habit) {
  return {
    id: habit.id || generateId('h'),
    name: habit.name || '',
    description: habit.description || '',
    icon: habit.icon || '\u{1F3AF}',
    color: habit.color || '#6366F1',
    category: habit.category || null,
    schedule: normalizeSchedule(habit.schedule),
    target: habit.target && habit.target > 0 ? habit.target : 1,
    unit: habit.unit || '',
    startDate: habit.startDate || startOfToday(),
    endDate: habit.endDate || null,
    reminderTime: habit.reminderTime == null ? null : habit.reminderTime,
    archived: !!habit.archived,
    createdAt: habit.createdAt || Date.now(),
    links: normalizeLinks(habit.links),
  };
}

/* ----------------------------------------------------------- commitments */

export const COMMITMENT_STATUSES = ['active', 'paused', 'achieved', 'archived'];

export function makeCommitment(input = {}) {
  return normalizeCommitment({
    id: generateId('c'),
    createdAt: Date.now(),
    startDate: startOfToday(),
    ...input,
  });
}

export function normalizeCommitment(c) {
  return {
    id: c.id || generateId('c'),
    title: c.title || '',
    description: c.description || '',
    why: c.why || '',
    icon: c.icon || '\u{1F331}',
    color: c.color || '#6366F1',
    startDate: c.startDate || startOfToday(),
    targetDate: c.targetDate || null,
    status: COMMITMENT_STATUSES.includes(c.status) ? c.status : 'active',
    createdAt: c.createdAt || Date.now(),
    achievedAt: c.achievedAt || null,
  };
}

/* ----------------------------------------------------------------- goals */

export function makeGoal(input = {}) {
  return normalizeGoal({ id: generateId('g'), createdAt: Date.now(), ...input });
}

export function normalizeGoal(g) {
  const metric = g.metric || {};
  return {
    id: g.id || generateId('g'),
    title: g.title || '',
    description: g.description || '',
    icon: g.icon || '\u{1F3AF}',
    color: g.color || '#0EA5E9',
    commitmentId: g.commitmentId || null,
    targetDate: g.targetDate || null,
    status: g.status || 'active',
    /* metric: how this goal knows it is done.
     *  milestones -> rolls up from its milestones + linked work
     *  count      -> a manual counter (e.g. "apply to 20 internships")   */
    metric: {
      type: metric.type || 'milestones',
      target: metric.target || 0,
      current: metric.current || 0,
      unit: metric.unit || '',
    },
    createdAt: g.createdAt || Date.now(),
    achievedAt: g.achievedAt || null,
  };
}

/* ------------------------------------------------------------ milestones */

export function makeMilestone(input = {}) {
  return normalizeMilestone({ id: generateId('m'), createdAt: Date.now(), ...input });
}

export function normalizeMilestone(m) {
  return {
    id: m.id || generateId('m'),
    title: m.title || '',
    parentType: m.parentType || 'commitment', // commitment | goal | challenge
    parentId: m.parentId || null,
    targetDate: m.targetDate || null,
    done: !!m.done,
    doneAt: m.doneAt || null,
    order: m.order || 0,
    createdAt: m.createdAt || Date.now(),
  };
}

/* ------------------------------------------------------------ challenges */

export const CHALLENGE_STATUSES = ['upcoming', 'active', 'completed', 'failed', 'paused'];

export const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: '#34C759', xp: 150 },
  { id: 'medium', label: 'Medium', color: '#FF9500', xp: 300 },
  { id: 'hard', label: 'Hard', color: '#FF3B30', xp: 600 },
  { id: 'extreme', label: 'Extreme', color: '#AF52DE', xp: 1000 },
];

export function makeChallenge(input = {}) {
  return normalizeChallenge({ id: generateId('ch'), createdAt: Date.now(), ...input });
}

export function normalizeChallenge(c) {
  const req = c.requirements || {};
  return {
    id: c.id || generateId('ch'),
    name: c.name || '',
    description: c.description || '',
    icon: c.icon || '\u{1F525}',
    color: c.color || '#F97316',
    category: c.category || null,
    difficulty: c.difficulty || 'medium',
    goalText: c.goalText || '',
    rules: Array.isArray(c.rules) ? c.rules : [],
    startDate: c.startDate || startOfToday(),
    durationDays: c.durationDays && c.durationDays > 0 ? c.durationDays : 30,
    cadence: c.cadence === 'weekly' ? 'weekly' : 'daily',
    /* Requirements point at *existing* habits and tasks, so a challenge never
     * forces the user to duplicate work they already track. */
    requirements: {
      habitIds: Array.isArray(req.habitIds) ? req.habitIds : [],
      taskIds: Array.isArray(req.taskIds) ? req.taskIds : [],
      minPerDay: req.minPerDay || 0, // 0 = every linked habit is required
    },
    allowedSkips: c.allowedSkips || 0,
    reward: c.reward || '',
    manualStatus: c.manualStatus || null, // paused / failed, set by the user
    createdAt: c.createdAt || Date.now(),
    completedAt: c.completedAt || null,
    links: normalizeLinks(c.links),
  };
}

/* -------------------------------------------------------------- projects */

export function makeProject(input = {}) {
  return normalizeProject({ id: generateId('p'), createdAt: Date.now(), ...input });
}

export function normalizeProject(p) {
  return {
    id: p.id || generateId('p'),
    name: p.name || '',
    color: p.color || '#6366F1',
    icon: p.icon || '\u{1F4C1}',
    sections: Array.isArray(p.sections) ? p.sections : [],
    archived: !!p.archived,
    order: p.order || 0,
    createdAt: p.createdAt || Date.now(),
  };
}

/* ------------------------------------------------------------ activities */

/**
 * The single completion record. `type` + `refId` say what happened; everything
 * that action feeds is worked out from the links graph at read time.
 */
export function makeActivity(input = {}) {
  return normalizeActivity({
    id: generateId('a'),
    date: todayKey(),
    ts: Date.now(),
    ...input,
  });
}

export function normalizeActivity(a) {
  return {
    id: a.id || generateId('a'),
    type: a.type || 'task', // task | habit
    refId: a.refId || null,
    date: a.date || dateKey(a.ts || Date.now()),
    ts: a.ts || Date.now(),
    amount: a.amount == null ? 1 : a.amount,
    note: a.note || '',
  };
}

/* ----------------------------------------------------------------- state */

export const DEFAULT_SETTINGS = {
  streakThreshold: 60, // % of a day's plan needed for a productivity-streak day
  showCompletedTasks: true,
  gamification: true,
};

export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    habits: [],
    commitments: [],
    goals: [],
    challenges: [],
    projects: [],
    milestones: [],
    activities: [],
    achievements: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: Date.now(),
  };
}

/**
 * Accepts anything previously written to disk - a bare legacy task array, a v1
 * object, or a current-shape state - and returns a valid current state.
 * Nothing is dropped silently.
 */
export function migrateState(raw, legacyTasks) {
  const base = emptyState();

  if (Array.isArray(raw)) {
    // Oldest shape: the saved file was just the task array.
    return { ...base, tasks: raw.map(normalizeTask) };
  }

  if (!raw || typeof raw !== 'object') {
    const tasks = Array.isArray(legacyTasks) ? legacyTasks.map(normalizeTask) : [];
    return { ...base, tasks };
  }

  const state = {
    ...base,
    ...raw,
    version: SCHEMA_VERSION,
    tasks: (raw.tasks || []).map(normalizeTask),
    habits: (raw.habits || []).map(normalizeHabit),
    commitments: (raw.commitments || []).map(normalizeCommitment),
    goals: (raw.goals || []).map(normalizeGoal),
    challenges: (raw.challenges || []).map(normalizeChallenge),
    projects: (raw.projects || []).map(normalizeProject),
    milestones: (raw.milestones || []).map(normalizeMilestone),
    activities: (raw.activities || []).map(normalizeActivity),
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
  };

  // A legacy task file alongside an already-migrated state: fold in anything
  // the new file does not know about rather than letting it disappear.
  if (Array.isArray(legacyTasks) && legacyTasks.length) {
    const known = new Set(state.tasks.map((t) => t.id));
    const extra = legacyTasks.filter((t) => t && t.id && !known.has(t.id)).map(normalizeTask);
    if (extra.length) state.tasks = [...extra, ...state.tasks];
  }

  return state;
}

/**
 * Completed tasks predate the activity log, so give the engine something to
 * chart: synthesise one activity per already-completed task on first migration.
 */
export function backfillActivities(state) {
  const existing = new Set(
    state.activities.filter((a) => a.type === 'task').map((a) => a.refId)
  );
  const backfilled = state.tasks
    .filter((t) => t.done && t.completedAt && !existing.has(t.id))
    .map((t) =>
      normalizeActivity({
        type: 'task',
        refId: t.id,
        ts: t.completedAt,
        date: dateKey(t.completedAt),
        amount: 1,
      })
    );
  if (!backfilled.length) return state;
  return { ...state, activities: [...state.activities, ...backfilled] };
}
