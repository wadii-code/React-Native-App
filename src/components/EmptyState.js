import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmptyState({ theme, filter, searchQuery }) {
  if (searchQuery) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>No results</Text>
        <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
          No tasks match "{searchQuery}"
        </Text>
        <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
          Try a different search term
        </Text>
      </View>
    );
  }

  const messages = {
    all: {
      icon: '✨',
      title: 'No tasks yet',
      sub: 'Add your first task below to get started',
      hint: 'Swipe left on tasks to delete them',
    },
    active: {
      icon: '🎉',
      title: 'All caught up!',
      sub: 'You have no active tasks',
      hint: 'Great job staying on top of things!',
    },
    completed: {
      icon: '📝',
      title: 'Nothing completed yet',
      sub: 'Complete a task to see it here',
      hint: 'Tap the checkbox to mark tasks as done',
    },
  };

  const msg = messages[filter] || messages.all;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{msg.icon}</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{msg.title}</Text>
      <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>{msg.sub}</Text>
      <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>{msg.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
