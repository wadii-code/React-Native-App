/**
 * Journey holds the three layers above the daily grind: what you are becoming
 * (commitments), where that means getting to (goals), and the pushes you set
 * yourself along the way (challenges).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { ScreenHeader, Segmented, Card, EmptyBlock, StatTile, Chip } from '../components/ui';
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

  const newLabel =
    segment === 'commitments' ? '+ Commitment' : segment === 'goals' ? '+ Goal' : '+ Challenge';

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        theme={theme}
        title="Journey"
        subtitle="What you are working to become"
        right={
          <TouchableOpacity
            onPress={() =>
              setEditor(segment === 'commitments' ? 'commitment' : segment === 'goals' ? 'goal' : 'challenge')
            }
            activeOpacity={0.8}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: theme.fontSize.xs }}>
              {newLabel}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <Segmented theme={theme} options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {segment === 'commitments' && (
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            {commitments.map((row) => (
              <CommitmentCard
                key={row.commitment.id}
                theme={theme}
                commitment={row.commitment}
                progress={row.progress}
                onPress={() => nav.navigate('commitmentDetail', { id: row.commitment.id })}
              />
            ))}
            {!commitments.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  compact
                  icon="🌱"
                  title="No commitments yet"
                  sub="A commitment is the thing underneath everything else - 'I want to become physically fit', 'I want to reach B2 German'. Habits, tasks and challenges hang off it."
                  actionLabel="Create a commitment"
                  onAction={() => setEditor('commitment')}
                />
              </Card>
            )}
          </View>
        )}

        {segment === 'goals' && (
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            {goals.map((row) => (
              <GoalCard
                key={row.goal.id}
                theme={theme}
                goal={row.goal}
                progress={row.progress}
                commitment={state.commitments.find((c) => c.id === row.goal.commitmentId)}
                onPress={() => nav.navigate('goalDetail', { id: row.goal.id })}
              />
            ))}
            {!goals.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  compact
                  icon="🎯"
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
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            {!!challenges.length && (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <StatTile
                    theme={theme}
                    label="Active"
                    value={challenges.filter((c) => c.stats.status === 'active').length}
                    icon="🔥"
                    color={theme.colors.success}
                  />
                  <StatTile
                    theme={theme}
                    label="Completed"
                    value={challenges.filter((c) => c.stats.status === 'completed').length}
                    icon="🏅"
                  />
                  <StatTile
                    theme={theme}
                    label="Success rate"
                    value={`${successRate(challenges)}%`}
                    icon="📊"
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
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

            {visibleChallenges.map((row) => (
              <ChallengeCard
                key={row.challenge.id}
                theme={theme}
                challenge={row.challenge}
                stats={row.stats}
                state={state}
                onPress={() => nav.navigate('challengeDetail', { id: row.challenge.id })}
              />
            ))}

            {!challenges.length && (
              <Card theme={theme}>
                <EmptyBlock
                  theme={theme}
                  compact
                  icon="🔥"
                  title="No challenges yet"
                  sub="A challenge is a defined push: 30 days of coding, 21 days without procrastination. Link the habits you already track and it scores itself."
                  actionLabel="Start a challenge"
                  onAction={() => setEditor('challenge')}
                />
              </Card>
            )}

            {!!challenges.length && !visibleChallenges.length && (
              <Card theme={theme}>
                <Text style={{ color: theme.colors.textTertiary, textAlign: 'center' }}>
                  Nothing here yet.
                </Text>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

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
