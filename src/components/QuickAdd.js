/**
 * One button creates anything.
 *
 * The typed line is parsed as you go, but parsing never gets the last word: the
 * type selector and the detail fields are always visible and always manual, so
 * a wrong guess costs one tap rather than a wrong record.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sheet, TextField, Field, Chip, SheetActions } from './ui';
import { DateChoice } from './pickers';
import { SingleSelect } from './LinkPicker';
import { parseQuickAdd } from '../domain/nlp';
import { scheduleLabel } from '../domain/recurrence';
import { PRIORITIES, withAlpha } from '../theme';
import { startOfToday, formatTime } from '../utils';

const TYPES = [
  { id: 'task', label: 'Task', icon: '☑', hint: 'Something to do' },
  { id: 'habit', label: 'Habit', icon: '🔁', hint: 'Something to repeat' },
  { id: 'challenge', label: 'Challenge', icon: '🔥', hint: 'A push with an end date' },
  { id: 'goal', label: 'Goal', icon: '🎯', hint: 'Where you want to get to' },
  { id: 'commitment', label: 'Commitment', icon: '🌱', hint: 'What you are becoming' },
];

const EXAMPLES = [
  'Study German every day at 7 PM',
  'Finish portfolio by September 15',
  '30 day coding challenge starting Monday',
  'Gym 4 times a week',
];

export default function QuickAdd({ theme, visible, state, actions, onClose, initial, onCreated }) {
  const [text, setText] = useState('');
  const [typeOverride, setTypeOverride] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [priority, setPriority] = useState('none');
  const [commitmentId, setCommitmentId] = useState(null);
  const [touchedDate, setTouchedDate] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(initial?.text || '');
    setTypeOverride(initial?.type || null);
    setDueDate(null);
    setPriority('none');
    setCommitmentId(initial?.commitmentId || null);
    setTouchedDate(false);
  }, [visible, initial]);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const type = typeOverride || parsed.type;

  // Parsed values feed the manual fields until the user edits them.
  const effectiveDate = touchedDate ? dueDate : parsed.dueDate || parsed.startDate;
  const effectivePriority = priority !== 'none' ? priority : parsed.priority;

  const title = parsed.title || text.trim();
  const canCreate = title.length > 0;

  const create = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const links = commitmentId
      ? { commitmentIds: [commitmentId], goalIds: [], challengeIds: [], milestoneIds: [] }
      : undefined;

    switch (type) {
      case 'habit':
        actions.addHabit({
          name: title,
          schedule: parsed.schedule || { type: 'daily' },
          reminderTime: parsed.dueTime,
          startDate: effectiveDate || startOfToday(),
          links,
        });
        break;
      case 'challenge':
        actions.addChallenge({
          name: title,
          startDate: parsed.startDate || effectiveDate || startOfToday(),
          durationDays: parsed.durationDays || 30,
          links,
        });
        break;
      case 'goal':
        actions.addGoal({ title, targetDate: effectiveDate, commitmentId });
        break;
      case 'commitment':
        actions.addCommitment({ title, targetDate: effectiveDate });
        break;
      case 'task':
      default:
        actions.addTask({
          text: title,
          dueDate: effectiveDate,
          dueTime: parsed.dueTime,
          priority: effectivePriority,
          labels: parsed.labels,
          recurrence: parsed.recurrence,
          links,
        });
        break;
    }
    onClose();
    if (onCreated) onCreated(type);
  };

  const typeMeta = TYPES.find((t) => t.id === type);

  return (
    <Sheet theme={theme} visible={visible} onClose={onClose} title="Quick add">
      <TextField
        theme={theme}
        value={text}
        onChangeText={setText}
        placeholder="What do you want to add?"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
        style={{ fontSize: theme.fontSize.lg, minHeight: 52 }}
      />

      {!!parsed.chips.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {parsed.chips.map((chip, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 7,
                backgroundColor: withAlpha(theme.colors.primary, 0.12),
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.colors.primary }}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!text.trim() && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginBottom: 8 }}>
            Try typing:
          </Text>
          {EXAMPLES.map((ex) => (
            <TouchableOpacity
              key={ex}
              onPress={() => {
                Haptics.selectionAsync();
                setText(ex);
              }}
              activeOpacity={0.7}
              style={{
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.inputBg,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                {ex}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.colors.textSecondary,
            marginBottom: 8,
          }}
        >
          Create as
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TYPES.map((t) => (
            <Chip
              key={t.id}
              theme={theme}
              label={t.label}
              icon={t.icon}
              active={type === t.id}
              onPress={() => setTypeOverride(t.id)}
            />
          ))}
        </ScrollView>
        {!!typeMeta && (
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 8 }}>
            {typeMeta.hint}
            {type === 'habit' && parsed.schedule ? ` · ${scheduleLabel(parsed.schedule)}` : ''}
            {type === 'habit' && parsed.dueTime != null ? ` · reminder ${formatTime(parsed.dueTime)}` : ''}
            {type === 'challenge' ? ` · ${parsed.durationDays || 30} days` : ''}
          </Text>
        )}
      </View>

      <View style={{ height: 18 }} />

      {(type === 'task' || type === 'goal' || type === 'commitment') && (
        <Field theme={theme} label={type === 'task' ? 'Due' : 'Target date'}>
          <DateChoice
            theme={theme}
            value={effectiveDate}
            onChange={(v) => {
              setTouchedDate(true);
              setDueDate(v);
            }}
          />
        </Field>
      )}

      {type === 'challenge' && (
        <Field theme={theme} label="Starts">
          <DateChoice
            theme={theme}
            value={effectiveDate || startOfToday()}
            onChange={(v) => {
              setTouchedDate(true);
              setDueDate(v);
            }}
            allowNone={false}
          />
        </Field>
      )}

      {type === 'task' && (
        <Field theme={theme} label="Priority">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRIORITIES.map((p) => (
              <Chip
                key={p.id}
                theme={theme}
                label={p.label}
                active={effectivePriority === p.id}
                color={p.color}
                onPress={() => setPriority(p.id)}
              />
            ))}
          </View>
        </Field>
      )}

      {type !== 'commitment' && state.commitments.length > 0 && (
        <Field theme={theme} label="Serves commitment" hint="Link it now and it starts counting immediately.">
          <SingleSelect
            theme={theme}
            options={state.commitments
              .filter((c) => c.status === 'active')
              .map((c) => ({ id: c.id, label: c.title, icon: c.icon, color: c.color }))}
            value={commitmentId}
            onChange={setCommitmentId}
            noneLabel="Not linked"
          />
        </Field>
      )}

      <SheetActions
        theme={theme}
        onCancel={onClose}
        onConfirm={create}
        confirmLabel={`Add ${typeMeta ? typeMeta.label.toLowerCase() : 'item'}`}
        disabled={!canCreate}
      />
    </Sheet>
  );
}
