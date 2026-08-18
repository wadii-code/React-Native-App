import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { withAlpha } from '../theme';
import { keyWeekday, keyToTs } from '../utils';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The contribution-graph view of a habit: one column per week, Monday at the
 * top. A glance should answer "am I actually doing this?" before any number is
 * read, so intensity carries the signal and everything else stays quiet.
 */
export default function Heatmap({
  theme,
  data,
  color,
  cellSize = 13,
  gap = 3,
  onPressDay,
  showMonths = true,
  scrollable = true,
}) {
  if (!data || !data.length) return null;
  const tint = color || theme.colors.primary;

  // Pad the first week so rows line up with weekdays (Monday first).
  const firstWd = keyWeekday(data[0].key);
  const lead = firstWd === 0 ? 6 : firstWd - 1;
  const cells = [...Array(lead).fill(null), ...data];

  const columns = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  const cellColor = (cell) => {
    if (!cell) return 'transparent';
    if (cell.done) return tint;
    if (cell.partial) return withAlpha(tint, 0.45);
    if (cell.missed) return withAlpha(theme.colors.danger, 0.16);
    if (!cell.scheduled) return withAlpha(theme.colors.heatEmpty, 0.5);
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
                  height: 12,
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
                borderRadius: 3,
                marginBottom: gap,
                backgroundColor: cellColor(cell),
              };
              if (!cell) return <View key={ri} style={style} />;
              if (!onPressDay) return <View key={cell.key} style={style} />;
              return (
                <TouchableOpacity
                  key={cell.key}
                  activeOpacity={0.6}
                  onPress={() => onPressDay(cell)}
                  style={style}
                />
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

export function HeatLegend({ theme, color, style }) {
  const tint = color || theme.colors.primary;
  const steps = [theme.colors.heatEmpty, withAlpha(tint, 0.35), withAlpha(tint, 0.65), tint];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginRight: 6 }}>Less</Text>
      {steps.map((c, i) => (
        <View
          key={i}
          style={{ width: 10, height: 10, borderRadius: 2.5, backgroundColor: c, marginRight: 3 }}
        />
      ))}
      <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginLeft: 3 }}>More</Text>
    </View>
  );
}

/** Compact seven-day strip used on habit cards and the Today screen. */
export function WeekStrip({ theme, data, color, size = 26 }) {
  const tint = color || theme.colors.primary;
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {data.map((cell, i) => (
        <View key={cell.key} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: theme.colors.textTertiary, marginBottom: 4 }}>
            {labels[i % 7]}
          </Text>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cell.done
                ? tint
                : cell.missed
                ? withAlpha(theme.colors.danger, 0.14)
                : theme.colors.heatEmpty,
              borderWidth: cell.today ? 1.5 : 0,
              borderColor: theme.colors.text,
            }}
          >
            {cell.done && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>✓</Text>}
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
        {data.map((d, i) => (
          <View key={d.label + i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(3, (d.value / max) * (height - 18)),
                borderRadius: 5,
                backgroundColor: d.muted ? theme.colors.track : withAlpha(tint, 0.25 + 0.75 * (d.value / max)),
              }}
            />
          </View>
        ))}
      </View>
      {showLabels && (
        <View style={{ flexDirection: 'row', marginTop: 6, gap: 4 }}>
          {data.map((d, i) => (
            <Text
              key={d.label + i}
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 9,
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
            backgroundColor: d.hasPlan ? withAlpha(tint, 0.3 + 0.7 * (d.percent / 100)) : theme.colors.track,
          }}
        />
      ))}
    </View>
  );
}

export const heatStyles = StyleSheet.create({});
