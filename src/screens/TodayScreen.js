/**
 * The home screen, and the answer to the question the whole app exists for:
 * "what am I committed to becoming, and what should I do today to get there?"
 *
 * Order matters here - today's actions come first, and the commitments they
 * serve sit right underneath so the connection is visible, not implied.
 *
 * The design brief for this screen was one second: the rings say how the day is
 * going before a single word is read, and everything below them is the plan in
 * the order you will act on it.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  Card,
  RingStack,
  ProgressBar,
  ListGroup,
  EmptyBlock,
  NavBar,
  LargeTitle,
  RoundButton,
  StreakPill,
  Icon,
  PressableScale,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
} from '../components/ui';
import { useTabBarHeight } from '../components/TabBar';
import { TaskRow, HabitRow, Section } from '../components/rows';
import { CommitmentCard } from '../components/cards';
import EditModal from '../components/EditModal';
import {
  dailySummary,
  habitStats,
  challengeStats,
  commitmentProgress,
  productivityStreak,
  computeXp,
  levelFromXp,
  isTaskOverdue,
} from '../domain/engine';
import { todayKey, formatFullDate, formatDueDate } from '../utils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen({ theme }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const [editingTask, setEditingTask] = useState(null);
  const today = todayKey();
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const tabBar = useTabBarHeight();

  const summary = useMemo(() => dailySummary(state, index, today, today), [state, index, today]);
  const streak = useMemo(() => productivityStreak(state, index, today), [state, index, today]);
  const level = useMemo(() => levelFromXp(computeXp(state, index, today)), [state, index, today]);

  const habitRows = useMemo(
    () =>
      summary.habits.items
        .map((h) => ({ habit: h, stats: habitStats(h, index, today) }))
        .sort((a, b) => Number(a.stats.doneToday) - Number(b.stats.doneToday)),
    [summary.habits.items, index, today]
  );

  const challengeRows = useMemo(
    () =>
      state.challenges
        .map((c) => ({ challenge: c, stats: challengeStats(c, state, index, today) }))
        .filter((row) => row.stats.status === 'active' || row.stats.status === 'upcoming')
        .sort((a, b) => a.stats.status.localeCompare(b.stats.status)),
    [state, index, today]
  );

  const commitmentRows = useMemo(
    () =>
      state.commitments
        .filter((c) => c.status === 'active')
        .map((c) => ({ commitment: c, progress: commitmentProgress(c, state, index, today) })),
    [state, index, today]
  );

  const taskRows = useMemo(() => {
    const rows = summary.tasks.items;
    return [...rows].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ao = isTaskOverdue(a, today);
      const bo = isTaskOverdue(b, today);
      if (ao !== bo) return ao ? -1 : 1;
      const order = { high: 0, medium: 1, low: 2, none: 3 };
      return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
    });
  }, [summary.tasks.items, today]);

  const isNew =
    !state.tasks.length && !state.habits.length && !state.commitments.length && !state.challenges.length;
  const allDone = summary.hasPlan && summary.percent >= 100;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title="Today"
        scrollY={scrollY}
        threshold={54}
        right={
          <RoundButton
            theme={theme}
            glyph="sliders"
            size={32}
            onPress={() => nav.navigate('settings')}
            color={theme.colors.fill2}
          />
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: tabBar + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <LargeTitle theme={theme} title={`${greeting()}.`} subtitle={formatFullDate(Date.now())} />

        {/* --------------------------------------------------- the rings */}
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
            <Card theme={theme} elevation="sm" style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RingStack
                  theme={theme}
                  size={112}
                  stroke={8}
                  gap={4}
                  series={[
                    { percent: pctOf(summary.tasks), color: theme.colors.primary },
                    { percent: pctOf(summary.habits), color: theme.colors.success },
                    { percent: pctOf(summary.challenges), color: theme.colors.warning },
                  ]}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...theme.type.title3, color: theme.colors.text }}>
                      {summary.percent}%
                    </Text>
                  </View>
                </RingStack>

                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Legend
                    theme={theme}
                    label="Tasks"
                    color={theme.colors.primary}
                    done={summary.tasks.done}
                    total={summary.tasks.total}
                  />
                  <Legend
                    theme={theme}
                    label="Habits"
                    color={theme.colors.success}
                    done={summary.habits.done}
                    total={summary.habits.total}
                  />
                  <Legend
                    theme={theme}
                    label="Challenges"
                    color={theme.colors.warning}
                    done={summary.challenges.done}
                    total={summary.challenges.total}
                    last
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.separator,
                  gap: 10,
                }}
              >
                {streak > 0 ? (
                  <StreakPill theme={theme} count={streak} unit=" day streak" color={theme.colors.warning} />
                ) : (
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                    No streak yet
                  </Text>
                )}
                {state.settings.gamification && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="sparkle" size={12} color={theme.colors.accent} />
                    <Text
                      style={{ ...theme.type.caption, color: theme.colors.textSecondary, marginLeft: 5, fontWeight: '600' }}
                    >
                      Level {level.level}
                    </Text>
                    <View
                      style={{
                        width: 34,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: theme.colors.track,
                        marginLeft: 7,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${level.percent}%`,
                          height: '100%',
                          borderRadius: 2,
                          backgroundColor: theme.colors.accent,
                        }}
                      />
                    </View>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <PressableScale onPress={() => nav.setTab('stats')} scaleTo={0.94} hitSlop={theme.hit}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.primary }}>Insights</Text>
                    <Icon name="chevronRight" size={11} color={theme.colors.primary} weight={2.2} style={{ marginLeft: 2 }} />
                  </View>
                </PressableScale>
              </View>
            </Card>
          </View>
        </FadeIn>

        {allDone && (
          <FadeIn delay={80}>
            <View style={{ paddingHorizontal: theme.screen, marginTop: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: theme.radius.lg,
                  backgroundColor: withAlpha(theme.colors.success, theme.dark ? 0.16 : 0.1),
                }}
              >
                <Icon name="check" size={18} color={theme.colors.success} weight={2.6} />
                <Text style={{ ...theme.type.subheadEmph, color: theme.colors.success, marginLeft: 10 }}>
                  Everything for today is done.
                </Text>
              </View>
            </View>
          </FadeIn>
        )}

        {isNew && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 18 }}>
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                glyph="target"
                title="Start with a commitment"
                sub="Name what you want to become. Habits, tasks and challenges hang off it, and everything you do rolls up into it."
                actionLabel="Create a commitment"
                onAction={() => nav.openQuickAdd({ type: 'commitment' })}
              />
            </Card>
          </View>
        )}

        {/* ---------------------------------------------------- the plan */}
        {!!taskRows.length && (
          <FadeIn delay={60}>
            <Section theme={theme} title="Today's focus" action="All tasks" onAction={() => nav.setTab('tasks')}>
              <ListGroup theme={theme} inset={50}>
                {taskRows.map((task) => (
                  <TaskRow
                    key={task.id}
                    theme={theme}
                    task={task}
                    state={state}
                    today={today}
                    onToggle={() => actions.toggleTask(task.id)}
                    onOpen={() => setEditingTask(task)}
                  />
                ))}
              </ListGroup>
            </Section>
          </FadeIn>
        )}

        {!!habitRows.length && (
          <FadeIn delay={110}>
            <Section theme={theme} title="Habits" action="All habits" onAction={() => nav.setTab('habits')}>
              <ListGroup theme={theme} inset={62}>
                {habitRows.map((row) => (
                  <HabitRow
                    key={row.habit.id}
                    theme={theme}
                    habit={row.habit}
                    stats={row.stats}
                    onOpen={() => nav.navigate('habitDetail', { id: row.habit.id })}
                    onCheck={() => actions.checkHabit(row.habit.id, row.habit.target || 1)}
                    onUncheck={() => actions.uncheckHabit(row.habit.id)}
                    onSetAmount={(amount) => actions.setHabitAmount(row.habit.id, amount)}
                  />
                ))}
              </ListGroup>
            </Section>
          </FadeIn>
        )}

        {!!challengeRows.length && (
          <FadeIn delay={150}>
            <Section theme={theme} title="Active challenges" action="All" onAction={() => nav.setTab('journey')}>
              {challengeRows.map((row) => (
                <TodayChallengeCard
                  key={row.challenge.id}
                  theme={theme}
                  challenge={row.challenge}
                  stats={row.stats}
                  onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
                />
              ))}
            </Section>
          </FadeIn>
        )}

        {!!commitmentRows.length && (
          <FadeIn delay={190}>
            <Section theme={theme} title="Commitments" action="Journey" onAction={() => nav.setTab('journey')}>
              {commitmentRows.map((row) => (
                <CommitmentCard
                  key={row.commitment.id}
                  theme={theme}
                  commitment={row.commitment}
                  progress={row.progress}
                  onPress={() => nav.navigate('commitmentDetail', { id: row.commitment.id })}
                />
              ))}
            </Section>
          </FadeIn>
        )}

        {!isNew && !summary.hasPlan && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 20 }}>
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                glyph="today"
                title="Your day is clear."
                sub="Nothing is due and no habit is scheduled. Rest is part of the plan - or add something small."
                actionLabel="Quick add"
                onAction={() => nav.openQuickAdd()}
              />
            </Card>
          </View>
        )}
      </Animated.ScrollView>

      <EditModal
        task={editingTask}
        onSave={actions.editTask}
        onDelete={actions.deleteTask}
        onClose={() => setEditingTask(null)}
        theme={theme}
        state={state}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- parts */

function pctOf(group) {
  if (!group || !group.total) return 0;
  return Math.round((group.done / group.total) * 100);
}

function Legend({ theme, label, color, done, total, last }) {
  const empty = !total;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: last ? 0 : 11 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: empty ? theme.colors.track : color,
          marginRight: 9,
        }}
      />
      <Text style={{ flex: 1, ...theme.type.footnote, color: theme.colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          ...theme.type.footnoteEmph,
          color: empty ? theme.colors.textQuaternary : theme.colors.text,
        }}
      >
        {done}
        <Text style={{ color: theme.colors.textTertiary, fontWeight: '400' }}>/{total}</Text>
      </Text>
    </View>
  );
}

/**
 * A challenge on Today shows only what today asks of it: the day number, the
 * bar, and the requirements still outstanding.
 */
function TodayChallengeCard({ theme, challenge, stats, onPress }) {
  return (
    <Card theme={theme} onPress={onPress} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(challenge.color, theme.dark ? 0.2 : 0.12),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 17 }}>{challenge.icon}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text numberOfLines={1} style={{ ...theme.type.subheadEmph, color: theme.colors.text }}>
            {challenge.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
              {stats.status === 'upcoming'
                ? `Starts ${formatDueDate(challenge.startDate)}`
                : `Day ${stats.dayIndex} of ${stats.totalDays}`}
            </Text>
            {stats.streak > 0 && (
              <StreakPill theme={theme} count={stats.streak} color={challenge.color} size="sm" />
            )}
          </View>
        </View>
        <Text style={{ ...theme.type.subheadEmph, color: challenge.color }}>{stats.percent}%</Text>
      </View>

      <ProgressBar
        theme={theme}
        percent={stats.percent}
        color={challenge.color}
        height={6}
        style={{ marginTop: 12 }}
      />

      {stats.status === 'active' && !!stats.todayRequirements.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {stats.todayRequirements.map((req) => (
            <View
              key={req.kind + req.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: theme.radius.xs,
                backgroundColor: req.done
                  ? withAlpha(theme.colors.success, theme.dark ? 0.2 : 0.12)
                  : theme.colors.fill1,
              }}
            >
              {req.done ? (
                <Icon name="check" size={10} color={theme.colors.success} weight={2.2} />
              ) : (
                <Text style={{ fontSize: 10 }}>{req.icon}</Text>
              )}
              <Text
                numberOfLines={1}
                style={{
                  ...theme.type.caption2,
                  maxWidth: 140,
                  marginLeft: 5,
                  color: req.done ? theme.colors.success : theme.colors.textSecondary,
                }}
              >
                {req.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export { TaskRow };
