/**
 * Consistency, drawn.
 *
 * A glance should answer "am I actually doing this?" before any number is read,
 * so intensity carries the signal and everything else stays quiet: no grid
 * lines, no legend unless asked for, no labels competing with the cells.
 *
 * Everything here is plain views. No chart dependency, and none needed.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, Animated, StyleSheet } from 'react-native';
import { withAlpha } from '../theme';
import { keyWeekday, keyToTs } from '../utils';
import Icon from './ui/icons';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toColumns(data) {
  // Pad the first week so rows line up with weekdays (Monday first).
  const firstWd = keyWeekday(data[0].key);
  const lead = firstWd === 0 ? 6 : firstWd - 1;
  const cells = [...Array(lead).fill(null), ...data];
  const columns = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}

/**
 * The full contribution graph: one column per week, Monday at the top.
 * A missed scheduled day is tinted rather than left blank, because the gap is
 * the information.
 */
export default function Heatmap({
  theme,
  data,
  color,
  cellSize = 13,
  gap = 3.5,
  onPressDay,
  showMonths = true,
  scrollable = true,
  radius,
}) {
  if (!data || !data.length) return null;
  const tint = color || theme.colors.primary;
  const columns = toColumns(data);
  const r = radius == null ? Math.max(2.5, cellSize * 0.28) : radius;

  const cellColor = (cell) => {
    if (!cell) return 'transparent';
    if (cell.done) return tint;
    if (cell.partial) return withAlpha(tint, 0.45);
    if (cell.missed) return withAlpha(theme.colors.danger, theme.dark ? 0.22 : 0.14);
    if (!cell.scheduled) return withAlpha(theme.colors.heatEmpty, 0.45);
    return theme.colors.heatEmpty;
  };

  const grid = (
    <View style={{ flexDirection: 'row' }}>
      {columns.map((column, ci) => {
        const firstReal = column.find(Boolean);
        const monthLabel =
          showMonths && firstReal && new Date(keyToTs(firstReal.key)).getDate() <= 7
            ? MONTH_LABELS[new Date(keyToTs(firstReal.key)).getMonth()]
            : '';
        return (
          <View key={ci} style={{ marginRight: gap }}>
            {showMonths && (
              <Text
                style={{
                  fontSize: 9,
                  height: 13,
                  color: theme.colors.textTertiary,
                  fontWeight: '600',
                }}
              >
                {monthLabel}
              </Text>
            )}
            {column.map((cell, ri) => {
              const style = {
                width: cellSize,
                height: cellSize,
                borderRadius: r,
                marginBottom: gap,
                backgroundColor: cellColor(cell),
                borderWidth: cell && cell.today ? 1.4 : 0,
                borderColor: theme.colors.text,
              };
              if (!cell) return <View key={ri} style={style} />;
              if (!onPressDay) return <View key={cell.key} style={style} />;
              return (
                <Pressable key={cell.key} onPress={() => onPressDay(cell)} style={style} />
              );
            })}
          </View>
        );
      })}
    </View>
  );

  if (!scrollable) return grid;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 4 }}
      // Newest weeks matter most, so open at the right-hand edge.
      ref={(ref) => ref && ref.scrollToEnd({ animated: false })}
    >
      {grid}
    </ScrollView>
  );
}

/**
 * The compact grid that lives on a habit card: the last N weeks only, sized to
 * fit a phone width without scrolling. This is the shape that makes a list of
 * habits readable as a whole - you can compare two habits' consistency without
 * opening either one.
 */
