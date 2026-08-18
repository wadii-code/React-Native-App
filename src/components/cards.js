/**
 * The cards that represent each kind of thing in lists.
 * They share a silhouette on purpose: icon, name, one line of truth, progress.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { withAlpha } from '../theme';
import { ProgressBar, Card } from './ui';
import { ConnectionSummary } from './LinkPicker';
import { WeekStrip } from './Heatmap';
import { scheduleLabel } from '../domain/recurrence';
import { formatShortDate } from '../utils';

/* ----------------------------------------------------------- habit card */

export function HabitCheckButton({ theme, habit, stats, onCheck, onUncheck, onSetAmount, size = 46 }) {
  const target = habit.target || 1;
  const amount = stats.amountToday;
  const done = stats.doneToday;

  const press = () => {
    if (done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUncheck();
      return;
    }
    Haptics.impactAsync(
      amount + 1 >= target ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    if (target > 1) onSetAmount(amount + 1);
    else onCheck();
  };

  return (
    <TouchableOpacity
      onPress={press}
      onLongPress={() => {
        if (amount > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onSetAmount(0);
        }
      }}
      activeOpacity={0.75}
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? habit.color : withAlpha(habit.color, amount > 0 ? 0.18 : 0.09),
        borderWidth: done ? 0 : 1.5,
        borderColor: withAlpha(habit.color, 0.35),
      }}
    >
      {done ? (
        <Text style={{ color: '#FFF', fontSize: size * 0.4, fontWeight: '800' }}>✓</Text>
      ) : target > 1 ? (
        <Text style={{ color: habit.color, fontSize: size * 0.32, fontWeight: '700' }}>
          {amount}/{target}
        </Text>
      ) : (
        <Text style={{ color: habit.color, fontSize: size * 0.4, fontWeight: '300' }}>+</Text>
      )}
    </TouchableOpacity>
  );
}

export function HabitCard({
  theme,
  habit,
  stats,
  week,
  state,
  onPress,
  onCheck,
  onUncheck,
  onSetAmount,
  compact,
}) {
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(habit.color, 0.14),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 19 }}>{habit.icon}</Text>
        </View>

        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text }}
          >
            {habit.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
              {scheduleLabel(habit.schedule)}
            </Text>
            {stats.current > 0 && (
              <Text style={{ fontSize: theme.fontSize.xs, color: habit.color, fontWeight: '700' }}>
                {'🔥'} {stats.current} {stats.streakUnit === 'week' ? 'wk' : 'd'}
              </Text>
            )}
          </View>
        </View>

        <HabitCheckButton
          theme={theme}
          habit={habit}
          stats={stats}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onSetAmount={onSetAmount}
        />
      </View>

      {!compact && !!week && (
        <View style={{ marginTop: 14 }}>
          <WeekStrip theme={theme} data={week} color={habit.color} />
        </View>
      )}

      {!compact && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 14 }}>
          <MiniStat theme={theme} label="Best" value={`${stats.best}`} />
          <MiniStat theme={theme} label="Consistency" value={`${stats.consistency}%`} />
          {!!stats.period && (
            <MiniStat
              theme={theme}
              label="This period"
              value={`${stats.period.done}/${stats.period.target}`}
            />
          )}
        </View>
      )}

      {!!state && (
        <ConnectionSummary theme={theme} state={state} links={habit.links} style={{ marginTop: 12 }} />
      )}
    </Card>
  );
}

function MiniStat({ theme, label, value }) {
  return (
    <View>
      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.text }}>
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------- challenge card */

export const STATUS_STYLE = (theme) => ({
  active: { label: 'Active', color: theme.colors.success },
  upcoming: { label: 'Upcoming', color: theme.colors.info },
  completed: { label: 'Completed', color: theme.colors.primary },
  failed: { label: 'Broken', color: theme.colors.danger },
  paused: { label: 'Paused', color: theme.colors.warning },
});

