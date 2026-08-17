import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRIORITIES, CATEGORIES } from '../theme';
import { formatDueDate, isPast, isToday } from '../utils';

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

export default function TaskItem({ task, onToggle, onEdit, theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[0];
  const category = CATEGORIES.find((c) => c.id === task.category);
  const dueLabel = formatDueDate(task.dueDate);
  const overdue = task.dueDate && isPast(task.dueDate) && !task.done;
  const dueToday = task.dueDate && isToday(task.dueDate) && !task.done;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(task.id);
  };

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onEdit(task)}
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <View
          style={[
            styles.priorityBar,
            { backgroundColor: task.done ? theme.colors.border : priority.color },
          ]}
        />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Checkbox
              checked={task.done}
              color={priority.color}
              onPress={handleToggle}
              borderColor={theme.colors.border}
            />
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
          </View>
          {(category || dueLabel || task.priority !== 'none') && (
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
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  text: {
    flex: 1,
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
});
