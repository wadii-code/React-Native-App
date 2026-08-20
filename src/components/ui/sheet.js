/**
 * Bottom sheets.
 *
 * Everything that used to be a centred modal is one of these. The behaviour is
 * the iOS one, not an approximation: the sheet springs up from the bottom, the
 * page behind it dims and recedes, a grabber sits at the top, and the whole
 * sheet follows your finger downward and dismisses if you let go past a
 * threshold or flick it.
 *
 * The pan uses react-native-gesture-handler, which the project already carries
 * for swipe-to-delete, so nothing new is required.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Glass, useSafeArea } from './platform';
import { haptic } from './primitives';
import Icon from './icons';

const SCREEN_H = Dimensions.get('window').height;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

export function Sheet({
  theme,
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '90%',
  /** Optional iOS-style header buttons. Falls back to a plain close glyph. */
  cancelLabel,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  scroll = true,
  detent,
}) {
  const insets = useSafeArea();
  const slide = useRef(new Animated.Value(SCREEN_H)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slide.setValue(SCREEN_H);
      drag.setValue(0);
      fade.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(slide, {
        toValue: 0,
        damping: 26,
        stiffness: 260,
        mass: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, slide, drag, fade]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: SCREEN_H, duration: 230, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      drag.setValue(0);
      onClose();
    });
  }, [slide, fade, drag, onClose]);

  const onGesture = useRef(
    Animated.event([{ nativeEvent: { translationY: drag } }], { useNativeDriver: true })
  ).current;

  const onGestureStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state !== State.END && nativeEvent.state !== State.CANCELLED) return;
    const past = nativeEvent.translationY > DISMISS_DISTANCE;
    const flicked = nativeEvent.velocityY > DISMISS_VELOCITY;
    if (past || flicked) {
      haptic('selection');
      Animated.parallel([
        Animated.timing(drag, {
          toValue: SCREEN_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 0, duration: 190, useNativeDriver: true }),
      ]).start(() => {
        drag.setValue(0);
        slide.setValue(SCREEN_H);
        onClose();
      });
    } else {
      Animated.spring(drag, {
        toValue: 0,
        damping: 24,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  if (!visible) return null;

  // Downward drag only: pulling up must not detach the sheet from the bottom.
  const dragDown = drag.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });
  const translateY = Animated.add(slide, dragDown);
  const backdropOpacity = Animated.multiply(
    fade,
    drag.interpolate({
      inputRange: [0, 260],
      outputRange: [1, 0.35],
      extrapolate: 'clamp',
    })
  );

  const hasHeaderButtons = !!(cancelLabel || confirmLabel);

  /**
   * Only the grabber and the header answer to the drag. Letting the whole sheet
   * pan would fight the scroll view inside it: every downward flick through a
   * long form would start dismissing the sheet instead of scrolling it.
   */
  const handle = (
    <View>
      {/* grabber */}
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: hasHeaderButtons || title ? 4 : 10 }}>
        <View
          style={{
            width: 36,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: theme.colors.textQuaternary,
            opacity: 0.7,
          }}
        />
      </View>

      {(hasHeaderButtons || !!title) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.screen,
            paddingTop: 6,
            paddingBottom: 14,
          }}
        >
          <View style={{ minWidth: 62, alignItems: 'flex-start' }}>
            {!!cancelLabel && (
              <Pressable onPress={close} hitSlop={theme.hit}>
                <Text style={{ ...theme.type.body, color: theme.colors.primary }}>{cancelLabel}</Text>
              </Pressable>
            )}
          </View>
          <Text numberOfLines={1} style={{ ...theme.type.headline, color: theme.colors.text, flex: 1, textAlign: 'center' }}>
            {title}
          </Text>
          <View style={{ minWidth: 62, alignItems: 'flex-end' }}>
            {confirmLabel ? (
              <Pressable
                onPress={() => {
                  if (confirmDisabled) return;
                  haptic('light');
                  onConfirm();
                }}
                hitSlop={theme.hit}
              >
                <Text
                  style={{
                    ...theme.type.headline,
                    color: confirmDisabled ? theme.colors.textQuaternary : theme.colors.primary,
                  }}
                >
                  {confirmLabel}
                </Text>
              </Pressable>
            ) : (
              !cancelLabel && (
                <Pressable
                  onPress={close}
                  hitSlop={theme.hit}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.colors.fill2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="close" size={12} color={theme.colors.textSecondary} weight={2} />
                </Pressable>
              )
            )}
          </View>
        </View>
      )}
    </View>
  );

  const body = (
    <>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.screen,
            paddingBottom: 8,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: theme.screen }}>{children}</View>
      )}

      {!!footer && <View style={{ paddingHorizontal: theme.screen }}>{footer}</View>}
      <View style={{ height: Math.max(insets.bottom, 12) }} />
    </>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]} />
          <Pressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xxl,
                borderTopRightRadius: theme.radius.xxl,
                maxHeight: detent === 'medium' ? '58%' : maxHeight,
                transform: [{ translateY }],
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
              },
              theme.shadow.lg,
            ]}
          >
            <PanGestureHandler
              onGestureEvent={onGesture}
              onHandlerStateChange={onGestureStateChange}
              activeOffsetY={8}
              failOffsetY={-12}
            >
              {handle}
            </PanGestureHandler>
            {body}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------- footer bar */

