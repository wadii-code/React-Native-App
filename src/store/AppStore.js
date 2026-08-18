/**
 * The single store for the whole system.
 *
 * Every mutation goes through one reducer so that a completion can ripple
 * correctly: finishing a task that is backed by a habit checks the habit too,
 * checking a habit ticks off the day's matching task, and both write exactly
 * one activity record for the engine to read.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
} from 'react';
import { loadAppState, saveAppState } from '../storage';
import {
  emptyState,
  makeTask,
  makeHabit,
  makeCommitment,
  makeGoal,
  makeChallenge,
  makeProject,
  makeMilestone,
  makeActivity,
  normalizeTask,
  normalizeHabit,
  normalizeCommitment,
  normalizeGoal,
  normalizeChallenge,
  normalizeProject,
  normalizeMilestone,
  migrateState,
} from '../domain/schema';
import { generateId } from '../domain/ids';
import { getNextRecurrenceDate } from '../domain/recurrence';
import { buildIndex } from '../domain/engine';
import { syncAchievements } from '../domain/achievements';
import { todayKey, dateKey, startOfDay } from '../utils';

const AppContext = createContext(null);

const initial = { data: emptyState(), loaded: false, migrated: false };

/* -------------------------------------------------------------- helpers */

const replace = (list, id, updater) =>
  list.map((item) => (item.id === id ? updater(item) : item));

const withoutId = (list, id) => list.filter((item) => item.id !== id);

function logActivity(data, activity) {
  return { ...data, activities: [...data.activities, makeActivity(activity)] };
}

function removeActivities(data, type, refId, date) {
  return {
    ...data,
    activities: data.activities.filter(
      (a) => !(a.type === type && a.refId === refId && (!date || a.date === date))
    ),
  };
}

function habitDoneAmount(data, habitId, date) {
  return data.activities
    .filter((a) => a.type === 'habit' && a.refId === habitId && a.date === date)
    .reduce((sum, a) => sum + a.amount, 0);
}

/** Completing a task never means doing the work twice: sync its habit. */
function syncHabitFromTask(data, task, date) {
  const habitId = task.links && task.links.habitId;
  if (!habitId) return data;
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  if (habitDoneAmount(data, habitId, date) >= (habit.target || 1)) return data;
  return logActivity(data, { type: 'habit', refId: habitId, date, amount: habit.target || 1 });
}

/** ...and the mirror image: checking a habit ticks its task for that day. */
function syncTaskFromHabit(data, habitId, date) {
  const target = data.tasks.find(
    (t) =>
      !t.done &&
      t.links.habitId === habitId &&
      t.dueDate &&
      dateKey(t.dueDate) === date
  );
  if (!target) return data;
  let next = {
    ...data,
    tasks: replace(data.tasks, target.id, (t) => ({
      ...t,
      done: true,
      completedAt: Date.now(),
    })),
  };
  next = logActivity(next, { type: 'task', refId: target.id, date });
  return spawnRecurrence(next, target);
}

/** Recurring tasks roll forward the moment the current occurrence is done. */
function spawnRecurrence(data, task) {
  if (!task.recurrence) return data;
  const nextDue = getNextRecurrenceDate(task.dueDate || Date.now(), task.recurrence);
  if (!nextDue) return data;
  const alreadyQueued = data.tasks.some(
    (t) =>
      !t.done &&
      t.id !== task.id &&
      t.text === task.text &&
      t.dueDate &&
      startOfDay(t.dueDate) === startOfDay(nextDue)
  );
  if (alreadyQueued) return data;
  const next = makeTask({
    ...task,
    id: generateId('t'),
    done: false,
    completedAt: null,
    createdAt: Date.now(),
    dueDate: nextDue,
    subtasks: (task.subtasks || []).map((st) => ({ ...st, id: generateId('s'), done: false })),
  });
  return { ...data, tasks: [next, ...data.tasks] };
}

/* -------------------------------------------------------------- reducer */

