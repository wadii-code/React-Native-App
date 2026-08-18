/**
 * Create/edit sheets for habits, commitments, goals and challenges.
 *
 * They share one layout so learning any one of them teaches the others, and
 * every editor ends with the same "what does this serve?" connection block -
 * the habit of linking is built into the act of creating.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Sheet,
  SheetActions,
  Field,
  TextField,
  OptionRow,
  Chip,
  Divider,
} from './ui';
import { MultiSelect, SingleSelect, ConnectionsFields } from './LinkPicker';
import { DateChoice, TimeChoice, NumberStepper, IconPicker, ColorPicker } from './pickers';
import { ENTITY_COLORS, ICON_CHOICES, HABIT_CATEGORIES, withAlpha } from '../theme';
import { SCHEDULE_TYPES, WEEKDAYS, normalizeSchedule, scheduleLabel } from '../domain/recurrence';
import { DIFFICULTIES } from '../domain/schema';
import { startOfToday, addDays, formatShortDate } from '../utils';

/* ---------------------------------------------------------------- habits */

export function HabitEditor({ theme, visible, habit, state, actions, onClose, onDeleted, presets }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const base = habit || {};
    setForm({
      name: base.name || presets?.name || '',
      description: base.description || '',
      icon: base.icon || '\u{1F3AF}',
      color: base.color || ENTITY_COLORS[0],
      category: base.category || null,
      schedule: normalizeSchedule(base.schedule || presets?.schedule),
      target: base.target || 1,
      unit: base.unit || '',
      startDate: base.startDate || startOfToday(),
      endDate: base.endDate || null,
      reminderTime: base.reminderTime ?? presets?.reminderTime ?? null,
      links: base.links || { commitmentIds: [], goalIds: [], challengeIds: [], milestoneIds: [] },
    });
  }, [visible, habit, presets]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setSchedule = (patch) => setForm((f) => ({ ...f, schedule: { ...f.schedule, ...patch } }));

  const save = () => {
    if (!form.name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = { ...form, name: form.name.trim() };
    if (habit) actions.editHabit(habit.id, payload);
    else actions.addHabit(payload);
    onClose();
  };

  const remove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    actions.deleteHabit(habit.id);
    onClose();
    if (onDeleted) onDeleted();
  };

  return (
    <Sheet theme={theme} visible={visible} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      <Field theme={theme} label="Habit">
        <TextField
          theme={theme}
          value={form.name}
          onChangeText={(name) => set({ name })}
          placeholder="Read 20 minutes"
          autoFocus={!habit}
        />
      </Field>

      <Field theme={theme} label="Icon">
        <IconPicker theme={theme} value={form.icon} onChange={(icon) => set({ icon })} choices={ICON_CHOICES} />
      </Field>

      <Field theme={theme} label="Colour">
        <ColorPicker theme={theme} value={form.color} onChange={(color) => set({ color })} choices={ENTITY_COLORS} />
      </Field>

      <Field theme={theme} label="Frequency" hint={scheduleLabel(form.schedule)}>
        <OptionRow
          theme={theme}
          options={SCHEDULE_TYPES}
          value={form.schedule.type}
          onChange={(type) => setSchedule({ type })}
        />
        {form.schedule.type === 'specificDays' && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {WEEKDAYS.map((day) => {
              const active = form.schedule.days.includes(day.id);
              return (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const days = active
                      ? form.schedule.days.filter((d) => d !== day.id)
                      : [...form.schedule.days, day.id];
                    setSchedule({ days });
                  }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: theme.borderRadius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? withAlpha(form.color, 0.16) : theme.colors.inputBg,
                    borderWidth: 1,
                    borderColor: active ? form.color : theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: active ? '700' : '500',
                      color: active ? form.color : theme.colors.textSecondary,
                    }}
                  >
                    {day.letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {(form.schedule.type === 'timesPerWeek' || form.schedule.type === 'timesPerMonth') && (
          <View style={{ marginTop: 12 }}>
            <NumberStepper
              theme={theme}
              value={form.schedule.times}
              onChange={(times) => setSchedule({ times })}
              min={1}
              max={form.schedule.type === 'timesPerWeek' ? 7 : 31}
              suffix="×"
            />
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 8 }}>
              Missing one day will not break your streak - only the period counts.
            </Text>
          </View>
        )}
        {form.schedule.type === 'everyNDays' && (
          <View style={{ marginTop: 12 }}>
            <NumberStepper
              theme={theme}
              value={form.schedule.interval}
              onChange={(interval) => setSchedule({ interval })}
              min={2}
              max={30}
              suffix="days"
            />
          </View>
        )}
      </Field>

      <Field theme={theme} label="Daily target" hint="How much counts as done for one day.">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <NumberStepper theme={theme} value={form.target} onChange={(target) => set({ target })} min={1} max={50} />
          <TextField
            theme={theme}
            value={form.unit}
            onChangeText={(unit) => set({ unit })}
            placeholder="unit (L, pages…)"
            style={{ flex: 1 }}
          />
        </View>
      </Field>

      <Field theme={theme} label="Category">
        <SingleSelect
          theme={theme}
          options={HABIT_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon }))}
          value={form.category}
          onChange={(category) => set({ category })}
        />
      </Field>

      <Field theme={theme} label="Reminder">
        <TimeChoice theme={theme} value={form.reminderTime} onChange={(reminderTime) => set({ reminderTime })} />
      </Field>

      <Field theme={theme} label="Start date">
        <DateChoice theme={theme} value={form.startDate} onChange={(startDate) => set({ startDate })} allowNone={false} />
      </Field>

      <Field theme={theme} label="End date (optional)">
        <DateChoice theme={theme} value={form.endDate} onChange={(endDate) => set({ endDate })} />
      </Field>

      <Field theme={theme} label="Notes">
        <TextField
          theme={theme}
          multiline
          value={form.description}
          onChangeText={(description) => set({ description })}
          placeholder="Why this habit matters…"
        />
      </Field>

      <Divider theme={theme} />
      <ConnectionsFields
        theme={theme}
        state={state}
        links={form.links}
        onChange={(patch) => set({ links: { ...form.links, ...patch } })}
      />

      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={save}
        confirmLabel={habit ? 'Save habit' : 'Create habit'}
        disabled={!form.name.trim()}
        onDelete={habit ? remove : undefined}
      />
    </Sheet>
  );
}

