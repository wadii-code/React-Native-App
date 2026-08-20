/**
 * A commitment, in detail.
 *
 * This is the top of the hierarchy, so the screen reads downward: the number
 * first, then why it matters, then the checkpoints, then everything feeding it.
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
  StreakPill,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
  useSafeArea,
} from '../components/ui';
import { Section, HabitCheck } from '../components/rows';
import { GoalCard, ChallengeCard, MilestoneRow } from '../components/cards';
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
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const insets = useSafeArea();

  const commitment = state.commitments.find((c) => c.id === params.id);
  const progress = useMemo(
    () => (commitment ? commitmentProgress(commitment, state, index, today) : null),
    [commitment, state, index, today]
  );

  if (!commitment || !progress) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <NavBar theme={theme} title="Commitment" onBack={nav.goBack} alwaysSolid compactOnly />
        <Text style={{ padding: 20, marginTop: headerSpace, ...theme.type.callout, color: theme.colors.textSecondary }}>
          This commitment no longer exists.
        </Text>
      </View>
    );
  }

  const milestones = milestonesOf(index, 'commitment', commitment.id);
  const daysLeft = commitment.targetDate ? daysBetweenKeys(today, dateKey(commitment.targetDate)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title={commitment.title}
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
        {/* ------------------------------------------------- progress */}
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
            <Card
              theme={theme}
              elevation="sm"
              tint={withAlpha(commitment.color, theme.dark ? 0.11 : 0.06)}
              style={{ padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconWell theme={theme} color={withAlpha(commitment.color, theme.dark ? 0.26 : 0.16)} size={46}>
                  <Text style={{ fontSize: 22 }}>{commitment.icon}</Text>
                </IconWell>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text numberOfLines={2} style={{ ...theme.type.title3, color: theme.colors.text }}>
                    {commitment.title}
                  </Text>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3 }}>
                    {commitment.targetDate
                      ? `Target ${formatShortDate(commitment.targetDate)}${
                          daysLeft != null
                            ? ` · ${daysLeft >= 0 ? `${daysLeft} days left` : 'past target'}`
                            : ''
                        }`
                      : `Since ${formatShortDate(commitment.startDate)}`}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
                <ProgressRing
                  theme={theme}
                  percent={progress.percent}
                  color={commitment.color}
                  size={86}
                  stroke={9}
                  trackColor={withAlpha(commitment.color, theme.dark ? 0.18 : 0.13)}
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
                        <ProgressBar theme={theme} percent={part.percent} color={commitment.color} height={4} />
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                      Nothing linked yet. Attach a habit, task or challenge and this fills in.
                    </Text>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 18,
                  paddingTop: 15,
                  borderTopWidth: 1,
                  borderTopColor: withAlpha(commitment.color, 0.16),
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: progress.movedToday ? theme.colors.success : theme.colors.textQuaternary,
                  }}
                />
                <Text style={{ ...theme.type.footnote, color: theme.colors.textSecondary }}>
                  {progress.movedToday ? 'You moved this forward today' : 'Nothing done for this today'}
                </Text>
                {progress.consistency != null && (
                  <Text style={{ marginLeft: 'auto', ...theme.type.footnoteEmph, color: commitment.color }}>
                    {progress.consistency}% consistent
                  </Text>
                )}
              </View>
            </Card>
          </View>
        </FadeIn>

        {/* ------------------------------------------------------- why */}
        {!!commitment.why && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 14 }}>
            <Card theme={theme} tint={withAlpha(commitment.color, theme.dark ? 0.14 : 0.08)} bordered={false}>
              <Text style={{ ...theme.type.caption2, color: commitment.color, marginBottom: 8 }}>
                WHY THIS MATTERS
              </Text>
              <Text style={{ ...theme.type.callout, color: theme.colors.text, lineHeight: 23 }}>
                {commitment.why}
              </Text>
            </Card>
          </View>
        )}

        {/* ------------------------------------------------- milestones */}
        <Section theme={theme} title="Milestones" action="Add" onAction={() => setMilestoneEditor('new')}>
          <Card theme={theme} style={{ paddingVertical: milestones.length ? 4 : 16 }}>
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
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                Break the commitment into checkpoints you can actually finish.
              </Text>
            )}
          </Card>
        </Section>

        {/* ------------------------------------------------------ goals */}
        <Section theme={theme} title="Goals" action="Add" onAction={() => setSubEditor('goal')}>
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
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>
                No goals under this commitment yet.
              </Text>
            </Card>
          )}
        </Section>

        {/* ----------------------------------------------------- habits */}
        <Section theme={theme} title="Habits">
          {progress.habits.length ? (
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
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ ...theme.type.callout, color: theme.colors.text }}>{habit.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                            {stats.consistency}% consistent
                          </Text>
                          {stats.current > 0 && (
                            <StreakPill theme={theme} count={stats.current} color={habit.color} size="sm" />
                          )}
                        </View>
                      </View>
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
          ) : (
            <Card theme={theme}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                No habits linked. Open a habit and tick this commitment under "Supports commitments".
              </Text>
            </Card>
          )}
        </Section>

        {/* ------------------------------------------------------ tasks */}
        <Section theme={theme} title="Tasks">
          {progress.tasks.length ? (
            <ListGroup theme={theme} inset={48}>
              {progress.tasks.slice(0, 12).map((task) => (
                <ListRow key={task.id} theme={theme} paddingVertical={11}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      theme={theme}
                      checked={task.done}
                      size={21}
                      color={commitment.color}
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
                No tasks linked yet.
              </Text>
            </Card>
          )}
        </Section>

        {/* ------------------------------------------------- challenges */}
        <Section theme={theme} title="Challenges" action="Add" onAction={() => setSubEditor('challenge')}>
          {progress.challenges.length ? (
            progress.challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                theme={theme}
                challenge={c}
                stats={challengeStats(c, state, index, today)}
                today={today}
                onPress={() => nav.navigate('challengeDetail', { id: c.id })}
              />
            ))
          ) : (
            <Card theme={theme}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                A challenge is a good way to force momentum on this commitment.
              </Text>
            </Card>
          )}
        </Section>
      </Animated.ScrollView>

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
