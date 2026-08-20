/**
 * Progress visualisation.
 *
 * Every number in this app is derived from the activity log, so progress is the
 * app's main output. It gets the most care: rings that sweep to their value,
 * bars that fill rather than appear, and a rounded cap that makes an arc drawn
 * from plain views read like a designed shape rather than a CSS trick.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { withAlpha } from '../../theme';
import Icon from './icons';

const clamp = (v) => Math.max(0, Math.min(100, v || 0));

/* ------------------------------------------------------------------- bar */

export function ProgressBar({ theme, percent, color, height = 8, style, track, animated = true, delay = 0 }) {
  const value = clamp(percent);
  const w = useRef(new Animated.Value(animated ? 0 : value)).current;

  useEffect(() => {
    if (!animated) {
      w.setValue(value);
      return undefined;
    }
    const anim = Animated.timing(w, {
      toValue: value,
      duration: 620,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [value, w, animated, delay]);

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track || theme.colors.track,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color || theme.colors.primary,
        }}
      />
    </View>
  );
}

/**
 * A bar split into segments - one per contributing source. Used on the Today
 * card, where a single number would hide which of tasks, habits or challenges
 * is actually carrying the day.
 */
export function StackedBar({ theme, segments, total, height = 8, style }) {
  const sum = Math.max(1, total || segments.reduce((n, s) => n + s.value, 0));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.track,
          overflow: 'hidden',
          flexDirection: 'row',
        },
        style,
      ]}
    >
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <View
            key={i}
            style={{
              width: `${(s.value / sum) * 100}%`,
              backgroundColor: s.color,
              borderRadius: height / 2,
              marginLeft: i === 0 ? 0 : -height / 2,
            }}
          />
        ))}
    </View>
  );
}

/* ------------------------------------------------------------------ ring */

/**
 * The progress ring.
 *
 * Two half-circles clipped and rotated, which is how you draw an arc without an
 * SVG dependency. The refinement over the naive version: both halves are driven
 * by one animated value so the arc sweeps, and a rounded cap rides the leading
 * edge on a rotating container - the trick that avoids trigonometry inside an
 * interpolation.
 */
export function ProgressRing({
  theme,
  percent = 0,
  size = 92,
  stroke = 9,
  color,
  children,
  trackColor,
  animated = true,
  cap = true,
  delay = 0,
}) {
  const value = clamp(percent);
  const tint = color || theme.colors.primary;
  const half = size / 2;
  const t = useRef(new Animated.Value(animated ? 0 : value)).current;

  useEffect(() => {
    if (!animated) {
      t.setValue(value);
      return undefined;
    }
    const anim = Animated.timing(t, {
      toValue: value,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [value, t, animated, delay]);

  const arc = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderTopColor: tint,
    borderRightColor: tint,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  const rightRotate = t.interpolate({
    inputRange: [0, 50],
    outputRange: ['-180deg', '0deg'],
    extrapolate: 'clamp',
  });
  const leftRotate = t.interpolate({
    inputRange: [50, 100],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });
  const leftOpacity = t.interpolate({
    inputRange: [49.9, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const capRotate = t.interpolate({ inputRange: [0, 100], outputRange: ['0deg', '360deg'] });
  const capOpacity = t.interpolate({
    inputRange: [0, 1.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: trackColor || theme.colors.track,
        }}
      />

      {/* right half: 0 - 50% */}
      <View style={{ position: 'absolute', width: half, height: size, left: half, overflow: 'hidden' }}>
        <Animated.View style={[arc, { left: -half, transform: [{ rotate: rightRotate }] }]} />
      </View>

      {/* left half: 50 - 100% */}
      <Animated.View
        style={{
          position: 'absolute',
          width: half,
          height: size,
          left: 0,
          overflow: 'hidden',
          opacity: leftOpacity,
        }}
      >
        <Animated.View style={[arc, { left: 0, transform: [{ rotate: leftRotate }] }]} />
      </Animated.View>

      {/* The rounded leading edge, carried around by a rotating container. */}
      {cap && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            opacity: capOpacity,
            transform: [{ rotate: capRotate }],
          }}
          pointerEvents="none"
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: half - stroke / 2,
              width: stroke,
              height: stroke,
              borderRadius: stroke / 2,
              backgroundColor: tint,
            }}
          />
        </Animated.View>
      )}

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/**
 * Several rings nested inside one another - the shape people already read as
 * "how did my day go" without a legend. Outermost ring is the first series.
 */
export function RingStack({ theme, series, size = 104, stroke = 9, gap = 4, children }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {series.map((s, i) => {
        const d = size - i * (stroke + gap) * 2;
        return (
          <View key={i} style={{ position: 'absolute' }}>
            <ProgressRing
              theme={theme}
              percent={s.percent}
              size={d}
              stroke={stroke}
              color={s.color}
              delay={i * 90}
              trackColor={withAlpha(s.color, theme.dark ? 0.16 : 0.12)}
            />
          </View>
        );
      })}
      {children}
    </View>
  );
}

/* ---------------------------------------------------------------- streak */

/** The streak marker. One flame, one number, no sentence. */
export function StreakPill({ theme, count, color, unit = 'd', style, size = 'md', muted }) {
  if (!count) return null;
  const tint = muted ? theme.colors.textTertiary : color || theme.colors.warning;
  const small = size === 'sm';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: small ? 6 : 8,
          paddingVertical: small ? 2 : 3,
          borderRadius: theme.radius.full,
          backgroundColor: withAlpha(tint, theme.dark ? 0.2 : 0.12),
        },
        style,
      ]}
    >
      <Icon name="flame" size={small ? 10 : 12} color={tint} />
      <Text
        style={{
          ...(small ? theme.type.caption2 : theme.type.caption),
          fontWeight: '700',
          color: tint,
          marginLeft: 4,
        }}
      >
        {count}
        {unit}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------ completion */

/**
 * A one-shot flourish when something is finished: a ring that expands out of
 * the tapped element and fades. It is the only celebratory animation in the
 * app, and it lasts 450ms.
 */
export function CompletionBurst({ theme, trigger, color, size = 44 }) {
  const t = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (!trigger) return undefined;
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [trigger, t]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color || theme.colors.success,
        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
      }}
    />
  );
}

/* -------------------------------------------------------------- day dots */

/**
 * The compact "how did this week go" strip: seven dots, today outlined. Small
 * enough to sit inside a list row, readable at a glance.
 */
export function DayDots({ theme, cells, color, size = 8, gap = 5, style }) {
  const tint = color || theme.colors.primary;
  return (
    <View style={[{ flexDirection: 'row', gap }, style]}>
      {cells.map((cell) => (
        <View
          key={cell.key}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: cell.done
              ? tint
              : cell.partial
              ? withAlpha(tint, 0.45)
              : theme.colors.fill2,
            borderWidth: cell.today ? 1.5 : 0,
            borderColor: withAlpha(tint, 0.8),
          }}
        />
      ))}
    </View>
  );
}

export const progressStyles = StyleSheet.create({});
