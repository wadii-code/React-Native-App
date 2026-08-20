/**
 * The two things a native-feeling iOS app needs from the platform: real safe
 * areas, and real translucency.
 *
 * Neither package is a dependency of this project, and adding one would force a
 * native rebuild on anyone already running the app. So both are resolved at
 * runtime: if `react-native-safe-area-context` or `expo-blur` happen to be
 * installed the app uses them and looks better for it, and if they are not it
 * falls back to values tuned to match. Nothing here ever throws.
 */
import React from 'react';
import { View, Platform, Dimensions, StatusBar, StyleSheet, Animated, Keyboard } from 'react-native';

/* ------------------------------------------------------------ safe areas */

let safeAreaModule = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  safeAreaModule = require('react-native-safe-area-context');
} catch {
  safeAreaModule = null;
}

/**
 * Devices with a home indicator have no hardware button, so the bottom 34pt
 * belong to the system. Every iPhone since the X reports a window height (or
 * width, in landscape) of at least 780pt, which is the standard way to detect
 * this without a native module.
 */
function guessInsets() {
  const { height, width } = Dimensions.get('window');
  const longest = Math.max(height, width);
  const shortest = Math.min(height, width);

  if (Platform.OS === 'ios') {
    // iPhone SE / 8 and earlier: physical home button, no notch.
    const hasHomeIndicator = longest >= 780 && shortest >= 375;
    return {
      top: hasHomeIndicator ? 47 : 20,
      bottom: hasHomeIndicator ? 34 : 0,
      left: 0,
      right: 0,
    };
  }
  return {
    top: StatusBar.currentHeight || 24,
    bottom: 0,
    left: 0,
    right: 0,
  };
}

const fallbackInsets = guessInsets();

/** Insets in points. Always returns all four keys. */
export function useSafeArea() {
  if (safeAreaModule && safeAreaModule.useSafeAreaInsets) {
    try {
      const insets = safeAreaModule.useSafeAreaInsets();
      // A provider-less tree reports zeros; the guess is better than nothing.
      if (insets && (insets.top || insets.bottom)) return insets;
    } catch {
      /* fall through */
    }
  }
  return fallbackInsets;
}

/**
 * Wraps the tree in a SafeAreaProvider when the package exists, and is a plain
 * passthrough when it does not.
 */
export function SafeAreaRoot({ children, style }) {
  if (safeAreaModule && safeAreaModule.SafeAreaProvider) {
    const { SafeAreaProvider } = safeAreaModule;
    return <SafeAreaProvider style={style}>{children}</SafeAreaProvider>;
  }
  return <View style={style}>{children}</View>;
}

/** How much room a floating bar must leave for the home indicator. */
export const bottomInset = () => fallbackInsets.bottom;

/* -------------------------------------------------------------- keyboard */

/**
 * The keyboard's height as an animated value, following the same curve the
 * system uses. Anything docked to the bottom of the screen rides this so the
 * keyboard never covers the thing you are typing into.
 *
 * `keyboardWillShow` fires before the animation on iOS, which is what lets the
 * bar move *with* the keyboard rather than after it.
 */
export function useKeyboardHeight() {
  const height = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(height, {
        toValue: e.endCoordinates ? e.endCoordinates.height : 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(height, {
        toValue: 0,
        duration: (e && e.duration) || 220,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);

  return height;
}

/* ----------------------------------------------------------------- glass */

let BlurView = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const blur = require('expo-blur');
  BlurView = blur.BlurView || null;
} catch {
  BlurView = null;
}

export const hasNativeBlur = !!BlurView;

/**
 * A translucent surface for chrome that floats over content: the tab bar, nav
 * bars, sheet backdrops, the floating add button.
 *
 * With `expo-blur` present this is a real material. Without it, it is a
 * high-alpha tint over the page colour - which on a calm, near-flat background
 * lands within a hair of the same result, and costs nothing.
 *
 * Glass is deliberately not offered to cards or list rows. Content stays
 * opaque; only the things hovering above it are see-through.
 */
export function Glass({ theme, intensity = 60, style, children, tint: tintProp, radius }) {
  const scheme = tintProp || (theme.dark ? 'dark' : 'light');
  const shape = radius == null ? null : { borderRadius: radius, overflow: 'hidden' };

  if (BlurView) {
    return (
      <BlurView intensity={intensity} tint={scheme} style={[shape, style]}>
        {/* A whisper of tint keeps text legible over bright photos and lists. */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.dark ? 'rgba(16,18,24,0.42)' : 'rgba(250,250,253,0.46)' },
          ]}
          pointerEvents="none"
        />
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[{ backgroundColor: theme.colors.glass }, shape, style]}>{children}</View>
  );
}

/** The hairline that separates floating chrome from the content beneath it. */
export function Hairline({ theme, style, top }) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.glassHairline,
        },
        top ? { top: 0 } : { bottom: 0 },
        style,
      ]}
    />
  );
}
