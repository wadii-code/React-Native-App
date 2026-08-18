/**
 * The home screen, and the answer to the question the whole app exists for:
 * "what am I committed to becoming, and what should I do today to get there?"
 *
 * Order matters here - today's actions come first, and the commitments they
 * serve sit right underneath so the connection is visible, not implied.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import { Card, ProgressRing, ProgressBar, SectionTitle, EmptyBlock, Checkbox } from '../components/ui';
import { HabitCheckButton, CommitmentCard } from '../components/cards';
import { ConnectionSummary } from '../components/LinkPicker';
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
import { todayKey, formatFullDate, formatDueDate, formatTime, dateKey } from '../utils';
import { PRIORITIES } from '../theme';

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

  const summary = useMemo(() => dailySummary(state, index, today, today), [state, index, today]);
  const streak = useMemo(() => productivityStreak(state, index, today), [state, index, today]);
  const level = useMemo(
    () => levelFromXp(computeXp(state, index, today)),
    [state, index, today]
  );

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ------------------------------------------------------- header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.6 }}>
                {greeting()}.
              </Text>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 }}>
                {formatFullDate(Date.now())}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => nav.navigate('settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.chip,
              }}
            >
              <Text style={{ fontSize: 16 }}>⚙︎</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ----------------------------------------------------- progress */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ProgressRing theme={theme} percent={summary.percent} size={92} stroke={9}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.text }}>
                  {summary.percent}%
                </Text>
                <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginTop: -2 }}>today</Text>
              </ProgressRing>

              <View style={{ flex: 1, marginLeft: 20 }}>
                <ProgressLine
                  theme={theme}
                  label="Tasks"
                  done={summary.tasks.done}
                  total={summary.tasks.total}
                  color={theme.colors.primary}
                />
                <ProgressLine
                  theme={theme}
                  label="Habits"
                  done={summary.habits.done}
                  total={summary.habits.total}
                  color={theme.colors.success}
                />
                <ProgressLine
                  theme={theme}
                  label="Challenges"
                  done={summary.challenges.done}
                  total={summary.challenges.total}
                  color={theme.colors.warning}
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
                borderTopColor: theme.colors.border,
                gap: 16,
              }}
            >
              <FooterStat theme={theme} label="Day streak" value={streak > 0 ? `🔥 ${streak}` : '—'} />
              {state.settings.gamification && (
                <FooterStat theme={theme} label="Level" value={`${level.level}`} sub={`${level.percent}%`} />
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => nav.setTab('stats')} activeOpacity={0.7}>
                <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                  Insights ›
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {isNew && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                icon="🌱"
                title="Start with a commitment"
                sub="Name what you want to become. Then attach the habits, tasks and challenges that get you there - everything you do will roll up into it."
                actionLabel="Create a commitment"
                onAction={() => nav.openQuickAdd({ type: 'commitment' })}
              />
            </Card>
          </View>
        )}

        {/* -------------------------------------------------------- tasks */}
        {!!taskRows.length && (
          <Section theme={theme} title="Today's focus" action="All tasks" onAction={() => nav.setTab('tasks')}>
            <Card theme={theme} padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
              {taskRows.map((task, i) => (
                <TaskRow
                  key={task.id}
                  theme={theme}
                  task={task}
                  state={state}
                  today={today}
                  onToggle={() => actions.toggleTask(task.id)}
                  onOpen={() => setEditingTask(task)}
                  last={i === taskRows.length - 1}
                />
              ))}
            </Card>
          </Section>
        )}

        {/* ------------------------------------------------------- habits */}
        {!!habitRows.length && (
          <Section theme={theme} title="Habits" action="All habits" onAction={() => nav.setTab('habits')}>
            <Card theme={theme} padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              {habitRows.map((row, i) => (
                <View
                  key={row.habit.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: i === habitRows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={0.7}
                    onPress={() => nav.navigate('habitDetail', { id: row.habit.id })}
                  >
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{row.habit.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: theme.fontSize.md,
                          color: row.stats.doneToday ? theme.colors.textTertiary : theme.colors.text,
                          textDecorationLine: row.stats.doneToday ? 'line-through' : 'none',
                        }}
                      >
                        {row.habit.name}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        {row.stats.current > 0 && (
                          <Text style={{ fontSize: 11, color: row.habit.color, fontWeight: '600' }}>
                            🔥 {row.stats.current} {row.stats.streakUnit === 'week' ? 'weeks' : 'days'}
                          </Text>
                        )}
                        {row.habit.reminderTime != null && (
                          <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
                            {formatTime(row.habit.reminderTime)}
                          </Text>
                        )}
                        {!!row.stats.period && (
                          <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
                            {row.stats.period.done}/{row.stats.period.target} this week
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  <HabitCheckButton
                    theme={theme}
                    habit={row.habit}
                    stats={row.stats}
                    size={38}
                    onCheck={() => actions.checkHabit(row.habit.id, row.habit.target || 1)}
                    onUncheck={() => actions.uncheckHabit(row.habit.id)}
                    onSetAmount={(amount) => actions.setHabitAmount(row.habit.id, amount)}
                  />
                </View>
              ))}
            </Card>
          </Section>
        )}

        {/* --------------------------------------------------- challenges */}
        {!!challengeRows.length && (
          <Section theme={theme} title="Active challenges" action="All" onAction={() => nav.setTab('journey')}>
            {challengeRows.map((row) => (
              <TouchableOpacity
                key={row.challenge.id}
                activeOpacity={0.8}
                onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
              >
                <Card theme={theme} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{row.challenge.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text }}
                      >
                        {row.challenge.name}
                      </Text>
                      <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 }}>
                        {row.stats.status === 'upcoming'
                          ? `Starts ${formatDueDate(row.challenge.startDate)}`
                          : `Day ${row.stats.dayIndex} / ${row.stats.totalDays}`}
                        {row.stats.streak > 0 ? `  ·  🔥 ${row.stats.streak}-day streak` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: row.challenge.color }}>
                      {row.stats.percent}%
                    </Text>
                  </View>

                  <ProgressBar
                    theme={theme}
                    percent={row.stats.percent}
                    color={row.challenge.color}
                    height={6}
                    style={{ marginTop: 12 }}
                  />

                  {row.stats.status === 'active' && !!row.stats.todayRequirements.length && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {row.stats.todayRequirements.map((req) => (
                        <View
                          key={req.kind + req.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 7,
                            backgroundColor: req.done
                              ? withAlpha(theme.colors.success, 0.14)
                              : theme.colors.inputBg,
                          }}
                        >
                          <Text style={{ fontSize: 10, marginRight: 4 }}>{req.done ? '✓' : req.icon}</Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              maxWidth: 140,
                              fontWeight: '600',
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
              </TouchableOpacity>
            ))}
          </Section>
        )}

        {/* -------------------------------------------------- commitments */}
        {!!commitmentRows.length && (
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
        )}

        {!isNew && !summary.hasPlan && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Card theme={theme}>
              <EmptyBlock
                theme={theme}
                compact
                icon="🍃"
                title="Nothing scheduled today"
                sub="No tasks due and no habits on today's schedule. Rest is part of the plan - or add something small."
                actionLabel="Quick add"
                onAction={() => nav.openQuickAdd()}
              />
            </Card>
          </View>
        )}
      </ScrollView>

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

