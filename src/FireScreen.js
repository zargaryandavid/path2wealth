import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, TextInput, Dimensions } from 'react-native';
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS, formatMoney, groupDigits } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';
import { buildSituation } from './fireInsight';

// Projects your portfolio forward month by month and finds when it hits your
// "FIRE number" = 25x annual expenses (the classic 4% rule).
function project({ start, monthly, ratePct, annualExpenses }) {
  const R = (parseFloat(ratePct) || 0) / 100;
  const mr = Math.pow(1 + R, 1 / 12) - 1;
  const fireNumber = (parseFloat(annualExpenses) || 0) * 25;
  let p = parseFloat(start) || 0;
  const M = parseFloat(monthly) || 0;
  const data = [{ year: 0, value: p }];
  let hitMonth = fireNumber > 0 && p >= fireNumber ? 0 : null;
  for (let m = 1; m <= 600; m++) {
    p = p * (1 + mr) + M;
    if (hitMonth === null && fireNumber > 0 && p >= fireNumber) hitMonth = m;
    if (m % 12 === 0) data.push({ year: m / 12, value: p });
  }
  let years = 25;
  if (hitMonth === 0) years = 10;
  else if (hitMonth != null) years = Math.min(40, Math.max(8, Math.ceil(hitMonth / 12) + 5));
  return { fireNumber, hitMonth, data: data.slice(0, years + 1) };
}

function compactAxis(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `$${Math.round(v)}`;
}

function fireAxisLabel(hitMonth) {
  if (hitMonth == null) return null;
  const y = Math.floor(hitMonth / 12);
  const mo = hitMonth % 12;
  if (hitMonth === 0) return 'now';
  if (!mo) return `${y}y`;
  return `${y}y ${mo}m`;
}

