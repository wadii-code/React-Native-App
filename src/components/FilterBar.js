import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export default function FilterBar({ theme, filter, setFilter, stats }) {
  const s = styles(theme);

  const getCount = (id) => {
    if (id === 'all') return stats.total;
    if (id === 'active') return stats.active;
    return stats.completed;
  };

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = getCount(f.id);
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
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
  );
}

const styles = (t) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.xl,
      paddingVertical: t.spacing.sm,
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
  });