/* ----------------------------------------------------------- commitments */

export function CommitmentEditor({ theme, visible, commitment, actions, onClose, onDeleted, presets }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const base = commitment || {};
    setForm({
      title: base.title || presets?.title || '',
      why: base.why || '',
      description: base.description || '',
      icon: base.icon || '\u{1F331}',
      color: base.color || ENTITY_COLORS[0],
      startDate: base.startDate || startOfToday(),
      targetDate: base.targetDate || null,
      status: base.status || 'active',
    });
  }, [visible, commitment, presets]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (commitment) actions.editCommitment(commitment.id, { ...form, title: form.title.trim() });
    else actions.addCommitment({ ...form, title: form.title.trim() });
    onClose();
  };

  return (
    <Sheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      title={commitment ? 'Edit commitment' : 'New commitment'}
    >
      <Field theme={theme} label="I am committed to">
        <TextField
          theme={theme}
          value={form.title}
          onChangeText={(title) => set({ title })}
          placeholder="Becoming physically fit"
          autoFocus={!commitment}
        />
      </Field>

      <Field theme={theme} label="Why it matters" hint="Read this on the days you do not feel like it.">
        <TextField
          theme={theme}
          multiline
          value={form.why}
          onChangeText={(why) => set({ why })}
          placeholder="Because I want energy for the things I care about."
        />
      </Field>

      <Field theme={theme} label="Icon">
        <IconPicker theme={theme} value={form.icon} onChange={(icon) => set({ icon })} choices={ICON_CHOICES} />
      </Field>

      <Field theme={theme} label="Colour">
        <ColorPicker theme={theme} value={form.color} onChange={(color) => set({ color })} choices={ENTITY_COLORS} />
      </Field>

      <Field theme={theme} label="Target date (optional)">
        <DateChoice
          theme={theme}
          value={form.targetDate}
          onChange={(targetDate) => set({ targetDate })}
          presets={[
            { label: '1 month', get: () => addDays(startOfToday(), 30) },
            { label: '3 months', get: () => addDays(startOfToday(), 90) },
            { label: '6 months', get: () => addDays(startOfToday(), 180) },
            { label: '1 year', get: () => addDays(startOfToday(), 365) },
          ]}
        />
      </Field>

      {!!commitment && (
        <Field theme={theme} label="Status">
          <OptionRow
            theme={theme}
            options={[
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'achieved', label: 'Achieved', color: theme.colors.success },
              { id: 'archived', label: 'Archived' },
            ]}
            value={form.status}
            onChange={(status) => set({ status, achievedAt: status === 'achieved' ? Date.now() : null })}
          />
        </Field>
      )}

      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={save}
        confirmLabel={commitment ? 'Save' : 'Create commitment'}
        disabled={!form.title.trim()}
        onDelete={
          commitment
            ? () => {
                actions.deleteCommitment(commitment.id);
                onClose();
                if (onDeleted) onDeleted();
              }
            : undefined
        }
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ goals */

