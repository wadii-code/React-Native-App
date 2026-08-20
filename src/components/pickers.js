/**
 * Date, time, number, icon and colour pickers built from presets and a nudge
 * row.
 *
 * A native date picker would mean another dependency and a native rebuild;
 * presets cover the cases people actually use, and the stepper reaches any
 * other date in a few taps. What changed in the redesign is the shape - the
 * presets are pills you can read at a glance, and the value you are editing is
 * shown as a sentence, not as a number squeezed between two arrows.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { withAlpha } from '../theme';
import { PressableScale, haptic } from './ui/primitives';
import { StepButton } from './ui/controls';
import Icon from './ui/icons';
import { startOfToday, addDays, formatFullDate, formatTime, startOfDay } from '../utils';

/* ------------------------------------------------------------------ date */

export function DateChoice({ theme, value, onChange, allowNone = true, presets, label }) {
  const options = presets || [
    { label: 'Today', get: () => startOfToday() },
    { label: 'Tomorrow', get: () => addDays(startOfToday(), 1) },
    { label: 'In 3 days', get: () => addDays(startOfToday(), 3) },
    { label: 'Next week', get: () => addDays(startOfToday(), 7) },
    { label: '1 month', get: () => addDays(startOfToday(), 30) },
    { label: '3 months', get: () => addDays(startOfToday(), 90) },
  ];

  const nudge = (days) => onChange(addDays(value || startOfToday(), days));

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {allowNone && (
          <PickerChip theme={theme} label="None" active={!value} onPress={() => onChange(null)} />
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
            marginTop: 12,
            backgroundColor: theme.colors.fill1,
            borderRadius: theme.radius.md,
            padding: 7,
            gap: 6,
          }}
        >
          <StepButton theme={theme} label="−7d" onPress={() => nudge(-7)} />
          <StepButton theme={theme} label="−1d" onPress={() => nudge(-1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ ...theme.type.footnoteEmph, color: theme.colors.text }}>
              {formatFullDate(value)}
            </Text>
          </View>
          <StepButton theme={theme} label="+1d" onPress={() => nudge(1)} />
          <StepButton theme={theme} label="+7d" onPress={() => nudge(7)} />
        </View>
      )}
      {!!label && (
        <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 7 }}>
          {label}
        </Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ time */

export function TimeChoice({ theme, value, onChange, allowNone = true }) {
  const presets = [6 * 60, 7 * 60, 8 * 60, 12 * 60, 18 * 60, 20 * 60, 21 * 60];
  const nudge = (mins) => {
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
            marginTop: 12,
            backgroundColor: theme.colors.fill1,
            borderRadius: theme.radius.md,
            padding: 7,
            gap: 6,
          }}
        >
          <StepButton theme={theme} label="−1h" onPress={() => nudge(-60)} />
          <StepButton theme={theme} label="−15m" onPress={() => nudge(-15)} />
          <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
            <Icon name="clock" size={13} color={theme.colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.text }}>{formatTime(value)}</Text>
          </View>
          <StepButton theme={theme} label="+15m" onPress={() => nudge(15)} />
          <StepButton theme={theme} label="+1h" onPress={() => nudge(60)} />
        </View>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- number */

export function NumberStepper({ theme, value, onChange, min = 1, max = 99, suffix }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <StepButton theme={theme} glyph="minus" big onPress={() => onChange(Math.max(min, value - 1))} />
      <Text
        style={{
          ...theme.type.title3,
          color: theme.colors.text,
          minWidth: 62,
          textAlign: 'center',
        }}
      >
        {value}
        {suffix ? <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>{` ${suffix}`}</Text> : null}
      </Text>
      <StepButton theme={theme} glyph="plus" big onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

/* ------------------------------------------------------------------ icon */

export function IconPicker({ theme, value, onChange, choices }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {choices.map((icon) => (
        <PressableScale
          key={icon}
          onPress={() => onChange(icon)}
          scaleTo={0.88}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              value === icon ? withAlpha(theme.colors.primary, theme.dark ? 0.24 : 0.13) : theme.colors.fill1,
            borderWidth: 1.5,
            borderColor: value === icon ? theme.colors.primary : 'transparent',
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------------- colour */

export function ColorPicker({ theme, value, onChange, choices }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {choices.map((color) => {
        const active = value === color;
        return (
          <PressableScale
            key={color}
            onPress={() => onChange(color)}
            scaleTo={0.86}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              // The selected swatch gets a ring of the page colour then the
              // colour itself, which reads as "lifted" without a shadow.
              borderWidth: active ? 3 : 0,
              borderColor: theme.colors.surface,
              backgroundColor: color,
              ...(active
                ? {
                    shadowColor: color,
                    shadowOpacity: 0.55,
                    shadowRadius: 7,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  }
                : null),
            }}
          >
            {active && <Icon name="check" size={15} color="#FFFFFF" weight={2.4} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ chip */

export function PickerChip({ theme, label, active, onPress, color }) {
  const tint = color || theme.colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: theme.radius.sm,
        borderWidth: 1.5,
        backgroundColor: active ? withAlpha(tint, theme.dark ? 0.22 : 0.12) : theme.colors.fill1,
        borderColor: active ? withAlpha(tint, 0.55) : 'transparent',
      }}
    >
      <Text
        style={{
          ...theme.type.footnoteEmph,
          fontWeight: active ? '600' : '500',
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export const pickerStyles = StyleSheet.create({});
