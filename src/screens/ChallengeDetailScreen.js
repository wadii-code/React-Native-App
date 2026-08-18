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
  StatTile,
  Checkbox,
  Chip,
} from '../components/ui';
import { HabitCheckButton, MilestoneRow, StatusBadge } from '../components/cards';
import { ChallengeEditor, MilestoneEditor } from '../components/editors';
import { ConnectionSummary } from '../components/LinkPicker';
import { challengeStats, habitStats, milestonesOf } from '../domain/engine';
import { DIFFICULTIES } from '../domain/schema';
import { todayKey, formatShortDate, keyToTs } from '../utils';

export default function ChallengeDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const [milestoneEditor, setMilestoneEditor] = useState(null);

  const challenge = state.challenges.find((c) => c.id === params.id);
  const stats = useMemo(
    () => (challenge ? challengeStats(challenge, state, index, today) : null),
    [challenge, state, index, today]
  );

  if (!challenge || !stats) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader theme={theme} title="Challenge" onBack={nav.goBack} />
        <Text style={{ padding: 20, color: theme.colors.textSecondary }}>
          This challenge no longer exists.
        </Text>
      </View>
    );
  }

  const difficulty = DIFFICULTIES.find((d) => d.id === challenge.difficulty) || DIFFICULTIES[1];
  const milestones = milestonesOf(index, 'challenge', challenge.id);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title={`${challenge.icon}  ${challenge.name}`}
        subtitle={`${formatShortDate(challenge.startDate)} → ${formatShortDate(
          keyToTs(stats.endKey)
        )} · ${challenge.durationDays} days`}
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
        {/* -------------------------------------------------- overview */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ProgressRing theme={theme} percent={stats.percent} color={challenge.color} size={88} stroke={9}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text }}>
                  {stats.percent}%
                </Text>
              </ProgressRing>
              <View style={{ flex: 1, marginLeft: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <StatusBadge theme={theme} status={stats.status} />
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: withAlpha(difficulty.color, 0.14),
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: difficulty.color }}>
                      {difficulty.label.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text }}>
                  Day {stats.dayIndex}
                  <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textTertiary }}>
                    {' '}
                    / {stats.totalDays}
                  </Text>
                </Text>
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 }}>
                  {stats.status === 'upcoming'
                    ? `Starts ${formatShortDate(challenge.startDate)}`
                    : `${stats.daysRemaining} days remaining`}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <StatTile theme={theme} label="Streak" value={stats.streak} icon="🔥" color={challenge.color} />
              <StatTile theme={theme} label="Cleared" value={`${stats.daysComplete}`} sub={`of ${stats.totalDays}`} />
              <StatTile
                theme={theme}
                label="Missed"
                value={stats.missedDays}
                sub={challenge.allowedSkips ? `${challenge.allowedSkips} allowed` : 'none allowed'}
                color={stats.missedDays ? theme.colors.danger : theme.colors.text}
              />
            </View>
          </Card>
        </View>

        {/* ------------------------------------------------ day tracker */}
        {stats.hasDaily && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="The run" />
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {stats.dayMap.map((day, i) => {
                  const isToday = day.key === today;
                  return (
                    <View
                      key={day.key}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: day.done
                          ? challenge.color
                          : day.future
                          ? theme.colors.heatEmpty
                          : withAlpha(theme.colors.danger, 0.14),
                        borderWidth: isToday ? 1.5 : 0,
                        borderColor: theme.colors.text,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: day.done
                            ? '#FFF'
                            : day.future
                            ? theme.colors.textTertiary
                            : theme.colors.danger,
                        }}
                      >
                        {i + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>
        )}

        {/* ------------------------------------------------ today's bar */}
        {stats.status === 'active' && !!stats.habits.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle
              theme={theme}
              title={stats.todayDone ? "Today — cleared" : "Today's requirement"}
            />
            <Card theme={theme}>
              {stats.habits.map((habit, i) => {
                const hs = habitStats(habit, index, today);
                return (
                  <View
                    key={habit.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 9,
                      borderBottomWidth: i === stats.habits.length - 1 ? 0 : StyleSheet.hairlineWidth,
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
                          checking this here also logs the habit
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <HabitCheckButton
                      theme={theme}
                      habit={habit}
                      stats={hs}
                      size={36}
                      onCheck={() => actions.checkHabit(habit.id, habit.target || 1)}
                      onUncheck={() => actions.uncheckHabit(habit.id)}
                      onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount)}
                    />
                  </View>
                );
              })}
              {challenge.requirements.minPerDay > 0 && (
                <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 10 }}>
                  {challenge.requirements.minPerDay} of {stats.habits.length} required each day.
                </Text>
              )}
            </Card>
          </View>
        )}

        {!stats.hasDaily && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Card theme={theme}>
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No daily habit is linked yet, so this challenge is scored on its tasks and milestones.
                Link a habit in Edit to track it day by day.
              </Text>
            </Card>
          </View>
        )}

        {/* ------------------------------------------------------ tasks */}
        {!!stats.tasks.length && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="Tasks in this challenge" />
            <Card theme={theme}>
              {stats.tasks.map((task, i) => (
                <View
                  key={task.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderBottomWidth: i === stats.tasks.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Checkbox
                    theme={theme}
                    checked={task.done}
                    size={20}
                    color={challenge.color}
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
              ))}
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
                  color={challenge.color}
                  onToggle={() => actions.toggleMilestone(m.id)}
                  onPress={() => setMilestoneEditor(m)}
                />
              ))
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                Optional checkpoints inside the challenge.
              </Text>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------------ rules */}
        {(!!challenge.rules.length || !!challenge.reward || !!challenge.description) && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionTitle theme={theme} title="The deal" />
            <Card theme={theme}>
              {!!challenge.description && (
                <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: 12, lineHeight: 21 }}>
                  {challenge.description}
                </Text>
              )}
              {challenge.rules.map((rule, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ color: challenge.color, marginRight: 8, fontWeight: '700' }}>·</Text>
                  <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                    {rule}
                  </Text>
                </View>
              ))}
              {!!challenge.reward && (
                <View
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: withAlpha(challenge.color, 0.1),
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: challenge.color, letterSpacing: 0.5 }}>
                    REWARD
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text, marginTop: 4 }}>
                    {challenge.reward}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* ------------------------------------------------ connections */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="What this serves" />
          <Card theme={theme}>
            <ConnectionSummary theme={theme} state={state} links={challenge.links} />
            {!challenge.links.commitmentIds.length && !challenge.links.goalIds.length && (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                Not linked to a commitment yet.
              </Text>
            )}
          </Card>
        </View>

        {/* ---------------------------------------------------- actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Status" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip
              theme={theme}
              label="Active"
              active={stats.status === 'active'}
              onPress={() => actions.setChallengeStatus(challenge.id, 'active')}
              color={theme.colors.success}
            />
            <Chip
              theme={theme}
              label="Paused"
              active={stats.status === 'paused'}
              onPress={() => actions.setChallengeStatus(challenge.id, 'paused')}
              color={theme.colors.warning}
            />
            <Chip
              theme={theme}
              label="Completed"
              active={stats.status === 'completed'}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                actions.setChallengeStatus(challenge.id, 'completed');
              }}
              color={theme.colors.primary}
            />
            <Chip
              theme={theme}
              label="Give up"
              active={stats.status === 'failed'}
              onPress={() => actions.setChallengeStatus(challenge.id, 'failed')}
              color={theme.colors.danger}
            />
          </View>
        </View>
      </ScrollView>

      <ChallengeEditor
        theme={theme}
        visible={editing}
        challenge={challenge}
        state={state}
        actions={actions}
        onClose={() => setEditing(false)}
        onDeleted={nav.goBack}
      />
      <MilestoneEditor
        theme={theme}
        visible={!!milestoneEditor}
        parentType="challenge"
        parentId={challenge.id}
        milestone={milestoneEditor && milestoneEditor !== 'new' ? milestoneEditor : null}
        actions={actions}
        onClose={() => setMilestoneEditor(null)}
      />
    </View>
  );
}
