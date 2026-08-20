/**
 * Surfaces and the things you press.
 *
 * The layering rule the whole app follows:
 *
 *   base      the page itself, never white
 *   raised    cards and grouped lists that sit on the page
 *   floating  buttons and bars hovering above content  (glass)
 *   sheet     modals presented over everything          (glass backdrop)
 *
 * A surface only goes up a layer when it needs to be understood as *on top of*
 * something, never for decoration.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

/* --------------------------------------------------------------- pressable */

const HAPTIC = {
  selection: () => Haptics.selectionAsync(),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

export function haptic(kind = 'selection') {
  const fn = HAPTIC[kind];
  if (fn) fn();
}

/**
 * The single press interaction used everywhere: a small, fast, spring-loaded
 * scale. It is the difference between a button that responds and a button that
 * merely works, and it costs one animated node.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.97,
  dim = 1,
  feedback = 'selection',
  hitSlop,
  accessibilityLabel,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const to = useCallback(
    (s, o) => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: s,
          damping: 18,
          stiffness: 380,
          mass: 0.6,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: o, duration: 90, useNativeDriver: true }),
      ]).start();
    },
    [scale, opacity]
  );

  if (!onPress && !onLongPress) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => to(scaleTo, dim)}
      onPressOut={() => to(1, 1)}
      onPress={
        onPress
          ? (e) => {
              if (feedback) haptic(feedback);
              onPress(e);
            }
          : undefined
      }
      onLongPress={onLongPress}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------- card */

/**
 * The default raised surface. Soft radius, one hairline, a shadow you have to
 * look for. `tint` paints the card in an entity colour wash - used sparingly,
 * for the one card on a screen that carries the screen's meaning.
 */
export function Card({
  theme,
  children,
  style,
  onPress,
  onLongPress,
  padded = true,
  tint,
  elevation = 'xs',
  bordered = true,
  radius,
}) {
  const body = (
    <View
      style={[
        {
          backgroundColor: tint || theme.colors.surface,
          borderRadius: radius == null ? theme.radius.lg : radius,
          padding: padded ? theme.spacing.lg : 0,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.colors.border,
        },
        theme.shadow[elevation] || theme.shadow.xs,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} scaleTo={0.985} feedback="selection">
      {body}
    </PressableScale>
  );
}

/* -------------------------------------------------------- grouped list */

/**
 * An iOS inset grouped list: one rounded surface, rows divided by separators
 * that start at the content edge rather than the card edge. This is the shape
 * that reads as "settings", "details", "a list of things of one kind" on iOS,
 * and it replaces the stacks of individually-shadowed rows the app used to
 * draw.
 */
export function ListGroup({ theme, children, style, inset = 16, header, footer, elevation = 'xs' }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {!!header && (
        <Text
          style={{
            ...theme.type.footnote,
            color: theme.colors.textSecondary,
            marginBottom: 8,
            marginLeft: 4,
          }}
        >
          {header}
        </Text>
      )}
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
            overflow: 'hidden',
          },
          theme.shadow[elevation] || theme.shadow.xs,
        ]}
      >
        {rows.map((child, i) => (
          <View key={child.key || i}>
            {i > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.colors.separator,
                  marginLeft: inset,
                }}
              />
            )}
            {child}
          </View>
        ))}
      </View>
      {!!footer && (
        <Text
          style={{
            ...theme.type.footnote,
            color: theme.colors.textTertiary,
            marginTop: 8,
            marginHorizontal: 4,
            lineHeight: 18,
          }}
        >
          {footer}
        </Text>
      )}
    </View>
  );
}

/** A row inside a ListGroup. Highlights on press the way a real table view does. */
export function ListRow({
  theme,
  children,
  onPress,
  onLongPress,
  style,
  paddingVertical = 12,
  paddingHorizontal = 16,
  disabled,
}) {
  const bg = useRef(new Animated.Value(0)).current;

  const content = (
    <Animated.View
      style={[
        {
          paddingVertical,
          paddingHorizontal,
          backgroundColor: bg.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0,0,0,0)', theme.colors.fill1],
          }),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!onPress && !onLongPress) return content;

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => Animated.timing(bg, { toValue: 1, duration: 60, useNativeDriver: false }).start()}
      onPressOut={() => Animated.timing(bg, { toValue: 0, duration: 220, useNativeDriver: false }).start()}
      onPress={
        onPress
          ? () => {
              haptic('selection');
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
    >
      {content}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ misc */

export function Divider({ theme, style, inset = 0 }) {
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.separator,
          marginVertical: 12,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}

/** A soft coloured wash behind an icon or an emoji. */
export function IconWell({ theme, color, size = 40, radius, children, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius == null ? size * 0.31 : radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({ theme, label, color, style, solid }) {
  const tint = color || theme.colors.primary;
  return (
    <View
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: theme.radius.xs,
          backgroundColor: solid ? tint : `${tint}22`,
        },
        style,
      ]}
    >
      <Text style={{ ...theme.type.caption2, color: solid ? '#FFF' : tint }}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------- skeleton */

/**
 * Loading states that hold the layout still. A shimmer that breathes rather
 * than pulses - fast enough to read as "working", slow enough not to nag.
 */
export function Skeleton({ theme, width = '100%', height = 14, radius = 7, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.fill2,
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        },
        style,
      ]}
    />
  );
}

/* ---------------------------------------------------------------- strike */

/**
 * Text that gets struck through when it is done - and struck through *exactly*,
 * one rule per rendered line, at that line's own width and baseline.
 *
 * `textDecorationLine` cannot be animated, and a single absolutely-positioned
 * rule would run the full width of the row rather than the width of the words.
 * `onTextLayout` hands back the real geometry of every line, so the rule is
 * drawn where the ink actually is, and grows out of the centre over 230ms.
 *
 * If a platform ever declines to report line geometry, the plain decoration is
 * used instead - struck through either way, never nothing.
 */
export function StrikeText({ theme, done, children, style, numberOfLines = 2, color }) {
  const [lines, setLines] = useState([]);
  const t = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, { toValue: done ? 1 : 0, duration: 230, useNativeDriver: true }).start();
  }, [done, t]);

  const measured = lines.length > 0;

  return (
    <View>
      <Animated.Text
        numberOfLines={numberOfLines}
        onTextLayout={(e) => setLines(e.nativeEvent.lines || [])}
        style={[
          style,
          {
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.42] }),
          },
          done && !measured ? { textDecorationLine: 'line-through' } : null,
        ]}
      >
        {children}
      </Animated.Text>

      {measured &&
        lines.map((ln, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: ln.x,
              top: ln.y + ln.height / 2 - 0.7,
              width: ln.width,
              height: 1.4,
              borderRadius: 1,
              backgroundColor: color || theme.colors.textTertiary,
              opacity: t,
              transform: [{ scaleX: t }],
            }}
          />
        ))}
    </View>
  );
}

/* ------------------------------------------------------------- entrance */

/**
 * A list item that arrives rather than appears: eight points up, over 260ms,
 * staggered by index. Applied only to the first screenful - anything below the
 * fold is already animated by the act of scrolling to it.
 */
export function FadeIn({ children, delay = 0, offset = 8, style, disabled }) {
  const t = useRef(new Animated.Value(disabled ? 1 : 0)).current;

  useEffect(() => {
    if (disabled) return undefined;
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay, disabled]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
