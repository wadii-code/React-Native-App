import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from './src/theme';
import { useTasks } from './src/useTasks';
import { isPast } from './src/utils';
import Header from './src/components/Header';
import SearchBar from './src/components/SearchBar';
import FilterBar from './src/components/FilterBar';
import TaskItem from './src/components/TaskItem';
import AddTask from './src/components/AddTask';
import EditModal from './src/components/EditModal';
import EmptyState from './src/components/EmptyState';

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    tasks,
    loaded,
    stats,
    addTask,
    editTask,
    deleteTask,
    toggleTask,
    restoreTask,
  } = useTasks();

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (filter === 'active') result = result.filter((t) => !t.done);
    if (filter === 'completed') result = result.filter((t) => t.done);

    result = [...result].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const aOverdue = a.dueDate && isPast(a.dueDate) && !a.done;
      const bOverdue = b.dueDate && isPast(b.dueDate) && !b.done;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [tasks, filter, searchQuery]);

  const showToast = useCallback((message, taskId) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, taskId });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleDelete = useCallback(
    (id) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteTask(id);
      showToast('Task deleted', id);
    },
    [deleteTask, showToast]
  );

  const handleUndo = useCallback(() => {
    if (!toast) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    restoreTask(toast.taskId);
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [toast, restoreTask]);

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

  if (!loaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={{ fontSize: 32 }}>✨</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Header theme={theme} isDark={isDark} onToggleTheme={toggleTheme} stats={stats} />
        <SearchBar theme={theme} query={searchQuery} onChange={setSearchQuery} />
        <FilterBar theme={theme} filter={filter} setFilter={setFilter} stats={stats} />

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={handleToggle}
              onEdit={handleEdit}
              theme={theme}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filteredTasks.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={<EmptyState theme={theme} filter={filter} searchQuery={searchQuery} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <AddTask onAdd={addTask} theme={theme} />
      </KeyboardAvoidingView>

      <EditModal
        task={editingTask}
        onSave={editTask}
        onDelete={handleDelete}
        onClose={() => setEditingTask(null)}
        theme={theme}
      />

      {toast && (
        <View style={[styles.toast, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <Text style={[styles.toastText, { color: theme.colors.text }]}>{toast.message}</Text>
          <TouchableOpacity onPress={handleUndo}>
            <Text style={[styles.toastAction, { color: theme.colors.primary }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  listEmpty: {
    flexGrow: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 180,
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
  toastText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toastAction: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 16,
  },
});
