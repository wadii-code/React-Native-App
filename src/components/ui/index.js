/**
 * The shared UI kit. Every screen is assembled from these, which is what keeps
 * tasks, habits, challenges and commitments feeling like one product instead of
 * four apps sharing a tab bar.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { withAlpha } from '../../theme';

/* ------------------------------------------------------------------ card */

export function Card({ theme, children, style, onPress, padded = true, tint }) {
  const body = (
    <View
      style={[
        {
          backgroundColor: tint || theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: padded ? theme.spacing.lg : 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
      {body}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ chip */

export function Chip({ theme, label, icon, active, onPress, color, small, style }) {
  const tint = color || theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={
        onPress
          ? () => {
              Haptics.selectionAsync();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: small ? 8 : 12,
          paddingVertical: small ? 4 : 8,
          borderRadius: theme.borderRadius.pill,
          backgroundColor: active ? withAlpha(tint, 0.14) : theme.colors.chip,
          borderWidth: 1,
          borderColor: active ? withAlpha(tint, 0.4) : 'transparent',
        },
        style,
      ]}
    >
      {!!icon && (
        <Text style={{ fontSize: small ? 10 : 12, marginRight: 5 }}>{icon}</Text>
      )}
      <Text
        style={{
          fontSize: small ? theme.fontSize.xs : theme.fontSize.sm,
          fontWeight: active ? '600' : '500',
          color: active ? tint : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------- progress */

export function ProgressBar({ theme, percent, color, height = 8, style, track }) {
  const value = Math.max(0, Math.min(100, percent || 0));
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track || theme.colors.track,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${value}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color || theme.colors.primary,
        }}
      />
    </View>
  );
}

/**
 * A ring drawn with two clipped half-circles - no SVG dependency needed.
 * The right half covers 0-50%, the left half 50-100%.
 */
export function ProgressRing({
  theme,
  percent = 0,
  size = 92,
  stroke = 8,
  color,
  children,
  trackColor,
}) {
  const value = Math.max(0, Math.min(100, percent));
  const tint = color || theme.colors.primary;
  const half = size / 2;

  const arc = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderTopColor: tint,
    borderRightColor: tint,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: trackColor || theme.colors.track,
        }}
      />
      <View
        style={{ position: 'absolute', width: half, height: size, left: half, overflow: 'hidden' }}
      >
        <View
          style={[
            arc,
            { left: -half, transform: [{ rotate: `${value <= 50 ? -180 + value * 3.6 : 0}deg` }] },
          ]}
        />
      </View>
      {value > 50 && (
        <View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden' }}>
          <View style={[arc, { left: 0, transform: [{ rotate: `${(value - 50) * 3.6}deg` }] }]} />
        </View>
      )}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------- segmented */

export function Segmented({ theme, options, value, onChange, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.chip,
          borderRadius: theme.borderRadius.md,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.id);
            }}
            activeOpacity={0.8}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: theme.borderRadius.sm + 1,
              backgroundColor: active ? theme.colors.surface : 'transparent',
              alignItems: 'center',
              ...(active
                ? {
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : null),
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: active ? '600' : '500',
                color: active ? theme.colors.text : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- header */

export function SectionTitle({ theme, title, action, onAction, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.colors.textSecondary,
        }}
      >
        {title}
      </Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text
            style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}
          >
            {action}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ScreenHeader({ theme, title, subtitle, onBack, right, compact }) {
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.xl,
        paddingTop: compact ? theme.spacing.sm : theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
      }}
    >
      {!!onBack && (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginBottom: 6, alignSelf: 'flex-start' }}
        >
          <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '600' }}>
            {'‹'}  Back
          </Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: compact ? theme.fontSize.xl : theme.fontSize.xxl,
              fontWeight: '700',
              color: theme.colors.text,
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.textSecondary,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}

export function RoundButton({ theme, icon, onPress, color, size = 38, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color || theme.colors.chip,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.42, color: theme.colors.text }}>{icon}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------- stat tile */

