import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'journey', label: 'Journey' },
  { id: 'stats', label: 'Stats' },
];

/**
 * Icons are drawn from plain views rather than emoji so the bar stays quiet and
 * consistent. The habits icon deliberately echoes the heatmap.
 */
function TabIcon({ id, color, active }) {
  const stroke = active ? 2 : 1.6;
  switch (id) {
    case 'today':
      return (
        <View
          style={{
            width: 19,
            height: 19,
            borderRadius: 10,
            borderWidth: stroke,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? color : 'transparent' }} />
        </View>
      );
    case 'tasks':
      return (
        <View style={{ width: 19, height: 19, justifyContent: 'center' }}>
          {[15, 19, 12].map((w, i) => (
            <View
              key={i}
              style={{
                width: w,
                height: stroke,
                borderRadius: 1,
                backgroundColor: color,
                marginBottom: i < 2 ? 4 : 0,
              }}
            />
          ))}
        </View>
      );
    case 'habits':
      return (
        <View style={{ width: 19, height: 19, flexDirection: 'row', flexWrap: 'wrap' }}>
          {[0.35, 1, 0.55, 1, 0.4, 0.85, 0.7, 1, 0.45].map((o, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 1.5,
                margin: 0.75,
                backgroundColor: color,
                opacity: active ? o : o * 0.75,
              }}
            />
          ))}
        </View>
      );
    case 'journey':
      return (
        <View style={{ width: 19, height: 19, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 9,
              borderRightWidth: 9,
              borderBottomWidth: 15,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              opacity: active ? 1 : 0.85,
            }}
          />
        </View>
      );
    case 'stats':
    default:
      return (
        <View style={{ width: 19, height: 19, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          {[8, 16, 12].map((h, i) => (
            <View key={i} style={{ width: 4, height: h, borderRadius: 1.5, backgroundColor: color }} />
          ))}
        </View>
      );
  }
}

export default function TabBar({ theme, active, onChange, onQuickAdd }) {
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const color = isActive ? theme.colors.primary : theme.colors.textTertiary;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(tab.id);
            }}
          >
            <TabIcon id={tab.id} color={color} active={isActive} />
            <Text
              style={[
                styles.label,
                { color, fontWeight: isActive ? '700' : '500' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!!onQuickAdd && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onQuickAdd();
          }}
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  fab: {
    position: 'absolute',
    right: 18,
    top: -62,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '300',
    marginTop: -3,
  },
});