export function MiniGrid({ theme, data, color, weeks = 10, cellSize = 9, gap = 3 }) {
  if (!data || !data.length) return null;
  const tint = color || theme.colors.primary;
  const columns = toColumns(data).slice(-weeks);

  return (
    <View style={{ flexDirection: 'row' }}>
      {columns.map((column, ci) => (
        <View key={ci} style={{ marginRight: ci === columns.length - 1 ? 0 : gap }}>
          {column.map((cell, ri) => (
            <View
              key={cell ? cell.key : ri}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: cellSize * 0.3,
                marginBottom: ri === 6 ? 0 : gap,
                backgroundColor: !cell
                  ? 'transparent'
                  : cell.done
                  ? tint
                  : cell.partial
                  ? withAlpha(tint, 0.45)
                  : cell.missed
                  ? withAlpha(theme.colors.danger, theme.dark ? 0.2 : 0.13)
                  : cell.scheduled
                  ? theme.colors.heatEmpty
                  : withAlpha(theme.colors.heatEmpty, 0.45),
                borderWidth: cell && cell.today ? 1.2 : 0,
                borderColor: withAlpha(tint, 0.9),
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function HeatLegend({ theme, color, style }) {
  const tint = color || theme.colors.primary;
  const steps = [theme.colors.heatEmpty, withAlpha(tint, 0.35), withAlpha(tint, 0.65), tint];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginRight: 6 }}>Less</Text>
      {steps.map((c, i) => (
        <View
          key={i}
          style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c, marginRight: 3 }}
        />
      ))}
      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginLeft: 3 }}>More</Text>
    </View>
  );
}

/** Seven days, labelled. Used on habit detail and inside the check-in card. */
export function WeekStrip({ theme, data, color, size = 30 }) {
  const tint = color || theme.colors.primary;
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {data.map((cell, i) => (
        <View key={cell.key} style={{ alignItems: 'center' }}>
          <Text style={{ ...theme.type.caption2, color: theme.colors.textTertiary, marginBottom: 6 }}>
            {labels[i % 7]}
          </Text>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size * 0.32,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cell.done
                ? tint
                : cell.missed
                ? withAlpha(theme.colors.danger, theme.dark ? 0.2 : 0.12)
                : theme.colors.heatEmpty,
              borderWidth: cell.today ? 1.6 : 0,
              borderColor: withAlpha(tint, 0.9),
            }}
          >
            {cell.done && <Icon name="check" size={size * 0.44} color="#FFFFFF" weight={2.2} />}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Minimal bar chart - plain views, no chart dependency. */
export function BarChart({ theme, data, color, height = 96, showLabels = true }) {
  const tint = color || theme.colors.primary;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 5 }}>
        {data.map((d, i) => (
          <View key={d.label + i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <GrowBar
              height={Math.max(3, (d.value / max) * (height - 18))}
              delay={i * 45}
              color={d.muted ? theme.colors.track : withAlpha(tint, 0.3 + 0.7 * (d.value / max))}
            />
          </View>
        ))}
      </View>
      {showLabels && (
        <View style={{ flexDirection: 'row', marginTop: 7, gap: 5 }}>
          {data.map((d, i) => (
            <Text
              key={d.label + i}
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 9.5,
                fontWeight: '500',
                color: theme.colors.textTertiary,
              }}
            >
              {d.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** A bar that grows out of the axis instead of appearing at full height. */
function GrowBar({ height, color, delay }) {
  const t = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const anim = Animated.spring(t, {
      toValue: 1,
      delay,
      damping: 18,
      stiffness: 180,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        width: '100%',
        height,
        borderRadius: 6,
        backgroundColor: color,
        transform: [{ scaleY: t }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [height / 2, 0] }) }],
      }}
    />
  );
}

/** A 30/90-day trend line approximated with thin bars - calm, not noisy. */
export function TrendStrip({ theme, data, color, height = 54 }) {
  const tint = color || theme.colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 2 }}>
      {data.map((d) => (
        <View
          key={d.key}
          style={{
            flex: 1,
            height: Math.max(2, (d.percent / 100) * height),
            borderRadius: 2,
            backgroundColor: d.hasPlan
              ? withAlpha(tint, 0.28 + 0.72 * (d.percent / 100))
              : theme.colors.track,
          }}
        />
      ))}
    </View>
  );
}

export const heatStyles = StyleSheet.create({});
