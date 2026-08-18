import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { Card, ScreenHeader, SectionTitle, ProgressRing, ProgressBar, Checkbox } from '../components/ui';
import { MilestoneRow, HabitCheckButton, ChallengeCard } from '../components/cards';
import { GoalEditor, MilestoneEditor } from '../components/editors';
import { NumberStepper } from '../components/pickers';
import { goalProgress, habitStats, challengeStats, milestonesOf } from '../domain/engine';
import { todayKey, formatShortDate } from '../utils';

export default function GoalDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const [milestoneEditor, setMilestoneEditor] = useState(null);

  const goal = state.goals.find((g) => g.id === params.id);
  const progress = useMemo(
    () => (goal ? goalProgress(goal, state, index, today) : null),
    [goal, state, index, today]
  );

  if (!goal || !progress) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader theme={theme} title="Goal" onBack={nav.goBack} />
        <Text style={{ padding: 20, color: theme.colors.textSecondary }}>This goal no longer exists.</Text>
      </View>
    );
  }

  const commitment = state.commitments.find((c) => c.id === goal.commitmentId);
  const milestones = milestonesOf(index, 'goal', goal.id);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title={`${goal.icon}  ${goal.title}`}
        subtitle={[
          commitment ? `${commitment.icon} ${commitment.title}` : 'Standalone goal',
          goal.targetDate ? `by ${formatShortDate(goal.targetDate)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
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
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ProgressRing theme={theme} percent={progress.percent} color={goal.color} size={84} stroke={8}>
                <Text style={{ fontSize: 19, fontWeight: '700', color: theme.colors.text }}>
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
                      <ProgressBar theme={theme} percent={part.percent} color={goal.color} height={4} />
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                    Add milestones, or link tasks and habits, and progress fills itself in.
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>

        {goal.metric.type === 'count' && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <SectionTitle theme={theme} title="Counter" />
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: theme.colors.text }}>
                    {goal.metric.current}
                    <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textTertiary }}>
                      {' '}
                      / {goal.metric.target} {goal.metric.unit}
                    </Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      actions.bumpGoalMetric(goal.id, -1);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.inputBg,
                    }}
                  >
                    <Text style={{ fontSize: 20, color: theme.colors.textSecondary }}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      actions.bumpGoalMetric(goal.id, 1);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: goal.color,
                    }}
                  >
                    <Text style={{ fontSize: 20, color: '#FFF' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Milestones" action="+ Add" onAction={() => setMilestoneEditor('new')} />
          <Card theme={theme}>
            {milestones.length ? (
              milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  theme={theme}
                  milestone={m}
                  color={goal.color}
                  onToggle={() => actions.toggleMilestone(m.id)}
                  onPress={() => setMilestoneEditor(m)}
                />
              ))
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No milestones yet.
              </Text>
            )}
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Tasks" />
          <Card theme={theme}>
            {progress.tasks.length ? (
              progress.tasks.map((task, i) => (
                <View
                  key={task.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderBottomWidth: i === progress.tasks.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Checkbox
                    theme={theme}
                    checked={task.done}
                    size={20}
                    color={goal.color}
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
                Link tasks to this goal from the task editor.
              </Text>
            )}
          </Card>
        </View>

        {!!progress.habits.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Habits" />
            <Card theme={theme}>
              {progress.habits.map((habit, i) => {
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
                      <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                        {habit.name}
                      </Text>
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
              })}
            </Card>
          </View>
        )}

        {!!progress.challenges.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Challenges" />
            {progress.challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                theme={theme}
                challenge={c}
                stats={challengeStats(c, state, index, today)}
                onPress={() => nav.navigate('challengeDetail', { id: c.id })}
              />
            ))}
          </View>
        )}

        {!!goal.description && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Notes" />
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 22 }}>
                {goal.description}
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <GoalEditor
        theme={theme}
        visible={editing}
        goal={goal}
        state={state}
        actions={actions}
        onClose={() => setEditing(false)}
        onDeleted={nav.goBack}
      />
      <MilestoneEditor
        theme={theme}
        visible={!!milestoneEditor}
        parentType="goal"
        parentId={goal.id}
        milestone={milestoneEditor && milestoneEditor !== 'new' ? milestoneEditor : null}
        actions={actions}
        onClose={() => setMilestoneEditor(null)}
      />
    </View>
  );
}
