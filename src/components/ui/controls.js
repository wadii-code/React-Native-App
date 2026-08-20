/**
 * Controls: the parts of the interface the user acts on.
 *
 * Each one is animated, because a control that changes state instantly reads as
 * a web page. None of them animate for longer than 260ms, because a control
 * that makes you wait reads as a toy.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { withAlpha } from '../../theme';
import Icon from './icons';
import { PressableScale, haptic } from './primitives';

/* ------------------------------------------------------------------ chip */

export function Chip({ theme, label, icon, glyph, active, onPress, color, small, style, count }) {
  const tint = color || theme.colors.primary;
  const px = small ? 10 : 14;
  const py = small ? 5 : 8;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.94}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: px,
          paddingVertical: py,
          borderRadius: theme.radius.full,
          backgroundColor: active ? withAlpha(tint, theme.dark ? 0.22 : 0.13) : theme.colors.fill1,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: active ? withAlpha(tint, 0.32) : theme.colors.borderLight,
        },
        style,
      ]}
    >
      {!!glyph && (
        <Icon
          name={glyph}
          size={small ? 12 : 14}
          color={active ? tint : theme.colors.textSecondary}
          style={{ marginRight: 5 }}
        />
      )}
      {!glyph && !!icon && <Text style={{ fontSize: small ? 11 : 13, marginRight: 5 }}>{icon}</Text>}
      <Text
        style={{
          ...(small ? theme.type.caption : theme.type.footnoteEmph),
          fontWeight: active ? '600' : '500',
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
      {count != null && (
        <Text
          style={{
            ...theme.type.caption2,
            marginLeft: 6,
            color: active ? withAlpha(tint, 0.75) : theme.colors.textTertiary,
          }}
        >
          {count}
        </Text>
      )}
    </PressableScale>
  );
}

/* ------------------------------------------------------------ segmented */

/**
 * The iOS segmented control, thumb and all. The thumb slides; the labels do
 * not move. Measuring the track once on layout is what makes that possible
 * without a layout dependency.
 */
export function Segmented({ theme, options, value, onChange, style, compact }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const pad = 2.5;
  const count = Math.max(1, options.length);
  const seg = trackWidth ? (trackWidth - pad * 2) / count : 0;
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value));
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!seg) return;
    Animated.spring(x, {
      toValue: activeIndex * seg,
      damping: 22,
      stiffness: 300,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, seg, x]);

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.fill2,
          borderRadius: theme.radius.sm,
          padding: pad,
        },
        style,
      ]}
    >
      {!!seg && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: pad,
              bottom: pad,
              left: pad,
              width: seg,
              borderRadius: theme.radius.sm - 2,
              backgroundColor: theme.dark ? theme.colors.surfaceElevated : '#FFFFFF',
              transform: [{ translateX: x }],
            },
            theme.shadow.xs,
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={String(opt.id)}
            onPress={() => {
              haptic('selection');
              onChange(opt.id);
            }}
            style={{
              flex: 1,
              paddingVertical: compact ? 6 : 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                ...theme.type.footnoteEmph,
                fontWeight: active ? '600' : '500',
                color: active ? theme.colors.text : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------- checkbox */

/**
 * Completing something should feel like something.
 *
 * The box springs past its size and settles; the tick draws in behind it. Two
 * hundred milliseconds, no bounce you could describe as playful - just enough
 * that the finger feels answered.
 */
export function Checkbox({ theme, checked, onPress, color, size = 24, radius, disabled, style }) {
  const tint = color || theme.colors.primary;
  const t = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      t.setValue(checked ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.spring(t, {
        toValue: checked ? 1 : 0,
        damping: 15,
        stiffness: 260,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pop, { toValue: checked ? 1.18 : 0.88, duration: 110, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, damping: 12, stiffness: 340, useNativeDriver: true }),
      ]),
    ]).start();
  }, [checked, t, pop]);

  return (
    <Pressable
      disabled={disabled}
      onPress={
        onPress
          ? () => {
              haptic(checked ? 'selection' : 'light');
              onPress();
            }
          : undefined
      }
      hitSlop={theme.hit}
      style={style}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: radius == null ? size / 2 : radius,
          borderWidth: 1.8,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: checked ? tint : theme.colors.textQuaternary,
          transform: [{ scale: pop }],
        }}
      >
        {/* The fill grows from the centre so the tick lands on a solid ground. */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: radius == null ? size / 2 : radius,
            backgroundColor: tint,
            opacity: t,
            transform: [{ scale: t }],
          }}
        />
        <Animated.View style={{ opacity: t, transform: [{ scale: t }] }}>
          <Icon name="check" size={size * 0.62} color="#FFFFFF" weight={Math.max(1.8, size * 0.1)} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* --------------------------------------------------------------- toggle */

