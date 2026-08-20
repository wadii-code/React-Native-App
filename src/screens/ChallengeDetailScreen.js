/**
 * A challenge, in detail.
 *
 * A challenge is not a long task, and it should not look like one. The screen
 * opens on a hero washed in the challenge's own colour that states where you
 * are standing - "Day 12 of 30" - and names the phase you are in, so the same
 * challenge looks different on day 1, day 7 and day 30 without any of the
 * numbers moving anywhere else.
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
  StatTile,
  Checkbox,
  Chip,
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
  haptic,
} from '../components/ui';
import { Section, HabitCheck } from '../components/rows';
import { MilestoneRow, StatusBadge, DayTrack } from '../components/cards';
import { ChallengeEditor, MilestoneEditor } from '../components/editors';
import { ConnectionSummary } from '../components/LinkPicker';
import { challengeStats, habitStats, milestonesOf } from '../domain/engine';
import { DIFFICULTIES } from '../domain/schema';
import { todayKey, formatShortDate, keyToTs } from '../utils';

/** The name for where you are in the run. It is the only thing that "levels up". */
function phaseOf(stats) {
  if (stats.status === 'completed') return 'Complete';
  if (stats.status === 'failed') return 'Broken';
  if (stats.status === 'upcoming') return 'Not started';
  if (stats.status === 'paused') return 'Paused';
  const ratio = stats.dayIndex / Math.max(1, stats.totalDays);
  if (ratio < 0.2) return 'Getting started';
  if (ratio < 0.45) return 'Finding the rhythm';
  if (ratio < 0.75) return 'Locked in';
  if (ratio < 1) return 'Home stretch';
  return 'Final day';
}

