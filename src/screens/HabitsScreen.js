import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { ScreenHeader, Segmented, StatTile, EmptyBlock, Card } from '../components/ui';
import { HabitCard } from '../components/cards';
import { HabitEditor } from '../components/editors';
import { habitStats, habitWeekCells } from '../domain/engine';
import { todayKey } from '../utils';

export default function HabitsScreen({ theme }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [view, setView] = useState('today');
  const [editing, setEditing] = useState(null); // null | {habit} | 'new'

  const rows = useMemo(
    () =>
      state.habits
        .filter((h) => !h.archived)
        .map((habit) => ({
          habit,
          stats: habitStats(habit, index, today),
          week: habitWeekCells(habit, index, today),
        })),
    [state.habits, index, today]
  );

  const visible = useMemo(() => {
    const list =
      view === 'today'
        ? rows.filter((r) => r.stats.dueToday || r.stats.amountToday > 0)
        : rows;
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
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title="Habits"
        subtitle={
          rows.length
            ? `${doneToday} of ${dueToday || rows.length} done today`
            : 'What do you want to repeat?'
        }
        right={
          <TouchableOpacity
            onPress={() => setEditing('new')}
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: theme.fontSize.sm }}>
              + New
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {!!rows.length && (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
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

            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 }}>
              <StatTile
                theme={theme}
                label="Done today"
                value={`${doneToday}/${dueToday || rows.length}`}
                icon="✓"
              />
              <StatTile
                theme={theme}
                label="Best streak"
                value={bestStreak}
                sub={bestStreak ? 'days' : 'no streak yet'}
                icon="🔥"
                color={theme.colors.warning}
              />
              <StatTile
                theme={theme}
                label="Consistency"
                value={`${avgConsistency}%`}
                icon="📈"
                color={theme.colors.success}
              />
            </View>
          </>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          {visible.map((row) => (
            <HabitCard
              key={row.habit.id}
              theme={theme}
              habit={row.habit}
              stats={row.stats}
              week={row.week}
              state={state}
              onPress={() => nav.navigate('habitDetail', { id: row.habit.id })}
              onCheck={() => actions.checkHabit(row.habit.id, row.habit.target || 1)}
              onUncheck={() => actions.uncheckHabit(row.habit.id)}
              onSetAmount={(amount) => actions.setHabitAmount(row.habit.id, amount)}
            />
          ))}

          {!rows.length && (
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                icon="🔁"
                title="No habits yet"
                sub="Habits are the things you repeat until they stop needing willpower. Add one, link it to a commitment, and every check-in will count toward something bigger."
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
                icon="✓"
                title="All done for today"
                sub="Nothing else is scheduled. Switch to All to see every habit."
              />
            </Card>
          )}
        </View>
      </ScrollView>

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
