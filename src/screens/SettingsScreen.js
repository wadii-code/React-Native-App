import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useApp } from '../store/AppStore';
import { useNav } from '../navigation';
import { useAppTheme } from '../theme';
import { Card, ScreenHeader, SectionTitle, Toggle, OptionRow, Sheet, Chip, Divider } from '../components/ui';

export default function SettingsScreen({ theme }) {
  const { state, actions } = useApp();
  const nav = useNav();
  const { mode, setMode } = useAppTheme();
  const [exportVisible, setExportVisible] = useState(false);

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
    <View style={{ flex: 1 }}>
      <ScreenHeader theme={theme} title="Settings" onBack={nav.goBack} compact />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <SectionTitle theme={theme} title="Appearance" />
          <Card theme={theme}>
            <OptionRow
              theme={theme}
              options={[
                { id: 'system', label: 'System' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Progress rules" />
          <Card theme={theme}>
            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 10 }}>
              How much of a day's plan counts as a day kept, for the productivity streak.
            </Text>
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
            <Divider theme={theme} />
            <Toggle
              theme={theme}
              value={state.settings.gamification}
              onChange={(v) => actions.setSetting('gamification', v)}
              label="Levels and achievements"
              sub="Turn off for a plain, numbers-only experience."
            />
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Projects" />
          <Card theme={theme}>
            {state.projects.length ? (
              state.projects.map((p, i) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: i === state.projects.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 10 }}>{p.icon}</Text>
                  <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text }}>
                    {p.name}
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginRight: 12 }}>
                    {state.tasks.filter((t) => t.projectId === p.id).length} tasks
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete project?', `Tasks in "${p.name}" move back to the Inbox.`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => actions.deleteProject(p.id),
                        },
                      ])
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                No projects yet. Create one from the Tasks screen.
              </Text>
            )}
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionTitle theme={theme} title="Your data" />
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.entries(counts).map(([key, value]) => (
                <View key={key} style={{ width: '50%', paddingVertical: 6 }}>
                  <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                    <Text style={{ fontWeight: '700', color: theme.colors.text }}>{value}</Text> {key}
                  </Text>
                </View>
              ))}
            </View>
            <Divider theme={theme} />
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, lineHeight: 18 }}>
              Everything lives on this device. Your original todo list was migrated in place, and the
              pre-migration file is still stored untouched as a backup.
            </Text>
            <TouchableOpacity onPress={() => setExportVisible(true)} style={{ marginTop: 14 }}>
              <Text style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.primary }}>
                View / copy raw data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmReset} style={{ marginTop: 16 }}>
              <Text style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.danger }}>
                Erase all data
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 18 }}>
            Tasks are actions. Habits are repeated actions. Commitments are what matters.{'\n'}
            Goals are where you are going. Challenges are the push.
          </Text>
        </View>
      </ScrollView>

      <Sheet
        theme={theme}
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        title="Raw data"
      >
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginBottom: 10 }}>
          Long-press to select and copy. Keep it somewhere safe as a backup.
        </Text>
        <Text
          selectable
          style={{
            fontSize: 10,
            fontFamily: 'monospace',
            color: theme.colors.textSecondary,
            backgroundColor: theme.colors.inputBg,
            padding: 12,
            borderRadius: theme.borderRadius.md,
          }}
        >
          {json}
        </Text>
      </Sheet>
    </View>
  );
}
