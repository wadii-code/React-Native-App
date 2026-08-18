/**
 * The original task hook, now a thin view over the unified store.
 *
 * Its API is unchanged on purpose: AddTask, EditModal, TaskItem and everything
 * else written against the todo app keep working exactly as before, while the
 * data underneath is shared with habits, challenges, goals and commitments.
 */
import { useCallback, useMemo, useState } from 'react';
import { useApp } from './store/AppStore';
import { todayKey, dateKey } from './utils';

export function useTasks() {
  const { state, loaded, actions } = useApp();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const tasks = state.tasks;

  const addTask = useCallback(
    (text, priority, category, dueDate, notes, subtasks, recurrence, extra) => {
      if (typeof text === 'object' && text !== null) {
        actions.addTask(text);
        return;
      }
      actions.addTask({
        text,
        priority,
        category,
        dueDate,
        notes,
        subtasks,
        recurrence,
        ...(extra || {}),
      });
    },
    [actions]
  );

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const today = todayKey();
    return {
      total: tasks.length,
      active: active.length,
      completed: tasks.length - active.length,
      completedToday: tasks.filter(
        (t) => t.done && t.completedAt && dateKey(t.completedAt) === today
      ).length,
      overdue: active.filter((t) => t.dueDate && dateKey(t.dueDate) < today).length,
    };
  }, [tasks]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((taskIds) => setSelectedIds(new Set(taskIds)), []);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const endSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const bulkDelete = useCallback(() => {
    actions.bulkTasks([...selectedIds], 'delete');
    endSelection();
  }, [actions, selectedIds, endSelection]);

  const bulkComplete = useCallback(() => {
    actions.bulkTasks([...selectedIds], 'complete');
    endSelection();
  }, [actions, selectedIds, endSelection]);

  const bulkSetPriority = useCallback(
    (priority) => {
      actions.bulkTasks([...selectedIds], 'update', { priority });
      endSelection();
    },
    [actions, selectedIds, endSelection]
  );

  const bulkSetCategory = useCallback(
    (category) => {
      actions.bulkTasks([...selectedIds], 'update', { category });
      endSelection();
    },
    [actions, selectedIds, endSelection]
  );

  return {
    tasks,
    loaded,
    stats,
    addTask,
    editTask: actions.editTask,
    deleteTask: actions.deleteTask,
    toggleTask: actions.toggleTask,
    toggleSubtask: actions.toggleSubtask,
    addSubtask: actions.addSubtask,
    deleteSubtask: actions.deleteSubtask,
    restoreTask: actions.restoreTask,
    reorderTasks: actions.reorderTasks,
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
