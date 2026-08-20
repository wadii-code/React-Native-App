/**
 * The task editor.
 *
 * Everything a task can carry is here, but almost none of it is on screen at
 * once: name, priority, category and dates are always visible because they are
 * always used, and repeat, connections, project, notes and subtasks live behind
 * disclosure rows that remember nothing and cost nothing to open.
 *
 * Presented as an iOS sheet - drag it down to dismiss, Cancel and Save in the
 * header where the thumb expects them.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Animated, LayoutAnimation, StyleSheet } from 'react-native';
import { PRIORITIES, CATEGORIES, withAlpha } from '../theme';
import { DateChoice, TimeChoice } from './pickers';
import { ConnectionsFields, SingleSelect } from './LinkPicker';
import { RECURRENCE_PRESETS, normalizeRecurrence, recurrenceLabel } from '../domain/recurrence';
import {
  Sheet,
  Field,
  TextField,
  Chip,
  Checkbox,
  Icon,
  Button,
  PressableScale,
  haptic,
} from './ui';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const emptyLinks = { commitmentIds: [], goalIds: [], challengeIds: [], milestoneIds: [], habitId: null };

/* ----------------------------------------------------------- disclosure */

/**
 * A row that opens a section. The chevron rotates rather than swapping glyphs,
 * which is the small difference between a control that feels made and one that
 * feels assembled.
 */
function Disclosure({ theme, glyph, label, badge, open, onPress, children }) {
  const spin = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(spin, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [open, spin]);

  return (
    <View style={{ marginBottom: 10 }}>
      <Pressable
        onPress={() => {
          haptic('selection');
          LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
          onPress();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 13,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.fill1,
        }}
      >
        <Icon name={glyph} size={16} color={theme.colors.textSecondary} />
        <Text style={{ flex: 1, marginLeft: 11, ...theme.type.callout, color: theme.colors.text }}>
          {label}
        </Text>
        {!!badge && (
          <Text style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginRight: 9 }}>
            {badge}
          </Text>
        )}
        <Animated.View
          style={{
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
            ],
          }}
        >
          <Icon name="chevronRight" size={13} color={theme.colors.textQuaternary} weight={2} />
        </Animated.View>
      </Pressable>
      {open && <View style={{ paddingTop: 14, paddingHorizontal: 2 }}>{children}</View>}
    </View>
  );
}

/* ---------------------------------------------------------------- editor */