export function GoalEditor({ theme, visible, goal, state, actions, onClose, onDeleted, presets }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const base = goal || {};
    setForm({
      title: base.title || presets?.title || '',
      description: base.description || '',
      icon: base.icon || '\u{1F3AF}',
      color: base.color || ENTITY_COLORS[1],
      commitmentId: base.commitmentId || presets?.commitmentId || null,
      targetDate: base.targetDate || null,
      status: base.status || 'active',
      metric: base.metric || { type: 'milestones', target: 0, current: 0, unit: '' },
    });
  }, [visible, goal, presets]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setMetric = (patch) => setForm((f) => ({ ...f, metric: { ...f.metric, ...patch } }));

  const save = () => {
    if (!form.title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (goal) actions.editGoal(goal.id, { ...form, title: form.title.trim() });
    else actions.addGoal({ ...form, title: form.title.trim() });
    onClose();
  };

  return (
    <Sheet theme={theme} visible={visible} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <Field theme={theme} label="Goal">
        <TextField
          theme={theme}
          value={form.title}
          onChangeText={(title) => set({ title })}
          placeholder="Build a portfolio"
          autoFocus={!goal}
        />
      </Field>

      <Field theme={theme} label="Part of commitment">
        <SingleSelect
          theme={theme}
          options={state.commitments.map((c) => ({ id: c.id, label: c.title, icon: c.icon, color: c.color }))}
          value={form.commitmentId}
          onChange={(commitmentId) => set({ commitmentId })}
          noneLabel="Standalone"
        />
      </Field>

      <Field theme={theme} label="How progress is measured">
        <OptionRow
          theme={theme}
          options={[
            { id: 'milestones', label: 'Milestones & linked work' },
            { id: 'count', label: 'A number I count' },
          ]}
          value={form.metric.type}
          onChange={(type) => setMetric({ type })}
        />
        {form.metric.type === 'count' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
            <NumberStepper
              theme={theme}
              value={form.metric.target || 1}
              onChange={(target) => setMetric({ target })}
              min={1}
              max={999}
            />
            <TextField
              theme={theme}
              value={form.metric.unit}
              onChangeText={(unit) => setMetric({ unit })}
              placeholder="applications, books…"
              style={{ flex: 1 }}
            />
          </View>
        )}
      </Field>

      <Field theme={theme} label="Icon">
        <IconPicker theme={theme} value={form.icon} onChange={(icon) => set({ icon })} choices={ICON_CHOICES} />
      </Field>

      <Field theme={theme} label="Colour">
        <ColorPicker theme={theme} value={form.color} onChange={(color) => set({ color })} choices={ENTITY_COLORS} />
      </Field>

      <Field theme={theme} label="Target date">
        <DateChoice theme={theme} value={form.targetDate} onChange={(targetDate) => set({ targetDate })} />
      </Field>

      <Field theme={theme} label="Notes">
        <TextField
          theme={theme}
          multiline
          value={form.description}
          onChangeText={(description) => set({ description })}
          placeholder="What does done look like?"
        />
      </Field>

      {!!goal && (
        <Field theme={theme} label="Status">
          <OptionRow
            theme={theme}
            options={[
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'achieved', label: 'Achieved', color: theme.colors.success },
            ]}
            value={form.status}
            onChange={(status) => set({ status, achievedAt: status === 'achieved' ? Date.now() : null })}
          />
        </Field>
      )}

      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={save}
        confirmLabel={goal ? 'Save' : 'Create goal'}
        disabled={!form.title.trim()}
        onDelete={
          goal
            ? () => {
                actions.deleteGoal(goal.id);
                onClose();
                if (onDeleted) onDeleted();
              }
            : undefined
        }
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------- challenges */

