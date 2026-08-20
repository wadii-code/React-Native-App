/**
 * Empty states and transient messages.
 *
 * An empty screen is the first thing a new user sees and the last thing a
 * finished user sees, so it gets a real design: a drawn mark rather than a
 * 48-point emoji, one line that says where they are, one line that says what to
 * do, and at most one button.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Pressable } from 'react-native';
import { withAlpha } from '../../theme';
import Icon from './icons';
import { Glass, useSafeArea } from './platform';
import { Button } from './controls';
import { haptic } from './primitives';

/* ------------------------------------------------------------ empty state */

/**
 * The mark: concentric rings in the accent colour with the glyph at the centre.
 * It reads as intentional at any size and costs three views.
 */
function EmptyMark({ theme, glyph, color, size = 64 }) {
  const tint = color || theme.colors.primary;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(pulse, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pulse,
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: withAlpha(tint, theme.dark ? 0.12 : 0.07),
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.68,
          height: size * 0.68,
          borderRadius: size,
          backgroundColor: withAlpha(tint, theme.dark ? 0.2 : 0.12),
        }}
      />
      <Icon name={glyph} size={size * 0.34} color={tint} weight={2} />
    </Animated.View>
  );
}

export function EmptyBlock({
  theme,
  glyph = 'sparkle',
  icon,
  title,
  sub,
  actionLabel,
  onAction,
  compact,
  color,
  style,
}) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingVertical: compact ? 26 : 52,
          paddingHorizontal: 28,
        },
        style,
      ]}
    >
      {icon ? (
        <Text style={{ fontSize: compact ? 30 : 38, marginBottom: 12 }}>{icon}</Text>
      ) : (
        <EmptyMark theme={theme} glyph={glyph} color={color} size={compact ? 54 : 66} />
      )}
      <Text
        style={{
          ...theme.type.headline,
          color: theme.colors.text,
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {!!sub && (
        <Text
          style={{
            ...theme.type.subhead,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 21,
            maxWidth: 300,
          }}
        >
          {sub}
        </Text>
      )}
      {!!actionLabel && (
        <Button
          theme={theme}
          label={actionLabel}
          onPress={onAction}
          variant="tonal"
          color={color}
          size="sm"
          style={{ marginTop: 18 }}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ toast */

/**
 * A message that arrives above the tab bar, waits, and leaves. Glass, because
 * it floats over content it must not hide. Never more than one at a time.
 */
export function Toast({ theme, visible, message, actionLabel, onAction, onHide, bottomOffset = 96, glyph }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: visible ? 1 : 0,
      damping: 22,
      stiffness: 260,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }, [visible, t]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        opacity: t,
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <Glass
        theme={theme}
        intensity={80}
        radius={theme.radius.lg}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 13,
            paddingHorizontal: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.glassBorder,
            overflow: 'hidden',
          },
          theme.shadow.md,
        ]}
      >
        {!!glyph && <Icon name={glyph} size={16} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />}
        <Text numberOfLines={2} style={{ flex: 1, ...theme.type.subheadEmph, color: theme.colors.text }}>
          {message}
        </Text>
        {!!actionLabel && (
          <Pressable
            onPress={() => {
              haptic('light');
              onAction();
            }}
            hitSlop={theme.hit}
            style={{ marginLeft: 14 }}
          >
            <Text style={{ ...theme.type.subheadEmph, color: theme.colors.primary }}>{actionLabel}</Text>
          </Pressable>
        )}
        {!actionLabel && !!onHide && (
          <Pressable onPress={onHide} hitSlop={theme.hit} style={{ marginLeft: 12 }}>
            <Icon name="close" size={12} color={theme.colors.textTertiary} weight={1.8} />
          </Pressable>
        )}
      </Glass>
    </Animated.View>
  );
}

/* ------------------------------------------------------------- loading */

/** The launch state. One mark, one breath - never a spinner on a blank page. */
export function LaunchState({ theme }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [t]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <Animated.View
        style={{
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(theme.colors.primary, theme.dark ? 0.22 : 0.12),
          }}
        >
          <Icon name="today" size={30} color={theme.colors.primary} weight={2.4} />
        </View>
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------ achievement */

/** The badge notification. Same glass language as the toast, one line taller. */
export function AchievementToast({ theme, visible, icon, title, description, extra, onDismiss }) {
  const insets = useSafeArea();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: visible ? 1 : 0,
      damping: 20,
      stiffness: 230,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [visible, t]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        top: insets.top + 6,
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}
    >
      <Glass
        theme={theme}
        intensity={85}
        radius={theme.radius.lg}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.glassBorder,
            overflow: 'hidden',
          },
          theme.shadow.md,
        ]}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(theme.colors.warning, theme.dark ? 0.22 : 0.14),
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...theme.type.caption2, color: theme.colors.warning }}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={{ ...theme.type.subheadEmph, color: theme.colors.text, marginTop: 2 }}>{title}</Text>
          <Text numberOfLines={1} style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 1 }}>
            {description}
            {extra}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={theme.hit} style={{ marginLeft: 8 }}>
          <Icon name="close" size={13} color={theme.colors.textTertiary} weight={1.8} />
        </Pressable>
      </Glass>
    </Animated.View>
  );
}
