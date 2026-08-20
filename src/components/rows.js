/**
 * The two rows that appear on more than one screen: a task and a habit.
 *
 * Both are written for an inset grouped list - no card of their own, no shadow,
 * no border. The list they sit in provides the surface, and the separator
 * between them starts at the text, not at the edge. That single change is most
 * of what makes a list read as iOS rather than as a stack of web cards.
 */
import React, { useRef } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { PRIORITIES, withAlpha } from '../theme';
import { Checkbox, StreakPill, Icon, ListRow, PressableScale, StrikeText, haptic } from './ui';
import { ConnectionSummary } from './LinkPicker';
import { isTaskOverdue } from '../domain/engine';
import { formatDueDate, formatTime, dateKey } from '../utils';

/* ------------------------------------------------------------------ task */

/**
 * A completed task does not vanish and does not merely grey out: the text fades
 * back and a line is drawn through it, over 220ms, while the row itself settles
 * a little. It reads as "filed", not as "deleted".
 */
export function TaskRow({
  theme,
  task,
  state,
  today,
  onToggle,
  onOpen,
  showMeta = true,
  dense,
}) {
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[0];
  const overdue = isTaskOverdue(task, today);
  const doneToday = task.done && task.completedAt && dateKey(task.completedAt) === today;
  const tint = priority.id === 'none' ? theme.colors.primary : priority.color;

  const meta = [];
  if (overdue) meta.push({ key: 'overdue', label: `Overdue · ${formatDueDate(task.dueDate)}`, color: theme.colors.danger, weight: '600' });
  else if (task.dueTime != null) meta.push({ key: 'time', label: formatTime(task.dueTime), glyph: 'clock' });
  if (doneToday) meta.push({ key: 'done', label: 'Done today', color: theme.colors.success, weight: '600' });
  if (task.links && task.links.habitId) meta.push({ key: 'habit', label: 'Habit', glyph: 'repeat' });
  if (task.recurrence) meta.push({ key: 'rec', label: 'Repeats', glyph: 'repeat' });
  const subtasks = task.subtasks || [];
  if (subtasks.length) {
    meta.push({ key: 'sub', label: `${subtasks.filter((s) => s.done).length}/${subtasks.length}`, glyph: 'check' });
  }

  return (
    <ListRow theme={theme} onPress={onOpen} paddingVertical={dense ? 10 : 12}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ paddingTop: 1 }}>
          <Checkbox theme={theme} checked={task.done} color={tint} size={22} onPress={onToggle} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <StrikeText
            theme={theme}
            done={task.done}
            style={{ ...theme.type.callout, color: theme.colors.text }}
          >
            {task.text}
          </StrikeText>

          {showMeta && !!meta.length && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              {meta.map((m) => (
                <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {!!m.glyph && (
                    <Icon name={m.glyph} size={11} color={m.color || theme.colors.textTertiary} style={{ marginRight: 3 }} />
                  )}
                  <Text
                    style={{
                      ...theme.type.caption,
                      fontWeight: m.weight || '500',
                      color: m.color || theme.colors.textTertiary,
                    }}
                  >
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!!state && (
            <ConnectionSummary theme={theme} state={state} links={task.links || {}} style={{ marginTop: 6 }} />
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
    </ListRow>
  );
}

/* ----------------------------------------------------------------- habit */

/**
 * The check control. Tapping it fills; on a counted habit each tap adds one and
 * the ring around it closes. Long-press resets the day, which is the only
 * destructive gesture in the app that does not ask first - because it undoes
 * something the same finger just did.
 */
export function HabitCheck({ theme, habit, stats, onCheck, onUncheck, onSetAmount, size = 44 }) {
  const target = habit.target || 1;
  const amount = stats.amountToday;
  const done = stats.doneToday;
  const scale = useRef(new Animated.Value(1)).current;

  const bump = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 11, stiffness: 380, useNativeDriver: true }),
    ]).start();
  };

  const press = () => {
    bump();
    if (done) {
      haptic('selection');
      onUncheck();
      return;
    }
    haptic(amount + 1 >= target ? 'medium' : 'light');
    if (target > 1) onSetAmount(amount + 1);
    else onCheck();
  };

  const fillRatio = target > 1 ? Math.min(1, amount / target) : done ? 1 : 0;

  return (
    <Pressable
      onPress={press}
      onLongPress={() => {
        if (amount > 0) {
          haptic('warning');
          bump();
          onSetAmount(0);
        }
      }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.34,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: done ? habit.color : withAlpha(habit.color, theme.dark ? 0.16 : 0.1),
          borderWidth: done ? 0 : 1.5,
          borderColor: withAlpha(habit.color, 0.3),
          transform: [{ scale }],
        }}
      >
        {/* Partial progress rises from the bottom, like a glass filling. */}
        {!done && fillRatio > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${fillRatio * 100}%`,
              backgroundColor: withAlpha(habit.color, 0.3),
            }}
          />
        )}
        {done ? (
          <Icon name="check" size={size * 0.46} color="#FFFFFF" weight={Math.max(2, size * 0.075)} />
        ) : target > 1 ? (
          <Text style={{ ...theme.type.caption, fontWeight: '700', color: habit.color }}>
            {amount}/{target}
          </Text>
        ) : (
          <Icon name="plus" size={size * 0.4} color={habit.color} weight={2.2} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function HabitRow({ theme, habit, stats, onOpen, onCheck, onUncheck, onSetAmount, week, dense }) {
  return (
    <ListRow theme={theme} onPress={onOpen} paddingVertical={dense ? 8 : 10}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(habit.color, theme.dark ? 0.2 : 0.12),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>{habit.icon}</Text>
        </View>

        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              ...theme.type.callout,
              color: stats.doneToday ? theme.colors.textTertiary : theme.colors.text,
            }}
          >
            {habit.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            {stats.current > 0 && (
              <StreakPill
                theme={theme}
                count={stats.current}
                unit={stats.streakUnit === 'week' ? 'w' : 'd'}
                color={habit.color}
                size="sm"
              />
            )}
            {!!stats.period && (
              <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                {stats.period.done}/{stats.period.target} this week
              </Text>
            )}
            {habit.reminderTime != null && stats.current === 0 && !stats.period && (
              <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                {formatTime(habit.reminderTime)}
              </Text>
            )}
          </View>
        </View>

        <HabitCheck
          theme={theme}
          habit={habit}
          stats={stats}
          size={38}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onSetAmount={onSetAmount}
        />
      </View>
    </ListRow>
  );
}

/* --------------------------------------------------------------- section */

/** Screen section: a heading, then its content. Used on Today and the details. */
export function Section({ theme, title, action, onAction, children, style, first }) {
  return (
    <View style={[{ paddingHorizontal: theme.screen, marginTop: first ? 18 : 26 }, style]}>
      {!!title && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingHorizontal: 2,
          }}
        >
          <Text style={{ ...theme.type.headline, color: theme.colors.text }}>{title}</Text>
          {!!action && (
            <PressableScale onPress={onAction} scaleTo={0.94} hitSlop={theme.hit}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...theme.type.subheadEmph, color: theme.colors.primary }}>{action}</Text>
                <Icon name="chevronRight" size={12} color={theme.colors.primary} weight={2.2} style={{ marginLeft: 2 }} />
              </View>
            </PressableScale>
          )}
        </View>
      )}
      {children}
    </View>
  );
}
