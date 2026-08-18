/**
 * Badges are earned by real work, never handed out for opening the app.
 * Each rule reads the same derived numbers the rest of the UI shows, so a badge
 * can always be traced back to something the user actually did.
 */
import { todayKey } from '../utils';
import { habitStats, challengeStats, productivityStreak, buildIndex } from './engine';

export const ACHIEVEMENTS = [
  {
    id: 'first_step',
    icon: '\u{1F331}',
    title: 'First Step',
    description: 'Complete your first task',
    metric: (c) => ({ value: c.tasksDone, target: 1 }),
  },
  {
    id: 'ten_done',
    icon: '\u{2713}',
    title: 'Getting Traction',
    description: 'Complete 10 tasks',
    metric: (c) => ({ value: c.tasksDone, target: 10 }),
  },
  {
    id: 'hundred_done',
    icon: '\u{1F4AA}',
    title: 'Century',
    description: 'Complete 100 tasks',
    metric: (c) => ({ value: c.tasksDone, target: 100 }),
  },
  {
    id: 'habit_born',
    icon: '\u{1F504}',
    title: 'Habit Born',
    description: 'Track a habit for 7 days in a row',
    metric: (c) => ({ value: c.bestHabitStreak, target: 7 }),
  },
  {
    id: 'habit_rooted',
    icon: '\u{1F333}',
    title: 'Rooted',
    description: 'Reach a 30-day habit streak',
    metric: (c) => ({ value: c.bestHabitStreak, target: 30 }),
  },
  {
    id: 'habit_master',
    icon: '\u{1F3C6}',
    title: 'Unbroken',
    description: 'Reach a 100-day habit streak',
    metric: (c) => ({ value: c.bestHabitStreak, target: 100 }),
  },
  {
    id: 'consistent',
    icon: '\u{1F4C8}',
    title: 'Consistent',
    description: 'Keep a habit above 80% consistency',
    metric: (c) => ({ value: c.bestConsistency, target: 80 }),
  },
  {
    id: 'challenger',
    icon: '\u{1F525}',
    title: 'Challenger',
    description: 'Start your first challenge',
    metric: (c) => ({ value: c.challengesStarted, target: 1 }),
  },
  {
    id: 'finisher',
    icon: '\u{1F3C5}',
    title: 'Finisher',
    description: 'Complete a challenge',
    metric: (c) => ({ value: c.challengesCompleted, target: 1 }),
  },
  {
    id: 'triple_threat',
    icon: '\u{2728}',
    title: 'Triple Threat',
    description: 'Complete 3 challenges',
    metric: (c) => ({ value: c.challengesCompleted, target: 3 }),
  },
  {
    id: 'committed',
    icon: '\u{1F91D}',
    title: 'Committed',
    description: 'Define your first commitment',
    metric: (c) => ({ value: c.commitments, target: 1 }),
  },
  {
    id: 'milestone_maker',
    icon: '\u{1F6A9}',
    title: 'Milestone Maker',
    description: 'Reach 10 milestones',
    metric: (c) => ({ value: c.milestonesDone, target: 10 }),
  },
  {
    id: 'week_perfect',
    icon: '\u{1F31F}',
    title: 'Perfect Week',
    description: 'Hit your daily plan 7 days running',
    metric: (c) => ({ value: c.productivityStreak, target: 7 }),
  },
  {
    id: 'month_strong',
    icon: '\u{1F48E}',
    title: 'Month Strong',
    description: 'Hit your daily plan 30 days running',
    metric: (c) => ({ value: c.productivityStreak, target: 30 }),
  },
  {
    id: 'architect',
    icon: '\u{1F5FA}',
    title: 'Architect',
    description: 'Connect a habit, a task and a challenge to one commitment',
    metric: (c) => ({ value: c.fullyConnectedCommitments, target: 1 }),
  },
];

export function achievementContext(state, index, today = todayKey()) {
  const idx = index || buildIndex(state);
  const habitStatsList = state.habits.map((h) => habitStats(h, idx, today));
  const challengeStatsList = state.challenges.map((c) => challengeStats(c, state, idx, today));

  const fullyConnected = state.commitments.filter((c) => {
    const hasHabit = state.habits.some((h) => h.links.commitmentIds.includes(c.id));
    const hasTask = state.tasks.some((t) => t.links.commitmentIds.includes(c.id));
    const hasChallenge = state.challenges.some((ch) => ch.links.commitmentIds.includes(c.id));
    return hasHabit && hasTask && hasChallenge;
  }).length;

  return {
    tasksDone: state.activities.filter((a) => a.type === 'task').length,
    habitCheckins: state.activities.filter((a) => a.type === 'habit').length,
    bestHabitStreak: habitStatsList.reduce((max, s) => Math.max(max, s.best), 0),
    bestConsistency: habitStatsList.reduce((max, s) => Math.max(max, s.consistency), 0),
    challengesStarted: state.challenges.length,
    challengesCompleted: challengeStatsList.filter((s) => s.status === 'completed').length,
    commitments: state.commitments.length,
    milestonesDone: state.milestones.filter((m) => m.done).length,
    productivityStreak: productivityStreak(state, idx, today),
    fullyConnectedCommitments: fullyConnected,
  };
}

export function evaluateAchievements(state, index, today = todayKey()) {
  const ctx = achievementContext(state, index, today);
  const unlockedMap = new Map((state.achievements || []).map((a) => [a.id, a.unlockedAt]));
  return ACHIEVEMENTS.map((def) => {
    const { value, target } = def.metric(ctx);
    const unlocked = value >= target;
    return {
      ...def,
      value,
      target,
      unlocked,
      percent: Math.min(100, Math.round((value / target) * 100)),
      unlockedAt: unlockedMap.get(def.id) || null,
    };
  });
}

/** Returns the persisted achievement list plus anything newly earned. */
export function syncAchievements(state, index, today = todayKey()) {
  const evaluated = evaluateAchievements(state, index, today);
  const known = new Set((state.achievements || []).map((a) => a.id));
  const added = evaluated
    .filter((a) => a.unlocked && !known.has(a.id))
    .map((a) => ({ id: a.id, unlockedAt: Date.now() }));
  if (!added.length) return { achievements: state.achievements || [], added: [] };
  return { achievements: [...(state.achievements || []), ...added], added };
}
