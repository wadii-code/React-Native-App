import { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
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
        notes: action.notes || '',
        subtasks: action.subtasks || [],
        recurrence: action.recurrence || null,
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
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          const newDone = !t.done;
          return { ...t, done: newDone, completedAt: newDone ? Date.now() : null };
        }),
      };
    case 'TOGGLE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.taskId) return t;
          const subtasks = t.subtasks.map((st) =>
            st.id === action.subtaskId ? { ...st, done: !st.done } : st
          );
          return { ...t, subtasks };
        }),
      };
    case 'ADD_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.taskId) return t;
          return {
            ...t,
            subtasks: [
              ...t.subtasks,
              { id: generateId(), text: action.text.trim(), done: false },
            ],
          };
        }),
      };
    case 'DELETE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.filter((st) => st.id !== action.subtaskId),
          };
        }),
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    loadTasks().then((tasks) => dispatch({ type: 'LOAD', tasks }));
  }, []);

  useEffect(() => {
    if (state.loaded) saveTasks(state.tasks);
  }, [state.tasks, state.loaded]);

  const addTask = useCallback(
    (text, priority, category, dueDate, notes, subtasks, recurrence) =>
      dispatch({ type: 'ADD', text, priority, category, dueDate, notes, subtasks, recurrence }),
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

  const toggleSubtask = useCallback(
    (taskId, subtaskId) => dispatch({ type: 'TOGGLE_SUBTASK', taskId, subtaskId }),
    []
  );

  const addSubtask = useCallback(
    (taskId, text) => dispatch({ type: 'ADD_SUBTASK', taskId, text }),
    []
  );

  const deleteSubtask = useCallback(
    (taskId, subtaskId) => dispatch({ type: 'DELETE_SUBTASK', taskId, subtaskId }),
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

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((taskIds) => {
    setSelectedIds(new Set(taskIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkDelete = useCallback(() => {
    selectedIds.forEach((id) => dispatch({ type: 'DELETE', id }));
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds]);

  const bulkComplete = useCallback(() => {
    selectedIds.forEach((id) => dispatch({ type: 'TOGGLE', id }));
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds]);

  const bulkSetPriority = useCallback(
    (priority) => {
      selectedIds.forEach((id) => dispatch({ type: 'EDIT', id, updates: { priority } }));
      setSelectedIds(new Set());
      setSelectionMode(false);
    },
    [selectedIds]
  );

  const bulkSetCategory = useCallback(
    (category) => {
      selectedIds.forEach((id) => dispatch({ type: 'EDIT', id, updates: { category } }));
      setSelectedIds(new Set());
      setSelectionMode(false);
    },
    [selectedIds]
  );

  return {
    tasks: state.tasks,
    loaded: state.loaded,
    stats,
    addTask,
    editTask,
    deleteTask,
    toggleTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    restoreTask,
    reorderTasks,
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    bulkDelete,
    bulkComplete,
    bulkSetPriority,
    bulkSetCategory,
  };
}
