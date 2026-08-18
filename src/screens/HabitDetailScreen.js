import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import { Card, ScreenHeader, SectionTitle, StatTile, ProgressBar, Divider } from '../components/ui';
import Heatmap, { HeatLegend, WeekStrip } from '../components/Heatmap';
import { HabitCheckButton } from '../components/cards';
import { HabitEditor } from '../components/editors';
import { ConnectionSummary } from '../components/LinkPicker';
import {
  habitStats,
  habitHistory,
  habitWeekCells,
  isHabitDoneOn,
  habitAmountOn,
} from '../domain/engine';
import { scheduleLabel } from '../domain/recurrence';
import { todayKey, formatTime, formatShortDate, formatFullDate, keyToTs } from '../utils';

export default function HabitDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);

  const habit = state.habits.find((h) => h.id === params.id);
  const stats = useMemo(() => (habit ? habitStats(habit, index, today) : null), [habit, index, today]);
  const history = useMemo(
    () => (habit ? habitHistory(habit, index, 119, today) : []),
    [habit, index, today]
  );
  const week = useMemo(() => (habit ? habitWeekCells(habit, index, today) : []), [habit, index, today]);

  if (!habit || !stats) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader theme={theme} title="Habit" onBack={nav.goBack} />
        <Text style={{ padding: 20, color: theme.colors.textSecondary }}>This habit no longer exists.</Text>
      </View>
    );
  }

  const linkedTasks = state.tasks.filter((t) => t.links.habitId === habit.id);
  const linkedChallenges = state.challenges.filter((c) =>
    c.requirements.habitIds.includes(habit.id)
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title={`${habit.icon}  ${habit.name}`}
        subtitle={`${scheduleLabel(habit.schedule)}${
          habit.target > 1 ? ` · ${habit.target}${habit.unit ? ` ${habit.unit}` : ''} per day` : ''
        }${habit.reminderTime != null ? ` · ${formatTime(habit.reminderTime)}` : ''}`}
        onBack={nav.goBack}
        compact
        right={
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.chip,
            }}
          >
            <Text style={{ fontWeight: '600', fontSize: theme.fontSize.sm, color: theme.colors.text }}>
              Edit
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ------------------------------------------------- check in */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 0.6 }}>
                  TODAY
                </Text>
                <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginTop: 4 }}>
                  {stats.doneToday
                    ? 'Done'
                    : habit.target > 1
                    ? `${stats.amountToday} of ${habit.target}${habit.unit ? ` ${habit.unit}` : ''}`
                    : stats.dueToday
                    ? 'Not yet'
                    : 'Not scheduled'}
                </Text>
                {!!stats.period && (
                  <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 4 }}>
                    {stats.period.done}/{stats.period.target} this period
                  </Text>
                )}
              </View>
              <HabitCheckButton
                theme={theme}
                habit={habit}
                stats={stats}
                size={54}
                onCheck={() => actions.checkHabit(habit.id, habit.target || 1)}
                onUncheck={() => actions.uncheckHabit(habit.id)}
                onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount)}
              />
            </View>

            <View style={{ marginTop: 18 }}>
              <WeekStrip theme={theme} data={week} color={habit.color} size={30} />
            </View>
          </Card>
        </View>

        {/* --------------------------------------------------- numbers */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 }}>
          <StatTile
            theme={theme}
            label="Current"
            value={`${stats.current}`}
            sub={stats.streakUnit === 'week' ? 'weeks' : 'days'}
            icon="🔥"
            color={habit.color}
          />
          <StatTile theme={theme} label="Best" value={`${stats.best}`} sub={stats.streakUnit === 'week' ? 'weeks' : 'days'} icon="🏆" />
          <StatTile theme={theme} label="Consistency" value={`${stats.consistency}%`} icon="📈" />
        </View>

        {/* --------------------------------------------------- heatmap */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="History" />
          <Card theme={theme}>
            <Heatmap theme={theme} data={history} color={habit.color} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
                {stats.completed} of {stats.expected} scheduled days
              </Text>
              <HeatLegend theme={theme} color={habit.color} />
            </View>
          </Card>
        </View>

        {/* ---------------------------------------------- week / month */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Rhythm" />
          <Card theme={theme}>
            <PeriodRow
              theme={theme}
              label="This week"
              done={stats.week.done}
              target={stats.week.target}
              color={habit.color}
            />
            <Divider theme={theme} />
            <PeriodRow
              theme={theme}
              label="This month"
              done={stats.month.done}
              target={stats.month.target}
              color={habit.color}
            />
            <Divider theme={theme} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                Total check-ins
              </Text>
              <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.text }}>
                {stats.totalCompletions}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                Started
              </Text>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                {formatShortDate(habit.startDate)}
              </Text>
            </View>
          </Card>
        </View>

        {/* ------------------------------------------------ connections */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="What this feeds" />
          <Card theme={theme}>
            {habit.links.commitmentIds.length ||
            habit.links.goalIds.length ||
            linkedChallenges.length ? (
              <>
                <ConnectionSummary theme={theme} state={state} links={habit.links} />
                {linkedChallenges.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => nav.navigate('challengeDetail', { id: c.id })}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ fontSize: 15, marginRight: 8 }}>{c.icon}</Text>
                    <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                      {c.name}
                    </Text>
                    <Text style={{ color: theme.colors.textTertiary }}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                This habit is not connected to anything yet. Link it to a commitment or challenge so
                every check-in moves something bigger.
              </Text>
            )}
            <TouchableOpacity onPress={() => setEditing(true)} style={{ marginTop: 14 }}>
              <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                Manage connections
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {!!habit.description && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Notes" />
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 22 }}>
                {habit.description}
              </Text>
            </Card>
          </View>
        )}

        {!!linkedTasks.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Tasks tracking this habit" />
            <Card theme={theme}>
              {linkedTasks.slice(0, 6).map((t, i) => (
                <Text
                  key={t.id}
                  style={{
                    fontSize: theme.fontSize.md,
                    color: t.done ? theme.colors.textTertiary : theme.colors.text,
                    paddingVertical: 6,
                    borderBottomWidth: i === Math.min(linkedTasks.length, 6) - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  {t.done ? '✓ ' : '○ '}
                  {t.text}
                </Text>
              ))}
            </Card>
          </View>
        )}

        {/* ---------------------------------------------- recent days */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Log the last few days" />
          <Card theme={theme}>
            {history
              .slice(-7)
              .reverse()
              .map((cell, i) => (
                <View
                  key={cell.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderBottomWidth: i === 6 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.text }}>
                    {formatFullDate(keyToTs(cell.key))}
                  </Text>
                  {!cell.scheduled && (
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginRight: 10 }}>
                      not scheduled
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isHabitDoneOn(habit, index, cell.key)) actions.uncheckHabit(habit.id, cell.key);
                      else actions.checkHabit(habit.id, habit.target || 1, cell.key);
                    }}
                    activeOpacity={0.75}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: cell.done ? habit.color : withAlpha(habit.color, 0.1),
                      borderWidth: cell.done ? 0 : 1,
                      borderColor: withAlpha(habit.color, 0.3),
                    }}
                  >
                    <Text
                      style={{
                        color: cell.done ? '#FFF' : habit.color,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {cell.done ? '✓' : habitAmountOn(index, habit.id, cell.key) || '+'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
          </Card>
        </View>
      </ScrollView>

      <HabitEditor
        theme={theme}
        visible={editing}
        habit={habit}
        state={state}
        actions={actions}
        onClose={() => setEditing(false)}
        onDeleted={nav.goBack}
      />
    </View>
  );
}

function PeriodRow({ theme, label, done, target, color }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.text }}>
          {done}/{target}
        </Text>
      </View>
      <ProgressBar theme={theme} percent={target ? (done / target) * 100 : 0} color={color} height={6} />
    </View>
  );
}
