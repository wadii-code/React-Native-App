import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList,
  Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRIORITIES, CATEGORIES } from '../theme';
import { startOfToday, addDays } from '../utils';

const DUE_OPTIONS = [
  { id: 'none', label: 'None', getValue: () => null },
  { id: 'today', label: 'Today', getValue: () => startOfToday() },
  { id: 'tomorrow', label: 'Tomorrow', getValue: () => addDays(startOfToday(), 1) },
  { id: 'nextWeek', label: 'Next week', getValue: () => addDays(startOfToday(), 7) },
];

const RECURRENCE_OPTIONS = [
  { id: null, label: 'None' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

function getDueId(dueDate) {
  if (!dueDate) return 'none';
  const today = startOfToday();
  if (dueDate === today) return 'today';
  if (dueDate === today + 86400000) return 'tomorrow';
  if (dueDate === today + 7 * 86400000) return 'nextWeek';
  return 'none';
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export default function EditModal({ task, onSave, onDelete, onClose, theme }) {
  const [text, setText] = useState('');
  const [priorityId, setPriorityId] = useState('none');
  const [categoryId, setCategoryId] = useState(null);
  const [dueId, setDueId] = useState('none');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [recurrenceId, setRecurrenceId] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);
  const focusTimer = useRef(null);
  const subtaskInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  useEffect(() => {
    if (task) {
      setText(task.text);
      setPriorityId(task.priority || 'none');
      setCategoryId(task.category || null);
      setDueId(getDueId(task.dueDate));
      setNotes(task.notes || '');
      setSubtasks(task.subtasks ? [...task.subtasks] : []);
      setRecurrenceId(task.recurrence || null);
      setExpandedSection(null);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        focusTimer.current = setTimeout(() => inputRef.current?.focus(), 300);
      });
    } else {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [task]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSave = () => {
    if (!task || !text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dueOpt = DUE_OPTIONS.find((d) => d.id === dueId);
    onSave(task.id, {
      text: text.trim(),
      priority: priorityId,
      category: categoryId,
      dueDate: dueOpt ? dueOpt.getValue() : null,
      notes,
      subtasks,
      recurrence: recurrenceId,
    });
    handleClose();
  };

  const handleDelete = () => {
    if (!task) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(task.id);
    handleClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    Haptics.selectionAsync();
    setSubtasks((prev) => [
      ...prev,
      { id: generateId(), text: newSubtaskText.trim(), done: false },
    ]);
    setNewSubtaskText('');
  };

  const handleToggleSubtask = (subtaskId) => {
    Haptics.selectionAsync();
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st))
    );
  };

  const handleDeleteSubtask = (subtaskId) => {
    Haptics.selectionAsync();
    setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
  };

  const toggleSection = (section) => {
    Haptics.selectionAsync();
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  if (!task) return null;

  const completedSubtasks = subtasks.filter((st) => st.done).length;

  return (
    <Modal visible={!!task} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={s.backdropTouch} onPress={handleClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={s.handle} />
          <Text style={[s.sheetTitle, { color: theme.colors.text }]}>Edit Task</Text>

          <TextInput
            ref={inputRef}
            style={[s.textInput, { color: theme.colors.text, backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border }]}
            value={text}
            onChangeText={setText}
            placeholder="Task name"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Priority</Text>
            <View style={s.row}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => { Haptics.selectionAsync(); setPriorityId(p.id); }}
                  style={[
                    s.selectBtn,
                    {
                      backgroundColor:
                        priorityId === p.id ? p.color + '20' : theme.colors.inputBg,
                      borderColor: priorityId === p.id ? p.color : theme.colors.border,
                    },
                  ]}
                >
                  <View style={[s.dot, { backgroundColor: p.color }]} />
                  <Text
                    style={[
                      s.selectText,
                      {
                        color: priorityId === p.id ? p.color : theme.colors.textSecondary,
                        fontWeight: priorityId === p.id ? '600' : '400',
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setCategoryId(null); }}
                style={[
                  s.catBtn,
                  {
                    backgroundColor: !categoryId ? theme.colors.primaryLight : theme.colors.inputBg,
                    borderColor: !categoryId ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    s.catText,
                    { color: !categoryId ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { Haptics.selectionAsync(); setCategoryId(c.id); }}
                  style={[
                    s.catBtn,
                    {
                      backgroundColor:
                        categoryId === c.id ? theme.colors.primaryLight : theme.colors.inputBg,
                      borderColor: categoryId === c.id ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={s.catIcon}>{c.icon}</Text>
                  <Text
                    style={[
                      s.catText,
                      {
                        color: categoryId === c.id ? theme.colors.primary : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Due Date</Text>
            <View style={s.row}>
              {DUE_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { Haptics.selectionAsync(); setDueId(d.id); }}
                  style={[
                    s.selectBtn,
                    {
                      backgroundColor:
                        dueId === d.id ? theme.colors.warningLight : theme.colors.inputBg,
                      borderColor: dueId === d.id ? theme.colors.warning : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.selectText,
                      {
                        color: dueId === d.id ? theme.colors.warning : theme.colors.textSecondary,
                        fontWeight: dueId === d.id ? '600' : '400',
                      },
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => toggleSection('recurrence')}
              style={[s.sectionToggle, { backgroundColor: theme.colors.inputBg }]}
            >
              <Text style={[s.sectionToggleText, { color: theme.colors.text }]}>
                ↻ Recurrence {recurrenceId ? `(${RECURRENCE_OPTIONS.find((r) => r.id === recurrenceId)?.label})` : ''}
              </Text>
              <Text style={[s.sectionToggleArrow, { color: theme.colors.textSecondary }]}>
                {expandedSection === 'recurrence' ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'recurrence' && (
              <View style={s.row}>
                {RECURRENCE_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.id || 'none'}
                    onPress={() => { Haptics.selectionAsync(); setRecurrenceId(r.id); }}
                    style={[
                      s.selectBtn,
                      {
                        backgroundColor:
                          recurrenceId === r.id ? theme.colors.primaryLight : theme.colors.inputBg,
                        borderColor: recurrenceId === r.id ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.selectText,
                        {
                          color: recurrenceId === r.id ? theme.colors.primary : theme.colors.textSecondary,
                          fontWeight: recurrenceId === r.id ? '600' : '400',
                        },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => toggleSection('notes')}
              style={[s.sectionToggle, { backgroundColor: theme.colors.inputBg }]}
            >
              <Text style={[s.sectionToggleText, { color: theme.colors.text }]}>
                📝 Notes {notes ? '(has content)' : ''}
              </Text>
              <Text style={[s.sectionToggleArrow, { color: theme.colors.textSecondary }]}>
                {expandedSection === 'notes' ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'notes' && (
              <TextInput
                style={[s.notesInput, { color: theme.colors.text, backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            <TouchableOpacity
              onPress={() => toggleSection('subtasks')}
              style={[s.sectionToggle, { backgroundColor: theme.colors.inputBg }]}
            >
              <Text style={[s.sectionToggleText, { color: theme.colors.text }]}>
                ☑ Subtasks {subtasks.length > 0 ? `(${completedSubtasks}/${subtasks.length})` : ''}
              </Text>
              <Text style={[s.sectionToggleArrow, { color: theme.colors.textSecondary }]}>
                {expandedSection === 'subtasks' ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
            {expandedSection === 'subtasks' && (
              <View>
                {subtasks.map((st) => (
                  <View key={st.id} style={[s.subtaskRow, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity
                      onPress={() => handleToggleSubtask(st.id)}
                      style={[
                        s.subtaskCheckbox,
                        {
                          borderColor: st.done ? theme.colors.success : theme.colors.border,
                          backgroundColor: st.done ? theme.colors.success : 'transparent',
                        },
                      ]}
                    >
                       {st.done && <Text style={s.checkmarkSmall}>✓</Text>}
                    </TouchableOpacity>
                    <Text
                      style={[
                        s.subtaskText,
                        {
                          color: st.done ? theme.colors.textTertiary : theme.colors.text,
                          textDecorationLine: st.done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {st.text}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteSubtask(st.id)}>
                      <Text style={[s.subtaskDelete, { color: theme.colors.danger }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={s.addSubtaskRow}>
                  <TextInput
                    ref={subtaskInputRef}
                    style={[s.subtaskInput, { color: theme.colors.text, backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border }]}
                    value={newSubtaskText}
                    onChangeText={setNewSubtaskText}
                    placeholder="Add subtask..."
                    placeholderTextColor={theme.colors.textTertiary}
                    returnKeyType="done"
                    onSubmitEditing={handleAddSubtask}
                  />
                  <TouchableOpacity
                    onPress={handleAddSubtask}
                    style={[s.addSubtaskBtn, { backgroundColor: newSubtaskText.trim() ? theme.colors.primary : theme.colors.chip }]}
                    disabled={!newSubtaskText.trim()}
                  >
                    <Text style={[s.addSubtaskBtnText, { color: newSubtaskText.trim() ? '#FFF' : theme.colors.textTertiary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity
              onPress={handleDelete}
              style={[s.deleteBtn, { backgroundColor: theme.colors.dangerLight }]}
            >
              <Text style={[s.deleteBtnText, { color: theme.colors.danger }]}>Delete</Text>
            </TouchableOpacity>
            <View style={s.rightActions}>
              <TouchableOpacity
                onPress={handleClose}
                style={[s.cancelBtn, { backgroundColor: theme.colors.inputBg }]}
              >
                <Text style={[s.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[s.saveBtn, { backgroundColor: text.trim() ? theme.colors.primary : theme.colors.chip }]}
                disabled={!text.trim()}
              >
                <Text
                  style={[
                    s.saveBtnText,
                    { color: text.trim() ? '#FFF' : theme.colors.textTertiary },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  catScroll: {
    marginBottom: 16,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  catIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  catText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionToggleArrow: {
    fontSize: 14,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 100,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
  },
  subtaskDelete: {
    fontSize: 14,
    fontWeight: '600',
    paddingLeft: 10,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  subtaskInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addSubtaskBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubtaskBtnText: {
    fontSize: 20,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkmarkSmall: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
