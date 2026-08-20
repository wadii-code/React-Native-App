/**
 * The cards that represent each kind of thing in lists.
 *
 * They share a silhouette on purpose - a coloured well, a name, one line of
 * truth, and progress - so the eye learns the shape once and reads every list
 * in the app with it. What differs is the *progress*, because that is the only
 * thing genuinely different between a habit, a challenge and a commitment:
 *
 *   habit       a grid of days: am I consistent?
 *   challenge   a track of days: how far into the run am I?
 *   commitment  a single bar: how much of the whole thing is done?
 *   goal        a bar plus its milestones
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { withAlpha } from '../theme';
import { ProgressBar, Card, StreakPill, Checkbox, Icon, ListRow, IconWell } from './ui';
import { ConnectionSummary } from './LinkPicker';
import { MiniGrid, WeekStrip } from './Heatmap';
import { HabitCheck } from './rows';
import { scheduleLabel } from '../domain/recurrence';
import { formatShortDate } from '../utils';

/** The old name for the check control, kept so detail screens keep working. */
export const HabitCheckButton = HabitCheck;

/* ----------------------------------------------------------- habit card */

export function HabitCard({
  theme,
  habit,
  stats,
  week,
  history,
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
        <IconWell theme={theme} color={withAlpha(habit.color, theme.dark ? 0.2 : 0.12)} size={42}>
          <Text style={{ fontSize: 20 }}>{habit.icon}</Text>
        </IconWell>

        <View style={{ flex: 1, paddingRight: 10, marginLeft: 12 }}>
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text }}>
            {habit.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
              {scheduleLabel(habit.schedule)}
            </Text>
            {stats.current > 0 && (
              <StreakPill
                theme={theme}
                count={stats.current}
                unit={stats.streakUnit === 'week' ? 'w' : 'd'}
                color={habit.color}
                size="sm"
              />
            )}
          </View>
        </View>

        <HabitCheck
          theme={theme}
          habit={habit}
          stats={stats}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onSetAmount={onSetAmount}
        />
      </View>

      {!compact && (history || week) && (
        <View style={{ marginTop: 16 }}>
          {history ? (
            <MiniGrid theme={theme} data={history} color={habit.color} weeks={11} cellSize={9} gap={3.5} />
          ) : (
            <WeekStrip theme={theme} data={week} color={habit.color} size={28} />
          )}
        </View>
      )}

      {!compact && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.separator,
            gap: 18,
          }}
        >
          <MiniStat theme={theme} label="Best" value={`${stats.best}`} />
          <MiniStat theme={theme} label="Consistency" value={`${stats.consistency}%`} tint={habit.color} />
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

function MiniStat({ theme, label, value, tint }) {
  return (
    <View>
      <Text style={{ ...theme.type.caption2, color: theme.colors.textTertiary, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ ...theme.type.subheadEmph, color: tint || theme.colors.text, marginTop: 2 }}>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.radius.xs,
        backgroundColor: withAlpha(style.color, theme.dark ? 0.2 : 0.12),
      }}
    >
      <View
        style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: style.color, marginRight: 5 }}
      />
      <Text style={{ ...theme.type.caption2, color: style.color }}>{style.label.toUpperCase()}</Text>
    </View>
  );
}

/**
 * The run, one mark per day.
 *
 * This is what makes day 1, day 7 and day 30 feel like different places: the
 * track fills left to right, missed days stay visible as gaps, and today is
 * outlined so you can see exactly where you are standing. Long challenges fall
 * back to a plain bar, because a hundred two-pixel marks say nothing.
 */
export function DayTrack({ theme, dayMap, today, color, height = 7, gap = 2.5, max = 45 }) {
  if (!dayMap || !dayMap.length || dayMap.length > max) return null;
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {dayMap.map((day) => {
        const missed = !day.done && !day.future && day.key !== today;
        return (
          <View
            key={day.key}
            style={{
              flex: 1,
              height,
              borderRadius: height / 2,
              backgroundColor: day.done
                ? color
                : missed
                ? withAlpha(theme.colors.danger, theme.dark ? 0.3 : 0.18)
                : theme.colors.track,
              borderWidth: day.key === today ? 1.4 : 0,
              borderColor: withAlpha(color, 0.9),
            }}
          />
        );
      })}
    </View>
  );
}

