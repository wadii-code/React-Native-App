/**
 * One calendar for everything: tasks, habit schedules, challenge windows,
 * milestones and the deadlines attached to goals and commitments.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import { Card, Checkbox } from '../components/ui';
import { HabitCheckButton } from '../components/cards';
import {
  monthMatrix,
  todayKey,
  dateKey,
  keyToTs,
  formatFullDate,
  formatTime,
} from '../utils';
import {
  isHabitDueOn,
  isHabitDoneOn,
  habitStats,
  challengeStats,
  challengeStartKey,
  challengeEndKey,
} from '../domain/engine';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarView({ theme, onOpenTask }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const weeks = useMemo(() => monthMatrix(cursor.year, cursor.month), [cursor]);

  /** Everything that touches a given day, gathered once for the whole month. */
  const dayIndex = useMemo(() => {
    const map = new Map();
    const touch = (key, patch) => {
      if (!key) return;
      const cur = map.get(key) || { tasks: 0, overdue: 0, habits: 0, events: [] };
      map.set(key, {
        tasks: cur.tasks + (patch.tasks || 0),
        overdue: cur.overdue + (patch.overdue || 0),
        habits: cur.habits + (patch.habits || 0),
        events: patch.event ? [...cur.events, patch.event] : cur.events,
      });
    };

    for (const task of state.tasks) {
      if (!task.dueDate) continue;
      const key = dateKey(task.dueDate);
      touch(key, { tasks: 1, overdue: !task.done && key < today ? 1 : 0 });
    }
    for (const challenge of state.challenges) {
      touch(challengeStartKey(challenge), {
        event: { type: 'challenge', color: challenge.color, label: `${challenge.name} starts`, id: challenge.id },
      });
      touch(challengeEndKey(challenge), {
        event: { type: 'challenge', color: challenge.color, label: `${challenge.name} ends`, id: challenge.id },
      });
    }
    for (const goal of state.goals) {
      if (goal.targetDate) {
        touch(dateKey(goal.targetDate), {
          event: { type: 'goal', color: goal.color, label: `Goal: ${goal.title}`, id: goal.id },
        });
      }
    }
    for (const c of state.commitments) {
      if (c.targetDate) {
        touch(dateKey(c.targetDate), {
          event: { type: 'commitment', color: c.color, label: `Commitment: ${c.title}`, id: c.id },
        });
      }
    }
    for (const m of state.milestones) {
      if (m.targetDate) {
        touch(dateKey(m.targetDate), {
          event: { type: 'milestone', color: theme.colors.accent, label: `Milestone: ${m.title}`, id: m.id },
        });
      }
    }
    return map;
  }, [state, today, theme]);

  const selectedTasks = useMemo(
    () => state.tasks.filter((t) => t.dueDate && dateKey(t.dueDate) === selected),
    [state.tasks, selected]
  );
  const selectedHabits = useMemo(
    () => state.habits.filter((h) => !h.archived && isHabitDueOn(h, index, selected)),
    [state.habits, index, selected]
  );
  const selectedEvents = dayIndex.get(selected)?.events || [];
  const selectedChallenges = useMemo(
    () =>
      state.challenges
        .map((c) => ({ challenge: c, stats: challengeStats(c, state, index, today) }))
        .filter((row) => selected >= row.stats.startKey && selected <= row.stats.endKey),
    [state, index, today, selected]
  );

  const shiftMonth = (delta) => {
    Haptics.selectionAsync();
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 20, color: theme.colors.textSecondary }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text }}>
              {monthLabel}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 20, color: theme.colors.textSecondary }}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, marginBottom: 6 }}>
            {WEEKDAY_LABELS.map((d, i) => (
              <Text
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: '700',
                  color: theme.colors.textTertiary,
                }}
              >
                {d}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row' }}>
              {week.map((key, di) => {
                if (!key) return <View key={di} style={{ flex: 1, height: 46 }} />;
                const info = dayIndex.get(key);
                const isToday = key === today;
                const isSelected = key === selected;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelected(key);
                    }}
                    activeOpacity={0.7}
                    style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : isToday
                          ? withAlpha(theme.colors.primary, 0.14)
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: isToday || isSelected ? '700' : '500',
                          color: isSelected
                            ? '#FFF'
                            : isToday
                            ? theme.colors.primary
                            : theme.colors.text,
                        }}
                      >
                        {Number(key.slice(8))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 2 }}>
                      {!!info?.tasks && (
                        <Dot color={info.overdue ? theme.colors.danger : theme.colors.primary} />
                      )}
                      {!!info?.events.length && <Dot color={theme.colors.accent} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Card>
      </View>

      {/* ------------------------------------------------- selected day */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.colors.textSecondary,
            marginBottom: 12,
          }}
        >
          {formatFullDate(keyToTs(selected))}
        </Text>

        {!selectedTasks.length &&
          !selectedHabits.length &&
          !selectedEvents.length &&
          !selectedChallenges.length && (
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textTertiary, textAlign: 'center' }}>
                Nothing scheduled.
              </Text>
            </Card>
          )}

        {!!selectedEvents.length && (
          <Card theme={theme} style={{ marginBottom: 10 }}>
            {selectedEvents.map((e, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: i === selectedEvents.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.borderLight,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: e.color,
                    marginRight: 10,
                  }}
                />
                <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                  {e.label}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {!!selectedTasks.length && (
          <Card theme={theme} style={{ marginBottom: 10 }}>
            {selectedTasks.map((task, i) => (
              <View
                key={task.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: i === selectedTasks.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.borderLight,
                }}
              >
                <Checkbox
                  theme={theme}
                  checked={task.done}
                  size={21}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    actions.toggleTask(task.id);
                  }}
                />
                <TouchableOpacity
                  style={{ flex: 1, marginLeft: 12 }}
                  activeOpacity={0.7}
                  onPress={() => onOpenTask && onOpenTask(task)}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.md,
                      color: task.done ? theme.colors.textTertiary : theme.colors.text,
                      textDecorationLine: task.done ? 'line-through' : 'none',
                    }}
                  >
                    {task.text}
                  </Text>
                  {task.dueTime != null && (
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>
                      {formatTime(task.dueTime)}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {!!selectedHabits.length && (
          <Card theme={theme} style={{ marginBottom: 10 }}>
            {selectedHabits.map((habit, i) => {
              const stats = habitStats(habit, index, todayKey());
              const doneThatDay = isHabitDoneOn(habit, index, selected);
              return (
                <View
                  key={habit.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: i === selectedHabits.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 10 }}>{habit.icon}</Text>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.7}
                    onPress={() => nav.navigate('habitDetail', { id: habit.id })}
                  >
                    <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}>
                      {habit.name}
                    </Text>
                  </TouchableOpacity>
                  {selected <= today ? (
                    <HabitCheckButton
                      theme={theme}
                      habit={habit}
                      stats={{ ...stats, doneToday: doneThatDay, amountToday: 0 }}
                      size={34}
                      onCheck={() => actions.checkHabit(habit.id, habit.target || 1, selected)}
                      onUncheck={() => actions.uncheckHabit(habit.id, selected)}
                      onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount, selected)}
                    />
                  ) : (
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>scheduled</Text>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        {!!selectedChallenges.length && (
          <Card theme={theme}>
            {selectedChallenges.map((row, i) => (
              <TouchableOpacity
                key={row.challenge.id}
                activeOpacity={0.7}
                onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: i === selectedChallenges.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.borderLight,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>{row.challenge.icon}</Text>
                <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                  {row.challenge.name}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
                  day {Math.max(1, Math.round((keyToTs(selected) - keyToTs(row.stats.startKey)) / 86400000) + 1)} /{' '}
                  {row.stats.totalDays}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function Dot({ color }) {
  return <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />;
}
