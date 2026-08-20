import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useAppTheme } from './src/theme';
import { AppProvider, useApp } from './src/store/AppStore';
import { NavProvider, useNav } from './src/navigation';
import TabBar from './src/components/TabBar';
import QuickAdd from './src/components/QuickAdd';
import { SafeAreaRoot } from './src/components/ui/platform';
import { LaunchState, AchievementToast } from './src/components/ui/feedback';
import { ACHIEVEMENTS } from './src/domain/achievements';

import TodayScreen from './src/screens/TodayScreen';
import TasksScreen from './src/screens/TasksScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import JourneyScreen from './src/screens/JourneyScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HabitDetailScreen from './src/screens/HabitDetailScreen';
import CommitmentDetailScreen from './src/screens/CommitmentDetailScreen';
import GoalDetailScreen from './src/screens/GoalDetailScreen';
import ChallengeDetailScreen from './src/screens/ChallengeDetailScreen';

const SCREEN_W = Dimensions.get('window').width;

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NavProvider>
          <SafeAreaRoot style={styles.flex}>
            <Shell />
          </SafeAreaRoot>
        </NavProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { state, loaded, actions, newAchievements, clearNewAchievements } = useApp();
  const nav = useNav();

  if (!loaded) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LaunchState theme={theme} />
      </>
    );
  }

  const detail = nav.current;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <TabHost theme={theme} isDark={isDark} onToggleTheme={toggleTheme} tab={nav.tab} />

      <DetailHost theme={theme} detail={detail} />

      {/* The bar hides while a detail screen is open, the way a pushed screen
       * takes over the whole surface on iOS. */}
      {!detail && (
        <TabBar
          theme={theme}
          active={nav.tab}
          onChange={nav.setTab}
          /* Tasks has its own composer in the same corner - two add buttons
           * stacked on each other would just be in the way. */
          onQuickAdd={nav.tab === 'tasks' ? null : () => nav.openQuickAdd()}
        />
      )}

      <QuickAdd
        theme={theme}
        visible={!!nav.quickAdd}
        initial={nav.quickAdd}
        state={state}
        actions={actions}
        onClose={nav.closeQuickAdd}
        onCreated={(type) => {
          if (type === 'habit') nav.setTab('habits');
          else if (type === 'challenge' || type === 'commitment' || type === 'goal') nav.setTab('journey');
        }}
      />

      <AchievementBanner
        theme={theme}
        items={newAchievements}
        onDismiss={clearNewAchievements}
        enabled={state.settings.gamification}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ tabs */

/**
 * Tabs cross-fade rather than cut. 160ms is short enough that it never delays
 * a tap and long enough that the eye does not have to re-find the page.
 */
function TabHost({ theme, isDark, onToggleTheme, tab }) {
  const fade = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(tab);

  useEffect(() => {
    if (tab === shown) return undefined;
    let cancelled = false;
    Animated.timing(fade, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      if (cancelled) return;
      setShown(tab);
      Animated.timing(fade, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [tab, shown, fade]);

  const screen = () => {
    switch (shown) {
      case 'tasks':
        return <TasksScreen theme={theme} isDark={isDark} onToggleTheme={onToggleTheme} />;
      case 'habits':
        return <HabitsScreen theme={theme} />;
      case 'journey':
        return <JourneyScreen theme={theme} />;
      case 'stats':
        return <StatsScreen theme={theme} />;
      case 'today':
      default:
        return <TodayScreen theme={theme} />;
    }
  };

  return <Animated.View style={[styles.flex, { opacity: fade }]}>{screen()}</Animated.View>;
}

/* ----------------------------------------------------------------- stack */

/**
 * The push transition. The detail screen comes in from the right while the tab
 * underneath drifts a little to the left and dims - the parallax that tells you
 * the page you left is still there, behind this one.
 */
function DetailHost({ theme, detail }) {
  const [rendered, setRendered] = useState(detail);
  const t = useRef(new Animated.Value(detail ? 1 : 0)).current;
  const lastKey = useRef(detail ? detail.screen : null);

  useEffect(() => {
    const key = detail ? detail.screen + JSON.stringify(detail.params || {}) : null;

    if (detail) {
      const changed = key !== lastKey.current;
      lastKey.current = key;
      setRendered(detail);
      if (changed) t.setValue(0);
      Animated.spring(t, {
        toValue: 1,
        damping: 30,
        stiffness: 280,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
      return undefined;
    }

    lastKey.current = null;
    if (!rendered) return undefined;
    const anim = Animated.timing(t, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setRendered(null);
    });
    return () => anim.stop();
  }, [detail, rendered, t]);

  if (!rendered) return null;

  const screen = () => {
    switch (rendered.screen) {
      case 'habitDetail':
        return <HabitDetailScreen theme={theme} params={rendered.params} />;
      case 'commitmentDetail':
        return <CommitmentDetailScreen theme={theme} params={rendered.params} />;
      case 'goalDetail':
        return <GoalDetailScreen theme={theme} params={rendered.params} />;
      case 'challengeDetail':
        return <ChallengeDetailScreen theme={theme} params={rendered.params} />;
      case 'settings':
        return <SettingsScreen theme={theme} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: theme.colors.background,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W, 0] }) }],
          ...(Platform.OS === 'ios'
            ? { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: -4, height: 0 } }
            : { elevation: 10 }),
        },
      ]}
    >
      {screen()}
    </Animated.View>
  );
}

/* ---------------------------------------------------------- achievements */

/** Quiet, brief, and never in the way - a badge should not interrupt work. */
function AchievementBanner({ theme, items, onDismiss, enabled }) {
  const timer = useRef(null);

  useEffect(() => {
    if (!items.length || !enabled) return undefined;
    timer.current = setTimeout(onDismiss, 4200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, enabled, onDismiss]);

  if (!items.length || !enabled) return null;
  const def = ACHIEVEMENTS.find((a) => a.id === items[0].id);
  if (!def) return null;

  return (
    <AchievementToast
      theme={theme}
      visible
      icon={def.icon}
      title={def.title}
      description={def.description}
      extra={items.length > 1 ? `  ·  +${items.length - 1} more` : ''}
      onDismiss={onDismiss}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