function GrowthChart({ data, fireNumber, hitMonth, width, height = 200 }) {
  if (!data || data.length < 2) return null;
  const padL = 40, padR = 14, padT = 16, padB = 34;
  const fire = Number(fireNumber) || 0;
  const startV = data[0].value || 0;
  const peak = Math.max(fire, ...data.map((d) => d.value), 1);
  // Keep the target in the middle of the chart when you are already past it.
  const maxV = (hitAlready => (hitAlready ? Math.max(fire, startV) * 1.35 : peak * 1.08))(fire > 0 && startV >= fire);
  const lastYear = Math.max(1, data[data.length - 1].year || 1);
  const X = (year) => padL + (year / lastYear) * (width - padL - padR);
  const Y = (v) => {
    const t = Math.min(1, Math.max(0, v / maxV));
    return padT + (1 - t) * (height - padT - padB);
  };
  const pts = data.map((d) => `${X(d.year)},${Y(d.value)}`).join(' ');
  const area = `${X(0)},${height - padB} ${pts} ${X(data[data.length - 1].year)},${height - padB}`;
  const fireY = fire ? Y(fire) : null;
  const hitYear = hitMonth != null ? hitMonth / 12 : null;
  const hitX = hitYear != null ? X(Math.min(hitYear, lastYear)) : null;
  const hitLabel = fireAxisLabel(hitMonth);
  const hitCalendar = hitMonth != null ? new Date().getFullYear() + Math.floor(hitMonth / 12) : null;
  const ticks = [0, lastYear].map((y) => Math.round(y));
  return (
    <Svg width={width} height={height}>
      <Polygon points={area} fill={COLORS.header + '22'} />
      {fireY != null && (
        <Line x1={padL} y1={fireY} x2={width - padR} y2={fireY} stroke={COLORS.expense} strokeWidth={1.5} strokeDasharray="5 4" />
      )}
      {hitX != null && fireY != null && (
        <Line x1={hitX} y1={fireY} x2={hitX} y2={height - padB} stroke={COLORS.expense} strokeWidth={1.5} strokeDasharray="4 4" />
      )}
      <Polyline points={pts} fill="none" stroke={COLORS.header} strokeWidth={2.5} />
      <Circle cx={X(data[data.length - 1].year)} cy={Y(Math.min(data[data.length - 1].value, maxV))} r={4} fill={COLORS.header} />
      {hitX != null && fireY != null && (
        <Circle cx={hitX} cy={fireY} r={5} fill={COLORS.expense} stroke="#FFFFFF" strokeWidth={2} />
      )}
      <SvgText x={4} y={Y(Math.min(startV, maxV)) + 4} fontSize="10" fill={COLORS.textMuted}>{compactAxis(startV)}</SvgText>
      {fire > 0 && (
        <SvgText x={4} y={Math.min(height - padB - 2, Math.max(12, fireY + 4))} fontSize="10" fill={COLORS.expense}>{compactAxis(fire)}</SvgText>
      )}
      {ticks.map((y) => (
        <SvgText key={y} x={X(y)} y={height - 16} fontSize="10" fill={COLORS.textMuted} textAnchor={y === 0 ? 'start' : 'end'}>{y}y</SvgText>
      ))}
      {hitX != null && hitLabel && (
        <>
          <SvgText x={hitX} y={height - 16} fontSize="11" fontWeight="700" fill={COLORS.expense} textAnchor="middle">{hitLabel}</SvgText>
          {hitCalendar != null && hitMonth > 0 && (
            <SvgText x={hitX} y={height - 3} fontSize="10" fill={COLORS.expense} textAnchor="middle">{String(hitCalendar)}</SvgText>
          )}
        </>
      )}
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

export default function FireScreen({
  visible, currentSavings = 0, monthlyContribution = 0, annualExpensesGuess = 0,
  sources = [], monthlyBills = [], monthlyIncome = 0, liquidSavings = 0, emergencyFund = 0, age = '', goal = '', onClose,
}) {
  const [start, setStart] = useState(String(Math.round(currentSavings) || ''));
  const [monthly, setMonthly] = useState(String(Math.round(monthlyContribution) || ''));
  const [rate, setRate] = useState('7');
  const [expenses, setExpenses] = useState(String(Math.round(annualExpensesGuess) || ''));

  useEffect(() => {
    if (!visible) return;
    setStart(String(Math.round(currentSavings) || ''));
    setMonthly(String(Math.round(monthlyContribution) || ''));
    setExpenses(String(Math.round(annualExpensesGuess) || ''));
  }, [visible, currentSavings, monthlyContribution, annualExpensesGuess]);

  const { fireNumber, hitMonth, data } = useMemo(
    () => project({ start, monthly, ratePct: rate, annualExpenses: expenses }),
    [start, monthly, rate, expenses]
  );

  const situation = useMemo(
    () => buildSituation({
      sources,
      monthlyBills,
      monthlyIncome,
      monthlyInvest: parseFloat(monthly) || 0,
      annualSpend: parseFloat(expenses) || 0,
      start: parseFloat(start) || 0,
      fireNumber,
      hitMonth,
      goal,
      liquidSavings,
      emergencyFund,
      age,
    }),
    [sources, monthlyBills, monthlyIncome, monthly, expenses, start, fireNumber, hitMonth, goal, liquidSavings, emergencyFund, age]
  );

  const chartWidth = Dimensions.get('window').width - 72;
  const yLabel = hitMonth === 0
    ? 'Already there'
    : hitMonth != null
      ? (() => { const y = Math.floor(hitMonth / 12), mo = hitMonth % 12; return `${y} yr${y === 1 ? '' : 's'}${mo ? ` ${mo} mo` : ''}`; })()
      : 'Not within 50 years';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="FIRE forecast" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>YOU CAN RETIRE IN</Text>
            <Text style={styles.heroValue}>{yLabel}</Text>
            <Text style={styles.heroSub}>Target: {formatMoney(fireNumber)} (25× yearly spending)</Text>
          </View>

          <View style={styles.chartCard}>
            <GrowthChart data={data} fireNumber={fireNumber} hitMonth={hitMonth} width={chartWidth} />
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
          <Text style={styles.breakdown}>From Smart allocation (savings + investments)</Text>
          <NumberField label="Expected annual return" value={rate} onChange={setRate} kind="percent" />
          <NumberField label="Your yearly spending (in retirement)" value={expenses} onChange={setExpenses} kind="money" />
            <Text style={styles.breakdown}>From repeating bills × 12, or this month’s spending × 12, whichever is higher</Text>

          <View style={styles.aiCard}>
            <View style={styles.aiHead}>
              <CatIcon name="creation" size={20} color={COLORS.header} />
              <Text style={styles.aiTitle}>Assets & liabilities</Text>
            </View>
            <View style={styles.aiCols}>
              <View style={styles.aiCol}>
                <Text style={styles.aiColLbl}>Assets</Text>
                <Text style={[styles.aiColAmt, { color: COLORS.income }]}>{formatMoney(situation.assets)}</Text>
                {sources.length === 0 && <Text style={styles.aiLine}>No assets tracked yet</Text>}
                {sources.map((x) => (
                  <View key={x.label} style={styles.aiRow}>
                    <Text style={styles.aiLine} numberOfLines={1}>{x.label}</Text>
                    <Text style={styles.aiLineAmt}>{formatMoney(x.amount)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.aiCol}>
                <Text style={styles.aiColLbl}>Liabilities</Text>
                <Text style={[styles.aiColAmt, { color: situation.bills ? COLORS.expense : COLORS.text }]}>
                  {situation.bills ? `${formatMoney(situation.bills)}/mo` : formatMoney(0)}
                </Text>
                {monthlyBills.length === 0 && (
                  <Text style={styles.aiLine}>No repeating bills or debts tracked</Text>
                )}
                {monthlyBills.map((x, i) => (
                  <View key={`${x.label}-${i}`} style={styles.aiRow}>
                    <Text style={styles.aiLine} numberOfLines={1}>{x.label}</Text>
                    <Text style={styles.aiLineAmt}>{formatMoney(x.amount)}</Text>
                  </View>
                ))}
                {situation.bills > 0 && (
                  <Text style={styles.aiFoot}>{formatMoney(situation.annualBills)} / year</Text>
                )}
              </View>
            </View>
            <View style={styles.aiNet}>
              <Text style={styles.aiNetLbl}>Net position (no loan balances stored)</Text>
              <Text style={styles.aiNetAmt}>{formatMoney(situation.assets)}</Text>
            </View>
          </View>

          <View style={styles.aiCard}>
            <View style={styles.aiHead}>
              <CatIcon name="comment-text-outline" size={20} color="#4C8DFF" />
              <Text style={styles.aiTitle}>Situation brief</Text>
            </View>
            {situation.notes.map((n, i) => (
              <Text key={i} style={styles.aiNote}>{n}</Text>
            ))}
          </View>

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
  aiCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 14, marginBottom: 14 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  aiCols: { flexDirection: 'row', gap: 12 },
  aiCol: { flex: 1, minWidth: 0 },
  aiColLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  aiColAmt: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  aiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 4 },
  aiLine: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  aiLineAmt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  aiFoot: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  aiNet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  aiNetLbl: { flex: 1, fontSize: 12, color: COLORS.textMuted, marginRight: 8 },
  aiNetAmt: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  aiNote: { fontSize: 13.5, color: COLORS.text, lineHeight: 20, marginBottom: 10 },
  disclaimer: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
});
