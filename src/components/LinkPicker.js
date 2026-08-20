/**
 * Linking is what turns a list of chores into a system, so it is one control,
 * in one place, with the same behaviour everywhere: chips that toggle, and a
 * compact read-only summary of what a thing feeds.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { withAlpha } from '../theme';
import { Field } from './ui';
import { PressableScale } from './ui/primitives';
import Icon from './ui/icons';

/* ---------------------------------------------------------------- select */

function SelectChip({ theme, option, active, onPress }) {
  const tint = option.color || theme.colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        backgroundColor: active ? withAlpha(tint, theme.dark ? 0.2 : 0.11) : theme.colors.fill1,
        borderColor: active ? withAlpha(tint, 0.55) : 'transparent',
      }}
    >
      {!!option.icon && <Text style={{ fontSize: 14, marginRight: 7 }}>{option.icon}</Text>}
      <Text
        numberOfLines={1}
        style={{
          ...theme.type.subhead,
          maxWidth: 190,
          fontWeight: active ? '600' : '500',
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {option.label}
      </Text>
      {active && <Icon name="check" size={13} color={tint} weight={2.4} style={{ marginLeft: 7 }} />}
    </PressableScale>
  );
}

export function MultiSelect({ theme, options, values, onChange, emptyHint }) {
  if (!options.length) {
    return (
      <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary }}>{emptyHint}</Text>
    );
  }
  const selected = new Set(values || []);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => (
        <SelectChip
          key={opt.id}
          theme={theme}
          option={opt}
          active={selected.has(opt.id)}
          onPress={() => {
            const next = new Set(selected);
            if (next.has(opt.id)) next.delete(opt.id);
            else next.add(opt.id);
            onChange([...next]);
          }}
        />
      ))}
    </View>
  );
}

export function SingleSelect({ theme, options, value, onChange, allowNone = true, noneLabel = 'None' }) {
  const all = allowNone ? [{ id: null, label: noneLabel }, ...options] : options;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {all.map((opt) => (
        <SelectChip
          key={String(opt.id)}
          theme={theme}
          option={opt}
          active={value === opt.id}
          onPress={() => onChange(opt.id)}
        />
      ))}
    </View>
  );
}

/* ----------------------------------------------------------- connections */

/**
 * The connection editor shared by tasks, habits and challenges.
 */
export function ConnectionsFields({
  theme,
  state,
  links,
  onChange,
  show = ['commitments', 'goals', 'challenges'],
}) {
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
            emptyHint="No commitments yet — create one in Journey."
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
export function ConnectionSummary({ theme, state, links, style }) {
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
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }, style]}>
      {names.slice(0, 3).map((n, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: theme.radius.xs,
            backgroundColor: withAlpha(n.color || theme.colors.primary, theme.dark ? 0.18 : 0.1),
          }}
        >
          <Text style={{ fontSize: 9, marginRight: 4 }}>{n.icon}</Text>
          <Text
            numberOfLines={1}
            style={{
              ...theme.type.caption2,
              maxWidth: 120,
              color: n.color || theme.colors.primary,
            }}
          >
            {n.label}
          </Text>
        </View>
      ))}
      {names.length > 3 && (
        <Text style={{ ...theme.type.caption2, fontWeight: '500', color: theme.colors.textTertiary }}>
          +{names.length - 3}
        </Text>
      )}
    </View>
  );
}

export const linkStyles = StyleSheet.create({});