function reducer(state, action) {
  if (action.type === 'LOAD') {
    return { data: action.data, loaded: true, migrated: !!action.migrated };
  }
  if (!state.loaded && action.type !== 'LOAD') return state;

  const data = state.data;
  const today = todayKey();
  const next = (d) => ({ ...state, data: d });

  switch (action.type) {
    /* ------------------------------------------------------------ tasks */
    case 'ADD_TASK': {
      const task = makeTask(action.task);
      return next({ ...data, tasks: [task, ...data.tasks] });
    }
    case 'EDIT_TASK':
      return next({
        ...data,
        tasks: replace(data.tasks, action.id, (t) => normalizeTask({ ...t, ...action.updates })),
      });
    case 'DELETE_TASK':
      return next({ ...data, tasks: withoutId(data.tasks, action.id) });
    case 'TOGGLE_TASK': {
      const task = data.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      if (task.done) {
        // Un-completing withdraws the activity so progress stays honest.
        const cleared = {
          ...data,
          tasks: replace(data.tasks, action.id, (t) => ({ ...t, done: false, completedAt: null })),
        };
        return next(removeActivities(cleared, 'task', action.id));
      }
      let updated = {
        ...data,
        tasks: replace(data.tasks, action.id, (t) => ({
          ...t,
          done: true,
          completedAt: Date.now(),
        })),
      };
      updated = logActivity(updated, { type: 'task', refId: task.id, date: today });
      updated = syncHabitFromTask(updated, task, today);
      updated = spawnRecurrence(updated, task);
      return next(updated);
    }
    case 'RESTORE_TASK': {
      const cleared = {
        ...data,
        tasks: replace(data.tasks, action.id, (t) => ({ ...t, done: false, completedAt: null })),
      };
      return next(removeActivities(cleared, 'task', action.id));
    }
    case 'UNDELETE_TASK':
      return next({ ...data, tasks: [normalizeTask(action.task), ...data.tasks] });
    case 'ADD_SUBTASK':
      return next({
        ...data,
        tasks: replace(data.tasks, action.taskId, (t) => ({
          ...t,
          subtasks: [...t.subtasks, { id: generateId('s'), text: action.text.trim(), done: false }],
        })),
      });
    case 'TOGGLE_SUBTASK':
      return next({
        ...data,
        tasks: replace(data.tasks, action.taskId, (t) => ({
          ...t,
          subtasks: t.subtasks.map((st) =>
            st.id === action.subtaskId ? { ...st, done: !st.done } : st
          ),
        })),
      });
    case 'DELETE_SUBTASK':
      return next({
        ...data,
        tasks: replace(data.tasks, action.taskId, (t) => ({
          ...t,
          subtasks: t.subtasks.filter((st) => st.id !== action.subtaskId),
        })),
      });
    case 'REORDER_TASKS': {
      const arr = [...data.tasks];
      const [item] = arr.splice(action.from, 1);
      arr.splice(action.to, 0, item);
      return next({ ...data, tasks: arr });
    }
    case 'BULK_TASKS': {
      let updated = data;
      for (const id of action.ids) {
        if (action.op === 'delete') {
          updated = { ...updated, tasks: withoutId(updated.tasks, id) };
        } else if (action.op === 'complete') {
          const task = updated.tasks.find((t) => t.id === id);
          if (task && !task.done) {
            updated = {
              ...updated,
              tasks: replace(updated.tasks, id, (t) => ({
                ...t,
                done: true,
                completedAt: Date.now(),
              })),
            };
            updated = logActivity(updated, { type: 'task', refId: id, date: today });
            updated = syncHabitFromTask(updated, task, today);
            updated = spawnRecurrence(updated, task);
          }
        } else if (action.op === 'update') {
          updated = {
            ...updated,
            tasks: replace(updated.tasks, id, (t) => normalizeTask({ ...t, ...action.updates })),
          };
        }
      }
      return next(updated);
    }

    /* ----------------------------------------------------------- habits */
    case 'ADD_HABIT':
      return next({ ...data, habits: [...data.habits, makeHabit(action.habit)] });
    case 'EDIT_HABIT':
      return next({
        ...data,
        habits: replace(data.habits, action.id, (h) => normalizeHabit({ ...h, ...action.updates })),
      });
    case 'DELETE_HABIT': {
      const cleaned = {
        ...data,
        habits: withoutId(data.habits, action.id),
        tasks: data.tasks.map((t) =>
          t.links.habitId === action.id ? { ...t, links: { ...t.links, habitId: null } } : t
        ),
        challenges: data.challenges.map((c) => ({
          ...c,
          requirements: {
            ...c.requirements,
            habitIds: c.requirements.habitIds.filter((id) => id !== action.id),
          },
        })),
      };
      return next(removeActivities(cleaned, 'habit', action.id));
    }
    case 'CHECK_HABIT': {
      const habit = data.habits.find((h) => h.id === action.id);
      if (!habit) return state;
      const date = action.date || today;
      const amount = action.amount || 1;
      let updated = logActivity(data, {
        type: 'habit',
        refId: habit.id,
        date,
        amount,
        note: action.note || '',
      });
      if (habitDoneAmount(updated, habit.id, date) >= (habit.target || 1)) {
        updated = syncTaskFromHabit(updated, habit.id, date);
      }
      return next(updated);
    }
    case 'UNCHECK_HABIT': {
      const date = action.date || today;
      let updated = removeActivities(data, 'habit', action.id, date);
      // Release the day's linked task as well, so the two never disagree.
      const linked = updated.tasks.find(
        (t) => t.links.habitId === action.id && t.dueDate && dateKey(t.dueDate) === date && t.done
      );
      if (linked) {
        updated = {
          ...updated,
          tasks: replace(updated.tasks, linked.id, (t) => ({
            ...t,
            done: false,
            completedAt: null,
          })),
        };
        updated = removeActivities(updated, 'task', linked.id, date);
      }
      return next(updated);
    }
    case 'SET_HABIT_AMOUNT': {
      const habit = data.habits.find((h) => h.id === action.id);
      if (!habit) return state;
      const date = action.date || today;
      let updated = removeActivities(data, 'habit', action.id, date);
      if (action.amount > 0) {
        updated = logActivity(updated, {
          type: 'habit',
          refId: action.id,
          date,
          amount: action.amount,
        });
        if (action.amount >= (habit.target || 1)) {
          updated = syncTaskFromHabit(updated, habit.id, date);
        }
      }
      return next(updated);
    }

    /* ------------------------------------------------------ commitments */
    case 'ADD_COMMITMENT':
      return next({
        ...data,
        commitments: [...data.commitments, makeCommitment(action.commitment)],
      });
    case 'EDIT_COMMITMENT':
      return next({
        ...data,
        commitments: replace(data.commitments, action.id, (c) =>
          normalizeCommitment({ ...c, ...action.updates })
        ),
      });
    case 'DELETE_COMMITMENT':
      return next({
        ...data,
        commitments: withoutId(data.commitments, action.id),
        goals: data.goals.map((g) =>
          g.commitmentId === action.id ? { ...g, commitmentId: null } : g
        ),
        milestones: data.milestones.filter(
          (m) => !(m.parentType === 'commitment' && m.parentId === action.id)
        ),
        tasks: data.tasks.map((t) => unlink(t, 'commitmentIds', action.id)),
        habits: data.habits.map((h) => unlink(h, 'commitmentIds', action.id)),
        challenges: data.challenges.map((c) => unlink(c, 'commitmentIds', action.id)),
      });

    /* ------------------------------------------------------------ goals */
    case 'ADD_GOAL':
      return next({ ...data, goals: [...data.goals, makeGoal(action.goal)] });
    case 'EDIT_GOAL':
      return next({
        ...data,
        goals: replace(data.goals, action.id, (g) => normalizeGoal({ ...g, ...action.updates })),
      });
    case 'DELETE_GOAL':
      return next({
        ...data,
        goals: withoutId(data.goals, action.id),
        milestones: data.milestones.filter(
          (m) => !(m.parentType === 'goal' && m.parentId === action.id)
        ),
        tasks: data.tasks.map((t) => unlink(t, 'goalIds', action.id)),
        habits: data.habits.map((h) => unlink(h, 'goalIds', action.id)),
        challenges: data.challenges.map((c) => unlink(c, 'goalIds', action.id)),
      });
    case 'BUMP_GOAL_METRIC':
      return next({
        ...data,
        goals: replace(data.goals, action.id, (g) => ({
          ...g,
          metric: {
            ...g.metric,
            current: Math.max(0, (g.metric.current || 0) + action.delta),
          },
        })),
      });

    /* ------------------------------------------------------- challenges */
    case 'ADD_CHALLENGE':
      return next({ ...data, challenges: [...data.challenges, makeChallenge(action.challenge)] });
    case 'EDIT_CHALLENGE':
      return next({
        ...data,
        challenges: replace(data.challenges, action.id, (c) =>
          normalizeChallenge({ ...c, ...action.updates })
        ),
      });
    case 'DELETE_CHALLENGE':
      return next({
        ...data,
        challenges: withoutId(data.challenges, action.id),
        milestones: data.milestones.filter(
          (m) => !(m.parentType === 'challenge' && m.parentId === action.id)
        ),
        tasks: data.tasks.map((t) => unlink(t, 'challengeIds', action.id)),
        habits: data.habits.map((h) => unlink(h, 'challengeIds', action.id)),
      });
    case 'SET_CHALLENGE_STATUS':
      return next({
        ...data,
        challenges: replace(data.challenges, action.id, (c) => ({
          ...c,
          manualStatus: action.status === 'active' ? null : action.status,
          completedAt: action.status === 'completed' ? Date.now() : null,
        })),
      });

    /* ------------------------------------------------------- milestones */
    case 'ADD_MILESTONE': {
      const siblings = data.milestones.filter(
        (m) => m.parentType === action.milestone.parentType && m.parentId === action.milestone.parentId
      );
      return next({
        ...data,
        milestones: [
          ...data.milestones,
          makeMilestone({ ...action.milestone, order: siblings.length }),
        ],
      });
    }
    case 'EDIT_MILESTONE':
      return next({
        ...data,
        milestones: replace(data.milestones, action.id, (m) =>
          normalizeMilestone({ ...m, ...action.updates })
        ),
      });
    case 'TOGGLE_MILESTONE':
      return next({
        ...data,
        milestones: replace(data.milestones, action.id, (m) => ({
          ...m,
          done: !m.done,
          doneAt: !m.done ? Date.now() : null,
        })),
      });
    case 'DELETE_MILESTONE':
      return next({
        ...data,
        milestones: withoutId(data.milestones, action.id),
        tasks: data.tasks.map((t) => unlink(t, 'milestoneIds', action.id)),
      });

    /* --------------------------------------------------------- projects */
    case 'ADD_PROJECT':
      return next({ ...data, projects: [...data.projects, makeProject(action.project)] });
    case 'EDIT_PROJECT':
      return next({
        ...data,
        projects: replace(data.projects, action.id, (p) =>
          normalizeProject({ ...p, ...action.updates })
        ),
      });
    case 'DELETE_PROJECT':
      return next({
        ...data,
        projects: withoutId(data.projects, action.id),
        tasks: data.tasks.map((t) =>
          t.projectId === action.id ? { ...t, projectId: null, sectionId: null } : t
        ),
      });
    case 'ADD_SECTION':
      return next({
        ...data,
        projects: replace(data.projects, action.projectId, (p) => ({
          ...p,
          sections: [
            ...p.sections,
            { id: generateId('sec'), name: action.name, order: p.sections.length },
          ],
        })),
      });
    case 'DELETE_SECTION':
      return next({
        ...data,
        projects: replace(data.projects, action.projectId, (p) => ({
          ...p,
          sections: p.sections.filter((s) => s.id !== action.sectionId),
        })),
        tasks: data.tasks.map((t) =>
          t.sectionId === action.sectionId ? { ...t, sectionId: null } : t
        ),
      });

    /* ------------------------------------------------------------ links */
    case 'SET_LINKS': {
      const collection = action.entity; // tasks | habits | challenges
      return next({
        ...data,
        [collection]: replace(data[collection], action.id, (item) => ({
          ...item,
          links: { ...item.links, ...action.links },
        })),
      });
    }
    case 'SET_CHALLENGE_REQUIREMENTS':
      return next({
        ...data,
        challenges: replace(data.challenges, action.id, (c) => ({
          ...c,
          requirements: { ...c.requirements, ...action.requirements },
        })),
      });

    /* --------------------------------------------------------- settings */
    case 'SET_SETTING':
      return next({ ...data, settings: { ...data.settings, [action.key]: action.value } });
    case 'SET_ACHIEVEMENTS':
      return next({ ...data, achievements: action.achievements });
    case 'IMPORT_STATE':
      return next(migrateState(action.data, null));
    case 'RESET_ALL':
      return next(emptyState());
    default:
      return state;
  }
}

