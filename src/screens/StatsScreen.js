/**
 * Analytics that answer questions a person actually asks: am I keeping up, what
 * is slipping, and is this month better than the last one. No vanity counters.
 *
 * The headline is one number and one arrow. Everything below it exists to
 * explain that arrow, in the order someone would ask: what did I do, which
 * habits held, which pushes landed, and what does the whole year look like.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  Card,
  NavBar,
  LargeTitle,
  Segmented,
  StatTile,
  ProgressBar,
  ListGroup,
  ListRow,
  Icon,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
} from '../components/ui';
import { Section } from '../components/rows';
import { useTabBarHeight } from '../components/TabBar';
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
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const tabBar = useTabBarHeight();

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

  const trendColor =
    summary.trend > 0 ? theme.colors.success : summary.trend < 0 ? theme.colors.danger : theme.colors.textSecondary;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar theme={theme} title="Insights" scrollY={scrollY} threshold={54} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: tabBar + 32 }}
      >
        <LargeTitle theme={theme} title="Insights" subtitle="How the system is actually going" />

        <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
          <Segmented
            theme={theme}
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onChange={setRange}
          />
        </View>

        {/* -------------------------------------------------- headline */}
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 16 }}>
            <Card theme={theme} elevation="sm" style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ ...theme.type.caption2, color: theme.colors.textTertiary }}>
                    AVERAGE COMPLETION
                  </Text>
                  <Text style={{ ...theme.type.largeTitle, color: theme.colors.text, marginTop: 4 }}>
                    {summary.avg}%
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: theme.radius.full,
                      backgroundColor: withAlpha(trendColor, theme.dark ? 0.2 : 0.12),
                    }}
                  >
                    {summary.trend !== 0 && (
                      <Icon
                        name={summary.trend > 0 ? 'arrowUp' : 'arrowDown'}
                        size={12}
                        color={trendColor}
                        weight={2}
                      />
                    )}
                    <Text style={{ ...theme.type.footnoteEmph, color: trendColor, marginLeft: 4 }}>
                      {Math.abs(summary.trend)}%
                    </Text>
                  </View>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 5 }}>
                    vs first half
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 18 }}>
                <TrendStrip theme={theme} data={summary.daily} color={theme.colors.primary} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <StatTile theme={theme} label="Day streak" value={streak} glyph="flame" color={theme.colors.warning} flat style={{ paddingHorizontal: 0 }} />
                <StatTile
                  theme={theme}
                  label="Items done"
                  value={summary.totalDone}
                  sub={`of ${summary.totalPlanned} planned`}
                  flat
                  style={{ paddingHorizontal: 0 }}
                />
                {state.settings.gamification && (
                  <StatTile
                    theme={theme}
                    label="Level"
                    value={level.level}
                    sub={`${level.percent}% to next`}
                    glyph="sparkle"
                    color={theme.colors.accent}
                    flat
                    style={{ paddingHorizontal: 0 }}
                  />
                )}
              </View>
            </Card>
          </View>
        </FadeIn>

        {/* ----------------------------------------------------- tasks */}
        <Section theme={theme} title="Tasks" action="Open" onAction={() => nav.setTab('tasks')}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatTile theme={theme} label="Completed" value={taskStats.completed} glyph="check" />
            <StatTile theme={theme} label="Completion" value={`${taskStats.rate}%`} glyph="chart" />
            <StatTile
              theme={theme}
              label="Overdue"
              value={taskStats.overdue}
              glyph="clock"
              color={taskStats.overdue ? theme.colors.danger : theme.colors.text}
            />
          </View>
          <Card theme={theme} style={{ marginTop: 10 }}>
            <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.textSecondary, marginBottom: 14 }}>
              When you get things done
            </Text>
            <BarChart theme={theme} data={weekdayBars} color={theme.colors.primary} height={92} />
          </Card>
        </Section>

        {/* ---------------------------------------------------- habits */}
        {!!habitRows.length && (
          <Section theme={theme} title="Habits" action="Open" onAction={() => nav.setTab('habits')}>
            <ListGroup theme={theme} inset={16}>
              {habitRows.map((row) => (
                <ListRow
                  key={row.habit.id}
                  theme={theme}
                  onPress={() => nav.navigate('habitDetail', { id: row.habit.id })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 9 }}>{row.habit.icon}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>
                      {row.habit.name}
                    </Text>
                    <Text style={{ ...theme.type.subheadEmph, color: row.habit.color }}>
                      {row.stats.consistency}%
                    </Text>
                  </View>
                  <ProgressBar theme={theme} percent={row.stats.consistency} color={row.habit.color} height={5} />
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 7 }}>
                    {row.stats.current} current · best {row.stats.best} · {row.stats.totalCompletions} check-ins
                  </Text>
                </ListRow>
              ))}
            </ListGroup>
          </Section>
        )}

        {/* ------------------------------------------------- challenges */}
        {!!challengeRows.length && (
          <Section theme={theme} title="Challenges" action="Open" onAction={() => nav.setTab('journey')}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatTile
                theme={theme}
                label="Active"
                value={challengeRows.filter((r) => r.stats.status === 'active').length}
                glyph="flame"
                color={theme.colors.warning}
              />
              <StatTile theme={theme} label="Completed" value={completedChallenges} glyph="check" color={theme.colors.success} />
              <StatTile
                theme={theme}
                label="Success"
                value={`${finishedChallenges ? Math.round((completedChallenges / finishedChallenges) * 100) : 0}%`}
                glyph="chart"
              />
            </View>
          </Section>
        )}

        {/* ------------------------------------------------ commitments */}
        {!!commitmentRows.length && (
          <Section theme={theme} title="Commitments" action="Open" onAction={() => nav.setTab('journey')}>
            <ListGroup theme={theme} inset={16}>
              {commitmentRows.map((row) => (
                <ListRow
                  key={row.commitment.id}
                  theme={theme}
                  onPress={() => nav.navigate('commitmentDetail', { id: row.commitment.id })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, marginRight: 9 }}>{row.commitment.icon}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>
                      {row.commitment.title}
                    </Text>
                    <Text style={{ ...theme.type.subheadEmph, color: row.commitment.color }}>
                      {row.progress.percent}%
                    </Text>
                  </View>
                  <ProgressBar theme={theme} percent={row.progress.percent} color={row.commitment.color} height={5} />
                  {row.progress.consistency != null && (
                    <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 7 }}>
                      {row.progress.consistency}% habit consistency ·{' '}
                      {row.progress.milestones.filter((m) => m.done).length}/{row.progress.milestones.length}{' '}
                      milestones
                    </Text>
                  )}
                </ListRow>
              ))}
            </ListGroup>
          </Section>
        )}

        {/* -------------------------------------------------- activity */}
        <Section theme={theme} title="Everything you have done">
          <Card theme={theme}>
            <Heatmap theme={theme} data={activityHeat} color={theme.colors.primary} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 14,
              }}
            >
              <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                {state.activities.length} completions logged
              </Text>
              <HeatLegend theme={theme} color={theme.colors.primary} />
            </View>
          </Card>
        </Section>

        {/* ---------------------------------------------- achievements */}
        {state.settings.gamification && (
          <Section theme={theme} title={`Achievements · ${unlocked.length}/${achievements.length}`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {achievements.map((a) => (
                <View
                  key={a.id}
                  style={{
                    width: '31.4%',
                    borderRadius: theme.radius.lg,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    backgroundColor: a.unlocked
                      ? withAlpha(theme.colors.warning, theme.dark ? 0.14 : 0.09)
                      : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: a.unlocked
                      ? withAlpha(theme.colors.warning, 0.28)
                      : theme.colors.border,
                  }}
                >
                  <Text style={{ fontSize: 22, opacity: a.unlocked ? 1 : 0.22 }}>{a.icon}</Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      ...theme.type.caption2,
                      textAlign: 'center',
                      marginTop: 7,
                      color: a.unlocked ? theme.colors.text : theme.colors.textTertiary,
                    }}
                  >
                    {a.title}
                  </Text>
                  {!a.unlocked && (
                    <Text style={{ ...theme.type.caption2, fontWeight: '500', color: theme.colors.textQuaternary, marginTop: 3 }}>
                      {a.value}/{a.target}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </Section>
        )}
      </Animated.ScrollView>
    </View>
  );
}
