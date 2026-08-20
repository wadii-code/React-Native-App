/**
 * One calendar for everything: tasks, habit schedules, challenge windows,
 * milestones and the deadlines attached to goals and commitments.
 *
 * The month grid is drawn the way iOS draws one - a filled disc for the
 * selection, a tinted disc for today, and small marks underneath for what the
 * day holds - and the day's contents sit beneath it in inset lists rather than
 * in a stack of separate cards.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  ListGroup,
  ListRow,
  Checkbox,
  Icon,
  PressableScale,
  Card,
  EmptyBlock,
  haptic,
} from '../components/ui';
import { HabitCheck } from '../components/rows';
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

export default function CalendarView({
  theme,
  onOpenTask,
  header,
  onScroll,
  topInset = 0,
  bottomInset = 120,
}) {
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
    haptic('selection');
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const jumpToToday = () => {
    haptic('light');
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const nothing =
    !selectedTasks.length && !selectedHabits.length && !selectedEvents.length && !selectedChallenges.length;

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottomInset }}
    >
      {header}

      <View style={{ paddingHorizontal: theme.screen }}>
        <Card theme={theme} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            <Text style={{ ...theme.type.title3, color: theme.colors.text }}>{monthLabel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <PressableScale onPress={jumpToToday} scaleTo={0.92} hitSlop={theme.hit} style={{ paddingHorizontal: 8 }}>
                <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.primary }}>Today</Text>
              </PressableScale>
              <PressableScale onPress={() => shiftMonth(-1)} scaleTo={0.85} style={{ padding: 6 }}>
                <Icon name="chevronLeft" size={16} color={theme.colors.primary} weight={2.4} />
              </PressableScale>
              <PressableScale onPress={() => shiftMonth(1)} scaleTo={0.85} style={{ padding: 6 }}>
                <Icon name="chevronRight" size={16} color={theme.colors.primary} weight={2.4} />
              </PressableScale>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((d, i) => (
              <Text
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  ...theme.type.caption2,
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
                if (!key) return <View key={di} style={{ flex: 1, height: 44 }} />;
                const info = dayIndex.get(key);
                const isToday = key === today;
                const isSelected = key === selected;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      haptic('selection');
                      setSelected(key);
                    }}
                    style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
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
                          ? withAlpha(theme.colors.primary, theme.dark ? 0.22 : 0.12)
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          ...theme.type.subhead,
                          fontWeight: isToday || isSelected ? '700' : '400',
                          color: isSelected ? '#FFF' : isToday ? theme.colors.primary : theme.colors.text,
                        }}
                      >
                        {Number(key.slice(8))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 3 }}>
                      {!!info?.tasks && (
                        <Dot color={info.overdue ? theme.colors.danger : theme.colors.primary} />
                      )}
                      {!!info?.events.length && <Dot color={theme.colors.accent} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
      </View>

      {/* ------------------------------------------------- selected day */}
      <View style={{ paddingHorizontal: theme.screen, marginTop: 22 }}>
        <Text style={{ ...theme.type.headline, color: theme.colors.text, marginBottom: 10, paddingHorizontal: 2 }}>
          {selected === today ? 'Today' : formatFullDate(keyToTs(selected))}
        </Text>

        {nothing && (
          <Card theme={theme}>
            <EmptyBlock
              theme={theme}
              compact
              glyph="calendar"
              title="Nothing scheduled"
              sub="This day is free."
            />
          </Card>
        )}

        {!!selectedEvents.length && (
          <ListGroup theme={theme} style={{ marginBottom: 12 }} inset={16}>
            {selectedEvents.map((e, i) => (
              <ListRow key={i} theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.color, marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>{e.label}</Text>
                </View>
              </ListRow>
            ))}
          </ListGroup>
        )}

        {!!selectedTasks.length && (
          <ListGroup theme={theme} style={{ marginBottom: 12 }} inset={50} header="Tasks">
            {selectedTasks.map((task) => (
              <ListRow key={task.id} theme={theme} onPress={() => onOpenTask && onOpenTask(task)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    theme={theme}
                    checked={task.done}
                    size={21}
                    onPress={() => actions.toggleTask(task.id)}
                  />
                  <View style={{ flex: 1, marginLeft: 13 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        ...theme.type.callout,
                        color: task.done ? theme.colors.textTertiary : theme.colors.text,
                        textDecorationLine: task.done ? 'line-through' : 'none',
                      }}
                    >
                      {task.text}
                    </Text>
                    {task.dueTime != null && (
                      <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 2 }}>
                        {formatTime(task.dueTime)}
                      </Text>
                    )}
                  </View>
                </View>
              </ListRow>
            ))}
          </ListGroup>
        )}

        {!!selectedHabits.length && (
          <ListGroup theme={theme} style={{ marginBottom: 12 }} inset={58} header="Habits">
            {selectedHabits.map((habit) => {
              const stats = habitStats(habit, index, todayKey());
              const doneThatDay = isHabitDoneOn(habit, index, selected);
              return (
                <ListRow
                  key={habit.id}
                  theme={theme}
                  onPress={() => nav.navigate('habitDetail', { id: habit.id })}
                  paddingVertical={9}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: withAlpha(habit.color, theme.dark ? 0.2 : 0.12),
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>{habit.icon}</Text>
                    </View>
                    <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>
                      {habit.name}
                    </Text>
                    {selected <= today ? (
                      <HabitCheck
                        theme={theme}
                        habit={habit}
                        stats={{ ...stats, doneToday: doneThatDay, amountToday: 0 }}
                        size={34}
                        onCheck={() => actions.checkHabit(habit.id, habit.target || 1, selected)}
                        onUncheck={() => actions.uncheckHabit(habit.id, selected)}
                        onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount, selected)}
                      />
                    ) : (
                      <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>scheduled</Text>
                    )}
                  </View>
                </ListRow>
              );
            })}
          </ListGroup>
        )}

        {!!selectedChallenges.length && (
          <ListGroup theme={theme} inset={16} header="Challenges">
            {selectedChallenges.map((row) => (
              <ListRow
                key={row.challenge.id}
                theme={theme}
                onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, marginRight: 10 }}>{row.challenge.icon}</Text>
                  <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>
                    {row.challenge.name}
                  </Text>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginRight: 6 }}>
                    day{' '}
                    {Math.max(
                      1,
                      Math.round((keyToTs(selected) - keyToTs(row.stats.startKey)) / 86400000) + 1
                    )}
                    /{row.stats.totalDays}
                  </Text>
                  <Icon name="chevronRight" size={13} color={theme.colors.textQuaternary} weight={2} />
                </View>
              </ListRow>
            ))}
          </ListGroup>
        )}
      </View>
    </Animated.ScrollView>
  );
}

function Dot({ color }) {
  return <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />;
}
