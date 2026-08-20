/**
 * The quick composer that lives above the tab bar on the task list.
 *
 * The options it carries are the same four as before - priority, category, due
 * date, repeat - but they no longer cycle on tap. Cycling is a pattern you only
 * meet on the web: it hides the choices, gives no way back, and cannot be
 * learned by looking. Each chip now opens a short action sheet, which shows
 * every option, marks the current one, and dismisses itself.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Keyboard, Animated, StyleSheet } from 'react-native';
import { PRIORITIES, CATEGORIES, withAlpha } from '../theme';
import { startOfToday, addDays } from '../utils';
import { Glass, useSafeArea, useKeyboardHeight } from './ui/platform';
import { ActionSheet } from './ui/sheet';
import Icon from './ui/icons';
import { haptic, PressableScale } from './ui/primitives';

const DUE_OPTIONS = [
  { id: 'none', label: 'No date', getValue: () => null },
  { id: 'today', label: 'Today', getValue: () => startOfToday() },
  { id: 'tomorrow', label: 'Tomorrow', getValue: () => addDays(startOfToday(), 1) },
  { id: 'nextWeek', label: 'Next week', getValue: () => addDays(startOfToday(), 7) },
];

const RECURRENCE_OPTIONS = [
  { id: null, label: 'No repeat' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

function OptionChip({ theme, glyph, icon, label, active, color, onPress }) {
  const tint = color || theme.colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        backgroundColor: active ? withAlpha(tint, theme.dark ? 0.22 : 0.13) : theme.colors.fill1,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? withAlpha(tint, 0.3) : theme.colors.borderLight,
      }}
    >
      {!!glyph && <Icon name={glyph} size={12} color={active ? tint : theme.colors.textTertiary} />}
      {!glyph && !!icon && <Text style={{ fontSize: 11 }}>{icon}</Text>}
      <Text
        style={{
          ...theme.type.caption,
          fontWeight: active ? '600' : '500',
          marginLeft: 5,
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export default function AddTask({ onAdd, theme, bottomOffset = 0 }) {
  const insets = useSafeArea();
  const keyboard = useKeyboardHeight();
  const [text, setText] = useState('');
  const [priorityId, setPriorityId] = useState('none');
  const [categoryId, setCategoryId] = useState(null);
  const [dueId, setDueId] = useState('none');
  const [recurrenceId, setRecurrenceId] = useState(null);
  const [sheet, setSheet] = useState(null);

  const priority = PRIORITIES.find((p) => p.id === priorityId) || PRIORITIES[0];
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const due = DUE_OPTIONS.find((d) => d.id === dueId) || DUE_OPTIONS[0];
  const recurrence = RECURRENCE_OPTIONS.find((r) => r.id === recurrenceId) || RECURRENCE_OPTIONS[0];

  const canAdd = !!text.trim();

  const handleAdd = () => {
    if (!canAdd) return;
    haptic('medium');
    onAdd(text, priority.id, category ? category.id : null, due.getValue(), '', [], recurrence.id);
    setText('');
    setPriorityId('none');
    setCategoryId(null);
    setDueId('none');
    setRecurrenceId(null);
    Keyboard.dismiss();
  };

  const sheets = {
    priority: {
      title: 'Priority',
      value: priorityId,
      options: PRIORITIES.map((p) => ({ id: p.id, label: p.label, onPress: () => setPriorityId(p.id) })),
    },
    category: {
      title: 'Category',
      value: categoryId,
      options: [
        { id: null, label: 'No category', onPress: () => setCategoryId(null) },
        ...CATEGORIES.map((c) => ({ id: c.id, label: `${c.icon}  ${c.label}`, onPress: () => setCategoryId(c.id) })),
      ],
    },
    due: {
      title: 'Due date',
      value: dueId,
      options: DUE_OPTIONS.map((d) => ({ id: d.id, label: d.label, onPress: () => setDueId(d.id) })),
    },
    repeat: {
      title: 'Repeat',
      value: recurrenceId,
      options: RECURRENCE_OPTIONS.map((r) => ({ id: r.id, label: r.label, onPress: () => setRecurrenceId(r.id) })),
    },
  };

  const active = sheet ? sheets[sheet] : null;

  return (
    <>
      {/* The bar rides the keyboard: it sits above the tab bar normally, and
       * lands directly on top of the keyboard once one is open. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomOffset,
          transform: [
            {
              translateY: keyboard.interpolate({
                inputRange: [0, bottomOffset, bottomOffset + 1000],
                outputRange: [0, 0, -1000],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        <Glass theme={theme} intensity={80}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.colors.glassHairline,
            }}
          />
          <View
            style={{
              paddingHorizontal: theme.screen,
              paddingTop: 10,
              paddingBottom: bottomOffset > 0 ? 10 : Math.max(insets.bottom, 10),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  height: 42,
                  justifyContent: 'center',
                  paddingHorizontal: 14,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.fill2,
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Add a task"
                  placeholderTextColor={theme.colors.textTertiary}
                  selectionColor={theme.colors.primary}
                  onSubmitEditing={handleAdd}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  style={{ padding: 0, ...theme.type.callout, color: theme.colors.text }}
                />
              </View>
              <PressableScale
                onPress={handleAdd}
                disabled={!canAdd}
                scaleTo={0.9}
                feedback={null}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: theme.radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canAdd ? theme.colors.primary : theme.colors.fill2,
                }}
              >
                <Icon
                  name="plus"
                  size={19}
                  color={canAdd ? '#FFFFFF' : theme.colors.textTertiary}
                  weight={2.4}
                />
              </PressableScale>
            </View>

            <View style={{ flexDirection: 'row', gap: 7, marginTop: 9 }}>
              <OptionChip
                theme={theme}
                glyph="dot"
                label={priority.id === 'none' ? 'Priority' : priority.label}
                active={priority.id !== 'none'}
                color={priority.color}
                onPress={() => setSheet('priority')}
              />
              <OptionChip
                theme={theme}
                icon={category ? category.icon : null}
                glyph={category ? null : 'folder'}
                label={category ? category.label : 'Category'}
                active={!!category}
                onPress={() => setSheet('category')}
              />
              <OptionChip
                theme={theme}
                glyph="calendar"
                label={due.id === 'none' ? 'Date' : due.label}
                active={due.id !== 'none'}
                color={theme.colors.warning}
                onPress={() => setSheet('due')}
              />
              <OptionChip
                theme={theme}
                glyph="repeat"
                label={recurrence.id ? recurrence.label : 'Repeat'}
                active={!!recurrence.id}
                color={theme.colors.success}
                onPress={() => setSheet('repeat')}
              />
            </View>
          </View>
        </Glass>
      </Animated.View>

      <ActionSheet
        theme={theme}
        visible={!!active}
        onClose={() => setSheet(null)}
        title={active ? active.title : ''}
        value={active ? active.value : null}
        options={active ? active.options : []}
      />
    </>
  );
}

/** How tall the composer is, so the list underneath can clear it. */
export const COMPOSER_HEIGHT = 104;

const styles = StyleSheet.create({});
