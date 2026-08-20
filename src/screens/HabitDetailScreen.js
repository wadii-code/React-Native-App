/**
 * A habit, in detail.
 *
 * The order is the order the question gets asked: did I do it today, how am I
 * doing lately, what does the whole history look like, and what does keeping
 * this actually serve.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { withAlpha } from '../theme';
import {
  Card,
  NavBar,
  StatTile,
  ProgressBar,
  ListGroup,
  ListRow,
  Button,
  Icon,
  IconWell,
  Divider,
  FadeIn,
  useScrollY,
  useHeaderSpacer,
  useSafeArea,
  haptic,
} from '../components/ui';
import { Section, HabitCheck } from '../components/rows';
import Heatmap, { HeatLegend, WeekStrip } from '../components/Heatmap';
import { HabitEditor } from '../components/editors';
import { ConnectionSummary } from '../components/LinkPicker';
import {
  habitStats,
  habitHistory,
  habitWeekCells,
  isHabitDoneOn,
  habitAmountOn,
} from '../domain/engine';
import { scheduleLabel } from '../domain/recurrence';
import { todayKey, formatTime, formatShortDate, formatFullDate, keyToTs } from '../utils';

export default function HabitDetailScreen({ theme, params }) {
  const { state, index, actions } = useApp();
  const nav = useNav();
  const today = todayKey();
  const [editing, setEditing] = useState(false);
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const insets = useSafeArea();

  const habit = state.habits.find((h) => h.id === params.id);
  const stats = useMemo(() => (habit ? habitStats(habit, index, today) : null), [habit, index, today]);
  const history = useMemo(
    () => (habit ? habitHistory(habit, index, 119, today) : []),
    [habit, index, today]
  );
  const week = useMemo(() => (habit ? habitWeekCells(habit, index, today) : []), [habit, index, today]);

  if (!habit || !stats) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <NavBar theme={theme} title="Habit" onBack={nav.goBack} alwaysSolid compactOnly />
        <Text style={{ padding: 20, marginTop: headerSpace, ...theme.type.callout, color: theme.colors.textSecondary }}>
          This habit no longer exists.
        </Text>
      </View>
    );
  }

  const linkedTasks = state.tasks.filter((t) => t.links.habitId === habit.id);
  const linkedChallenges = state.challenges.filter((c) => c.requirements.habitIds.includes(habit.id));

  const todayLabel = stats.doneToday
    ? 'Done'
    : habit.target > 1
    ? `${stats.amountToday} of ${habit.target}${habit.unit ? ` ${habit.unit}` : ''}`
    : stats.dueToday
    ? 'Not yet'
    : 'Not scheduled';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar
        theme={theme}
        title={habit.name}
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
        {/* ------------------------------------------------- check in */}
        <FadeIn>
          <View style={{ paddingHorizontal: theme.screen, marginTop: 6 }}>
            <Card
              theme={theme}
              elevation="sm"
              tint={withAlpha(habit.color, theme.dark ? 0.11 : 0.06)}
              style={{ padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconWell theme={theme} color={withAlpha(habit.color, theme.dark ? 0.26 : 0.16)} size={46}>
                  <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
                </IconWell>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text numberOfLines={2} style={{ ...theme.type.title3, color: theme.colors.text }}>
                    {habit.name}
                  </Text>
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3 }}>
                    {scheduleLabel(habit.schedule)}
                    {habit.target > 1 ? ` · ${habit.target}${habit.unit ? ` ${habit.unit}` : ''} a day` : ''}
                    {habit.reminderTime != null ? ` · ${formatTime(habit.reminderTime)}` : ''}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 18,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: withAlpha(habit.color, 0.16),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.type.caption2, color: theme.colors.textTertiary }}>TODAY</Text>
                  <Text style={{ ...theme.type.title2, color: theme.colors.text, marginTop: 3 }}>
                    {todayLabel}
                  </Text>
                  {!!stats.period && (
                    <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 4 }}>
                      {stats.period.done}/{stats.period.target} this period
                    </Text>
                  )}
                </View>
                <HabitCheck
                  theme={theme}
                  habit={habit}
                  stats={stats}
                  size={54}
                  onCheck={() => actions.checkHabit(habit.id, habit.target || 1)}
                  onUncheck={() => actions.uncheckHabit(habit.id)}
                  onSetAmount={(amount) => actions.setHabitAmount(habit.id, amount)}
                />
              </View>

              <View style={{ marginTop: 20 }}>
                <WeekStrip theme={theme} data={week} color={habit.color} size={31} />
              </View>
            </Card>
          </View>
        </FadeIn>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: theme.screen, marginTop: 12 }}>
          <StatTile
            theme={theme}
            label="Current"
            value={`${stats.current}`}
            sub={stats.streakUnit === 'week' ? 'weeks' : 'days'}
            glyph="flame"
            color={habit.color}
          />
          <StatTile
            theme={theme}
            label="Best"
            value={`${stats.best}`}
            sub={stats.streakUnit === 'week' ? 'weeks' : 'days'}
            glyph="sparkle"
          />
          <StatTile theme={theme} label="Consistency" value={`${stats.consistency}%`} glyph="chart" />
        </View>

        {/* --------------------------------------------------- heatmap */}
        <Section theme={theme} title="History">
          <Card theme={theme}>
            <Heatmap theme={theme} data={history} color={habit.color} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 14,
              }}
            >
              <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary }}>
                {stats.completed} of {stats.expected} scheduled days
              </Text>
              <HeatLegend theme={theme} color={habit.color} />
            </View>
          </Card>
        </Section>

        {/* ---------------------------------------------- week / month */}
        <Section theme={theme} title="Rhythm">
          <Card theme={theme}>
            <PeriodRow theme={theme} label="This week" done={stats.week.done} target={stats.week.target} color={habit.color} />
            <Divider theme={theme} />
            <PeriodRow theme={theme} label="This month" done={stats.month.done} target={stats.month.target} color={habit.color} />
            <Divider theme={theme} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary }}>Total check-ins</Text>
              <Text style={{ ...theme.type.subheadEmph, color: theme.colors.text }}>
                {stats.totalCompletions}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary }}>Started</Text>
              <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary }}>
                {formatShortDate(habit.startDate)}
              </Text>
            </View>
          </Card>
        </Section>

        {/* ------------------------------------------------ connections */}
        <Section theme={theme} title="What this feeds">
          <Card theme={theme}>
            {habit.links.commitmentIds.length || habit.links.goalIds.length || linkedChallenges.length ? (
              <>
                <ConnectionSummary theme={theme} state={state} links={habit.links} />
                {linkedChallenges.map((c) => (
                  <ListRow
                    key={c.id}
                    theme={theme}
                    paddingHorizontal={0}
                    onPress={() => nav.navigate('challengeDetail', { id: c.id })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, marginRight: 9 }}>{c.icon}</Text>
                      <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>{c.name}</Text>
                      <Icon name="chevronRight" size={13} color={theme.colors.textQuaternary} weight={2} />
                    </View>
                  </ListRow>
                ))}
              </>
            ) : (
              <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, lineHeight: 20 }}>
                This habit is not connected to anything yet. Link it to a commitment or challenge so every
                check-in moves something bigger.
              </Text>
            )}
            <Button
              theme={theme}
              label="Manage connections"
              variant="plain"
              size="sm"
              onPress={() => setEditing(true)}
              style={{ marginTop: 10, paddingHorizontal: 0 }}
            />
          </Card>
        </Section>

        {!!habit.description && (
          <Section theme={theme} title="Notes">
            <Card theme={theme}>
              <Text style={{ ...theme.type.callout, color: theme.colors.textSecondary, lineHeight: 22 }}>
                {habit.description}
              </Text>
            </Card>
          </Section>
        )}

        {!!linkedTasks.length && (
          <Section theme={theme} title="Tasks tracking this habit">
            <ListGroup theme={theme} inset={16}>
              {linkedTasks.slice(0, 6).map((t) => (
                <ListRow key={t.id} theme={theme} paddingVertical={10}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      name={t.done ? 'check' : 'dot'}
                      size={14}
                      color={t.done ? theme.colors.success : theme.colors.textQuaternary}
                      weight={2.2}
                    />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: 11,
                        ...theme.type.callout,
                        color: t.done ? theme.colors.textTertiary : theme.colors.text,
                      }}
                    >
                      {t.text}
                    </Text>
                  </View>
                </ListRow>
              ))}
            </ListGroup>
          </Section>
        )}

        {/* ---------------------------------------------- recent days */}
        <Section theme={theme} title="Log the last few days">
          <ListGroup theme={theme} inset={16}>
            {history
              .slice(-7)
              .reverse()
              .map((cell) => (
                <ListRow key={cell.key} theme={theme} paddingVertical={9}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ flex: 1, ...theme.type.subhead, color: theme.colors.text }}>
                      {cell.key === today ? 'Today' : formatFullDate(keyToTs(cell.key))}
                    </Text>
                    {!cell.scheduled && (
                      <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginRight: 12 }}>
                        not scheduled
                      </Text>
                    )}
                    <DayToggle
                      theme={theme}
                      habit={habit}
                      cell={cell}
                      amount={habitAmountOn(index, habit.id, cell.key)}
                      onPress={() => {
                        haptic('light');
                        if (isHabitDoneOn(habit, index, cell.key)) actions.uncheckHabit(habit.id, cell.key);
                        else actions.checkHabit(habit.id, habit.target || 1, cell.key);
                      }}
                    />
                  </View>
                </ListRow>
              ))}
          </ListGroup>
        </Section>
      </Animated.ScrollView>

      <HabitEditor
        theme={theme}
        visible={editing}
        habit={habit}
        state={state}
        actions={actions}
        onClose={() => setEditing(false)}
        onDeleted={nav.goBack}
      />
    </View>
  );
}

/* ---------------------------------------------------------------- parts */

function PeriodRow({ theme, label, done, target, color }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary }}>{label}</Text>
        <Text style={{ ...theme.type.subheadEmph, color: theme.colors.text }}>
          {done}/{target}
        </Text>
      </View>
      <ProgressBar theme={theme} percent={target ? (done / target) * 100 : 0} color={color} height={6} />
    </View>
  );
}

function DayToggle({ theme, habit, cell, amount, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: cell.done ? habit.color : withAlpha(habit.color, theme.dark ? 0.16 : 0.09),
        borderWidth: cell.done ? 0 : 1,
        borderColor: withAlpha(habit.color, 0.3),
      }}
    >
      {cell.done ? (
        <Icon name="check" size={14} color="#FFFFFF" weight={2.2} />
      ) : amount ? (
        <Text style={{ ...theme.type.caption2, color: habit.color }}>{amount}</Text>
      ) : (
        <Icon name="plus" size={13} color={habit.color} weight={2.2} />
      )}
    </Pressable>
  );
}
