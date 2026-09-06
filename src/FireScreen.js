import React, { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, TextInput, Dimensions } from 'react-native';
import Svg, { Polyline, Polygon, Line, Circle } from 'react-native-svg';
import { COLORS, formatMoney, groupDigits } from './theme';
import ScreenHeader from './ScreenHeader';

// Projects your portfolio forward month by month and finds when it hits your
// "FIRE number" = 25x annual expenses (the classic 4% rule).
function project({ start, monthly, ratePct, annualExpenses }) {
  const R = (parseFloat(ratePct) || 0) / 100;
  const mr = Math.pow(1 + R, 1 / 12) - 1;
  const fireNumber = (parseFloat(annualExpenses) || 0) * 25;
  let p = parseFloat(start) || 0;
  const M = parseFloat(monthly) || 0;
  const data = [{ year: 0, value: p }];
  let hitMonth = null;
  for (let m = 1; m <= 600; m++) {
    p = p * (1 + mr) + M;
    if (hitMonth === null && fireNumber > 0 && p >= fireNumber) hitMonth = m;
    if (m % 12 === 0) data.push({ year: m / 12, value: p });
  }
  const years = hitMonth ? Math.min(50, Math.ceil(hitMonth / 12) + 1) : 50;
  return { fireNumber, hitMonth, data: data.slice(0, years + 1) };
}

function GrowthChart({ data, fireNumber, width, height = 170 }) {
  if (!data || data.length < 2) return null;
  const pad = 10;
  const maxV = (Math.max(fireNumber || 0, ...data.map((d) => d.value)) || 1) * 1.05;
  const lastYear = data[data.length - 1].year || 1;
  const X = (i) => pad + (data[i].year / lastYear) * (width - 2 * pad);
  const Y = (v) => height - pad - (v / maxV) * (height - 2 * pad);
  const line = data.map((d, i) => `${X(i)},${Y(d.value)}`).join(' ');
  const area = `${X(0)},${height - pad} ${line} ${X(data.length - 1)},${height - pad}`;
  const fireY = fireNumber ? Y(fireNumber) : null;
  return (
    <Svg width={width} height={height}>
      <Polygon points={area} fill={COLORS.header + '22'} />
      <Polyline points={line} fill="none" stroke={COLORS.header} strokeWidth={2.5} />
      {fireY !== null && fireY > pad && fireY < height - pad && (
        <Line x1={pad} y1={fireY} x2={width - pad} y2={fireY} stroke={COLORS.expense} strokeWidth={1.5} strokeDasharray="5 4" />
      )}
      <Circle cx={X(data.length - 1)} cy={Y(data[data.length - 1].value)} r={4} fill={COLORS.header} />
    </Svg>
  );
}

// Module-level so its TextInput keeps focus between keystrokes.
function NumberField({ label, value, onChange, kind }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputBox}>
        {kind === 'money' && <Text style={styles.prefix}>$</Text>}
        <TextInput
          style={styles.input}
          value={kind === 'money' ? groupDigits(value) : value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted}
        />
        {kind === 'percent' && <Text style={styles.suffix}>%</Text>}
      </View>
    </View>
  );
}

export default function FireScreen({ visible, currentSavings = 0, monthlyContribution = 0, annualExpensesGuess = 0, sources = [], onClose }) {
  const [start, setStart] = useState(String(Math.round(currentSavings) || ''));
  const [monthly, setMonthly] = useState(String(Math.round(monthlyContribution) || ''));
  const [rate, setRate] = useState('7');
  const [expenses, setExpenses] = useState(String(Math.round(annualExpensesGuess) || ''));

  const { fireNumber, hitMonth, data } = useMemo(
    () => project({ start, monthly, ratePct: rate, annualExpenses: expenses }),
    [start, monthly, rate, expenses]
  );

  const chartWidth = Dimensions.get('window').width - 72;
  const yLabel = hitMonth
    ? (() => { const y = Math.floor(hitMonth / 12), mo = hitMonth % 12; return `${y} yr${y === 1 ? '' : 's'}${mo ? ` ${mo} mo` : ''}`; })()
    : 'Not within 50 years';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="FIRE forecast" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>YOU CAN RETIRE IN</Text>
            <Text style={styles.heroValue}>{yLabel}</Text>
            <Text style={styles.heroSub}>Target: {formatMoney(fireNumber)} (25× yearly spending)</Text>
          </View>

          <View style={styles.chartCard}>
            <GrowthChart data={data} fireNumber={fireNumber} width={chartWidth} />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.lg, { backgroundColor: COLORS.header }]} /><Text style={styles.legendText}>Your portfolio</Text></View>
              <View style={styles.legendItem}><View style={[styles.lg, { backgroundColor: COLORS.expense }]} /><Text style={styles.legendText}>FIRE target</Text></View>
            </View>
          </View>

          <NumberField label="Current savings & investments" value={start} onChange={setStart} kind="money" />
          {sources.length > 0 && (
            <Text style={styles.breakdown}>Includes {sources.map((x) => `${x.label} ${formatMoney(x.amount)}`).join('  ·  ')}</Text>
          )}
          <NumberField label="Investing each month" value={monthly} onChange={setMonthly} kind="money" />
          <NumberField label="Expected annual return" value={rate} onChange={setRate} kind="percent" />
          <NumberField label="Your yearly spending (in retirement)" value={expenses} onChange={setExpenses} kind="money" />

          <Text style={styles.disclaimer}>
            An estimate, not financial advice. It assumes steady contributions and a constant average return — real markets rise and fall.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  body: { padding: 20, paddingBottom: 44 },
  hero: { alignItems: 'center', marginBottom: 18 },
  heroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: COLORS.textMuted },
  heroValue: { fontSize: 34, fontWeight: '800', color: COLORS.header, marginTop: 4 },
  heroSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  chartCard: { backgroundColor: COLORS.background, borderRadius: 18, padding: 16, marginBottom: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lg: { width: 12, height: 4, borderRadius: 2 },
  legendText: { fontSize: 12, color: COLORS.textMuted },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: COLORS.textMuted, marginBottom: 7 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14 },
  prefix: { fontSize: 16, color: COLORS.header, fontWeight: '700', marginRight: 6 },
  suffix: { fontSize: 16, color: COLORS.textMuted, fontWeight: '700' },
  input: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 13 },
  breakdown: { fontSize: 12, color: COLORS.textMuted, marginTop: -8, marginBottom: 14, lineHeight: 17 },
  disclaimer: { fontSize: 12, color: COLORS.textMuted, marginTop: 12, lineHeight: 17 },
});
