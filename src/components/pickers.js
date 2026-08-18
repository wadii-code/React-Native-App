import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { withAlpha } from '../theme';
import { startOfToday, addDays, formatFullDate, formatTime, startOfDay } from '../utils';

/**
 * Date and time pickers built from presets and a nudge row.
 *
 * A native date picker would mean another dependency; presets cover the cases
 * people actually use, and the stepper reaches any other date in a few taps.
 */
export function DateChoice({ theme, value, onChange, allowNone = true, presets, label }) {
  const options = presets || [
    { label: 'Today', get: () => startOfToday() },
    { label: 'Tomorrow', get: () => addDays(startOfToday(), 1) },
    { label: 'In 3 days', get: () => addDays(startOfToday(), 3) },
    { label: 'Next week', get: () => addDays(startOfToday(), 7) },
    { label: '1 month', get: () => addDays(startOfToday(), 30) },
    { label: '3 months', get: () => addDays(startOfToday(), 90) },
  ];

  const nudge = (days) => {
    Haptics.selectionAsync();
    onChange(addDays(value || startOfToday(), days));
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {allowNone && (
          <PickerChip
            theme={theme}
            label="None"
            active={!value}
            onPress={() => onChange(null)}
          />
        )}
        {options.map((opt) => {
          const ts = opt.get();
          const active = value != null && startOfDay(value) === startOfDay(ts);
          return (
            <PickerChip
              key={opt.label}
              theme={theme}
              label={opt.label}
              active={active}
              onPress={() => onChange(ts)}
            />
          );
        })}
      </ScrollView>

      {value != null && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            backgroundColor: theme.colors.inputBg,
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        >
          <Stepper theme={theme} label="-7d" onPress={() => nudge(-7)} />
          <Stepper theme={theme} label="-1d" onPress={() => nudge(-1)} />
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: theme.fontSize.sm,
              fontWeight: '600',
              color: theme.colors.text,
            }}
          >
            {formatFullDate(value)}
          </Text>
          <Stepper theme={theme} label="+1d" onPress={() => nudge(1)} />
          <Stepper theme={theme} label="+7d" onPress={() => nudge(7)} />
        </View>
      )}
      {!!label && (
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 6 }}>
          {label}
        </Text>
      )}
    </View>
  );
}

export function TimeChoice({ theme, value, onChange, allowNone = true }) {
  const presets = [6 * 60, 7 * 60, 8 * 60, 12 * 60, 18 * 60, 20 * 60, 21 * 60];
  const nudge = (mins) => {
    Haptics.selectionAsync();
    const base = value == null ? 8 * 60 : value;
    onChange((base + mins + 1440) % 1440);
  };
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {allowNone && (
          <PickerChip theme={theme} label="None" active={value == null} onPress={() => onChange(null)} />
        )}
        {presets.map((m) => (
          <PickerChip
            key={m}
            theme={theme}
            label={formatTime(m)}
            active={value === m}
            onPress={() => onChange(m)}
          />
        ))}
      </ScrollView>
      {value != null && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            backgroundColor: theme.colors.inputBg,
            borderRadius: theme.borderRadius.md,
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        >
          <Stepper theme={theme} label="-1h" onPress={() => nudge(-60)} />
          <Stepper theme={theme} label="-15m" onPress={() => nudge(-15)} />
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: theme.fontSize.sm,
              fontWeight: '600',
              color: theme.colors.text,
            }}
          >
            {formatTime(value)}
          </Text>
          <Stepper theme={theme} label="+15m" onPress={() => nudge(15)} />
          <Stepper theme={theme} label="+1h" onPress={() => nudge(60)} />
        </View>
      )}
    </View>
  );
}

export function NumberStepper({ theme, value, onChange, min = 1, max = 99, suffix }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Stepper
        theme={theme}
        label="−"
        big
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, minWidth: 54, textAlign: 'center' }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      <Stepper theme={theme} label="+" big onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

export function IconPicker({ theme, value, onChange, choices }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {choices.map((icon) => (
        <TouchableOpacity
          key={icon}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(icon);
          }}
          activeOpacity={0.7}
          style={{
            width: 42,
            height: 42,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: value === icon ? theme.colors.primaryLight : theme.colors.inputBg,
            borderWidth: 1,
            borderColor: value === icon ? theme.colors.primary : theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 19 }}>{icon}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ColorPicker({ theme, value, onChange, choices }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {choices.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(color);
          }}
          activeOpacity={0.7}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: value === color ? 3 : 0,
            borderColor: theme.colors.surface,
            shadowColor: color,
            shadowOpacity: value === color ? 0.5 : 0,
            shadowRadius: 5,
            elevation: value === color ? 3 : 0,
          }}
        >
          {value === color && <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PickerChip({ theme, label, active, onPress, color }) {
  const tint = color || theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.75}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        backgroundColor: active ? withAlpha(tint, 0.14) : theme.colors.inputBg,
        borderColor: active ? tint : theme.colors.border,
      }}
    >
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: active ? '600' : '500',
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Stepper({ theme, label, onPress, big }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: big ? 16 : 10,
        paddingVertical: big ? 10 : 6,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text
        style={{
          fontSize: big ? 18 : theme.fontSize.xs,
          fontWeight: '700',
          color: theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export { PickerChip };