export default function EditModal({ task, onSave, onDelete, onClose, theme, state }) {
  const [text, setText] = useState('');
  const [priorityId, setPriorityId] = useState('none');
  const [categoryId, setCategoryId] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [dueTime, setDueTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [recurrenceType, setRecurrenceType] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [labels, setLabels] = useState([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [links, setLinks] = useState(emptyLinks);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setPriorityId(task.priority || 'none');
    setCategoryId(task.category || null);
    setDueDate(task.dueDate || null);
    setDueTime(task.dueTime == null ? null : task.dueTime);
    setNotes(task.notes || '');
    setSubtasks(task.subtasks ? [...task.subtasks] : []);
    setRecurrenceType(normalizeRecurrence(task.recurrence)?.type || null);
    setProjectId(task.projectId || null);
    setLabels(task.labels ? [...task.labels] : []);
    setLinks({ ...emptyLinks, ...(task.links || {}) });
    setLabelDraft('');
    setNewSubtaskText('');
    setExpandedSection(null);
  }, [task]);

  const handleSave = () => {
    if (!task || !text.trim()) return;
    onSave(task.id, {
      text: text.trim(),
      priority: priorityId,
      category: categoryId,
      dueDate,
      dueTime,
      notes,
      subtasks,
      recurrence: recurrenceType ? { type: recurrenceType } : null,
      projectId,
      labels,
      links,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    haptic('warning');
    onDelete(task.id);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    haptic('selection');
    setSubtasks((prev) => [...prev, { id: generateId(), text: newSubtaskText.trim(), done: false }]);
    setNewSubtaskText('');
  };

  const toggleSection = (section) =>
    setExpandedSection((prev) => (prev === section ? null : section));

  if (!task) return null;

  const completedSubtasks = subtasks.filter((st) => st.done).length;
  const linkedCount =
    links.commitmentIds.length + links.goalIds.length + links.challengeIds.length + (links.habitId ? 1 : 0);
  const projects = state?.projects || [];
  const habits = state?.habits || [];

  return (
    <Sheet
      theme={theme}
      visible={!!task}
      onClose={onClose}
      title="Edit task"
      cancelLabel="Cancel"
      confirmLabel="Save"
      onConfirm={handleSave}
      confirmDisabled={!text.trim()}
      maxHeight="92%"
    >
      <TextField
        theme={theme}
        value={text}
        onChangeText={setText}
        placeholder="Task name"
        returnKeyType="done"
        style={{ ...theme.type.title3, minHeight: 54 }}
      />

      <View style={{ height: 20 }} />

      <Field theme={theme} label="Priority">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRIORITIES.map((p) => (
            <PressableScale
              key={p.id}
              onPress={() => setPriorityId(p.id)}
              scaleTo={0.94}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 11,
                borderRadius: theme.radius.sm,
                borderWidth: 1.5,
                backgroundColor:
                  priorityId === p.id ? withAlpha(p.color, theme.dark ? 0.22 : 0.12) : theme.colors.fill1,
                borderColor: priorityId === p.id ? withAlpha(p.color, 0.6) : 'transparent',
              }}
            >
              <View
                style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: p.color, marginRight: 6 }}
              />
              <Text
                style={{
                  ...theme.type.caption,
                  fontWeight: priorityId === p.id ? '700' : '500',
                  color: priorityId === p.id ? p.color : theme.colors.textSecondary,
                }}
              >
                {p.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </Field>

      <Field theme={theme} label="Category">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip theme={theme} label="None" active={!categoryId} onPress={() => setCategoryId(null)} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              theme={theme}
              label={c.label}
              icon={c.icon}
              active={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>
      </Field>

      <Field theme={theme} label="Due date">
        <DateChoice theme={theme} value={dueDate} onChange={setDueDate} />
      </Field>

      <Field theme={theme} label="Time">
        <TimeChoice theme={theme} value={dueTime} onChange={setDueTime} />
      </Field>

      {/* ------------------------------------------------------ repeat */}
      <Disclosure
        theme={theme}
        glyph="repeat"
        label="Repeat"
        badge={recurrenceType ? recurrenceLabel({ type: recurrenceType }) : null}
        open={expandedSection === 'recurrence'}
        onPress={() => toggleSection('recurrence')}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RECURRENCE_PRESETS.map((r) => (
            <Chip
              key={r.type || 'none'}
              theme={theme}
              label={r.label}
              active={recurrenceType === r.type}
              onPress={() => setRecurrenceType(r.type)}
            />
          ))}
        </View>
      </Disclosure>

      {/* ------------------------------------------------- connections */}
      <Disclosure
        theme={theme}
        glyph="target"
        label="Connections"
        badge={linkedCount ? `${linkedCount}` : null}
        open={expandedSection === 'connections'}
        onPress={() => toggleSection('connections')}
      >
        {!!state && (
          <>
            <ConnectionsFields
              theme={theme}
              state={state}
              links={links}
              onChange={(patch) => setLinks((l) => ({ ...l, ...patch }))}
            />
            <Field
              theme={theme}
              label="Track as a habit check-in"
              hint="Completing this task also checks off that habit for the day — and the other way round."
            >
              <SingleSelect
                theme={theme}
                options={habits
                  .filter((h) => !h.archived)
                  .map((h) => ({ id: h.id, label: h.name, icon: h.icon, color: h.color }))}
                value={links.habitId}
                onChange={(habitId) => setLinks((l) => ({ ...l, habitId }))}
                noneLabel="No"
              />
            </Field>
          </>
        )}
      </Disclosure>

      {/* ---------------------------------------------------- project */}
      <Disclosure
        theme={theme}
        glyph="folder"
        label="Project & labels"
        badge={labels.length ? `${labels.length} labels` : null}
        open={expandedSection === 'project'}
        onPress={() => toggleSection('project')}
      >
        <SingleSelect
          theme={theme}
          options={projects
            .filter((p) => !p.archived)
            .map((p) => ({ id: p.id, label: p.name, icon: p.icon, color: p.color }))}
          value={projectId}
          onChange={setProjectId}
          noneLabel="Inbox"
        />
        {!!labels.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
            {labels.map((label) => (
              <PressableScale
                key={label}
                onPress={() => setLabels((prev) => prev.filter((l) => l !== label))}
                scaleTo={0.92}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.fill2,
                }}
              >
                <Text style={{ ...theme.type.caption, color: theme.colors.textSecondary }}>@{label}</Text>
                <Icon name="close" size={9} color={theme.colors.textTertiary} weight={1.8} style={{ marginLeft: 6 }} />
              </PressableScale>
            ))}
          </View>
        )}
        <View style={{ marginTop: 12 }}>
          <TextField
            theme={theme}
            value={labelDraft}
            onChangeText={setLabelDraft}
            placeholder="Add a label"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => {
              const value = labelDraft.trim().replace(/^@/, '');
              if (!value || labels.includes(value)) return;
              setLabels((prev) => [...prev, value]);
              setLabelDraft('');
            }}
          />
        </View>
      </Disclosure>

      {/* ------------------------------------------------------- notes */}
      <Disclosure
        theme={theme}
        glyph="list"
        label="Notes"
        badge={notes ? 'written' : null}
        open={expandedSection === 'notes'}
        onPress={() => toggleSection('notes')}
      >
        <TextField
          theme={theme}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering"
          multiline
        />
      </Disclosure>

      {/* ---------------------------------------------------- subtasks */}
      <Disclosure
        theme={theme}
        glyph="check"
        label="Subtasks"
        badge={subtasks.length ? `${completedSubtasks}/${subtasks.length}` : null}
        open={expandedSection === 'subtasks'}
        onPress={() => toggleSection('subtasks')}
      >
        {subtasks.map((st) => (
          <View
            key={st.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 11,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.separator,
            }}
          >
            <Checkbox
              theme={theme}
              checked={st.done}
              size={20}
              color={theme.colors.success}
              onPress={() =>
                setSubtasks((prev) => prev.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))
              }
            />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                ...theme.type.callout,
                color: st.done ? theme.colors.textTertiary : theme.colors.text,
                textDecorationLine: st.done ? 'line-through' : 'none',
              }}
            >
              {st.text}
            </Text>
            <Pressable
              onPress={() => {
                haptic('selection');
                setSubtasks((prev) => prev.filter((x) => x.id !== st.id));
              }}
              hitSlop={theme.hit}
            >
              <Icon name="close" size={12} color={theme.colors.danger} weight={2} />
            </Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField
              theme={theme}
              value={newSubtaskText}
              onChangeText={setNewSubtaskText}
              placeholder="Add a subtask"
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />
          </View>
          <PressableScale
            onPress={handleAddSubtask}
            disabled={!newSubtaskText.trim()}
            scaleTo={0.9}
            style={{
              width: 46,
              height: 46,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: newSubtaskText.trim() ? theme.colors.primary : theme.colors.fill2,
            }}
          >
            <Icon
              name="plus"
              size={18}
              color={newSubtaskText.trim() ? '#FFFFFF' : theme.colors.textTertiary}
              weight={2.4}
            />
          </PressableScale>
        </View>
      </Disclosure>

      <View style={{ marginTop: 18, alignItems: 'center' }}>
        <Button
          theme={theme}
          label="Delete task"
          variant="destructive"
          glyph="trash"
          onPress={handleDelete}
        />
      </View>
    </Sheet>
  );
}