export default function ChallengeDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const [milestoneEditor, setMilestoneEditor] = useState(null);
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const insets = useSafeArea();

  const challenge = state.challenges.find((c) => c.id === params.id);
  const stats = useMemo(
    () => (challenge ? challengeStats(challenge, state, index, today) : null),
    [challenge, state, index, today]
  );

  if (!challenge || !stats) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <NavBar theme={theme} title="Challenge" onBack={nav.goBack} alwaysSolid compactOnly />
        <Text style={{ padding: 20, marginTop: headerSpace, ...theme.type.callout, color: theme.colors.textSecondary }}>
          This challenge no longer exists.
        </Text>
      </View>
    );
  }

  const difficulty = DIFFICULTIES.find((d) => d.id === challenge.difficulty) || DIFFICULTIES[1];
  const milestones = milestonesOf(index, 'challenge', challenge.id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title={challenge.name}
        scrollY={scrollY}
        threshold={80}
        onBack={nav.goBack}
        right={
          <Button theme={theme} label="Edit" variant="plain" size="sm" onPress={() => setEditing(true)} />
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: insets.bottom + 48 }}
      >
        {/* ------------------------------------------------------- hero */}
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
            <Card
              theme={theme}
              elevation="sm"
              tint={withAlpha(challenge.color, theme.dark ? 0.12 : 0.07)}
              style={{ padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconWell theme={theme} color={withAlpha(challenge.color, theme.dark ? 0.26 : 0.16)} size={46}>
                  <Text style={{ fontSize: 22 }}>{challenge.icon}</Text>
                </IconWell>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text numberOfLines={2} style={{ ...theme.type.title3, color: theme.colors.text }}>
                    {challenge.name}
                  </Text>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3 }}>
                    {formatShortDate(challenge.startDate)} → {formatShortDate(keyToTs(stats.endKey))}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 }}>
                <StatusBadge theme={theme} status={stats.status} />
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: theme.radius.xs,
                    backgroundColor: withAlpha(difficulty.color, theme.dark ? 0.2 : 0.13),
                  }}
                >
                  <Text style={{ ...theme.type.caption2, color: difficulty.color }}>
                    {difficulty.label.toUpperCase()}
                  </Text>
                </View>
                {stats.streak > 0 && (
                  <StreakPill theme={theme} count={stats.streak} color={challenge.color} size="sm" />
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.type.caption2, color: theme.colors.textTertiary }}>
                    {phaseOf(stats).toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                    <Text style={{ ...theme.type.largeTitle, color: theme.colors.text }}>
                      Day {stats.dayIndex}
                    </Text>
                    <Text style={{ ...theme.type.title3, color: theme.colors.textTertiary, marginLeft: 6 }}>
                      / {stats.totalDays}
                    </Text>
                  </View>
                  <Text style={{ ...theme.type.footnote, color: theme.colors.textSecondary, marginTop: 4 }}>
                    {stats.status === 'upcoming'
                      ? `Starts ${formatShortDate(challenge.startDate)}`
                      : `${stats.daysRemaining} days remaining`}
                  </Text>
                </View>
                <ProgressRing
                  theme={theme}
                  percent={stats.percent}
                  color={challenge.color}
                  size={78}
                  stroke={8}
                  trackColor={withAlpha(challenge.color, theme.dark ? 0.18 : 0.13)}
                >
                  <Text style={{ ...theme.type.headline, color: theme.colors.text }}>{stats.percent}%</Text>
                </ProgressRing>
              </View>

              {stats.hasDaily && stats.dayMap.length <= 45 && (
                <View style={{ marginTop: 18 }}>
                  <DayTrack theme={theme} dayMap={stats.dayMap} today={today} color={challenge.color} height={8} />
                </View>
              )}
            </Card>
          </View>
        </FadeIn>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: theme.screen, marginTop: 12 }}>
          <StatTile theme={theme} label="Streak" value={stats.streak} glyph="flame" color={challenge.color} />
          <StatTile theme={theme} label="Cleared" value={`${stats.daysComplete}`} sub={`of ${stats.totalDays}`} glyph="check" />
          <StatTile
            theme={theme}
            label="Missed"
            value={stats.missedDays}
            sub={challenge.allowedSkips ? `${challenge.allowedSkips} allowed` : 'none allowed'}
            color={stats.missedDays ? theme.colors.danger : theme.colors.text}
          />
        </View>

        {/* -------------------------------------------------- the run */}
        {stats.hasDaily && (
          <Section theme={theme} title="The run">
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {stats.dayMap.map((day, i) => {
                  const isToday = day.key === today;
                  return (
                    <View
                      key={day.key}
                      style={{
                        width: 27,
                        height: 27,
                        borderRadius: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: day.done
                          ? challenge.color
                          : day.future
                          ? theme.colors.heatEmpty
                          : withAlpha(theme.colors.danger, theme.dark ? 0.22 : 0.13),
                        borderWidth: isToday ? 1.6 : 0,
                        borderColor: withAlpha(challenge.color, 0.95),
                      }}
                    >
                      <Text
                        style={{
                          ...theme.type.caption2,
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
          </Section>
        )}

        {/* ------------------------------------------------ today's bar */}
        {stats.status === 'active' && !!stats.habits.length && (
          <Section theme={theme} title={stats.todayDone ? 'Today — cleared' : "Today's requirement"}>
            <ListGroup theme={theme} inset={16} footer={
              challenge.requirements.minPerDay > 0
                ? `${challenge.requirements.minPerDay} of ${stats.habits.length} required each day.`
                : null
            }>
              {stats.habits.map((habit) => {
                const hs = habitStats(habit, index, today);
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
                        <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 2 }}>
                          checking here also logs the habit
                        </Text>
                      </View>
                      <HabitCheck
                        theme={theme}
                        habit={habit}
                        stats={hs}
                        size={36}
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

        {!stats.hasDaily && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 22 }}>
            <Card theme={theme}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                No daily habit is linked yet, so this challenge is scored on its tasks and milestones. Link a
                habit in Edit to track it day by day.
              </Text>
            </Card>
          </View>
        )}

        {/* ------------------------------------------------------ tasks */}
        {!!stats.tasks.length && (
          <Section theme={theme} title="Tasks in this challenge">
            <ListGroup theme={theme} inset={48}>
              {stats.tasks.map((task) => (
                <ListRow key={task.id} theme={theme} paddingVertical={11}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox
                      theme={theme}
                      checked={task.done}
                      size={21}
                      color={challenge.color}
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
          </Section>
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
                  color={challenge.color}
                  onToggle={() => actions.toggleMilestone(m.id)}
                  onPress={() => setMilestoneEditor(m)}
                />
              ))
            ) : (
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>
                Optional checkpoints inside the challenge.
              </Text>
            )}
          </Card>
        </Section>

        {/* ------------------------------------------------------ rules */}
        {(!!challenge.rules.length || !!challenge.reward || !!challenge.description) && (
          <Section theme={theme} title="The deal">
            <Card theme={theme}>
              {!!challenge.description && (
                <Text style={{ ...theme.type.callout, color: theme.colors.textSecondary, marginBottom: 14, lineHeight: 22 }}>
                  {challenge.description}
                </Text>
              )}
              {challenge.rules.map((rule, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: challenge.color,
                      marginTop: 8,
                      marginRight: 11,
                    }}
                  />
                  <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>{rule}</Text>
                </View>
              ))}
              {!!challenge.reward && (
                <View
                  style={{
                    marginTop: 8,
                    padding: 14,
                    borderRadius: theme.radius.md,
                    backgroundColor: withAlpha(challenge.color, theme.dark ? 0.16 : 0.09),
                  }}
                >
                  <Text style={{ ...theme.type.caption2, color: challenge.color }}>REWARD</Text>
                  <Text style={{ ...theme.type.callout, color: theme.colors.text, marginTop: 5 }}>
                    {challenge.reward}
                  </Text>
                </View>
              )}
            </Card>
          </Section>
        )}

        {/* ------------------------------------------------ connections */}
        <Section theme={theme} title="What this serves">
          <Card theme={theme}>
            <ConnectionSummary theme={theme} state={state} links={challenge.links} />
            {!challenge.links.commitmentIds.length && !challenge.links.goalIds.length && (
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>
                Not linked to a commitment yet.
              </Text>
            )}
          </Card>
        </Section>

        {/* ---------------------------------------------------- actions */}
        <Section theme={theme} title="Status">
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
                haptic('success');
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
        </Section>
      </Animated.ScrollView>

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
