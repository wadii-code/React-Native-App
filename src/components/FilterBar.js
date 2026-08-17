import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { id: 'created', label: 'Created', icon: '🕐' },
  { id: 'dueDate', label: 'Due Date', icon: '📅' },
  { id: 'priority', label: 'Priority', icon: '🔴' },
  { id: 'alpha', label: 'A-Z', icon: '🔤' },
];

export default function FilterBar({ theme, filter, setFilter, stats, sortBy, setSortBy }) {
  const s = styles(theme);

  const getCount = (id) => {
    if (id === 'all') return stats.total;
    if (id === 'active') return stats.active;
    return stats.completed;
  };

  return (
    <View style={s.container}>
      <View style={s.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = getCount(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.id);
                }}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f.label}
                </Text>
                <Text style={[s.chipCount, active && s.chipCountActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sortRow} contentContainerStyle={s.sortRowContent}>
        <Text style={[s.sortLabel, { color: theme.colors.textTertiary }]}>Sort:</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = sortBy === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSortBy(opt.id);
              }}
              style={[s.sortChip, active && s.sortChipActive]}
              activeOpacity={0.7}
            >
              <Text style={s.sortIcon}>{opt.icon}</Text>
              <Text style={[s.sortText, active && s.sortTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.xl,
      paddingVertical: t.spacing.sm,
    },
    filterRow: {
      marginBottom: t.spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderRadius: t.borderRadius.pill,
      backgroundColor: t.colors.chip,
      marginRight: t.spacing.sm,
    },
    chipActive: {
      backgroundColor: t.colors.chipActive,
    },
    chipText: {
      fontSize: t.fontSize.sm,
      fontWeight: '500',
      color: t.colors.textSecondary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    chipCount: {
      fontSize: t.fontSize.xs,
      fontWeight: '600',
      color: t.colors.textTertiary,
      marginLeft: t.spacing.xs,
      backgroundColor: t.colors.background,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    chipCountActive: {
      color: t.colors.primary,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    sortRow: {
      marginTop: t.spacing.xs,
    },
    sortRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sortLabel: {
      fontSize: t.fontSize.xs,
      fontWeight: '600',
      marginRight: t.spacing.sm,
    },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.xs,
      borderRadius: t.borderRadius.sm,
      backgroundColor: t.colors.chip,
      marginRight: t.spacing.xs,
    },
    sortChipActive: {
      backgroundColor: t.colors.primaryLight,
      borderWidth: 1,
      borderColor: t.colors.primary + '40',
    },
    sortIcon: {
      fontSize: 11,
      marginRight: 4,
    },
    sortText: {
      fontSize: t.fontSize.xs,
      fontWeight: '500',
      color: t.colors.textSecondary,
    },
    sortTextActive: {
      color: t.colors.primary,
    },
  });