export function ChallengeCard({ theme, challenge, stats, state, onPress, today }) {
  const track = stats.hasDaily && stats.dayMap.length && stats.dayMap.length <= 45;
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconWell theme={theme} color={withAlpha(challenge.color, theme.dark ? 0.2 : 0.12)} size={42}>
          <Text style={{ fontSize: 20 }}>{challenge.icon}</Text>
        </IconWell>
        <View style={{ flex: 1, paddingRight: 8, marginLeft: 12 }}>
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text }}>
            {challenge.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
              {stats.status === 'upcoming'
                ? `Starts ${formatShortDate(challenge.startDate)}`
                : `Day ${stats.dayIndex} of ${stats.totalDays}`}
            </Text>
            {stats.streak > 0 && (
              <StreakPill theme={theme} count={stats.streak} color={challenge.color} size="sm" />
            )}
          </View>
        </View>
        <StatusBadge theme={theme} status={stats.status} />
      </View>

      <View style={{ marginTop: 16 }}>
        {track ? (
          <DayTrack theme={theme} dayMap={stats.dayMap} today={today} color={challenge.color} />
        ) : (
          <ProgressBar theme={theme} percent={stats.percent} color={challenge.color} height={7} />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
            {stats.hasDaily
              ? `${stats.daysComplete} of ${stats.totalDays} days cleared`
              : `${stats.tasksDone} of ${stats.tasks.length} tasks done`}
          </Text>
          <Text style={{ ...theme.type.caption, fontWeight: '700', color: challenge.color }}>
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
        <IconWell theme={theme} color={withAlpha(commitment.color, theme.dark ? 0.2 : 0.12)} size={42}>
          <Text style={{ fontSize: 20 }}>{commitment.icon}</Text>
        </IconWell>
        <View style={{ flex: 1, paddingRight: 8, marginLeft: 12 }}>
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text }}>
            {commitment.title}
          </Text>
          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 4 }}>
            {progress.goals.length} goals · {progress.habits.length} habits ·{' '}
            {progress.challenges.length} challenges
          </Text>
        </View>
        <Text style={{ ...theme.type.title3, color: commitment.color }}>{progress.percent}%</Text>
      </View>

      <ProgressBar
        theme={theme}
        percent={progress.percent}
        color={commitment.color}
        height={7}
        style={{ marginTop: 14 }}
      />

      {!compact && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 7 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: progress.movedToday ? theme.colors.success : theme.colors.textQuaternary,
            }}
          />
          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
            {progress.movedToday ? 'Moved forward today' : 'No movement today'}
          </Text>
        </View>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ goal card */

export function GoalCard({ theme, goal, progress, commitment, onPress }) {
  const doneMilestones = progress.milestones.filter((m) => m.done).length;
  return (
    <Card theme={theme} style={{ marginBottom: 10 }} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconWell theme={theme} color={withAlpha(goal.color, theme.dark ? 0.2 : 0.12)} size={38} radius={12}>
          <Text style={{ fontSize: 18 }}>{goal.icon}</Text>
        </IconWell>
        <View style={{ flex: 1, paddingRight: 8, marginLeft: 12 }}>
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text }}>
            {goal.title}
          </Text>
          <Text numberOfLines={1} style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3 }}>
            {commitment ? `${commitment.icon} ${commitment.title}` : 'Standalone goal'}
            {goal.targetDate ? `  ·  by ${formatShortDate(goal.targetDate)}` : ''}
          </Text>
        </View>
        <Text style={{ ...theme.type.subheadEmph, color: goal.color }}>{progress.percent}%</Text>
      </View>

      <ProgressBar
        theme={theme}
        percent={progress.percent}
        color={goal.color}
        style={{ marginTop: 14 }}
        height={6}
      />

      {!!progress.milestones.length && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5 }}>
          {progress.milestones.slice(0, 8).map((m) => (
            <View
              key={m.id}
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: m.done ? goal.color : theme.colors.track,
              }}
            />
          ))}
          <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginLeft: 4 }}>
            {doneMilestones}/{progress.milestones.length} milestones
          </Text>
        </View>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- milestone row */

export function MilestoneRow({ theme, milestone, onToggle, onPress, color }) {
  const tint = color || theme.colors.primary;
  return (
    <ListRow theme={theme} onPress={onPress} paddingHorizontal={0} paddingVertical={11}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Checkbox theme={theme} checked={milestone.done} color={tint} size={22} radius={7} onPress={onToggle} />
        <View style={{ flex: 1, marginLeft: 13 }}>
          <Text
            style={{
              ...theme.type.callout,
              color: milestone.done ? theme.colors.textTertiary : theme.colors.text,
              textDecorationLine: milestone.done ? 'line-through' : 'none',
            }}
          >
            {milestone.title}
          </Text>
          {!!milestone.targetDate && (
            <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 2 }}>
              by {formatShortDate(milestone.targetDate)}
            </Text>
          )}
        </View>
        {!!onPress && <Icon name="chevronRight" size={13} color={theme.colors.textQuaternary} weight={2} />}
      </View>
    </ListRow>
  );
}

export const cardStyles = StyleSheet.create({});