/** The iOS switch. Knob springs, track cross-fades. */
export function Toggle({ theme, value, onChange, label, sub, disabled, compact }) {
  const t = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, {
      toValue: value ? 1 : 0,
      damping: 18,
      stiffness: 340,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
  }, [value, t]);

  const track = (
    <Animated.View
      style={{
        width: 51,
        height: 31,
        borderRadius: 15.5,
        padding: 2,
        justifyContent: 'center',
        backgroundColor: t.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.track, theme.colors.success],
        }),
      }}
    >
      <Animated.View
        style={[
          {
            width: 27,
            height: 27,
            borderRadius: 13.5,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
          },
          theme.shadow.xs,
        ]}
      />
    </Animated.View>
  );

  if (!label) {
    return (
      <Pressable
        disabled={disabled}
        onPress={() => {
          haptic('selection');
          onChange(!value);
        }}
      >
        {track}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic('selection');
        onChange(!value);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: compact ? 8 : 12,
      }}
    >
      <View style={{ flex: 1, paddingRight: 14 }}>
        <Text style={{ ...theme.type.callout, color: theme.colors.text }}>{label}</Text>
        {!!sub && (
          <Text style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginTop: 2 }}>
            {sub}
          </Text>
        )}
      </View>
      {track}
    </Pressable>
  );
}

/* --------------------------------------------------------------- buttons */

/**
 * One button component, four intents. Every call-to-action in the app is one of
 * these, which is why they all feel the same under the thumb.
 */
export function Button({
  theme,
  label,
  onPress,
  variant = 'primary',
  color,
  size = 'md',
  glyph,
  disabled,
  style,
  full,
}) {
  const tint = color || theme.colors.primary;
  const height = size === 'sm' ? 36 : size === 'lg' ? 52 : 46;
  const px = size === 'sm' ? 14 : 20;

  const palette = {
    primary: { bg: disabled ? theme.colors.fill2 : tint, fg: disabled ? theme.colors.textTertiary : '#FFFFFF', border: 'transparent' },
    tonal: { bg: withAlpha(tint, theme.dark ? 0.22 : 0.12), fg: tint, border: 'transparent' },
    plain: { bg: 'transparent', fg: tint, border: 'transparent' },
    grey: { bg: theme.colors.fill2, fg: theme.colors.text, border: 'transparent' },
    destructive: { bg: withAlpha(theme.colors.danger, theme.dark ? 0.22 : 0.11), fg: theme.colors.danger, border: 'transparent' },
  }[variant] || {};

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      feedback={variant === 'primary' ? 'light' : 'selection'}
      scaleTo={0.96}
      style={[
        {
          height,
          paddingHorizontal: px,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          backgroundColor: palette.bg,
          alignSelf: full ? 'stretch' : 'flex-start',
          flex: full ? 1 : undefined,
        },
        style,
      ]}
    >
      {!!glyph && (
        <Icon name={glyph} size={size === 'sm' ? 14 : 16} color={palette.fg} style={{ marginRight: 7 }} />
      )}
      <Text
        style={{
          ...(size === 'sm' ? theme.type.footnoteEmph : theme.type.headline),
          color: palette.fg,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/** A circular icon button - nav bar actions, close buttons, steppers. */
export function RoundButton({ theme, glyph, icon, onPress, color, fg, size = 34, style, weight }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={theme.hit}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color || theme.colors.fill2,
        },
        style,
      ]}
    >
      {glyph ? (
        <Icon
          name={glyph}
          size={size * 0.46}
          color={fg || theme.colors.textSecondary}
          weight={weight}
          mask={color || theme.colors.fill2}
        />
      ) : (
        <Text style={{ fontSize: size * 0.42, color: fg || theme.colors.text }}>{icon}</Text>
      )}
    </PressableScale>
  );
}

/* ------------------------------------------------------------- stat tile */

