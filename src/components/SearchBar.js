import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function SearchBar({ theme, query, onChange }) {
  const s = styles(theme);
  return (
    <View style={s.container}>
      <View style={s.inputRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.input}
          placeholder="Search tasks..."
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={onChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.xl,
      paddingVertical: t.spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.inputBg,
      borderRadius: t.borderRadius.md,
      paddingHorizontal: t.spacing.md,
      height: 44,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: t.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: t.fontSize.md,
      color: t.colors.text,
      padding: 0,
    },
    clearBtn: {
      fontSize: 14,
      color: t.colors.textTertiary,
      paddingLeft: t.spacing.sm,
    },
  });