export function StatTile({ theme, label, value, sub, color, icon, style, onPress }) {
  const tint = color || theme.colors.text;
  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        {!!icon && <Text style={{ fontSize: 12, marginRight: 4 }}>{icon}</Text>}
        <Text
          numberOfLines={1}
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.textSecondary,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: tint, letterSpacing: -0.5 }}>
        {value}
      </Text>
      {!!sub && (
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.75} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

/* ----------------------------------------------------------- empty state */

export function EmptyBlock({ theme, icon, title, sub, actionLabel, onAction, compact }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 48, paddingHorizontal: 32 }}>
      <Text style={{ fontSize: compact ? 30 : 40, marginBottom: 10 }}>{icon}</Text>
      <Text
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.text,
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {!!sub && (
        <Text
          style={{
            fontSize: theme.fontSize.md,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: 21,
          }}
        >
          {sub}
        </Text>
      )}
      {!!actionLabel && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={{
            marginTop: 18,
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: theme.fontSize.md }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- inputs */

export function Field({ theme, label, hint, children, style }) {
  return (
    <View style={[{ marginBottom: theme.spacing.lg }, style]}>
      {!!label && (
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.colors.textSecondary,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}
      {children}
      {!!hint && (
        <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 6 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function TextField({ theme, multiline, style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.textTertiary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        {
          backgroundColor: theme.colors.inputBg,
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 13,
          fontSize: theme.fontSize.md,
          color: theme.colors.text,
          minHeight: multiline ? 88 : 46,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function OptionRow({ theme, options, value, onChange, columns }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        const tint = opt.color || theme.colors.primary;
        return (
          <TouchableOpacity
            key={String(opt.id)}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.id);
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: theme.borderRadius.md,
              borderWidth: 1,
              width: columns ? `${100 / columns - 2}%` : undefined,
              backgroundColor: active ? withAlpha(tint, 0.14) : theme.colors.inputBg,
              borderColor: active ? tint : theme.colors.border,
            }}
          >
            {!!opt.icon && <Text style={{ fontSize: 13, marginRight: 6 }}>{opt.icon}</Text>}
            {!!opt.dot && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginRight: 6,
                  backgroundColor: opt.color,
                }}
              />
            )}
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: active ? '600' : '500',
                color: active ? tint : theme.colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Toggle({ theme, value, onChange, label, sub }) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!value);
      }}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}>{label}</Text>
        {!!sub && (
          <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 }}>
            {sub}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 48,
          height: 29,
          borderRadius: 15,
          padding: 2,
          backgroundColor: value ? theme.colors.success : theme.colors.track,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 25,
            height: 25,
            borderRadius: 13,
            backgroundColor: '#FFF',
            alignSelf: value ? 'flex-end' : 'flex-start',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

/* ----------------------------------------------------------------- sheet */

export function Sheet({ theme, visible, onClose, title, children, footer, maxHeight = '88%' }) {
  const slide = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(400);
      fade.setValue(0);
    }
  }, [visible, slide, fade]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 400, duration: 180, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay, opacity: fade }]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.borderRadius.xxl,
            borderTopRightRadius: theme.borderRadius.xxl,
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: 30,
            maxHeight,
            transform: [{ translateY: slide }],
          }}
        >
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.colors.border,
              alignSelf: 'center',
              marginTop: 10,
              marginBottom: 14,
            }}
          />
          {!!title && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text }}>
                {title}
              </Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.textTertiary }}>
                  {'✕'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {children}
          </ScrollView>
          {footer}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetActions({ theme, onCancel, onConfirm, confirmLabel = 'Save', disabled, destructive, onDelete }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
      {!!onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.dangerLight,
          }}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: '600', fontSize: theme.fontSize.md }}>
            Delete
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onCancel}
        style={{
          flex: 1,
          paddingVertical: 14,
          borderRadius: theme.borderRadius.md,
          backgroundColor: theme.colors.inputBg,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', fontSize: theme.fontSize.md }}>
          Cancel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onConfirm}
        disabled={disabled}
        style={{
          flex: 1.4,
          paddingVertical: 14,
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          backgroundColor: disabled
            ? theme.colors.chip
            : destructive
            ? theme.colors.danger
            : theme.colors.primary,
        }}
      >
        <Text
          style={{
            color: disabled ? theme.colors.textTertiary : '#FFF',
            fontWeight: '700',
            fontSize: theme.fontSize.md,
          }}
        >
          {confirmLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------------------------------------------------------------- misc */

export function Divider({ theme, style }) {
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 12 },
        style,
      ]}
    />
  );
}

export function Checkbox({ theme, checked, onPress, color, size = 24, radius }) {
  const tint = color || theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius == null ? size / 2 : radius,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: checked ? tint : theme.colors.border,
        backgroundColor: checked ? tint : 'transparent',
      }}
    >
      {checked && (
        <Text style={{ color: '#FFF', fontSize: size * 0.55, fontWeight: '700' }}>{'✓'}</Text>
      )}
    </TouchableOpacity>
  );
}

export function LinkRow({ theme, icon, label, value, onPress, color }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
      }}
    >
      {!!icon && <Text style={{ fontSize: 16, marginRight: 12 }}>{icon}</Text>}
      <Text style={{ flex: 1, fontSize: theme.fontSize.md, color: color || theme.colors.text }}>
        {label}
      </Text>
      {!!value && (
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary, marginRight: 6 }}>
          {value}
        </Text>
      )}
      <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.textTertiary }}>{'›'}</Text>
    </TouchableOpacity>
  );
}