/** A single number with its name. Three of these fit a phone width exactly. */
export function StatTile({ theme, label, value, sub, color, glyph, icon, style, onPress, flat }) {
  const tint = color || theme.colors.text;
  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: flat ? 'transparent' : theme.colors.surface,
          borderRadius: theme.radius.lg,
          paddingHorizontal: 14,
          paddingVertical: 13,
          borderWidth: flat ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        flat ? null : theme.shadow.xs,
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
        {!!glyph && (
          <Icon name={glyph} size={12} color={theme.colors.textTertiary} style={{ marginRight: 5 }} />
        )}
        {!glyph && !!icon && <Text style={{ fontSize: 11, marginRight: 5 }}>{icon}</Text>}
        <Text numberOfLines={1} style={{ ...theme.type.caption, color: theme.colors.textSecondary, flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text style={{ ...theme.type.metricSm, color: tint }} numberOfLines={1}>
        {value}
      </Text>
      {!!sub && (
        <Text numberOfLines={1} style={{ ...theme.type.caption2, color: theme.colors.textTertiary, marginTop: 2, fontWeight: '500' }}>
          {sub}
        </Text>
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={{ flex: 1 }}>
      {content}
    </PressableScale>
  );
}

/* ------------------------------------------------------------ option row */

/** A wrapping set of mutually exclusive options - the picker used inside sheets. */
export function OptionRow({ theme, options, value, onChange, columns }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        const tint = opt.color || theme.colors.primary;
        return (
          <PressableScale
            key={String(opt.id)}
            onPress={() => onChange(opt.id)}
            scaleTo={0.95}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: theme.radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              width: columns ? `${100 / columns - 2}%` : undefined,
              backgroundColor: active ? withAlpha(tint, theme.dark ? 0.22 : 0.12) : theme.colors.fill1,
              borderColor: active ? withAlpha(tint, 0.45) : theme.colors.borderLight,
            }}
          >
            {!!opt.icon && <Text style={{ fontSize: 13, marginRight: 6 }}>{opt.icon}</Text>}
            {!!opt.dot && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginRight: 7,
                  backgroundColor: opt.color,
                }}
              />
            )}
            <Text
              style={{
                ...theme.type.subhead,
                fontWeight: active ? '600' : '500',
                color: active ? tint : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------- disclosure */

/** A tappable row that leads somewhere. The chevron is the whole promise. */
export function LinkRow({ theme, glyph, icon, label, value, onPress, color, last, danger }) {
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptic('selection');
              onPress();
            }
          : undefined
      }
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
    >
      {!!glyph && <Icon name={glyph} size={17} color={color || theme.colors.textSecondary} style={{ marginRight: 12 }} />}
      {!glyph && !!icon && <Text style={{ fontSize: 16, marginRight: 12 }}>{icon}</Text>}
      <Text
        style={{
          flex: 1,
          ...theme.type.callout,
          color: danger ? theme.colors.danger : color || theme.colors.text,
        }}
      >
        {label}
      </Text>
      {!!value && (
        <Text style={{ ...theme.type.subhead, color: theme.colors.textTertiary, marginRight: 6 }}>
          {value}
        </Text>
      )}
      {!!onPress && <Icon name="chevronRight" size={14} color={theme.colors.textQuaternary} weight={2} />}
    </Pressable>
  );
}

/* --------------------------------------------------------------- stepper */

/**
 * A tiny value nudger. Used by the date and time pickers, where the alternative
 * would be a native picker module the project does not carry.
 */
export function StepButton({ theme, glyph, label, onPress, big, style }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      feedback="selection"
      style={[
        {
          paddingHorizontal: big ? 16 : 11,
          paddingVertical: big ? 10 : 7,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: big ? 48 : 40,
        },
        style,
      ]}
    >
      {glyph ? (
        <Icon name={glyph} size={big ? 18 : 13} color={theme.colors.textSecondary} weight={2.2} />
      ) : (
        <Text style={{ ...theme.type.caption, fontWeight: '700', color: theme.colors.textSecondary }}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

/* ---------------------------------------------------------------- number */

/** A number that counts to its new value instead of jumping to it. */
export function AnimatedNumber({ theme, value, style, format, duration = 420 }) {
  const [shown, setShown] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const from = useRef(value);

  useEffect(() => {
    const listener = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    from.current = value;
    return () => anim.removeListener(listener);
  }, [value, anim, duration]);

  return <Text style={style}>{format ? format(shown) : shown}</Text>;
}