function unlink(entity, field, id) {
  if (!entity.links || !Array.isArray(entity.links[field])) return entity;
  if (!entity.links[field].includes(id)) return entity;
  return {
    ...entity,
    links: { ...entity.links, [field]: entity.links[field].filter((x) => x !== id) },
  };
}

/* ------------------------------------------------------------- provider */

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [newAchievements, setNewAchievements] = useState([]);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadAppState().then(({ state: data, migrated }) => {
      if (!cancelled) dispatch({ type: 'LOAD', data, migrated });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced persistence: rapid check-offs should not thrash storage.
  useEffect(() => {
    if (!state.loaded) return undefined;
    pending.current = state.data;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pending.current) saveAppState(pending.current);
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.data, state.loaded]);

  // Flush on unmount so nothing is lost if the app is closed mid-debounce.
  useEffect(
    () => () => {
      if (pending.current) saveAppState(pending.current);
    },
    []
  );

  const index = useMemo(() => buildIndex(state.data), [state.data]);

  // Award badges after the state settles, and surface anything newly earned.
  useEffect(() => {
    if (!state.loaded || !state.data.settings.gamification) return;
    const { achievements, added } = syncAchievements(state.data, index);
    if (added.length) {
      dispatch({ type: 'SET_ACHIEVEMENTS', achievements });
      setNewAchievements(added);
    }
  }, [state.data, state.loaded, index]);

  const clearNewAchievements = useCallback(() => setNewAchievements([]), []);

  const actions = useMemo(() => makeActions(dispatch), [dispatch]);

  const value = useMemo(
    () => ({
      state: state.data,
      loaded: state.loaded,
      migrated: state.migrated,
      index,
      actions,
      newAchievements,
      clearNewAchievements,
    }),
    [state.data, state.loaded, state.migrated, index, actions, newAchievements, clearNewAchievements]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function makeActions(dispatch) {
  return {
    // tasks
    addTask: (task) => dispatch({ type: 'ADD_TASK', task }),
    editTask: (id, updates) => dispatch({ type: 'EDIT_TASK', id, updates }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', id }),
    toggleTask: (id) => dispatch({ type: 'TOGGLE_TASK', id }),
    restoreTask: (id) => dispatch({ type: 'RESTORE_TASK', id }),
    undeleteTask: (task) => dispatch({ type: 'UNDELETE_TASK', task }),
    addSubtask: (taskId, text) => dispatch({ type: 'ADD_SUBTASK', taskId, text }),
    toggleSubtask: (taskId, subtaskId) => dispatch({ type: 'TOGGLE_SUBTASK', taskId, subtaskId }),
    deleteSubtask: (taskId, subtaskId) => dispatch({ type: 'DELETE_SUBTASK', taskId, subtaskId }),
    reorderTasks: (from, to) => dispatch({ type: 'REORDER_TASKS', from, to }),
    bulkTasks: (ids, op, updates) => dispatch({ type: 'BULK_TASKS', ids, op, updates }),
    // habits
    addHabit: (habit) => dispatch({ type: 'ADD_HABIT', habit }),
    editHabit: (id, updates) => dispatch({ type: 'EDIT_HABIT', id, updates }),
    deleteHabit: (id) => dispatch({ type: 'DELETE_HABIT', id }),
    checkHabit: (id, amount, date, note) =>
      dispatch({ type: 'CHECK_HABIT', id, amount, date, note }),
    uncheckHabit: (id, date) => dispatch({ type: 'UNCHECK_HABIT', id, date }),
    setHabitAmount: (id, amount, date) => dispatch({ type: 'SET_HABIT_AMOUNT', id, amount, date }),
    // commitments
    addCommitment: (commitment) => dispatch({ type: 'ADD_COMMITMENT', commitment }),
    editCommitment: (id, updates) => dispatch({ type: 'EDIT_COMMITMENT', id, updates }),
    deleteCommitment: (id) => dispatch({ type: 'DELETE_COMMITMENT', id }),
    // goals
    addGoal: (goal) => dispatch({ type: 'ADD_GOAL', goal }),
    editGoal: (id, updates) => dispatch({ type: 'EDIT_GOAL', id, updates }),
    deleteGoal: (id) => dispatch({ type: 'DELETE_GOAL', id }),
    bumpGoalMetric: (id, delta) => dispatch({ type: 'BUMP_GOAL_METRIC', id, delta }),
    // challenges
    addChallenge: (challenge) => dispatch({ type: 'ADD_CHALLENGE', challenge }),
    editChallenge: (id, updates) => dispatch({ type: 'EDIT_CHALLENGE', id, updates }),
    deleteChallenge: (id) => dispatch({ type: 'DELETE_CHALLENGE', id }),
    setChallengeStatus: (id, status) => dispatch({ type: 'SET_CHALLENGE_STATUS', id, status }),
    setChallengeRequirements: (id, requirements) =>
      dispatch({ type: 'SET_CHALLENGE_REQUIREMENTS', id, requirements }),
    // milestones
    addMilestone: (milestone) => dispatch({ type: 'ADD_MILESTONE', milestone }),
    editMilestone: (id, updates) => dispatch({ type: 'EDIT_MILESTONE', id, updates }),
    toggleMilestone: (id) => dispatch({ type: 'TOGGLE_MILESTONE', id }),
    deleteMilestone: (id) => dispatch({ type: 'DELETE_MILESTONE', id }),
    // projects
    addProject: (project) => dispatch({ type: 'ADD_PROJECT', project }),
    editProject: (id, updates) => dispatch({ type: 'EDIT_PROJECT', id, updates }),
    deleteProject: (id) => dispatch({ type: 'DELETE_PROJECT', id }),
    addSection: (projectId, name) => dispatch({ type: 'ADD_SECTION', projectId, name }),
    deleteSection: (projectId, sectionId) =>
      dispatch({ type: 'DELETE_SECTION', projectId, sectionId }),
    // graph + settings
    setLinks: (entity, id, links) => dispatch({ type: 'SET_LINKS', entity, id, links }),
    setSetting: (key, value) => dispatch({ type: 'SET_SETTING', key, value }),
    importState: (data) => dispatch({ type: 'IMPORT_STATE', data }),
    resetAll: () => dispatch({ type: 'RESET_ALL' }),
  };
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/* Exported for the reducer tests, which run outside React. */
export { reducer as appReducer, initial as initialStoreState };
