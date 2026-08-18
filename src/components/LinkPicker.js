import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { withAlpha } from '../theme';
import { Field } from './ui';

/** Chips that toggle on and off - the one control used everywhere things link. */
export function MultiSelect({ theme, options, values, onChange, emptyHint }) {
  if (!options.length) {
    return (
      <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
        {emptyHint}
      </Text>
    );
  }
  const selected = new Set(values || []);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = selected.has(opt.id);
        const tint = opt.color || theme.colors.primary;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync();
              const next = new Set(selected);
              if (next.has(opt.id)) next.delete(opt.id);
              else next.add(opt.id);
              onChange([...next]);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              backgroundColor: active ? withAlpha(tint, 0.14) : theme.colors.inputBg,
              borderColor: active ? tint : theme.colors.border,
            }}
          >
            {!!opt.icon && <Text style={{ fontSize: 13, marginRight: 6 }}>{opt.icon}</Text>}
            <Text
              numberOfLines={1}
              style={{
                fontSize: theme.fontSize.sm,
                maxWidth: 190,
                fontWeight: active ? '600' : '500',
                color: active ? tint : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
            {active && (
              <Text style={{ fontSize: 12, marginLeft: 6, color: tint, fontWeight: '700' }}>✓</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SingleSelect({ theme, options, value, onChange, allowNone = true, noneLabel = 'None' }) {
  const all = allowNone ? [{ id: null, label: noneLabel }, ...options] : options;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {all.map((opt) => {
        const active = value === opt.id;
        const tint = opt.color || theme.colors.primary;
        return (
          <TouchableOpacity
            key={String(opt.id)}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.id);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              backgroundColor: active ? withAlpha(tint, 0.14) : theme.colors.inputBg,
              borderColor: active ? tint : theme.colors.border,
            }}
          >
            {!!opt.icon && <Text style={{ fontSize: 13, marginRight: 6 }}>{opt.icon}</Text>}
            <Text
              numberOfLines={1}
              style={{
                fontSize: theme.fontSize.sm,
                maxWidth: 190,
                fontWeight: active ? '600' : '500',
                color: active ? tint : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * The connection editor shared by tasks, habits and challenges. Linking is what
 * turns a list of chores into a system, so it is one control, in one place,
 * with the same behaviour everywhere.
 */
export function ConnectionsFields({ theme, state, links, onChange, show = ['commitments', 'goals', 'challenges'] }) {
  const commitmentOptions = state.commitments
    .filter((c) => c.status !== 'archived')
    .map((c) => ({ id: c.id, label: c.title, icon: c.icon, color: c.color }));
  const goalOptions = state.goals.map((g) => ({
    id: g.id,
    label: g.title,
    icon: g.icon,
    color: g.color,
  }));
  const challengeOptions = state.challenges.map((c) => ({
    id: c.id,
    label: c.name,
    icon: c.icon,
    color: c.color,
  }));

  return (
    <View>
      {show.includes('commitments') && (
        <Field theme={theme} label="Supports commitments">
          <MultiSelect
            theme={theme}
            options={commitmentOptions}
            values={links.commitmentIds}
            onChange={(ids) => onChange({ commitmentIds: ids })}
            emptyHint="No commitments yet - create one in Journey."
          />
        </Field>
      )}
      {show.includes('goals') && (
        <Field theme={theme} label="Contributes to goals">
          <MultiSelect
            theme={theme}
            options={goalOptions}
            values={links.goalIds}
            onChange={(ids) => onChange({ goalIds: ids })}
            emptyHint="No goals yet."
          />
        </Field>
      )}
      {show.includes('challenges') && (
        <Field theme={theme} label="Counts toward challenges">
          <MultiSelect
            theme={theme}
            options={challengeOptions}
            values={links.challengeIds}
            onChange={(ids) => onChange({ challengeIds: ids })}
            emptyHint="No challenges yet."
          />
        </Field>
      )}
    </View>
  );
}

/** A compact read-only summary of what an item feeds into. */
export function ConnectionSummary({ theme, state, links, style, onPress }) {
  const names = [];
  for (const id of links.commitmentIds || []) {
    const c = state.commitments.find((x) => x.id === id);
    if (c) names.push({ icon: c.icon, label: c.title, color: c.color });
  }
  for (const id of links.goalIds || []) {
    const g = state.goals.find((x) => x.id === id);
    if (g) names.push({ icon: g.icon, label: g.title, color: g.color });
  }
  for (const id of links.challengeIds || []) {
    const c = state.challenges.find((x) => x.id === id);
    if (c) names.push({ icon: c.icon, label: c.name, color: c.color });
  }
  if (!names.length) return null;

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
      {names.slice(0, 3).map((n, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 7,
            backgroundColor: withAlpha(n.color || theme.colors.primary, 0.12),
          }}
        >
          <Text style={{ fontSize: 9, marginRight: 4 }}>{n.icon}</Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              maxWidth: 120,
              fontWeight: '600',
              color: n.color || theme.colors.primary,
            }}
          >
            {n.label}
          </Text>
        </View>
      ))}
      {names.length > 3 && (
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary, alignSelf: 'center' }}>
          +{names.length - 3}
        </Text>
      )}
    </View>
  );
}
