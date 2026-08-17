import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function Header({ theme, isDark, onToggleTheme, stats, onToggleSelectionMode }) {
  const s = styles(theme);
  return (
    <View style={s.container}>
      <View style={s.row}>
        <TouchableOpacity
          onLongPress={() => {
            if (onToggleSelectionMode) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onToggleSelectionMode();
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={s.title}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleTheme}
          style={s.themeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.subtitle}>
        {stats.active === 0 && stats.completed === 0
          ? 'No tasks yet'
          : `${stats.active} active · ${stats.completed} completed`}
      </Text>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.xl,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: t.fontSize.xxxl,
      fontWeight: '700',
      color: t.colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: t.fontSize.sm,
      color: t.colors.textSecondary,
      marginTop: t.spacing.xs,
    },
    themeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.colors.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIcon: {
      fontSize: 18,
    },
  });
