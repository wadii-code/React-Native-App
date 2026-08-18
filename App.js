import React, { useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  UIManager,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useAppTheme } from './src/theme';
import { AppProvider, useApp } from './src/store/AppStore';
import { NavProvider, useNav } from './src/navigation';
import TabBar from './src/components/TabBar';
import QuickAdd from './src/components/QuickAdd';
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

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NavProvider>
          <Shell />
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
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={{ fontSize: 32 }}>✨</Text>
      </View>
    );
  }

  const detail = nav.current;

  const renderScreen = () => {
    if (detail) {
      switch (detail.screen) {
        case 'habitDetail':
          return <HabitDetailScreen theme={theme} params={detail.params} />;
        case 'commitmentDetail':
          return <CommitmentDetailScreen theme={theme} params={detail.params} />;
        case 'goalDetail':
          return <GoalDetailScreen theme={theme} params={detail.params} />;
        case 'challengeDetail':
          return <ChallengeDetailScreen theme={theme} params={detail.params} />;
        case 'settings':
          return <SettingsScreen theme={theme} />;
        default:
          break;
      }
    }
    switch (nav.tab) {
      case 'tasks':
        return <TasksScreen theme={theme} isDark={isDark} onToggleTheme={toggleTheme} />;
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>{renderScreen()}</View>
      </KeyboardAvoidingView>

      <TabBar
        theme={theme}
        active={nav.tab}
        onChange={nav.setTab}
        /* The Tasks screen has its own add bar in the same corner - two plus
         * buttons stacked on top of each other would just be in the way. */
        onQuickAdd={nav.tab === 'tasks' && !detail ? null : () => nav.openQuickAdd()}
      />

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

      <AchievementToast
        theme={theme}
        items={newAchievements}
        onDismiss={clearNewAchievements}
        enabled={state.settings.gamification}
      />
    </SafeAreaView>
  );
}

/** Quiet, brief, and never in the way - a badge should not interrupt work. */
function AchievementToast({ theme, items, onDismiss, enabled }) {
  const slide = useRef(new Animated.Value(120)).current;
  const timer = useRef(null);

  useEffect(() => {
    if (!items.length || !enabled) return undefined;
    Animated.spring(slide, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(slide, { toValue: 120, duration: 220, useNativeDriver: true }).start(onDismiss);
    }, 4200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, enabled, slide, onDismiss]);

  if (!items.length || !enabled) return null;
  const def = ACHIEVEMENTS.find((a) => a.id === items[0].id);
  if (!def) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <Text style={{ fontSize: 24, marginRight: 12 }}>{def.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary, letterSpacing: 0.5 }}>
          ACHIEVEMENT UNLOCKED
        </Text>
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginTop: 2 }}>
          {def.title}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 1 }}>
          {def.description}
          {items.length > 1 ? `  ·  +${items.length - 1} more` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={{ color: theme.colors.textTertiary, fontSize: 16 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
});
