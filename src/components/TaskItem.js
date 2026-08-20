/**
 * A task in the main list.
 *
 * It is a row in an inset group, not a card of its own: the group provides the
 * surface and the rounding, this provides the content and the separator. That
 * is the difference between an iOS list and a column of web cards.
 *
 * Two swipes, matching the two things you do to a task:
 *   left  ->  complete
 *   right ->  delete
 */
import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { PRIORITIES, CATEGORIES, withAlpha } from '../theme';
import { formatDueDate, isPast, isToday, formatTime } from '../utils';
import { recurrenceLabel } from '../domain/recurrence';
import { ConnectionSummary } from './LinkPicker';
import { Checkbox, Icon, StrikeText, haptic } from './ui';

function SwipeAction({ theme, glyph, label, color, onPress, align, first, last }) {
  return (
    <RectButton
      style={{
        width: 84,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color,
        borderTopLeftRadius: align === 'right' ? 0 : first ? theme.radius.lg : 0,
        borderBottomLeftRadius: align === 'right' ? 0 : last ? theme.radius.lg : 0,
        borderTopRightRadius: align === 'right' ? (first ? theme.radius.lg : 0) : 0,
        borderBottomRightRadius: align === 'right' ? (last ? theme.radius.lg : 0) : 0,
      }}
      onPress={onPress}
    >
      <Icon name={glyph} size={19} color="#FFFFFF" weight={2.2} />
      <Text style={{ color: '#FFF', ...theme.type.caption2, marginTop: 4 }}>{label}</Text>
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
  state,
  first,
  last,
}) {
  const swipeableRef = useRef(null);
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[0];
  const category = CATEGORIES.find((c) => c.id === task.category);
  const dueLabel = formatDueDate(task.dueDate);
  const overdue = task.dueDate && isPast(task.dueDate) && !task.done;
  const dueToday = task.dueDate && isToday(task.dueDate) && !task.done;
  const tint = priority.id === 'none' ? theme.colors.primary : priority.color;

  const completedSubtasks = task.subtasks ? task.subtasks.filter((st) => st.done).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const press = useRef(new Animated.Value(0)).current;

  const handleToggle = () => onToggle(task.id);

  const handlePress = () => {
    if (selectionMode) {
      haptic('selection');
      onToggleSelection(task.id);
    } else {
      haptic('light');
      onEdit(task);
    }
  };

  const renderRight = (progress) => {
    if (selectionMode) return null;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [84, 0] });
    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <SwipeAction
          theme={theme}
          glyph="trash"
          label="Delete"
          color={theme.colors.danger}
          align="right"
          first={first}
          last={last}
          onPress={() => {
            haptic('warning');
            swipeableRef.current?.close();
            onDelete(task.id);
          }}
        />
      </Animated.View>
    );
  };

  const renderLeft = (progress) => {
    if (selectionMode) return null;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-84, 0] });
    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <SwipeAction
          theme={theme}
          glyph={task.done ? 'repeat' : 'check'}
          label={task.done ? 'Undo' : 'Done'}
          color={theme.colors.success}
          align="left"
          first={first}
          last={last}
          onPress={() => {
            haptic('medium');
            swipeableRef.current?.close();
            onToggle(task.id);
          }}
        />
      </Animated.View>
    );
  };

  const chips = [];
  if (category) chips.push({ key: 'cat', icon: category.icon, label: category.label });
  if (dueLabel) {
    chips.push({
      key: 'due',
      glyph: 'calendar',
      label: dueLabel,
      color: overdue ? theme.colors.danger : dueToday ? theme.colors.warning : null,
    });
  }
  if (task.dueTime != null) chips.push({ key: 'time', glyph: 'clock', label: formatTime(task.dueTime) });
  if (task.recurrence) chips.push({ key: 'rec', glyph: 'repeat', label: recurrenceLabel(task.recurrence) });
  if (task.links && task.links.habitId) chips.push({ key: 'habit', glyph: 'repeat', label: 'Habit' });
  if (totalSubtasks > 0) chips.push({ key: 'sub', glyph: 'check', label: `${completedSubtasks}/${totalSubtasks}` });
  (task.labels || []).slice(0, 2).forEach((l) => chips.push({ key: `l${l}`, label: `@${l}` }));

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRight}
      renderLeftActions={renderLeft}
      overshootRight={false}
      overshootLeft={false}
      friction={1.8}
      rightThreshold={40}
      leftThreshold={40}
    >
      <Pressable
        onPressIn={() => Animated.timing(press, { toValue: 1, duration: 60, useNativeDriver: false }).start()}
        onPressOut={() => Animated.timing(press, { toValue: 0, duration: 220, useNativeDriver: false }).start()}
        onPress={handlePress}
      >
        <Animated.View
          style={{
            backgroundColor: selected
              ? withAlpha(theme.colors.primary, theme.dark ? 0.18 : 0.09)
              : press.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.colors.surface, theme.colors.fill1],
                }),
            paddingHorizontal: 16,
            paddingVertical: 13,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 1 }}>
              {selectionMode ? (
                <Checkbox
                  theme={theme}
                  checked={selected}
                  color={theme.colors.primary}
                  size={22}
                  onPress={() => onToggleSelection(task.id)}
                />
              ) : (
                <Checkbox theme={theme} checked={task.done} color={tint} size={22} onPress={handleToggle} />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <StrikeText
                theme={theme}
                done={task.done}
                style={{ ...theme.type.callout, color: theme.colors.text }}
              >
                {task.text}
              </StrikeText>

              {!!chips.length && !task.done && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 5 }}>
                  {chips.map((c) => (
                    <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {!!c.glyph && (
                        <Icon
                          name={c.glyph}
                          size={11}
                          color={c.color || theme.colors.textTertiary}
                          style={{ marginRight: 3.5 }}
                        />
                      )}
                      {!c.glyph && !!c.icon && <Text style={{ fontSize: 10, marginRight: 3.5 }}>{c.icon}</Text>}
                      <Text
                        style={{
                          ...theme.type.caption,
                          fontWeight: c.color ? '600' : '500',
                          color: c.color || theme.colors.textTertiary,
                        }}
                      >
                        {c.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {!!state && !selectionMode && !task.done && (
                <ConnectionSummary theme={theme} state={state} links={task.links || {}} style={{ marginTop: 7 }} />
              )}

              {!!task.notes && task.notes.trim().length > 0 && !selectionMode && !task.done && (
                <Text
                  numberOfLines={1}
                  style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginTop: 5 }}
                >
                  {task.notes}
                </Text>
              )}
            </View>

            {priority.id !== 'none' && !task.done && (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: priority.color,
                  marginTop: 8,
                  marginLeft: 10,
                }}
              />
            )}
          </View>
        </Animated.View>

        {!last && (
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.colors.separator,
              marginLeft: 50,
            }}
          />
        )}
      </Pressable>
    </Swipeable>
  );
}
