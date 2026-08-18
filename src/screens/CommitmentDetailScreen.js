import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  Card,
  ScreenHeader,
  SectionTitle,
  ProgressRing,
  ProgressBar,
  Checkbox,
} from '../components/ui';
import { HabitCheckButton, GoalCard, ChallengeCard, MilestoneRow } from '../components/cards';
import { CommitmentEditor, GoalEditor, MilestoneEditor, ChallengeEditor } from '../components/editors';
import {
  commitmentProgress,
  goalProgress,
  challengeStats,
  habitStats,
  milestonesOf,
} from '../domain/engine';
import { todayKey, formatShortDate, daysBetweenKeys, dateKey } from '../utils';

export default function CommitmentDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const [milestoneEditor, setMilestoneEditor] = useState(null); // null | 'new' | milestone
  const [subEditor, setSubEditor] = useState(null); // 'goal' | 'challenge'

  const commitment = state.commitments.find((c) => c.id === params.id);
  const progress = useMemo(
    () => (commitment ? commitmentProgress(commitment, state, index, today) : null),
    [commitment, state, index, today]
  );

  if (!commitment || !progress) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader theme={theme} title="Commitment" onBack={nav.goBack} />
        <Text style={{ padding: 20, color: theme.colors.textSecondary }}>
          This commitment no longer exists.
        </Text>
      </View>
    );
  }

  const milestones = milestonesOf(index, 'commitment', commitment.id);
  const daysLeft = commitment.targetDate
    ? daysBetweenKeys(today, dateKey(commitment.targetDate))
    : null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title={`${commitment.icon}  ${commitment.title}`}
        subtitle={
          commitment.targetDate
            ? `Target ${formatShortDate(commitment.targetDate)}${
                daysLeft != null ? ` · ${daysLeft >= 0 ? `${daysLeft} days left` : 'past target'}` : ''
              }`
            : `Since ${formatShortDate(commitment.startDate)}`
        }
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
        {/* ------------------------------------------------- progress */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ProgressRing theme={theme} percent={progress.percent} color={commitment.color} size={88} stroke={9}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>
                  {progress.percent}%
                </Text>
              </ProgressRing>
              <View style={{ flex: 1, marginLeft: 18 }}>
                {progress.parts.length ? (
                  progress.parts.map((part, i) => (
                    <View key={part.label} style={{ marginBottom: i === progress.parts.length - 1 ? 0 : 9 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '600', color: theme.colors.textSecondary }}>
                          {part.label}
                        </Text>
                        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
                          {part.detail}
                        </Text>
                      </View>
                      <ProgressBar theme={theme} percent={part.percent} color={commitment.color} height={4} />
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                    Nothing linked yet. Attach a habit, task or challenge and this fills in.
                  </Text>
                )}
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
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: progress.movedToday ? theme.colors.success : theme.colors.border,
                }}
              />
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                {progress.movedToday
                  ? 'You moved this forward today'
                  : 'Nothing done for this today'}
              </Text>
              {progress.consistency != null && (
                <Text style={{ marginLeft: 'auto', fontSize: theme.fontSize.sm, fontWeight: '700', color: commitment.color }}>
                  {progress.consistency}% consistent
                </Text>
              )}
            </View>
          </Card>
        </View>

        {/* ------------------------------------------------------- why */}
        {!!commitment.why && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Card theme={theme} tint={withAlpha(commitment.color, 0.08)}>
              <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '700', letterSpacing: 0.6, color: commitment.color, marginBottom: 6 }}>
                WHY THIS MATTERS
              </Text>
              <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text, lineHeight: 22 }}>
                {commitment.why}
              </Text>
            </Card>
          </View>
        )}

        {/* ------------------------------------------------- milestones */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Milestones" action="+ Add" onAction={() => setMilestoneEditor('new')} />
          <Card theme={theme}>
            {milestones.length ? (
              milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  theme={theme}
                  milestone={m}
                  color={commitment.color}
                  onToggle={() => actions.toggleMilestone(m.id)}
                  onPress={() => setMilestoneEditor(m)}
                />
              ))
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                Break the commitment into checkpoints you can actually finish.
              </Text>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------------ goals */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Goals" action="+ Add" onAction={() => setSubEditor('goal')} />
          {progress.goals.length ? (
            progress.goals.map((g) => (
              <GoalCard
                key={g.id}
                theme={theme}
                goal={g}
                progress={goalProgress(g, state, index, today)}
                commitment={commitment}
                onPress={() => nav.navigate('goalDetail', { id: g.id })}
              />
            ))
          ) : (
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No goals under this commitment yet.
              </Text>
            </Card>
          )}
        </View>

        {/* ----------------------------------------------------- habits */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Habits" />
          <Card theme={theme}>
            {progress.habits.length ? (
              progress.habits.map((habit, i) => {
                const stats = habitStats(habit, index, today);
                return (
                  <View
                    key={habit.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 9,
                      borderBottomWidth: i === progress.habits.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.borderLight,
                    }}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      activeOpacity={0.7}
                      onPress={() => nav.navigate('habitDetail', { id: habit.id })}
                    >
                      <Text style={{ fontSize: 16, marginRight: 10 }}>{habit.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}>
                          {habit.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>
                          {stats.consistency}% consistent
                          {stats.current > 0 ? ` · 🔥 ${stats.current}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <HabitCheckButton
                      theme={theme}
                      habit={habit}
                      stats={stats}
                      size={34}
                      onCheck={() => actions.checkHabit(habit.id, habit.target || 1)}
                      onUncheck={() => actions.uncheckHabit(habit.id)}
                      onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount)}
                    />
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No habits linked. Open a habit and tick this commitment under "Supports commitments".
              </Text>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------------ tasks */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Tasks" />
          <Card theme={theme}>
            {progress.tasks.length ? (
              progress.tasks.slice(0, 12).map((task, i) => (
                <View
                  key={task.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderBottomWidth:
                      i === Math.min(progress.tasks.length, 12) - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Checkbox
                    theme={theme}
                    checked={task.done}
                    size={20}
                    color={commitment.color}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      actions.toggleTask(task.id);
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: theme.fontSize.md,
                      color: task.done ? theme.colors.textTertiary : theme.colors.text,
                      textDecorationLine: task.done ? 'line-through' : 'none',
                    }}
                  >
                    {task.text}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No tasks linked yet.
              </Text>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------- challenges */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Challenges" action="+ Add" onAction={() => setSubEditor('challenge')} />
          {progress.challenges.length ? (
            progress.challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                theme={theme}
                challenge={c}
                stats={challengeStats(c, state, index, today)}
                onPress={() => nav.navigate('challengeDetail', { id: c.id })}
              />
            ))
          ) : (
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                A challenge is a good way to force momentum on this commitment.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <CommitmentEditor
        theme={theme}
        visible={editing}
        commitment={commitment}
        actions={actions}
        onClose={() => setEditing(false)}
        onDeleted={nav.goBack}
      />
      <MilestoneEditor
        theme={theme}
        visible={!!milestoneEditor}
        parentType="commitment"
        parentId={commitment.id}
        milestone={milestoneEditor && milestoneEditor !== 'new' ? milestoneEditor : null}
        actions={actions}
        onClose={() => setMilestoneEditor(null)}
      />
      <GoalEditor
        theme={theme}
        visible={subEditor === 'goal'}
        state={state}
        actions={actions}
        presets={{ commitmentId: commitment.id }}
        onClose={() => setSubEditor(null)}
      />
      <ChallengeEditor
        theme={theme}
        visible={subEditor === 'challenge'}
        state={state}
        actions={actions}
        presets={{
          links: { commitmentIds: [commitment.id], goalIds: [], challengeIds: [], milestoneIds: [] },
        }}
        onClose={() => setSubEditor(null)}
      />
    </View>
  );
}
