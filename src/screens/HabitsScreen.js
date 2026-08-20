/**
 * Habits.
 *
 * Each card carries its own eleven-week grid, so the list answers "which of
 * these am I actually keeping?" without opening a single one. That comparison
 * is the whole point of a habit screen; numbers alone never deliver it.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import {
  NavBar,
  LargeTitle,
  Segmented,
  StatTile,
  EmptyBlock,
  Card,
  RoundButton,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
} from '../components/ui';
import { useTabBarHeight } from '../components/TabBar';
import { HabitCard } from '../components/cards';
import { HabitEditor } from '../components/editors';
import { habitStats, habitWeekCells, habitHistory } from '../domain/engine';
import { todayKey } from '../utils';

export default function HabitsScreen({ theme }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [view, setView] = useState('today');
  const [editing, setEditing] = useState(null); // null | {habit} | 'new'
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const tabBar = useTabBarHeight();

  const rows = useMemo(
    () =>
      state.habits
        .filter((h) => !h.archived)
        .map((habit) => ({
          habit,
          stats: habitStats(habit, index, today),
          week: habitWeekCells(habit, index, today),
          history: habitHistory(habit, index, 76, today),
        })),
    [state.habits, index, today]
  );

  const visible = useMemo(() => {
    const list =
      view === 'today' ? rows.filter((r) => r.stats.dueToday || r.stats.amountToday > 0) : rows;
    return [...list].sort((a, b) => {
      if (a.stats.doneToday !== b.stats.doneToday) return a.stats.doneToday ? 1 : -1;
      return b.stats.current - a.stats.current;
    });
  }, [rows, view]);

  const doneToday = rows.filter((r) => r.stats.doneToday).length;
  const dueToday = rows.filter((r) => r.stats.dueToday).length;
  const bestStreak = rows.reduce((max, r) => Math.max(max, r.stats.best), 0);
  const avgConsistency = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.stats.consistency, 0) / rows.length)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title="Habits"
        scrollY={scrollY}
        threshold={54}
        right={
          <RoundButton
            theme={theme}
            glyph="plus"
            size={32}
            weight={2.3}
            color={theme.colors.primary}
            fg="#FFFFFF"
            onPress={() => setEditing('new')}
          />
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: tabBar + 32 }}
      >
        <LargeTitle
          theme={theme}
          title="Habits"
          subtitle={
            rows.length
              ? `${doneToday} of ${dueToday || rows.length} done today`
              : 'What do you want to repeat?'
          }
        />

        {!!rows.length && (
          <FadeIn>
            <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
              <Segmented
                theme={theme}
                options={[
                  { id: 'today', label: 'Today' },
                  { id: 'all', label: `All (${rows.length})` },
                ]}
                value={view}
                onChange={setView}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: theme.screen, marginTop: 16 }}>
              <StatTile
                theme={theme}
                label="Done today"
                value={`${doneToday}/${dueToday || rows.length}`}
                glyph="check"
              />
              <StatTile
                theme={theme}
                label="Best streak"
                value={bestStreak}
                sub={bestStreak ? 'days' : 'not yet'}
                glyph="flame"
                color={theme.colors.warning}
              />
              <StatTile
                theme={theme}
                label="Consistency"
                value={`${avgConsistency}%`}
                glyph="chart"
                color={theme.colors.success}
              />
            </View>
          </FadeIn>
        )}

        <View style={{ paddingHorizontal: theme.screen, marginTop: 20 }}>
          {visible.map((row, i) => (
            <FadeIn key={row.habit.id} delay={Math.min(i, 6) * 45}>
              <HabitCard
                theme={theme}
                habit={row.habit}
                stats={row.stats}
                week={row.week}
                history={row.history}
                state={state}
                onPress={() => nav.navigate('habitDetail', { id: row.habit.id })}
                onCheck={() => actions.checkHabit(row.habit.id, row.habit.target || 1)}
                onUncheck={() => actions.uncheckHabit(row.habit.id)}
                onSetAmount={(amount) => actions.setHabitAmount(row.habit.id, amount)}
              />
            </FadeIn>
          ))}

          {!rows.length && (
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                glyph="grid"
                title="Start building your first habit."
                sub="Habits are the things you repeat until they stop needing willpower. Link one to a commitment and every check-in counts toward something bigger."
                actionLabel="Create a habit"
                onAction={() => setEditing('new')}
              />
            </Card>
          )}

          {!!rows.length && !visible.length && (
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                glyph="check"
                color={theme.colors.success}
                title="All done for today"
                sub="Nothing else is scheduled. Switch to All to see every habit."
              />
            </Card>
          )}
        </View>
      </Animated.ScrollView>

      <HabitEditor
        theme={theme}
        visible={!!editing}
        habit={editing && editing !== 'new' ? editing : null}
        state={state}
        actions={actions}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}