function Section({ theme, title, action, onAction, children }) {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <SectionTitle theme={theme} title={title} action={action} onAction={onAction} />
      {children}
    </View>
  );
}

function ProgressLine({ theme, label, done, total, color, last }) {
  return (
    <View style={{ marginBottom: last ? 0 : 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, fontWeight: '600' }}>
          {label}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
          {done}/{total}
        </Text>
      </View>
      <ProgressBar
        theme={theme}
        percent={total ? (done / total) * 100 : 0}
        color={color}
        height={5}
      />
    </View>
  );
}

function FooterStat({ theme, label, value, sub }) {
  return (
    <View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text }}>
          {value}
        </Text>
        {!!sub && (
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{sub}</Text>
        )}
      </View>
    </View>
  );
}

export function TaskRow({ theme, task, state, today, onToggle, onOpen, last }) {
  const priority = PRIORITIES.find((p) => p.id === task.priority) || PRIORITIES[0];
  const overdue = isTaskOverdue(task, today);
  const doneToday = task.done && task.completedAt && dateKey(task.completedAt) === today;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.borderLight,
      }}
    >
      <Checkbox
        theme={theme}
        checked={task.done}
        color={priority.id === 'none' ? theme.colors.primary : priority.color}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        size={22}
      />
      <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} activeOpacity={0.7} onPress={onOpen}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: theme.fontSize.md,
            color: task.done ? theme.colors.textTertiary : theme.colors.text,
            textDecorationLine: task.done ? 'line-through' : 'none',
          }}
        >
          {task.text}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {overdue && (
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.danger }}>
              Overdue · {formatDueDate(task.dueDate)}
            </Text>
          )}
          {!overdue && task.dueTime != null && (
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
              {formatTime(task.dueTime)}
            </Text>
          )}
          {doneToday && (
            <Text style={{ fontSize: 11, color: theme.colors.success, fontWeight: '600' }}>
              Done today
            </Text>
          )}
          {!!task.links.habitId && (
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>🔁 habit</Text>
          )}
        </View>
        {!!state && <ConnectionSummary theme={theme} state={state} links={task.links} style={{ marginTop: 6 }} />}
      </TouchableOpacity>
    </View>
  );
}
