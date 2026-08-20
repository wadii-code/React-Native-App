/**
 * Navigation chrome: the large title that scrolls away, and the translucent bar
 * it collapses into.
 *
 * This is the single most recognisable iOS pattern, and the app did not have
 * it. The mechanism is the real one, not an imitation: the large title lives
 * *inside* the scroll view, so it leaves with the content, while a fixed bar
 * sits above it and fades its compact title in as the large one goes.
 */
import React, { useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import Icon from './icons';
import { Glass, useSafeArea } from './platform';
import { PressableScale, haptic } from './primitives';

export const NAV_BAR_HEIGHT = 44;

/** Wire this into a ScrollView / FlatList to drive the collapsing header. */
export function useScrollY() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })
  ).current;
  return { scrollY, onScroll, scrollEventThrottle: 16 };
}

/* ---------------------------------------------------------------- nav bar */

/**
 * The fixed bar. Transparent over the top of a page until the content scrolls
 * under it, at which point it becomes glass with a hairline and the compact
 * title arrives from below.
 */
export function NavBar({
  theme,
  title,
  scrollY,
  onBack,
  backLabel = 'Back',
  right,
  left,
  threshold = 46,
  alwaysSolid,
  compactOnly,
}) {
  const insets = useSafeArea();
  // Screens that do not scroll still need a value to interpolate against.
  const still = useRef(new Animated.Value(alwaysSolid ? 999 : 0)).current;
  const y = scrollY || still;

  const materialOpacity = alwaysSolid
    ? 1
    : y.interpolate({
        inputRange: [threshold - 24, threshold + 8],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

  const titleOpacity = compactOnly
    ? 1
    : y.interpolate({
        inputRange: [threshold - 6, threshold + 18],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

  const titleShift = compactOnly
    ? 0
    : y.interpolate({
        inputRange: [threshold - 6, threshold + 18],
        outputRange: [9, 0],
        extrapolate: 'clamp',
      });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingTop: insets.top,
      }}
      pointerEvents="box-none"
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: materialOpacity }]} pointerEvents="none">
        <Glass theme={theme} intensity={72} style={StyleSheet.absoluteFillObject} />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.glassHairline,
          }}
        />
      </Animated.View>

      <View
        style={{
          height: NAV_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
        }}
        pointerEvents="box-none"
      >
        <View style={{ minWidth: 64, alignItems: 'flex-start' }}>
          {!!onBack && (
            <Pressable
              onPress={() => {
                haptic('selection');
                onBack();
              }}
              hitSlop={theme.hit}
              style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}
            >
              <Icon name="chevronLeft" size={19} color={theme.colors.primary} weight={2.4} />
              <Text style={{ ...theme.type.body, color: theme.colors.primary, marginLeft: 1 }}>
                {backLabel}
              </Text>
            </Pressable>
          )}
          {!onBack && left}
        </View>

        <Animated.View
          style={{
            flex: 1,
            alignItems: 'center',
            opacity: titleOpacity,
            transform: [{ translateY: titleShift }],
          }}
          pointerEvents="none"
        >
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text }}>
            {title}
          </Text>
        </Animated.View>

        <View style={{ minWidth: 64, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' }}>
          {right}
        </View>
      </View>
    </View>
  );
}

/**
 * The large title. Goes at the very top of the scroll content, directly under
 * the space reserved for the nav bar.
 */
export function LargeTitle({ theme, title, subtitle, right, style, accessory }) {
  return (
    <View style={[{ paddingHorizontal: theme.screen, paddingTop: 6, paddingBottom: 10 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ ...theme.type.largeTitle, color: theme.colors.text }} numberOfLines={2}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary, marginTop: 3 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
      {accessory}
    </View>
  );
}

/** Space to leave at the top of scroll content so it starts below the nav bar. */
export function useHeaderSpacer() {
  const insets = useSafeArea();
  return insets.top + NAV_BAR_HEIGHT;
}

/* ---------------------------------------------------------- static header */

/**
 * The non-collapsing header, kept for detail screens where the title is the
 * subject's name and should stay put while its content scrolls.
 */
export function ScreenHeader({ theme, title, subtitle, onBack, right, compact, style }) {
  const insets = useSafeArea();
  return (
    <View
      style={[
        {
          paddingHorizontal: theme.screen,
          paddingTop: insets.top + (compact ? 6 : 10),
          paddingBottom: theme.spacing.sm,
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
    >
      {!!onBack && (
        <Pressable
          onPress={() => {
            haptic('selection');
            onBack();
          }}
          hitSlop={theme.hit}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' }}
        >
          <Icon name="chevronLeft" size={18} color={theme.colors.primary} weight={2.4} />
          <Text style={{ ...theme.type.callout, color: theme.colors.primary, marginLeft: 2 }}>Back</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            numberOfLines={2}
            style={{
              ...(compact ? theme.type.title1 : theme.type.largeTitle),
              color: theme.colors.text,
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ ...theme.type.footnote, color: theme.colors.textSecondary, marginTop: 3 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- sections */

/**
 * A section header. Sentence case, secondary colour, no rule beneath it -
 * hierarchy from type, not from boxes.
 */
export function SectionTitle({ theme, title, action, onAction, style, caps, trailing }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 2,
        },
        style,
      ]}
    >
      <Text
        style={
          caps
            ? { ...theme.type.overline, textTransform: 'uppercase', color: theme.colors.textTertiary }
            : { ...theme.type.headline, color: theme.colors.text }
        }
      >
        {title}
      </Text>
      {trailing}
      {!!action && (
        <PressableScale onPress={onAction} scaleTo={0.94} hitSlop={theme.hit}>
          <Text style={{ ...theme.type.subheadEmph, color: theme.colors.primary }}>{action}</Text>
        </PressableScale>
      )}
    </View>
  );
}
