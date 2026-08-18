/**
 * Analytics that answer questions a person actually asks: am I keeping up, what
 * is slipping, and is this month better than the last one. No vanity counters.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import { Card, ScreenHeader, SectionTitle, Segmented, StatTile, ProgressBar } from '../components/ui';
import Heatmap, { TrendStrip, BarChart, HeatLegend } from '../components/Heatmap';
import {
  rangeSummary,
  productivityStreak,
  habitStats,
  challengeStats,
  commitmentProgress,
  computeXp,
  levelFromXp,
  activityCountsByDay,
  isTaskOverdue,
} from '../domain/engine';
import { evaluateAchievements } from '../domain/achievements';
import { todayKey, dateKey, addDaysKey, keyWeekday, pct } from '../utils';

const RANGES = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
];

export default function StatsScreen({ theme }) {
  const { state, index } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [range, setRange] = useState(30);

  const summary = useMemo(() => rangeSummary(state, index, range, today), [state, index, range, today]);
  const streak = useMemo(() => productivityStreak(state, index, today), [state, index, today]);
  const level = useMemo(() => levelFromXp(computeXp(state, index, today)), [state, index, today]);

  const taskStats = useMemo(() => {
    const from = addDaysKey(today, -(range - 1));
    const completed = state.activities.filter((a) => a.type === 'task' && a.date >= from).length;
    const created = state.tasks.filter((t) => dateKey(t.createdAt) >= from).length;
    const overdue = state.tasks.filter((t) => isTaskOverdue(t, today)).length;
    return { completed, created, overdue, rate: pct(completed, Math.max(completed, created)) };
  }, [state, range, today]);

  const habitRows = useMemo(
    () =>
      state.habits
        .filter((h) => !h.archived)
        .map((h) => ({ habit: h, stats: habitStats(h, index, today) }))
        .sort((a, b) => b.stats.consistency - a.stats.consistency),
    [state.habits, index, today]
  );

  const challengeRows = useMemo(
    () => state.challenges.map((c) => ({ challenge: c, stats: challengeStats(c, state, index, today) })),
    [state, index, today]
  );

  const commitmentRows = useMemo(
    () =>
      state.commitments
        .filter((c) => c.status === 'active')
        .map((c) => ({ commitment: c, progress: commitmentProgress(c, state, index, today) })),
    [state, index, today]
  );

  const activityHeat = useMemo(() => {
    const counts = activityCountsByDay(state, 119, today);
    return counts.map((c) => ({
      key: c.key,
      done: c.count > 0,
      partial: false,
      scheduled: true,
      missed: false,
      intensity: c.intensity,
      amount: c.count,
    }));
  }, [state, today]);

  const weekdayBars = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    const from = addDaysKey(today, -(range - 1));
    for (const a of state.activities) {
      if (a.date < from) continue;
      const wd = keyWeekday(a.date);
      totals[wd === 0 ? 6 : wd - 1] += 1;
    }
    return labels.map((label, i) => ({ label, value: totals[i] }));
  }, [state.activities, range, today]);

  const achievements = useMemo(() => evaluateAchievements(state, index, today), [state, index, today]);
  const unlocked = achievements.filter((a) => a.unlocked);

  const completedChallenges = challengeRows.filter((r) => r.stats.status === 'completed').length;
  const finishedChallenges = challengeRows.filter((r) =>
    ['completed', 'failed'].includes(r.stats.status)
  ).length;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader theme={theme} title="Insights" subtitle="How the system is actually going" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Segmented
            theme={theme}
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onChange={setRange}
          />
        </View>

        {/* -------------------------------------------------- headline */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textTertiary }}>
                  AVERAGE COMPLETION
                </Text>
                <Text style={{ fontSize: 34, fontWeight: '700', color: theme.colors.text, letterSpacing: -1 }}>
                  {summary.avg}%
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.md,
                    fontWeight: '700',
                    color:
                      summary.trend > 0
                        ? theme.colors.success
                        : summary.trend < 0
                        ? theme.colors.danger
                        : theme.colors.textSecondary,
                  }}
                >
                  {summary.trend > 0 ? '↑' : summary.trend < 0 ? '↓' : '→'} {Math.abs(summary.trend)}%
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>vs first half</Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <TrendStrip theme={theme} data={summary.daily} color={theme.colors.primary} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <StatTile theme={theme} label="Day streak" value={streak} icon="🔥" color={theme.colors.warning} />
              <StatTile
                theme={theme}
                label="Items done"
                value={summary.totalDone}
                sub={`of ${summary.totalPlanned} planned`}
              />
              {state.settings.gamification && (
                <StatTile theme={theme} label="Level" value={level.level} sub={`${level.percent}% to next`} icon="✦" />
              )}
            </View>
          </Card>
        </View>

        {/* ----------------------------------------------------- tasks */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Tasks" action="Open" onAction={() => nav.setTab('tasks')} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatTile theme={theme} label="Completed" value={taskStats.completed} icon="✓" />
            <StatTile theme={theme} label="Completion" value={`${taskStats.rate}%`} icon="📈" />
            <StatTile
              theme={theme}
              label="Overdue"
              value={taskStats.overdue}
              icon="⚠"
              color={taskStats.overdue ? theme.colors.danger : theme.colors.text}
            />
          </View>
          <Card theme={theme} style={{ marginTop: 10 }}>
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 10 }}>
              When you get things done
            </Text>
            <BarChart theme={theme} data={weekdayBars} color={theme.colors.primary} height={90} />
          </Card>
        </View>

        {/* ---------------------------------------------------- habits */}
        {!!habitRows.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Habits" action="Open" onAction={() => nav.setTab('habits')} />
            <Card theme={theme}>
              {habitRows.map((row, i) => (
                <TouchableOpacity
                  key={row.habit.id}
                  activeOpacity={0.7}
                  onPress={() => nav.navigate('habitDetail', { id: row.habit.id })}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: i === habitRows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>{row.habit.icon}</Text>
                    <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                      {row.habit.name}
                    </Text>
                    <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: row.habit.color }}>
                      {row.stats.consistency}%
                    </Text>
                  </View>
                  <ProgressBar theme={theme} percent={row.stats.consistency} color={row.habit.color} height={5} />
                  <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 5 }}>
                    🔥 {row.stats.current} current · best {row.stats.best} · {row.stats.totalCompletions} check-ins
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* ------------------------------------------------- challenges */}
        {!!challengeRows.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Challenges" action="Open" onAction={() => nav.setTab('journey')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatTile
                theme={theme}
                label="Active"
                value={challengeRows.filter((r) => r.stats.status === 'active').length}
                icon="🔥"
              />
              <StatTile theme={theme} label="Completed" value={completedChallenges} icon="🏅" />
              <StatTile
                theme={theme}
                label="Success"
                value={`${finishedChallenges ? Math.round((completedChallenges / finishedChallenges) * 100) : 0}%`}
                icon="📊"
              />
            </View>
          </View>
        )}

        {/* ------------------------------------------------ commitments */}
        {!!commitmentRows.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Commitments" action="Open" onAction={() => nav.setTab('journey')} />
            <Card theme={theme}>
              {commitmentRows.map((row, i) => (
                <TouchableOpacity
                  key={row.commitment.id}
                  activeOpacity={0.7}
                  onPress={() => nav.navigate('commitmentDetail', { id: row.commitment.id })}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: i === commitmentRows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 15, marginRight: 8 }}>{row.commitment.icon}</Text>
                    <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                      {row.commitment.title}
                    </Text>
                    <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: row.commitment.color }}>
                      {row.progress.percent}%
                    </Text>
                  </View>
                  <ProgressBar theme={theme} percent={row.progress.percent} color={row.commitment.color} height={5} />
                  {row.progress.consistency != null && (
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 5 }}>
                      {row.progress.consistency}% habit consistency · {row.progress.milestones.filter((m) => m.done).length}/
                      {row.progress.milestones.length} milestones
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* -------------------------------------------------- activity */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Everything you have done" />
          <Card theme={theme}>
            <Heatmap theme={theme} data={activityHeat} color={theme.colors.primary} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
                {state.activities.length} completions logged
              </Text>
              <HeatLegend theme={theme} color={theme.colors.primary} />
            </View>
          </Card>
        </View>

        {/* ---------------------------------------------- achievements */}
        {state.settings.gamification && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title={`Achievements · ${unlocked.length}/${achievements.length}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {achievements.map((a) => (
                <View
                  key={a.id}
                  style={{
                    width: '31%',
                    borderRadius: theme.borderRadius.lg,
                    padding: 12,
                    alignItems: 'center',
                    backgroundColor: a.unlocked ? withAlpha(theme.colors.primary, 0.1) : theme.colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: a.unlocked ? withAlpha(theme.colors.primary, 0.3) : theme.colors.border,
                  }}
                >
                  <Text style={{ fontSize: 22, opacity: a.unlocked ? 1 : 0.25 }}>{a.icon}</Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      textAlign: 'center',
                      marginTop: 6,
                      color: a.unlocked ? theme.colors.text : theme.colors.textTertiary,
                    }}
                  >
                    {a.title}
                  </Text>
                  {!a.unlocked && (
                    <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginTop: 3 }}>
                      {a.value}/{a.target}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
