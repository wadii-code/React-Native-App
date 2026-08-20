/**
 * Settings, as an iOS settings screen: inset groups, one idea per group, the
 * explanation underneath the group rather than crammed into a row.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Animated, Alert, Pressable } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { useAppTheme } from '../theme';
import {
  NavBar,
  LargeTitle,
  ListGroup,
  ListRow,
  Segmented,
  Toggle,
  Chip,
  Sheet,
  Icon,
  useScrollY,
  useHeaderSpacer,
  useSafeArea,
} from '../components/ui';

export default function SettingsScreen({ theme }) {
  const { state, actions } = useApp();
  const nav = useNav();
  const { mode, setMode } = useAppTheme();
  const [exportVisible, setExportVisible] = useState(false);
  const { scrollY, onScroll, scrollEventThrottle } = useScrollY();
  const headerSpace = useHeaderSpacer();
  const insets = useSafeArea();

  const counts = useMemo(
    () => ({
      tasks: state.tasks.length,
      habits: state.habits.length,
      commitments: state.commitments.length,
      goals: state.goals.length,
      challenges: state.challenges.length,
      milestones: state.milestones.length,
      activities: state.activities.length,
      projects: state.projects.length,
    }),
    [state]
  );

  const json = useMemo(() => JSON.stringify(state, null, 2), [state]);

  const confirmReset = () => {
    Alert.alert(
      'Erase everything?',
      'This deletes every task, habit, commitment, goal, challenge and completion record on this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: () => actions.resetAll() },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavBar theme={theme} title="Settings" scrollY={scrollY} threshold={54} onBack={nav.goBack} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingTop: headerSpace, paddingBottom: insets.bottom + 48 }}
      >
        <LargeTitle theme={theme} title="Settings" />

        <Group theme={theme} title="Appearance">
          <View style={{ padding: 14 }}>
            <Segmented
              theme={theme}
              options={[
                { id: 'system', label: 'System' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        </Group>

        <Group
          theme={theme}
          title="Progress rules"
          footer="How much of a day's plan counts as a day kept, for the productivity streak."
        >
          <ListRow theme={theme} paddingVertical={14}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[50, 60, 75, 100].map((v) => (
                <Chip
                  key={v}
                  theme={theme}
                  label={`${v}%`}
                  active={state.settings.streakThreshold === v}
                  onPress={() => actions.setSetting('streakThreshold', v)}
                />
              ))}
            </View>
          </ListRow>
          <ListRow theme={theme} paddingVertical={2}>
            <Toggle
              theme={theme}
              value={state.settings.gamification}
              onChange={(v) => actions.setSetting('gamification', v)}
              label="Levels and achievements"
              sub="Turn off for a plain, numbers-only experience."
            />
          </ListRow>
        </Group>

        <Group theme={theme} title="Projects" footer={state.projects.length ? null : 'Create projects from the Tasks screen.'}>
          {state.projects.length ? (
            state.projects.map((p) => (
              <ListRow key={p.id} theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 11 }}>{p.icon}</Text>
                  <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.text }}>{p.name}</Text>
                  <Text style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginRight: 14 }}>
                    {state.tasks.filter((t) => t.projectId === p.id).length} tasks
                  </Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete project?', `Tasks in "${p.name}" move back to the Inbox.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => actions.deleteProject(p.id) },
                      ])
                    }
                    hitSlop={theme.hit}
                  >
                    <Icon name="close" size={13} color={theme.colors.danger} weight={2} />
                  </Pressable>
                </View>
              </ListRow>
            ))
          ) : (
            <ListRow theme={theme}>
              <Text style={{ ...theme.type.callout, color: theme.colors.textTertiary }}>No projects yet</Text>
            </ListRow>
          )}
        </Group>

        <Group
          theme={theme}
          title="Your data"
          footer="Everything lives on this device. Your original todo list was migrated in place, and the pre-migration file is still stored untouched as a backup."
        >
          <ListRow theme={theme} paddingVertical={14}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.entries(counts).map(([key, value]) => (
                <View key={key} style={{ width: '50%', paddingVertical: 5 }}>
                  <Text style={{ ...theme.type.subhead, color: theme.colors.textSecondary }}>
                    <Text style={{ fontWeight: '700', color: theme.colors.text }}>{value}</Text> {key}
                  </Text>
                </View>
              ))}
            </View>
          </ListRow>
          <ListRow theme={theme} onPress={() => setExportVisible(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, ...theme.type.callout, color: theme.colors.primary }}>
                View / copy raw data
              </Text>
              <Icon name="chevronRight" size={13} color={theme.colors.textQuaternary} weight={2} />
            </View>
          </ListRow>
          <ListRow theme={theme} onPress={confirmReset}>
            <Text style={{ ...theme.type.callout, color: theme.colors.danger }}>Erase all data</Text>
          </ListRow>
        </Group>

        <View style={{ paddingHorizontal: theme.screen + 6, marginTop: 30 }}>
          <Text
            style={{
              ...theme.type.footnote,
              color: theme.colors.textQuaternary,
              textAlign: 'center',
              lineHeight: 19,
            }}
          >
            Tasks are actions. Habits are repeated actions. Commitments are what matters.{'\n'}
            Goals are where you are going. Challenges are the push.
          </Text>
        </View>
      </Animated.ScrollView>

      <Sheet theme={theme} visible={exportVisible} onClose={() => setExportVisible(false)} title="Raw data">
        <Text style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginBottom: 12 }}>
          Long-press to select and copy. Keep it somewhere safe as a backup.
        </Text>
        <Text
          selectable
          style={{
            fontSize: 10,
            lineHeight: 14,
            fontFamily: 'monospace',
            color: theme.colors.textSecondary,
            backgroundColor: theme.colors.fill1,
            padding: 12,
            borderRadius: theme.radius.md,
          }}
        >
          {json}
        </Text>
      </Sheet>
    </View>
  );
}

function Group({ theme, title, footer, children }) {
  return (
    <View style={{ paddingHorizontal: theme.screen, marginTop: 26 }}>
      <Text
        style={{
          ...theme.type.footnoteEmph,
          color: theme.colors.textSecondary,
          marginBottom: 9,
          marginLeft: 4,
        }}
      >
        {title}
      </Text>
      <ListGroup theme={theme} footer={footer}>
        {children}
      </ListGroup>
    </View>
  );
}