const DURATION_PRESETS = [7, 21, 30, 60, 100];

export function ChallengeEditor({ theme, visible, challenge, state, actions, onClose, onDeleted, presets }) {
  const [form, setForm] = useState(null);
  const [ruleDraft, setRuleDraft] = useState('');

  useEffect(() => {
    if (!visible) return;
    const base = challenge || {};
    setForm({
      name: base.name || presets?.name || '',
      description: base.description || '',
      icon: base.icon || '\u{1F525}',
      color: base.color || ENTITY_COLORS[5],
      difficulty: base.difficulty || 'medium',
      goalText: base.goalText || '',
      rules: base.rules ? [...base.rules] : [],
      startDate: base.startDate || presets?.startDate || startOfToday(),
      durationDays: base.durationDays || presets?.durationDays || 30,
      allowedSkips: base.allowedSkips || 0,
      reward: base.reward || '',
      requirements: base.requirements
        ? { ...base.requirements }
        : { habitIds: [], taskIds: [], minPerDay: 0 },
      links: base.links ||
        presets?.links || { commitmentIds: [], goalIds: [], challengeIds: [], milestoneIds: [] },
    });
    setRuleDraft('');
  }, [visible, challenge, presets]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (challenge) actions.editChallenge(challenge.id, { ...form, name: form.name.trim() });
    else actions.addChallenge({ ...form, name: form.name.trim() });
    onClose();
  };

  const endDate = addDays(form.startDate, Math.max(1, form.durationDays) - 1);
  const habitOptions = state.habits
    .filter((h) => !h.archived)
    .map((h) => ({ id: h.id, label: h.name, icon: h.icon, color: h.color }));
  const openTasks = state.tasks
    .filter((t) => !t.done)
    .slice(0, 40)
    .map((t) => ({ id: t.id, label: t.text }));

  return (
    <Sheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      title={challenge ? 'Edit challenge' : 'New challenge'}
    >
      <Field theme={theme} label="Challenge">
        <TextField
          theme={theme}
          value={form.name}
          onChangeText={(name) => set({ name })}
          placeholder="30 Days of Coding"
          autoFocus={!challenge}
        />
      </Field>

      <Field theme={theme} label="Duration" hint={`${formatShortDate(form.startDate)} → ${formatShortDate(endDate)}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {DURATION_PRESETS.map((d) => (
            <Chip
              key={d}
              theme={theme}
              label={`${d} days`}
              active={form.durationDays === d}
              onPress={() => set({ durationDays: d })}
              color={form.color}
            />
          ))}
        </View>
        <NumberStepper
          theme={theme}
          value={form.durationDays}
          onChange={(durationDays) => set({ durationDays })}
          min={1}
          max={365}
          suffix="days"
        />
      </Field>

      <Field theme={theme} label="Starts">
        <DateChoice theme={theme} value={form.startDate} onChange={(startDate) => set({ startDate })} allowNone={false} />
      </Field>

      <Field
        theme={theme}
        label="Daily requirement"
        hint="Pick habits you already track - the challenge reads their check-ins, so nothing is logged twice."
      >
        <MultiSelect
          theme={theme}
          options={habitOptions}
          values={form.requirements.habitIds}
          onChange={(habitIds) => set({ requirements: { ...form.requirements, habitIds } })}
          emptyHint="Create a habit first, then link it here."
        />
      </Field>

      {form.requirements.habitIds.length > 1 && (
        <Field theme={theme} label="How many per day" hint="0 means every linked habit is required.">
          <NumberStepper
            theme={theme}
            value={form.requirements.minPerDay}
            onChange={(minPerDay) => set({ requirements: { ...form.requirements, minPerDay } })}
            min={0}
            max={form.requirements.habitIds.length}
          />
        </Field>
      )}

      <Field theme={theme} label="Tasks that count" hint="One-off work that belongs to this challenge.">
        <MultiSelect
          theme={theme}
          options={openTasks}
          values={form.requirements.taskIds}
          onChange={(taskIds) => set({ requirements: { ...form.requirements, taskIds } })}
          emptyHint="No open tasks to attach."
        />
      </Field>

      <Field theme={theme} label="Difficulty">
        <OptionRow
          theme={theme}
          options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label, color: d.color, dot: true }))}
          value={form.difficulty}
          onChange={(difficulty) => set({ difficulty })}
        />
      </Field>

      <Field theme={theme} label="Rest days allowed" hint="Days you can miss before the challenge is marked failed.">
        <NumberStepper
          theme={theme}
          value={form.allowedSkips}
          onChange={(allowedSkips) => set({ allowedSkips })}
          min={0}
          max={30}
        />
      </Field>

      <Field theme={theme} label="Rules">
        {form.rules.map((rule, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.inputBg,
              borderRadius: theme.borderRadius.sm,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 8,
            }}
          >
            <Text style={{ flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.text }}>
              {rule}
            </Text>
            <TouchableOpacity
              onPress={() => set({ rules: form.rules.filter((_, idx) => idx !== i) })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextField
            theme={theme}
            value={ruleDraft}
            onChangeText={setRuleDraft}
            placeholder="No social media before noon"
            style={{ flex: 1 }}
            onSubmitEditing={() => {
              if (!ruleDraft.trim()) return;
              set({ rules: [...form.rules, ruleDraft.trim()] });
              setRuleDraft('');
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (!ruleDraft.trim()) return;
              Haptics.selectionAsync();
              set({ rules: [...form.rules, ruleDraft.trim()] });
              setRuleDraft('');
            }}
            style={{
              width: 46,
              borderRadius: theme.borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ruleDraft.trim() ? theme.colors.primary : theme.colors.chip,
            }}
          >
            <Text style={{ fontSize: 22, color: ruleDraft.trim() ? '#FFF' : theme.colors.textTertiary }}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </Field>

      <Field theme={theme} label="Reward" hint="What you get when you finish.">
        <TextField
          theme={theme}
          value={form.reward}
          onChangeText={(reward) => set({ reward })}
          placeholder="A weekend off, guilt-free"
        />
      </Field>

      <Field theme={theme} label="Icon">
        <IconPicker theme={theme} value={form.icon} onChange={(icon) => set({ icon })} choices={ICON_CHOICES} />
      </Field>

      <Field theme={theme} label="Colour">
        <ColorPicker theme={theme} value={form.color} onChange={(color) => set({ color })} choices={ENTITY_COLORS} />
      </Field>

      <Divider theme={theme} />
      <ConnectionsFields
        theme={theme}
        state={state}
        links={form.links}
        onChange={(patch) => set({ links: { ...form.links, ...patch } })}
        show={['commitments', 'goals']}
      />

      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={save}
        confirmLabel={challenge ? 'Save' : 'Start challenge'}
        disabled={!form.name.trim()}
        onDelete={
          challenge
            ? () => {
                actions.deleteChallenge(challenge.id);
                onClose();
                if (onDeleted) onDeleted();
              }
            : undefined
        }
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------- milestones */

export function MilestoneEditor({ theme, visible, parentType, parentId, milestone, actions, onClose }) {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(milestone?.title || '');
    setTargetDate(milestone?.targetDate || null);
  }, [visible, milestone]);

  const save = () => {
    if (!title.trim()) return;
    Haptics.selectionAsync();
    if (milestone) actions.editMilestone(milestone.id, { title: title.trim(), targetDate });
    else actions.addMilestone({ title: title.trim(), targetDate, parentType, parentId });
    onClose();
  };

  return (
    <Sheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      title={milestone ? 'Edit milestone' : 'New milestone'}
      maxHeight="70%"
    >
      <Field theme={theme} label="Milestone">
        <TextField
          theme={theme}
          value={title}
          onChangeText={setTitle}
          placeholder="Finish the React course"
          autoFocus
        />
      </Field>
      <Field theme={theme} label="Target date">
        <DateChoice theme={theme} value={targetDate} onChange={setTargetDate} />
      </Field>
      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={save}
        confirmLabel={milestone ? 'Save' : 'Add milestone'}
        disabled={!title.trim()}
        onDelete={
          milestone
            ? () => {
                actions.deleteMilestone(milestone.id);
                onClose();
              }
            : undefined
        }
      />
    </Sheet>
  );
}
