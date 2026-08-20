/**
 * The task list.
 *
 * Search, filters, sorting, swipe actions, multi-select, subtasks, the add bar
 * and the edit sheet all behave exactly as they did. What changed is the shape:
 * tasks are now grouped by when they are due - overdue first, then today, then
 * everything after - inside inset lists with sticky headers, which is how a
 * person actually reads a day. Sorting still decides the order *within* each
 * group, so nothing about the existing logic was thrown away.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Pressable,
} from 'react-native';

import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { useTasks } from '../useTasks';
import { isPast, todayKey, dateKey, addDaysKey } from '../utils';
import { ENTITY_COLORS, ICON_CHOICES, withAlpha } from '../theme';
import TaskItem from '../components/TaskItem';
import AddTask from '../components/AddTask';
import EditModal from '../components/EditModal';
import CalendarView from './CalendarView';
import { useTabBarHeight } from '../components/TabBar';
import {
  NavBar,
  LargeTitle,
  Segmented,
  Chip,
  Sheet,
  Field,
  TextField,
  SheetActions,
  SearchField,
  ActionSheet,
  EmptyBlock,
  Toast,
  RoundButton,
  Icon,
  Glass,
  useSafeArea,
  useScrollY,
  useHeaderSpacer,
  haptic,
} from '../components/ui';
import { ColorPicker, IconPicker } from '../components/pickers';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

const SORTS = [
  { id: 'created', label: 'Date created' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'alpha', label: 'Alphabetical' },
];

const BUCKETS = [
  { id: 'overdue', title: 'Overdue', tone: 'danger' },
  { id: 'today', title: 'Today' },
  { id: 'tomorrow', title: 'Tomorrow' },
  { id: 'upcoming', title: 'Upcoming' },
  { id: 'someday', title: 'No date' },
  { id: 'completed', title: 'Completed' },
];

function bucketOf(task, today) {
  if (task.done) return 'completed';
  if (!task.dueDate) return 'someday';
  const key = dateKey(task.dueDate);
  if (key < today) return 'overdue';
  if (key === today) return 'today';
  if (key === addDaysKey(today, 1)) return 'tomorrow';
  return 'upcoming';
}

export default function TasksScreen({ theme, isDark, onToggleTheme }) {
  const { state, actions } = useApp();
  const nav = useNav();
  const insets = useSafeArea();
  const tabBar = useTabBarHeight();
  const headerSpace = useHeaderSpacer();
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const today = todayKey();

  const {
    tasks,
    addTask,
    editTask,
    deleteTask,
    toggleTask,
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
  const [sortSheet, setSortSheet] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
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

  /** The same sorted list, cut into the groups a person reads it in. */
  const sections = useMemo(() => {
    const map = new Map(BUCKETS.map((b) => [b.id, []]));
    for (const task of filteredTasks) map.get(bucketOf(task, today)).push(task);
    return BUCKETS.filter((b) => map.get(b.id).length).map((b) => ({
      ...b,
      key: b.id,
      data: map.get(b.id),
    }));
  }, [filteredTasks, today]);

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
  }, [toast, actions]);

  const handleEdit = useCallback((task) => setEditingTask(task), []);

  const handleToggle = useCallback(
    (id) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleTask(id);
    },
    [toggleTask]
  );

  const handleBulkDelete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptic('warning');
    const count = selectedIds.size;
    bulkDelete();
    showToast(`${count} tasks deleted`, null);
  }, [bulkDelete, selectedIds, showToast]);

  const handleBulkComplete = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptic('medium');
    bulkComplete();
  }, [bulkComplete]);

  const handleSelectAll = useCallback(() => {
    haptic('selection');
    if (selectedIds.size === filteredTasks.length) deselectAll();
    else selectAll(filteredTasks.map((t) => t.id));
  }, [selectedIds, filteredTasks, selectAll, deselectAll]);

  const listHeader = (
    <View>
      <LargeTitle
        theme={theme}
        title="Tasks"
        subtitle={
          scopedStats.total === 0
            ? 'Nothing here yet'
            : `${scopedStats.active} active · ${scopedStats.completed} completed`
        }
      />

      <View style={{ paddingHorizontal: theme.screen, marginTop: 4 }}>
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

      <View style={{ paddingHorizontal: theme.screen, marginTop: 14 }}>
        <SearchField theme={theme} value={searchQuery} onChange={setSearchQuery} placeholder="Search tasks" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: theme.screen }}
        style={{ marginTop: 14 }}
      >
        {[
          { id: 'all', label: 'All', count: scopedStats.total },
          { id: 'active', label: 'Active', count: scopedStats.active },
          { id: 'completed', label: 'Done', count: scopedStats.completed },
        ].map((f) => (
          <Chip
            key={f.id}
            theme={theme}
            label={f.label}
            count={f.count}
            active={filter === f.id}
            onPress={() => setFilter(f.id)}
          />
        ))}
        <View style={{ width: 1, backgroundColor: theme.colors.border, marginVertical: 6 }} />
        <Chip
          theme={theme}
          label="All projects"
          active={projectFilter === 'all'}
          onPress={() => setProjectFilter('all')}
        />
        <Chip
          theme={theme}
          label="Inbox"
          glyph="inbox"
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
        <Chip theme={theme} label="New project" glyph="plus" onPress={() => setProjectSheet(true)} />
      </ScrollView>

      <View style={{ height: 18 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {selectionMode ? (
        <SelectionBar
          theme={theme}
          insets={insets}
          count={selectedIds.size}
          all={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
          onSelectAll={handleSelectAll}
          onCancel={toggleSelectionMode}
          onComplete={handleBulkComplete}
          onDelete={handleBulkDelete}
        />
      ) : (
        <NavBar
          theme={theme}
          title="Tasks"
          scrollY={scrollY}
          threshold={54}
          right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <RoundButton theme={theme} glyph="sliders" size={32} onPress={() => setSortSheet(true)} />
              <RoundButton theme={theme} glyph="ellipsis" size={32} onPress={() => setMoreSheet(true)} />
            </View>
          }
        />
      )}

      {view === 'calendar' && !selectionMode ? (
        <CalendarView
          theme={theme}
          onOpenTask={handleEdit}
          header={listHeader}
          onScroll={onScroll}
          topInset={headerSpace}
          bottomInset={tabBar + 24}
        />
      ) : (
        <Animated.SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          stickySectionHeadersEnabled
          ListHeaderComponent={selectionMode ? <View style={{ height: 12 }} /> : listHeader}
          contentContainerStyle={{
            paddingTop: selectionMode ? insets.top + 56 : headerSpace,
            paddingBottom: tabBar + 108,
            flexGrow: sections.length ? 0 : 1,
          }}
          renderSectionHeader={({ section }) => (
            <SectionHeader theme={theme} section={section} />
          )}
          renderItem={({ item, index, section }) => (
            <View style={{ paddingHorizontal: theme.screen }}>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: index === 0 ? theme.radius.lg : 0,
                  borderTopRightRadius: index === 0 ? theme.radius.lg : 0,
                  borderBottomLeftRadius: index === section.data.length - 1 ? theme.radius.lg : 0,
                  borderBottomRightRadius: index === section.data.length - 1 ? theme.radius.lg : 0,
                  overflow: 'hidden',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderTopWidth: index === 0 ? StyleSheet.hairlineWidth : 0,
                  borderBottomWidth: index === section.data.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderColor: theme.colors.border,
                }}
              >
                <TaskItem
                  task={item}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  theme={theme}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelection={toggleSelection}
                  state={state}
                  first={index === 0}
                  last={index === section.data.length - 1}
                />
              </View>
            </View>
          )}
          SectionSeparatorComponent={({ trailingItem }) => (trailingItem ? null : <View style={{ height: 22 }} />)}
          ListEmptyComponent={
            <TasksEmpty theme={theme} filter={filter} searchQuery={searchQuery} />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {!selectionMode && view === 'list' && (
        <AddTask
          theme={theme}
          bottomOffset={tabBar}
          onAdd={(text, priority, category, dueDate, notes, subtasks, recurrence) =>
            addTask(text, priority, category, dueDate, notes, subtasks, recurrence, {
              projectId: projectFilter !== 'all' && projectFilter !== 'inbox' ? projectFilter : null,
            })
          }
        />
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

      <ActionSheet
        theme={theme}
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title="Sort by"
        message="Order inside each group"
        value={sortBy}
        options={SORTS.map((s) => ({ id: s.id, label: s.label, onPress: () => setSortBy(s.id) }))}
      />

      <ActionSheet
        theme={theme}
        visible={moreSheet}
        onClose={() => setMoreSheet(false)}
        options={[
          { id: 'select', label: 'Select tasks', glyph: 'check', onPress: toggleSelectionMode },
          {
            id: 'theme',
            label: isDark ? 'Switch to light' : 'Switch to dark',
            glyph: isDark ? 'sun' : 'moon',
            onPress: onToggleTheme,
          },
          { id: 'settings', label: 'Settings', glyph: 'sliders', onPress: () => nav.navigate('settings') },
        ]}
      />

      <Toast
        theme={theme}
        visible={!!toast}
        message={toast ? toast.message : ''}
        actionLabel={toast && toast.task ? 'Undo' : null}
        onAction={handleUndo}
        glyph="trash"
        bottomOffset={tabBar + 108}
      />
    </View>
  );
}

/* --------------------------------------------------------------- pieces */

function SectionHeader({ theme, section }) {
  const danger = section.tone === 'danger';
  return (
    <View style={{ paddingHorizontal: theme.screen, paddingTop: 4, paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: theme.radius.full,
          backgroundColor: danger
            ? withAlpha(theme.colors.danger, theme.dark ? 0.18 : 0.1)
            : theme.colors.fill2,
        }}
      >
        <Text
          style={{
            ...theme.type.caption,
            fontWeight: '700',
            letterSpacing: 0.2,
            color: danger ? theme.colors.danger : theme.colors.textSecondary,
          }}
        >
          {section.title}
        </Text>
        <Text
          style={{
            ...theme.type.caption,
            marginLeft: 6,
            color: danger ? withAlpha(theme.colors.danger, 0.7) : theme.colors.textTertiary,
          }}
        >
          {section.data.length}
        </Text>
      </View>
    </View>
  );
}

function TasksEmpty({ theme, filter, searchQuery }) {
  if (searchQuery) {
    return (
      <EmptyBlock
        theme={theme}
        glyph="search"
        title="No matches"
        sub={`Nothing here matches "${searchQuery}".`}
      />
    );
  }
  const copy = {
    all: {
      glyph: 'today',
      title: 'Your day is clear.',
      sub: 'Add your first task below. Swipe a task left to complete it, right to delete it.',
    },
    active: {
      glyph: 'check',
      title: 'All caught up.',
      sub: 'Nothing active. That is allowed to feel good.',
    },
    completed: {
      glyph: 'check',
      title: 'Nothing completed yet',
      sub: 'Finished tasks collect here.',
    },
  }[filter];
  return <EmptyBlock theme={theme} glyph={copy.glyph} title={copy.title} sub={copy.sub} />;
}

/**
 * Multi-select takes over the nav bar rather than pushing a second bar under
 * it - the same way Photos and Mail do it.
 */
function SelectionBar({ theme, insets, count, all, onSelectAll, onCancel, onComplete, onDelete }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}>
      <Glass theme={theme} intensity={80} style={{ paddingTop: insets.top }}>
        <View
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.screen,
          }}
        >
          <Pressable onPress={onSelectAll} hitSlop={theme.hit}>
            <Text style={{ ...theme.type.callout, color: theme.colors.primary }}>
              {all ? 'Deselect all' : 'Select all'}
            </Text>
          </Pressable>
          <Text style={{ ...theme.type.headline, color: theme.colors.text }}>
            {count ? `${count} selected` : 'Select tasks'}
          </Text>
          <Pressable onPress={onCancel} hitSlop={theme.hit}>
            <Text style={{ ...theme.type.callout, color: theme.colors.primary }}>Done</Text>
          </Pressable>
        </View>

        {count > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: theme.screen, paddingBottom: 10 }}>
            <Pressable
              onPress={onComplete}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: theme.radius.sm,
                backgroundColor: withAlpha(theme.colors.success, theme.dark ? 0.2 : 0.12),
              }}
            >
              <Icon name="check" size={14} color={theme.colors.success} weight={2.2} />
              <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.success, marginLeft: 7 }}>
                Complete
              </Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: theme.radius.sm,
                backgroundColor: withAlpha(theme.colors.danger, theme.dark ? 0.2 : 0.11),
              }}
            >
              <Icon name="trash" size={14} color={theme.colors.danger} weight={2} />
              <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.danger, marginLeft: 7 }}>
                Delete
              </Text>
            </Pressable>
          </View>
        )}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.glassHairline,
          }}
        />
      </Glass>
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
    <Sheet theme={theme} visible={visible} onClose={onClose} title="New project" maxHeight="82%">
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
