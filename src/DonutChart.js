import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, formatMoney } from './theme';

function compactMoney(amount) {
  const n = Number(amount) || 0;
  if (Math.abs(n - Math.round(n)) >= 0.005) return formatMoney(n);
  const sign = n < 0 ? '-' : '';
  const intPart = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + '$' + intPart;
}

// The donut chart. We draw it by hand with SVG circles instead of using a
// heavy chart library, so it stays fast and always works inside Expo Go.
// Each slice is one circle with a dashed outline sized to its share of the total.
export default function DonutChart({
  data = [],              // [{ key, label, value, color }]
  size = 230,
  strokeWidth = 34,
  centerTitle = 'Spent',
  selectedKey = null,
  onSelectSlice = () => {},
}) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // If a slice is tapped, the middle shows that slice; otherwise the grand total.
  const selected = data.find((d) => d.key === selectedKey);
  const centerAmount = selected ? selected.value : total;
  const centerLabel = selected ? selected.label : centerTitle;
  const amountText = compactMoney(centerAmount);
  const hole = Math.max(48, size - strokeWidth - 8);
  const amountSize = Math.max(10, Math.min(22, Math.floor((hole - 16) / Math.max(amountText.length * 0.72, 4))));

  let offsetAcc = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {/* Faint full ring so the donut always looks complete. */}
          <Circle cx={cx} cy={cy} r={radius} stroke={COLORS.border} strokeWidth={strokeWidth} fill="none" />
          {total > 0 &&
            data.filter((d) => Number(d.value) > 0).map((d) => {
              const dash = (Number(d.value) / total) * circumference;
              const gap = Math.max(0, circumference - dash);
              const dashOffset = -offsetAcc;
              offsetAcc += dash;
              const dimmed = selectedKey && d.key !== selectedKey;
              return (
                <Circle
                  key={d.key}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={d.color}
                  strokeWidth={dimmed ? strokeWidth * 0.6 : strokeWidth}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={dashOffset}
                  fill="none"
                  opacity={dimmed ? 0.35 : 1}
                />
              );
            })}
        </G>
      </Svg>

      {/* The number in the middle of the donut. */}
      <Pressable
        style={[styles.center, { width: hole, height: hole }]}
        onPress={() => onSelectSlice(null)}
      >
        <Text style={[styles.centerLabel, { fontSize: Math.max(10, Math.round(size * 0.07)) }]} numberOfLines={1}>
          {centerLabel}
        </Text>
        <Text style={[styles.centerAmount, { fontSize: amountSize, width: hole - 12 }]} numberOfLines={1}>
          {amountText}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerLabel: { color: COLORS.textMuted, marginBottom: 2, textAlign: 'center' },
  centerAmount: { color: COLORS.text, fontWeight: '700', textAlign: 'center' },
});