export function StatusBadge({ theme, status }) {
  const style = STATUS_STYLE(theme)[status] || STATUS_STYLE(theme).active;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: withAlpha(style.color, 0.14),
      }}
    >
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: style.color, letterSpacing: 0.3 }}>
        {style.label.toUpperCase()}
      </Text>
    </View>
  );
}

export function ChallengeCard({ theme, challenge, stats, state, onPress }) {
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(challenge.color, 0.14),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 19 }}>{challenge.icon}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text }}
          >
            {challenge.name}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 3 }}>
            {stats.status === 'upcoming'
              ? `Starts ${formatShortDate(challenge.startDate)}`
              : `Day ${stats.dayIndex} of ${stats.totalDays}`}
            {stats.streak > 0 ? `  ·  🔥 ${stats.streak}-day streak` : ''}
          </Text>
        </View>
        <StatusBadge theme={theme} status={stats.status} />
      </View>

      <View style={{ marginTop: 14 }}>
        <ProgressBar theme={theme} percent={stats.percent} color={challenge.color} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
            {stats.hasDaily
              ? `${stats.daysComplete}/${stats.totalDays} days cleared`
              : `${stats.tasksDone}/${stats.tasks.length} tasks done`}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '700', color: challenge.color }}>
            {stats.percent}%
          </Text>
        </View>
      </View>

      {!!state && (
        <ConnectionSummary theme={theme} state={state} links={challenge.links} style={{ marginTop: 12 }} />
      )}
    </Card>
  );
}

/* ------------------------------------------------------ commitment card */

export function CommitmentCard({ theme, commitment, progress, onPress, compact }) {
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(commitment.color, 0.14),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 19 }}>{commitment.icon}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text }}
          >
            {commitment.title}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 3 }}>
            {progress.goals.length} goals · {progress.habits.length} habits · {progress.challenges.length} challenges
          </Text>
        </View>
        <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '700', color: commitment.color }}>
          {progress.percent}%
        </Text>
      </View>

      <ProgressBar
        theme={theme}
        percent={progress.percent}
        color={commitment.color}
        style={{ marginTop: 12 }}
      />

      {!compact && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: progress.movedToday ? theme.colors.success : theme.colors.border,
            }}
          />
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
            {progress.movedToday ? 'Moved forward today' : 'No movement today'}
          </Text>
        </View>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ goal card */

export function GoalCard({ theme, goal, progress, commitment, onPress }) {
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(goal.color, 0.14),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 17 }}>{goal.icon}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text }}
          >
            {goal.title}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 }}>
            {commitment ? `${commitment.icon} ${commitment.title}` : 'Standalone goal'}
            {goal.targetDate ? `  ·  by ${formatShortDate(goal.targetDate)}` : ''}
          </Text>
        </View>
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: goal.color }}>
          {progress.percent}%
        </Text>
      </View>
      <ProgressBar theme={theme} percent={progress.percent} color={goal.color} style={{ marginTop: 12 }} height={6} />
      {!!progress.milestones.length && (
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 8 }}>
          {progress.milestones.filter((m) => m.done).length}/{progress.milestones.length} milestones
        </Text>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- milestone row */

export function MilestoneRow({ theme, milestone, onToggle, onPress, color }) {
  const tint = color || theme.colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          marginRight: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: milestone.done ? tint : theme.colors.border,
          backgroundColor: milestone.done ? tint : 'transparent',
        }}
      >
        {milestone.done && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.7}>
        <Text
          style={{
            fontSize: theme.fontSize.md,
            color: milestone.done ? theme.colors.textTertiary : theme.colors.text,
            textDecorationLine: milestone.done ? 'line-through' : 'none',
          }}
        >
          {milestone.title}
        </Text>
        {!!milestone.targetDate && (
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 }}>
            by {formatShortDate(milestone.targetDate)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export const cardStyles = StyleSheet.create({});