/**
 * The confirm / cancel pair at the bottom of an editing sheet. Kept because
 * every editor in the app calls it; restyled so the primary action carries the
 * weight and the secondary one steps back.
 */
export function SheetActions({
  theme,
  onCancel,
  onConfirm,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  disabled,
  destructive,
  onDelete,
  deleteLabel = 'Delete',
}) {
  return (
    <View style={{ marginTop: theme.spacing.md, marginBottom: 4 }}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          haptic('light');
          onConfirm();
        }}
        style={({ pressed }) => ({
          height: 50,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          backgroundColor: disabled
            ? theme.colors.fill2
            : destructive
            ? theme.colors.danger
            : theme.colors.primary,
        })}
      >
        <Text
          style={{
            ...theme.type.headline,
            color: disabled ? theme.colors.textTertiary : '#FFFFFF',
          }}
        >
          {confirmLabel}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
        <Pressable onPress={onCancel} style={{ paddingVertical: 12, paddingHorizontal: 18 }}>
          <Text style={{ ...theme.type.callout, color: theme.colors.textSecondary }}>{cancelLabel}</Text>
        </Pressable>
        {!!onDelete && (
          <>
            <View style={{ width: 1, height: 14, backgroundColor: theme.colors.border }} />
            <Pressable
              onPress={() => {
                haptic('warning');
                onDelete();
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 18 }}
            >
              <Text style={{ ...theme.type.callout, color: theme.colors.danger }}>{deleteLabel}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------ action sheet */

/**
 * A short list of choices presented from the bottom - the native alternative to
 * a row of filter chips or a dropdown. Used for sorting, which used to be a
 * second row of pills sitting permanently under the search bar.
 */
export function ActionSheet({ theme, visible, onClose, title, message, options, value, destructiveId }) {
  const insets = useSafeArea();
  const slide = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slide.setValue(SCREEN_H);
      fade.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, damping: 28, stiffness: 300, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, slide, fade]);

  const dismiss = (cb) => {
    Animated.parallel([
      Animated.timing(slide, { toValue: SCREEN_H, duration: 210, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      if (cb) cb();
    });
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => dismiss()} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fade }]}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]} />
          <Pressable style={{ flex: 1 }} onPress={() => dismiss()} />
        </Animated.View>

        <Animated.View
          style={{
            paddingHorizontal: 10,
            paddingBottom: Math.max(insets.bottom, 10),
            transform: [{ translateY: slide }],
          }}
        >
          <Glass
            theme={theme}
            intensity={80}
            radius={theme.radius.lg}
            style={{ overflow: 'hidden', marginBottom: 8 }}
          >
            {(!!title || !!message) && (
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}>
                {!!title && (
                  <Text style={{ ...theme.type.footnoteEmph, color: theme.colors.textSecondary }}>{title}</Text>
                )}
                {!!message && (
                  <Text style={{ ...theme.type.caption, color: theme.colors.textTertiary, marginTop: 3, textAlign: 'center' }}>
                    {message}
                  </Text>
                )}
              </View>
            )}
            {options.map((opt, i) => (
              <View key={String(opt.id)}>
                {(i > 0 || !!title || !!message) && (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.glassHairline }} />
                )}
                <Pressable
                  onPress={() => {
                    haptic('selection');
                    dismiss(opt.onPress);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 15,
                    alignItems: 'center',
                    backgroundColor: pressed ? theme.colors.fill2 : 'transparent',
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!!opt.glyph && (
                      <Icon
                        name={opt.glyph}
                        size={16}
                        color={opt.id === destructiveId ? theme.colors.danger : theme.colors.primary}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text
                      style={{
                        ...theme.type.body,
                        fontWeight: value === opt.id ? '600' : '400',
                        color: opt.id === destructiveId ? theme.colors.danger : theme.colors.primary,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {value === opt.id && (
                      <Icon name="check" size={15} color={theme.colors.primary} style={{ marginLeft: 8 }} weight={2.2} />
                    )}
                  </View>
                </Pressable>
              </View>
            ))}
          </Glass>

          <Glass theme={theme} intensity={80} radius={theme.radius.lg} style={{ overflow: 'hidden' }}>
            <Pressable
              onPress={() => dismiss()}
              style={({ pressed }) => ({
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: pressed ? theme.colors.fill2 : 'transparent',
              })}
            >
              <Text style={{ ...theme.type.headline, color: theme.colors.text }}>Cancel</Text>
            </Pressable>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}
