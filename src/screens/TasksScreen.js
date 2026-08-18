/**
 * The original todo screen, preserved.
 *
 * Search, filters, sorting, swipe-to-delete, multi-select, subtasks, the add
 * bar and the edit sheet all behave exactly as they did. What is new sits
 * around them: projects, a calendar view, and the links that let a task feed a
 * goal or a challenge.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { useTasks } from '../useTasks';
import { isPast, todayKey, dateKey } from '../utils';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import TaskItem from '../components/TaskItem';
import AddTask from '../components/AddTask';
import EditModal from '../components/EditModal';
import EmptyState from '../components/EmptyState';
import CalendarView from './CalendarView';
import { Segmented, Chip, Sheet, Field, TextField, SheetActions } from '../components/ui';
import { ColorPicker, IconPicker } from '../components/pickers';
import { ENTITY_COLORS, ICON_CHOICES } from '../theme';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

export default function TasksScreen({ theme, isDark, onToggleTheme }) {
  const { state, actions } = useApp();
  const nav = useNav();
  const {
    tasks,
    stats,
    addTask,
    editTask,
    deleteTask,
    toggleTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    restoreTask,
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    bulkDelete,
    bulkComplete,
  } = useTasks();

  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [projectSheet, setProjectSheet] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.labels || []).some((l) => l.toLowerCase().includes(q))
      );
    }

    if (projectFilter === 'inbox') result = result.filter((t) => !t.projectId);
    else if (projectFilter !== 'all') result = result.filter((t) => t.projectId === projectFilter);

    if (filter === 'active') result = result.filter((t) => !t.done);
    if (filter === 'completed') result = result.filter((t) => t.done);

    result = [...result].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;

      const aOverdue = a.dueDate && isPast(a.dueDate) && !a.done;
      const bOverdue = b.dueDate && isPast(b.dueDate) && !b.done;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      switch (sortBy) {
        case 'dueDate':
          if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return b.createdAt - a.createdAt;
        case 'priority': {
          const pa = PRIORITY_ORDER[a.priority] ?? 3;
          const pb = PRIORITY_ORDER[b.priority] ?? 3;
          if (pa !== pb) return pa - pb;
          return b.createdAt - a.createdAt;
        }
        case 'alpha':
          return a.text.localeCompare(b.text);
        case 'created':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [tasks, filter, searchQuery, sortBy, projectFilter]);

  const scopedStats = useMemo(() => {
    const scope = tasks.filter((t) => {
      if (projectFilter === 'inbox') return !t.projectId;
      if (projectFilter !== 'all') return t.projectId === projectFilter;
      return true;
    });
    const active = scope.filter((t) => !t.done);
    return { total: scope.length, active: active.length, completed: scope.length - active.length };
  }, [tasks, projectFilter]);

  const showToast = useCallback((message, task) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, task });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleDelete = useCallback(
    (id) => {
      const removed = tasks.find((t) => t.id === id);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteTask(id);
      showToast('Task deleted', removed);
    },
    [tasks, deleteTask, showToast]
  );

  const handleUndo = useCallback(() => {
    if (!toast || !toast.task) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    actions.undeleteTask(toast.task);
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [toast, actions]);

  const handleEdit = useCallback((task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTask(task);
  }, []);

  const handleToggle = useCallback(
    (id) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleTask(id);
    },
    [toggleTask]
  );

  const handleBulkDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const count = selectedIds.size;
    bulkDelete();
    showToast(`${count} tasks deleted`, null);
  }, [bulkDelete, selectedIds, showToast]);

  const handleBulkComplete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bulkComplete();
  }, [bulkComplete]);

  const handleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (selectedIds.size === filteredTasks.length) deselectAll();
    else selectAll(filteredTasks.map((t) => t.id));
  }, [selectedIds, filteredTasks, selectAll, deselectAll]);

  return (
    <View style={{ flex: 1 }}>
      {selectionMode ? (
        <View
          style={[
            styles.selectionHeader,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectionBtn}>
            <Text style={[styles.selectionBtnText, { color: theme.colors.primary }]}>
              {selectedIds.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.selectionCount, { color: theme.colors.text }]}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectionBtn}>
            <Text style={[styles.selectionBtnText, { color: theme.colors.danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Header
          theme={theme}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          stats={scopedStats}
          onToggleSelectionMode={toggleSelectionMode}
        />
      )}

      {selectionMode && selectedIds.size > 0 && (
        <View
          style={[
            styles.bulkActions,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleBulkComplete}
            style={[styles.bulkBtn, { backgroundColor: theme.colors.successLight }]}
          >
            <Text style={[styles.bulkBtnText, { color: theme.colors.success }]}>✓ Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBulkDelete}
            style={[styles.bulkBtn, { backgroundColor: theme.colors.dangerLight }]}
          >
            <Text style={[styles.bulkBtnText, { color: theme.colors.danger }]}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectionMode && (
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Segmented
            theme={theme}
            options={[
              { id: 'list', label: 'List' },
              { id: 'calendar', label: 'Calendar' },
            ]}
            value={view}
            onChange={setView}
          />
        </View>
      )}

      {view === 'calendar' && !selectionMode ? (
        <CalendarView theme={theme} onOpenTask={handleEdit} />
      ) : (
        <>
          {!selectionMode && (
            <>
              <SearchBar theme={theme} query={searchQuery} onChange={setSearchQuery} />
              <View style={{ paddingLeft: 20, paddingVertical: 4 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                  <Chip
                    theme={theme}
                    label="All"
                    active={projectFilter === 'all'}
                    onPress={() => setProjectFilter('all')}
                  />
                  <Chip
                    theme={theme}
                    label="Inbox"
                    icon="📥"
                    active={projectFilter === 'inbox'}
                    onPress={() => setProjectFilter('inbox')}
                  />
                  {state.projects
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <Chip
                        key={p.id}
                        theme={theme}
                        label={p.name}
                        icon={p.icon}
                        color={p.color}
                        active={projectFilter === p.id}
                        onPress={() => setProjectFilter(p.id)}
                      />
                    ))}
                  <Chip theme={theme} label="+ Project" onPress={() => setProjectSheet(true)} />
                </ScrollView>
              </View>
              <FilterBar
                theme={theme}
                filter={filter}
                setFilter={setFilter}
                stats={scopedStats}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </>
          )}

          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskItem
                task={item}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                theme={theme}
                selectionMode={selectionMode}
                selected={selectedIds.has(item.id)}
                onToggleSelection={toggleSelection}
                onToggleSubtask={(subtaskId) => toggleSubtask(item.id, subtaskId)}
                onAddSubtask={(text) => addSubtask(item.id, text)}
                onDeleteSubtask={(subtaskId) => deleteSubtask(item.id, subtaskId)}
                state={state}
              />
            )}
            contentContainerStyle={[
              { paddingBottom: 24 },
              filteredTasks.length === 0 && { flexGrow: 1 },
            ]}
            ListEmptyComponent={
              <EmptyState theme={theme} filter={filter} searchQuery={searchQuery} />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {!selectionMode && (
            <AddTask
              onAdd={(text, priority, category, dueDate, notes, subtasks, recurrence) =>
                addTask(text, priority, category, dueDate, notes, subtasks, recurrence, {
                  projectId: projectFilter !== 'all' && projectFilter !== 'inbox' ? projectFilter : null,
                })
              }
              theme={theme}
            />
          )}
        </>
      )}

      {!selectionMode && (
        <EditModal
          task={editingTask}
          onSave={editTask}
          onDelete={handleDelete}
          onClose={() => setEditingTask(null)}
          theme={theme}
          state={state}
        />
      )}

      <ProjectSheet
        theme={theme}
        visible={projectSheet}
        actions={actions}
        onClose={() => setProjectSheet(false)}
      />

      {toast && (
        <View
          style={[
            styles.toast,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.toastText, { color: theme.colors.text }]}>{toast.message}</Text>
          {!!toast.task && (
            <TouchableOpacity onPress={handleUndo}>
              <Text style={[styles.toastAction, { color: theme.colors.primary }]}>Undo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ProjectSheet({ theme, visible, actions, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(ENTITY_COLORS[0]);
  const [icon, setIcon] = useState('📁');

  useEffect(() => {
    if (visible) {
      setName('');
      setColor(ENTITY_COLORS[0]);
      setIcon('📁');
    }
  }, [visible]);

  return (
    <Sheet theme={theme} visible={visible} onClose={onClose} title="New project" maxHeight="80%">
      <Field theme={theme} label="Name">
        <TextField theme={theme} value={name} onChangeText={setName} placeholder="Portfolio site" autoFocus />
      </Field>
      <Field theme={theme} label="Icon">
        <IconPicker theme={theme} value={icon} onChange={setIcon} choices={['📁', ...ICON_CHOICES]} />
      </Field>
      <Field theme={theme} label="Colour">
        <ColorPicker theme={theme} value={color} onChange={setColor} choices={ENTITY_COLORS} />
      </Field>
      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={() => {
          if (!name.trim()) return;
          actions.addProject({ name: name.trim(), color, icon });
          onClose();
        }}
        confirmLabel="Create project"
        disabled={!name.trim()}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  toastText: { fontSize: 15, fontWeight: '500' },
  toastAction: { fontSize: 15, fontWeight: '700', marginLeft: 16 },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectionBtn: { padding: 8 },
  selectionBtnText: { fontSize: 15, fontWeight: '600' },
  selectionCount: { fontSize: 15, fontWeight: '600' },
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bulkBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  bulkBtnText: { fontSize: 14, fontWeight: '600' },
});
