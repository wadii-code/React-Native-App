/**
 * Text entry.
 *
 * Fields are drawn as filled shapes rather than outlined boxes: on iOS an
 * outline reads as a web form, a fill reads as a control. The focus state is a
 * ring in the accent colour rather than a colour change, so the field does not
 * jump when it gains focus.
 */
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Animated, Pressable, StyleSheet } from 'react-native';
import { withAlpha } from '../../theme';
import Icon from './icons';
import { haptic } from './primitives';

/* ----------------------------------------------------------------- field */

export function Field({ theme, label, hint, children, style, action, onAction }) {
  return (
    <View style={[{ marginBottom: theme.spacing.xl }, style]}>
      {!!label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <Text
            style={{
              ...theme.type.footnoteEmph,
              color: theme.colors.textSecondary,
            }}
          >
            {label}
          </Text>
          {!!action && (
            <Pressable onPress={onAction} hitSlop={theme.hit}>
              <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.primary }}>{action}</Text>
            </Pressable>
          )}
        </View>
      )}
      {children}
      {!!hint && (
        <Text style={{ ...theme.type.footnote, color: theme.colors.textTertiary, marginTop: 7, lineHeight: 18 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------ text field */

export function TextField({ theme, multiline, style, onFocus, onBlur, plain, ...props }) {
  const focus = useRef(new Animated.Value(0)).current;

  const animate = (to) =>
    Animated.timing(focus, { toValue: to, duration: 160, useNativeDriver: false }).start();

  return (
    <Animated.View
      style={{
        borderRadius: theme.radius.md,
        backgroundColor: plain ? 'transparent' : theme.colors.fill1,
        borderWidth: plain ? 0 : 1.5,
        borderColor: focus.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(0,0,0,0)', withAlpha(theme.colors.primary, 0.55)],
        }),
      }}
    >
      <TextInput
        placeholderTextColor={theme.colors.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        selectionColor={theme.colors.primary}
        onFocus={(e) => {
          animate(1);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          animate(0);
          if (onBlur) onBlur(e);
        }}
        style={[
          {
            paddingHorizontal: plain ? 0 : 14,
            paddingVertical: multiline ? 12 : 12,
            ...theme.type.callout,
            color: theme.colors.text,
            minHeight: multiline ? 92 : 46,
          },
          style,
        ]}
        {...props}
      />
    </Animated.View>
  );
}

/* ---------------------------------------------------------- search field */

/**
 * The iOS search field: a rounded fill, a leading glyph that is part of the
 * field rather than an emoji sitting next to it, and a clear button that only
 * exists while there is something to clear.
 */
export function SearchField({ theme, value, onChange, placeholder = 'Search', style, onSubmit, autoFocus }) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height: 38,
          paddingHorizontal: 10,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.fill2,
          borderWidth: 1.5,
          borderColor: focused ? withAlpha(theme.colors.primary, 0.5) : 'transparent',
        },
        style,
      ]}
    >
      <Icon name="search" size={16} color={theme.colors.textTertiary} weight={1.8} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        selectionColor={theme.colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        clearButtonMode="never"
        style={{
          flex: 1,
          marginLeft: 7,
          padding: 0,
          ...theme.type.callout,
          color: theme.colors.text,
        }}
      />
      {!!value && (
        <Pressable
          onPress={() => {
            haptic('selection');
            onChange('');
          }}
          hitSlop={theme.hit}
          style={{
            width: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: theme.colors.textQuaternary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={9} color={theme.colors.surface} weight={1.8} />
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------- inline add */

/**
 * The always-available "add a task" bar that sits above the tab bar on the task
 * list. It grows a detail row only once there is something to attach detail to,
 * so an empty screen shows one line and nothing else.
 */
export function InlineComposer({ theme, value, onChange, onSubmit, placeholder, accessory, submitDisabled }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.fill2,
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            selectionColor={theme.colors.primary}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            style={{ flex: 1, padding: 0, ...theme.type.callout, color: theme.colors.text }}
          />
        </View>
        <Pressable
          onPress={() => {
            if (submitDisabled) return;
            haptic('medium');
            onSubmit();
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: submitDisabled ? theme.colors.fill2 : theme.colors.primary,
          }}
        >
          <Icon
            name="plus"
            size={20}
            color={submitDisabled ? theme.colors.textTertiary : '#FFFFFF'}
            weight={2.4}
          />
        </Pressable>
      </View>
      {accessory}
    </View>
  );
}

export const inputStyles = StyleSheet.create({});
