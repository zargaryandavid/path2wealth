import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, formatMoney } from './theme';

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

  let offsetAcc = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {/* Faint full ring so the donut always looks complete. */}
          <Circle cx={cx} cy={cy} r={radius} stroke={COLORS.border} strokeWidth={strokeWidth} fill="none" />
          {total > 0 &&
            data.map((d) => {
              const dash = (d.value / total) * circumference;
              const gap = circumference - dash;
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
                  onPress={() => onSelectSlice(d.key === selectedKey ? null : d.key)}
                />
              );
            })}
        </G>
      </Svg>

      {/* The number in the middle of the donut. */}
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerLabel}>{centerLabel}</Text>
        <Text style={styles.centerAmount}>{formatMoney(centerAmount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: 2 },
  centerAmount: { color: COLORS.text, fontSize: 25, fontWeight: '700' },
});
