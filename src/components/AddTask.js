import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Keyboard,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRIORITIES, CATEGORIES } from '../theme';
import { startOfToday, addDays } from '../utils';

const DUE_OPTIONS = [
  { id: 'none', label: 'No date', icon: '📅' },
  { id: 'today', label: 'Today', icon: '📅', getValue: () => startOfToday() },
  { id: 'tomorrow', label: 'Tomorrow', icon: '📅', getValue: () => addDays(startOfToday(), 1) },
  { id: 'nextWeek', label: 'Next week', icon: '📅', getValue: () => addDays(startOfToday(), 7) },
];

export default function AddTask({ onAdd, theme }) {
  const [text, setText] = useState('');
  const [priorityIdx, setPriorityIdx] = useState(0);
  const [categoryIdx, setCategoryIdx] = useState(-1);
  const [dueIdx, setDueIdx] = useState(0);
  const inputRef = useRef(null);

  const currentPriority = PRIORITIES[priorityIdx];
  const currentCategory = categoryIdx >= 0 ? CATEGORIES[categoryIdx] : null;
  const currentDue = DUE_OPTIONS[dueIdx];

  const cyclePriority = () => {
    Haptics.selectionAsync();
    setPriorityIdx((i) => (i + 1) % PRIORITIES.length);
  };

  const cycleCategory = () => {
    Haptics.selectionAsync();
    setCategoryIdx((i) => {
      const next = i + 1;
      return next >= CATEGORIES.length ? -1 : next;
    });
  };

  const cycleDue = () => {
    Haptics.selectionAsync();
    setDueIdx((i) => (i + 1) % DUE_OPTIONS.length);
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dueValue = currentDue.getValue ? currentDue.getValue() : null;
    onAdd(text, currentPriority.id, currentCategory?.id || null, dueValue);
    setText('');
    setPriorityIdx(0);
    setCategoryIdx(-1);
    setDueIdx(0);
    Keyboard.dismiss();
  };

  const hasOptions =
    currentPriority.id !== 'none' || currentCategory || currentDue.id !== 'none';

  return (
    <View style={[s.wrapper, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      <View style={s.inputRow}>
        <TextInput
          ref={inputRef}
          style={[s.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBg }]}
          placeholder="Add a new task..."
          placeholderTextColor={theme.colors.textTertiary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleAdd}
          style={[
            s.addBtn,
            { backgroundColor: text.trim() ? theme.colors.primary : theme.colors.chip },
          ]}
          activeOpacity={0.7}
          disabled={!text.trim()}
        >
          <Text
            style={[
              s.addBtnText,
              { color: text.trim() ? '#FFFFFF' : theme.colors.textTertiary },
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.optionsRow}
        contentContainerStyle={s.optionsContent}
      >
        <TouchableOpacity
          onPress={cyclePriority}
          style={[
            s.optionChip,
            {
              backgroundColor:
                currentPriority.id !== 'none'
                  ? currentPriority.color + '20'
                  : theme.colors.chip,
              borderColor:
                currentPriority.id !== 'none'
                  ? currentPriority.color + '40'
                  : theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              s.dot,
              { backgroundColor: currentPriority.color },
            ]}
          />
          <Text
            style={[
              s.optionText,
              {
                color:
                  currentPriority.id !== 'none'
                    ? currentPriority.color
                    : theme.colors.textSecondary,
              },
            ]}
          >
            {currentPriority.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={cycleCategory}
          style={[
            s.optionChip,
            {
              backgroundColor: currentCategory
                ? theme.colors.primaryLight
                : theme.colors.chip,
              borderColor: currentCategory
                ? theme.colors.primary + '40'
                : theme.colors.border,
            },
          ]}
        >
          <Text style={s.optionIcon}>{currentCategory ? currentCategory.icon : '📁'}</Text>
          <Text
            style={[
              s.optionText,
              { color: currentCategory ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {currentCategory ? currentCategory.label : 'Category'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={cycleDue}
          style={[
            s.optionChip,
            {
              backgroundColor:
                currentDue.id !== 'none'
                  ? theme.colors.warningLight
                  : theme.colors.chip,
              borderColor:
                currentDue.id !== 'none'
                  ? theme.colors.warning + '40'
                  : theme.colors.border,
            },
          ]}
        >
          <Text style={s.optionIcon}>📅</Text>
          <Text
            style={[
              s.optionText,
              {
                color:
                  currentDue.id !== 'none'
                    ? theme.colors.warning
                    : theme.colors.textSecondary,
              },
            ]}
          >
            {currentDue.label}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  optionsRow: {
    marginTop: 10,
  },
  optionsContent: {
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
