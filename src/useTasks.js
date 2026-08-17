import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { loadTasks, saveTasks } from './storage';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function taskReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { tasks: action.tasks, loaded: true };
    case 'ADD': {
      const task = {
        id: generateId(),
        text: action.text.trim(),
        done: false,
        priority: action.priority || 'none',
        category: action.category || null,
        dueDate: action.dueDate || null,
        createdAt: Date.now(),
        completedAt: null,
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }
    case 'EDIT':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.updates } : t
        ),
      };
    case 'DELETE':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
      };
    case 'TOGGLE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
            : t
        ),
      };
    case 'RESTORE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? { ...t, done: false, completedAt: null }
            : t
        ),
      };
    case 'REORDER': {
      const { from, to } = action;
      const arr = [...state.tasks];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...state, tasks: arr };
    }
    default:
      return state;
  }
}

export function useTasks() {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: [],
    loaded: false,
  });

  useEffect(() => {
    loadTasks().then((tasks) => dispatch({ type: 'LOAD', tasks }));
  }, []);

  useEffect(() => {
    if (state.loaded) saveTasks(state.tasks);
  }, [state.tasks, state.loaded]);

  const addTask = useCallback(
    (text, priority, category, dueDate) =>
      dispatch({ type: 'ADD', text, priority, category, dueDate }),
    []
  );

  const editTask = useCallback(
    (id, updates) => dispatch({ type: 'EDIT', id, updates }),
    []
  );

  const deleteTask = useCallback(
    (id) => dispatch({ type: 'DELETE', id }),
    []
  );

  const toggleTask = useCallback(
    (id) => dispatch({ type: 'TOGGLE', id }),
    []
  );

  const restoreTask = useCallback(
    (id) => dispatch({ type: 'RESTORE', id }),
    []
  );

  const reorderTasks = useCallback(
    (from, to) => dispatch({ type: 'REORDER', from, to }),
    []
  );

  const stats = useMemo(() => {
    const active = state.tasks.filter((t) => !t.done);
    return {
      total: state.tasks.length,
      active: active.length,
      completed: state.tasks.length - active.length,
    };
  }, [state.tasks]);

  return {
    tasks: state.tasks,
    loaded: state.loaded,
    stats,
    addTask,
    editTask,
    deleteTask,
    toggleTask,
    restoreTask,
    reorderTasks,
  };
}
