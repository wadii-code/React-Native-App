/**
 * Journey holds the three layers above the daily grind: what you are becoming
 * (commitments), where that means getting to (goals), and the pushes you set
 * yourself along the way (challenges).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import {
  NavBar,
  LargeTitle,
  Segmented,
  Card,
  EmptyBlock,
  StatTile,
  Chip,
  RoundButton,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
} from '../components/ui';
import { useTabBarHeight } from '../components/TabBar';
import { CommitmentCard, GoalCard, ChallengeCard } from '../components/cards';
import { CommitmentEditor, GoalEditor, ChallengeEditor } from '../components/editors';
import { commitmentProgress, goalProgress, challengeStats } from '../domain/engine';
import { todayKey } from '../utils';

const SEGMENTS = [
  { id: 'commitments', label: 'Commitments' },
  { id: 'goals', label: 'Goals' },
  { id: 'challenges', label: 'Challenges' },
];

export default function JourneyScreen({ theme }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [segment, setSegment] = useState('commitments');
  const [editor, setEditor] = useState(null); // 'commitment' | 'goal' | 'challenge'
  const [challengeFilter, setChallengeFilter] = useState('current');
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const tabBar = useTabBarHeight();

  const commitments = useMemo(
    () =>
      state.commitments
        .filter((c) => c.status !== 'archived')
        .map((c) => ({ commitment: c, progress: commitmentProgress(c, state, index, today) })),
    [state, index, today]
  );

  const goals = useMemo(
    () => state.goals.map((g) => ({ goal: g, progress: goalProgress(g, state, index, today) })),
    [state, index, today]
  );

  const challenges = useMemo(
    () =>
      state.challenges
        .map((c) => ({ challenge: c, stats: challengeStats(c, state, index, today) }))
        .sort((a, b) => b.challenge.startDate - a.challenge.startDate),
    [state, index, today]
  );

  const visibleChallenges = useMemo(() => {
    if (challengeFilter === 'current') {
      return challenges.filter((c) => ['active', 'upcoming', 'paused'].includes(c.stats.status));
    }
    if (challengeFilter === 'done') {
      return challenges.filter((c) => ['completed', 'failed'].includes(c.stats.status));
    }
    return challenges;
  }, [challenges, challengeFilter]);

  const openEditor = () =>
    setEditor(segment === 'commitments' ? 'commitment' : segment === 'goals' ? 'goal' : 'challenge');

  const subtitle = {
    commitments: 'What you are working to become',
    goals: 'The checkpoints along the way',
    challenges: 'The pushes you set yourself',
  }[segment];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title="Journey"
        scrollY={scrollY}
        threshold={54}
        right={
          <RoundButton
            theme={theme}
            glyph="plus"
            size={32}
            weight={2.3}
            color={theme.colors.primary}
            fg="#FFFFFF"
            onPress={openEditor}
          />
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: tabBar + 32 }}
      >
        <LargeTitle theme={theme} title="Journey" subtitle={subtitle} />

        <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
          <Segmented theme={theme} options={SEGMENTS} value={segment} onChange={setSegment} />
        </View>

        {segment === 'commitments' && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 20 }}>
            {commitments.map((row, i) => (
              <FadeIn key={row.commitment.id} delay={Math.min(i, 6) * 45}>
                <CommitmentCard
                  theme={theme}
                  commitment={row.commitment}
                  progress={row.progress}
                  onPress={() => nav.navigate('commitmentDetail', { id: row.commitment.id })}
                />
              </FadeIn>
            ))}
            {!commitments.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  glyph="target"
                  title="Name what you are becoming."
                  sub="A commitment is the thing underneath everything else — 'physically fit', 'fluent in German'. Habits, tasks and challenges hang off it."
                  actionLabel="Create a commitment"
                  onAction={() => setEditor('commitment')}
                />
              </Card>
            )}
          </View>
        )}

        {segment === 'goals' && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 20 }}>
            {goals.map((row, i) => (
              <FadeIn key={row.goal.id} delay={Math.min(i, 6) * 45}>
                <GoalCard
                  theme={theme}
                  goal={row.goal}
                  progress={row.progress}
                  commitment={state.commitments.find((c) => c.id === row.goal.commitmentId)}
                  onPress={() => nav.navigate('goalDetail', { id: row.goal.id })}
                />
              </FadeIn>
            ))}
            {!goals.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  glyph="target"
                  color={theme.colors.info}
                  title="No goals yet"
                  sub="Goals are the checkpoints on the way to a commitment: finish the course, build the portfolio, pass the exam."
                  actionLabel="Create a goal"
                  onAction={() => setEditor('goal')}
                />
              </Card>
            )}
          </View>
        )}

        {segment === 'challenges' && (
          <View style={{ paddingHorizontal: theme.screen, marginTop: 20 }}>
            {!!challenges.length && (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <StatTile
                    theme={theme}
                    label="Active"
                    value={challenges.filter((c) => c.stats.status === 'active').length}
                    glyph="flame"
                    color={theme.colors.warning}
                  />
                  <StatTile
                    theme={theme}
                    label="Completed"
                    value={challenges.filter((c) => c.stats.status === 'completed').length}
                    glyph="check"
                    color={theme.colors.success}
                  />
                  <StatTile
                    theme={theme}
                    label="Success rate"
                    value={`${successRate(challenges)}%`}
                    glyph="chart"
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[
                    { id: 'current', label: 'Current' },
                    { id: 'done', label: 'Finished' },
                    { id: 'all', label: 'All' },
                  ].map((f) => (
                    <Chip
                      key={f.id}
                      theme={theme}
                      label={f.label}
                      active={challengeFilter === f.id}
                      onPress={() => setChallengeFilter(f.id)}
                    />
                  ))}
                </View>
              </>
            )}

            {visibleChallenges.map((row, i) => (
              <FadeIn key={row.challenge.id} delay={Math.min(i, 6) * 45}>
                <ChallengeCard
                  theme={theme}
                  challenge={row.challenge}
                  stats={row.stats}
                  state={state}
                  today={today}
                  onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
                />
              </FadeIn>
            ))}

            {!challenges.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  glyph="flame"
                  color={theme.colors.warning}
                  title="Ready for your next challenge?"
                  sub="A challenge is a defined push: 30 days of coding, 21 days without procrastination. Link the habits you already track and it scores itself."
                  actionLabel="Start a challenge"
                  onAction={() => setEditor('challenge')}
                />
              </Card>
            )}

            {!!challenges.length && !visibleChallenges.length && (
              <Card theme={theme}>
                <EmptyBlock theme={theme} compact glyph="flame" title="Nothing here yet" />
              </Card>
            )}
          </View>
        )}
      </Animated.ScrollView>

      <CommitmentEditor
        theme={theme}
        visible={editor === 'commitment'}
        actions={actions}
        onClose={() => setEditor(null)}
      />
      <GoalEditor
        theme={theme}
        visible={editor === 'goal'}
        state={state}
        actions={actions}
        onClose={() => setEditor(null)}
      />
      <ChallengeEditor
        theme={theme}
        visible={editor === 'challenge'}
        state={state}
        actions={actions}
        onClose={() => setEditor(null)}
      />
    </View>
  );
}

function successRate(rows) {
  const finished = rows.filter((r) => ['completed', 'failed'].includes(r.stats.status));
  if (!finished.length) return 0;
  return Math.round(
    (finished.filter((r) => r.stats.status === 'completed').length / finished.length) * 100
  );
}
