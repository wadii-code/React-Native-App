import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { PRIORITIES, CATEGORIES } from '../theme';
import { formatDueDate, isPast, isToday, formatTime } from '../utils';
import { recurrenceLabel } from '../domain/recurrence';
import { ConnectionSummary } from './LinkPicker';

function Checkbox({ checked, color, onPress, borderColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.checkbox,
        { borderColor },
        checked && { backgroundColor: color, borderColor: color },
      ]}
    >
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

function SwipeAction({ text, color, onPress }) {
  return (
    <RectButton
      style={[styles.swipeAction, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.swipeActionText}>{text}</Text>
    </RectButton>
  );
}

export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  theme,
  selectionMode,
  selected,
  onToggleSelection,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  state,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const swipeableRef = useRef(null);
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[0];
  const category = CATEGORIES.find((c) => c.id === task.category);
  const dueLabel = formatDueDate(task.dueDate);
  const overdue = task.dueDate && isPast(task.dueDate) && !task.done;
  const dueToday = task.dueDate && isToday(task.dueDate) && !task.done;

  const completedSubtasks = task.subtasks ? task.subtasks.filter((st) => st.done).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id);
  };

  const handlePressIn = () => {
    if (!selectionMode) {
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (!selectionMode) {
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    }
  };

  const handlePress = () => {
    if (selectionMode) {
      Haptics.selectionAsync();
      onToggleSelection(task.id);
    } else {
      onEdit(task);
    }
  };

  const handleSwipeDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeableRef.current?.close();
    onDelete(task.id);
  };

  const renderRightActions = (progress) => {
    if (selectionMode) return null;
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <SwipeAction text="Delete" color={theme.colors.danger} onPress={handleSwipeDelete} />
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[
            styles.container,
            {
              backgroundColor: selected ? theme.colors.primaryLight : theme.colors.surface,
            },
          ]}
        >
          <View
            style={[
              styles.priorityBar,
              { backgroundColor: task.done ? theme.colors.border : priority.color },
            ]}
          />
          <View style={styles.content}>
            <View style={styles.topRow}>
              {selectionMode ? (
                <Checkbox
                  checked={selected}
                  color={theme.colors.primary}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleSelection(task.id);
                  }}
                  borderColor={theme.colors.border}
                />
              ) : (
                <Checkbox
                  checked={task.done}
                  color={priority.color}
                  onPress={handleToggle}
                  borderColor={theme.colors.border}
                />
              )}
              <View style={styles.textContainer}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.text,
                    { color: task.done ? theme.colors.textTertiary : theme.colors.text },
                    task.done && styles.textDone,
                  ]}
                >
                  {task.text}
                </Text>
                {!!task.recurrence && (
                  <Text style={[styles.recurrenceBadge, { color: theme.colors.primary }]}>
                    {'↻ '}
                    {recurrenceLabel(task.recurrence)}
                  </Text>
                )}
              </View>
            </View>

            {(category ||
              dueLabel ||
              task.priority !== 'none' ||
              totalSubtasks > 0 ||
              task.dueTime != null ||
              (task.labels || []).length > 0) && (
              <View style={styles.metaRow}>
                {category && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <Text style={styles.badgeIcon}>{category.icon}</Text>
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      {category.label}
                    </Text>
                  </View>
                )}
                {dueLabel && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: overdue
                          ? theme.colors.dangerLight
                          : dueToday
                          ? theme.colors.warningLight
                          : theme.colors.chip,
                      },
                    ]}
                  >
                    <Text style={styles.badgeIcon}>📅</Text>
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: overdue
                            ? theme.colors.danger
                            : dueToday
                            ? theme.colors.warning
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {dueLabel}
                    </Text>
                  </View>
                )}
                {task.dueTime != null && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <Text style={styles.badgeIcon}>🕐</Text>
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      {formatTime(task.dueTime)}
                    </Text>
                  </View>
                )}
                {!!task.links && !!task.links.habitId && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <Text style={styles.badgeIcon}>🔁</Text>
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      Habit
                    </Text>
                  </View>
                )}
                {(task.labels || []).slice(0, 2).map((label) => (
                  <View key={label} style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      @{label}
                    </Text>
                  </View>
                ))}
                {task.priority !== 'none' && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <View
                      style={[styles.priorityDot, { backgroundColor: priority.color }]}
                    />
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      {priority.label}
                    </Text>
                  </View>
                )}
                {totalSubtasks > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.chip }]}>
                    <Text style={styles.badgeIcon}>☑</Text>
                    <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                      {completedSubtasks}/{totalSubtasks}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!!state && !selectionMode && (
              <ConnectionSummary
                theme={theme}
                state={state}
                links={task.links || {}}
                style={styles.connections}
              />
            )}

            {!!task.notes && task.notes.trim().length > 0 && !selectionMode && (
              <Text
                numberOfLines={1}
                style={[styles.notesPreview, { color: theme.colors.textTertiary }]}
              >
                📝 {task.notes}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  priorityBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  textDone: {
    textDecorationLine: 'line-through',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginLeft: 36,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 8,
    marginRight: 20,
    borderRadius: 14,
  },
  swipeActionText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  recurrenceBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  notesPreview: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 36,
    fontStyle: 'italic',
  },
  connections: {
    marginTop: 8,
    marginLeft: 36,
  },
});
