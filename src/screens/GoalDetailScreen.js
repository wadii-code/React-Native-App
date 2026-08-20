/**
 * A goal, in detail.
 *
 * A goal is the middle layer: it has a number, a deadline and a parent. The
 * counter, when it has one, is given a control large enough to use one-handed,
 * because that is the one thing people come back to this screen to do.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  Card,
  NavBar,
  ProgressRing,
  ProgressBar,
  Checkbox,
  ListGroup,
  ListRow,
  Button,
  Icon,
  IconWell,
  PressableScale,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
  useSafeArea,
} from '../components/ui';
import { Section, HabitCheck } from '../components/rows';
import { MilestoneRow, ChallengeCard } from '../components/cards';
import { GoalEditor, MilestoneEditor } from '../components/editors';
import { goalProgress, habitStats, challengeStats, milestonesOf } from '../domain/engine';
import { todayKey, formatShortDate } from '../utils';

export default function GoalDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const [milestoneEditor, setMilestoneEditor] = useState(null);
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const insets = useSafeArea();

  const goal = state.goals.find((g) => g.id === params.id);
  const progress = useMemo(
    () => (goal ? goalProgress(goal, state, index, today) : null),
    [goal, state, index, today]
  );

  if (!goal || !progress) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <NavBar theme={theme} title="Goal" onBack={nav.goBack} alwaysSolid compactOnly />
        <Text style={{ padding: 20, marginTop: headerSpace, ...theme.type.callout, color: theme.colors.textSecondary }}>
          This goal no longer exists.
        </Text>
      </View>
    );
  }

  const commitment = state.commitments.find((c) => c.id === goal.commitmentId);
  const milestones = milestonesOf(index, 'goal', goal.id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title={goal.title}
        scrollY={scrollY}
        threshold={70}
        onBack={nav.goBack}
        right={<Button theme={theme} label="Edit" variant="plain" size="sm" onPress={() => setEditing(true)} />}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: insets.bottom + 48 }}
      >
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
            <Card
              theme={theme}
              elevation="sm"
              tint={withAlpha(goal.color, theme.dark ? 0.11 : 0.06)}
              style={{ padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconWell theme={theme} color={withAlpha(goal.color, theme.dark ? 0.26 : 0.16)} size={44}>
                  <Text style={{ fontSize: 21 }}>{goal.icon}</Text>
                </IconWell>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text numberOfLines={2} style={{ ...theme.type.title3, color: theme.colors.text }}>
                    {goal.title}
                  </Text>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3 }}>
                    {[
                      commitment ? `${commitment.icon} ${commitment.title}` : 'Standalone goal',
                      goal.targetDate ? `by ${formatShortDate(goal.targetDate)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                <ProgressRing
                  theme={theme}
                  percent={progress.percent}
                  color={goal.color}
                  size={82}
                  stroke={8}
                  trackColor={withAlpha(goal.color, theme.dark ? 0.18 : 0.13)}
                >
                  <Text style={{ ...theme.type.title3, color: theme.colors.text }}>{progress.percent}%</Text>
                </ProgressRing>
                <View style={{ flex: 1, marginLeft: 18 }}>
                  {progress.parts.length ? (
                    progress.parts.map((part, i) => (
                      <View key={part.label} style={{ marginBottom: i === progress.parts.length - 1 ? 0 : 11 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                          <Text style={{ ...theme.type.caption, color: theme.colors.textSecondary, fontWeight: '600' }}>
                            {part.label}
                          </Text>
                          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                            {part.detail}
                          </Text>
                        </View>
                        <ProgressBar theme={theme} percent={part.percent} color={goal.color} height={4} />
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                      Add milestones, or link tasks and habits, and progress fills itself in.
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </View>
        </FadeIn>

        {goal.metric.type === 'count' && (
          <Section theme={theme} title="Counter">
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ ...theme.type.largeTitle, color: theme.colors.text }}>
                    {goal.metric.current}
                    <Text style={{ ...theme.type.title3, color: theme.colors.textTertiary }}>
                      {' '}
                      / {goal.metric.target} {goal.metric.unit}
                    </Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <PressableScale
                    onPress={() => actions.bumpGoalMetric(goal.id, -1)}
                    scaleTo={0.9}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: theme.radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.fill2,
                    }}
                  >
                    <Icon name="minus" size={18} color={theme.colors.textSecondary} weight={2.4} />
                  </PressableScale>
                  <PressableScale
                    onPress={() => actions.bumpGoalMetric(goal.id, 1)}
                    feedback="light"
                    scaleTo={0.9}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: theme.radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: goal.color,
                    }}
                  >
                    <Icon name="plus" size={18} color="#FFFFFF" weight={2.4} />
                  </PressableScale>
                </View>
              </View>
              <ProgressBar
                theme={theme}
                percent={goal.metric.target ? (goal.metric.current / goal.metric.target) * 100 : 0}
                color={goal.color}
                height={6}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Section>
        )}

        <Section theme={theme} title="Milestones" action="Add" onAction={() => setMilestoneEditor('new')}>
          <Card theme={theme} style={{ paddingVertical: milestones.length ? 4 : 16 }}>
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
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>
                No milestones yet.
              </Text>
            )}
          </Card>
        </Section>

        <Section theme={theme} title="Tasks">
          {progress.tasks.length ? (
            <ListGroup theme={theme} inset={48}>
              {progress.tasks.map((task) => (
                <ListRow key={task.id} theme={theme} paddingVertical={11}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      theme={theme}
                      checked={task.done}
                      size={21}
                      color={goal.color}
                      onPress={() => actions.toggleTask(task.id)}
                    />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: 13,
                        ...theme.type.callout,
                        color: task.done ? theme.colors.textTertiary : theme.colors.text,
                        textDecorationLine: task.done ? 'line-through' : 'none',
                      }}
                    >
                      {task.text}
                    </Text>
                  </View>
                </ListRow>
              ))}
            </ListGroup>
          ) : (
            <Card theme={theme}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>
                Link tasks to this goal from the task editor.
              </Text>
            </Card>
          )}
        </Section>

        {!!progress.habits.length && (
          <Section theme={theme} title="Habits">
            <ListGroup theme={theme} inset={16}>
              {progress.habits.map((habit) => {
                const stats = habitStats(habit, index, today);
                return (
                  <ListRow
                    key={habit.id}
                    theme={theme}
                    onPress={() => nav.navigate('habitDetail', { id: habit.id })}
                    paddingVertical={10}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 17, marginRight: 11 }}>{habit.icon}</Text>
                      <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>
                        {habit.name}
                      </Text>
                      <HabitCheck
                        theme={theme}
                        habit={habit}
                        stats={stats}
                        size={34}
                        onCheck={() => actions.checkHabit(habit.id, habit.target || 1)}
                        onUncheck={() => actions.uncheckHabit(habit.id)}
                        onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount)}
                      />
                    </View>
                  </ListRow>
                );
              })}
            </ListGroup>
          </Section>
        )}

        {!!progress.challenges.length && (
          <Section theme={theme} title="Challenges">
            {progress.challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                theme={theme}
                challenge={c}
                stats={challengeStats(c, state, index, today)}
                today={today}
                onPress={() => nav.navigate('challengeDetail', { id: c.id })}
              />
            ))}
          </Section>
        )}

        {!!goal.description && (
          <Section theme={theme} title="Notes">
            <Card theme={theme}>
              <Text style={{ ...theme.type.callout, color: theme.colors.textSecondary, lineHeight: 22 }}>
                {goal.description}
              </Text>
            </Card>
          </Section>
        )}
      </Animated.ScrollView>

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
