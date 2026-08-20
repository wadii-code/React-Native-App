/**
 * The tab bar.
 *
 * Translucent, hairline-topped, and sitting on the real home-indicator inset
 * rather than a guessed 24 points. The icons are drawn, not emoji, so they take
 * the tint colour like type does; the selected one lifts and settles.
 *
 * The compose button floats above the bar rather than inside it. It is the one
 * place in the app where a control sits on top of content, so it is glass-free
 * and solid: it must always be findable.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import Icon from './ui/icons';
import { Glass, useSafeArea } from './ui/platform';
import { PressableScale, haptic } from './ui/primitives';

export const TABS = [
  { id: 'today', label: 'Today', glyph: 'today' },
  { id: 'tasks', label: 'Tasks', glyph: 'list' },
  { id: 'habits', label: 'Habits', glyph: 'grid' },
  { id: 'journey', label: 'Journey', glyph: 'summit' },
  { id: 'stats', label: 'Insights', glyph: 'chart' },
];

/** How much room the bar takes, so scroll views can clear it. */
export function useTabBarHeight() {
  const insets = useSafeArea();
  return 50 + Math.max(insets.bottom, 8);
}

function TabButton({ theme, tab, active, onPress }) {
  const t = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: active ? 1 : 0,
      damping: 15,
      stiffness: 300,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  }, [active, t]);

  const color = active ? theme.colors.primary : theme.colors.textTertiary;

  return (
    <Pressable
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 2 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <Animated.View
        style={{
          transform: [
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
          ],
        }}
      >
        <Icon name={tab.glyph} size={22} color={color} filled={active} weight={active ? 2.1 : 1.8} />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          letterSpacing: 0.1,
          marginTop: 4,
          fontWeight: active ? '600' : '500',
          color,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function TabBar({ theme, active, onChange, onQuickAdd }) {
  const insets = useSafeArea();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {!!onQuickAdd && (
        <PressableScale
          onPress={onQuickAdd}
          feedback="medium"
          scaleTo={0.9}
          accessibilityLabel="Quick add"
          style={[
            {
              position: 'absolute',
              right: 18,
              bottom: 50 + bottomPad + 16,
              width: 54,
              height: 54,
              borderRadius: 27,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
            },
            /* A colour-matched shadow, kept faint. A hard drop shadow under a
             * circle is the one thing that would make this read as Material. */
            {
              shadowColor: theme.colors.primary,
              shadowOpacity: theme.dark ? 0.32 : 0.26,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 5 },
              elevation: 6,
            },
          ]}
        >
          <Icon name="plus" size={24} color="#FFFFFF" weight={2.6} />
        </PressableScale>
      )}

      <Glass theme={theme} intensity={78} style={{ paddingBottom: bottomPad }}>
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
        <View style={{ flexDirection: 'row', height: 50 }}>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              theme={theme}
              tab={tab}
              active={tab.id === active}
              onPress={() => onChange(tab.id)}
            />
          ))}
        </View>
      </Glass>
    </View>
  );
}
