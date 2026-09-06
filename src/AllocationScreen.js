import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { COLORS, formatMoney, groupDigits } from './theme';
import ScreenHeader from './ScreenHeader';

// The buckets your income gets split into.
const BUCKETS = [
  { key: 'essentials',  label: 'Essentials',  sub: 'Rent, food, bills',      color: '#7C8CA3', def: 50 },
  { key: 'savings',     label: 'Savings',     sub: 'Emergency + goals',      color: '#0EA47A', def: 20 },
  { key: 'investments', label: 'Investments', sub: 'Stocks, retirement',     color: '#4C8DFF', def: 15 },
  { key: 'fun',         label: 'Fun',         sub: 'Guilt-free spending',    color: '#F5A623', def: 15 },
];

export default function AllocationScreen({ visible, income = 0, alloc = {}, setAlloc = () => {}, onClose }) {
  const [amount, setAmount] = useState(String(income || ''));

  const inc = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const total = BUCKETS.reduce((s, b) => s + (alloc[b.key] || 0), 0);
  const adjust = (k, d) => setAlloc({ ...alloc, [k]: Math.max(0, Math.min(100, (alloc[k] || 0) + d)) });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Smart Allocation" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <Text style={styles.lbl}>YOUR MONTHLY INCOME</Text>
          <View style={styles.incomeRow}>
            <Text style={styles.cur}>$</Text>
            <TextInput style={styles.incomeInput} value={groupDigits(amount)}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
          </View>

          <View style={styles.bar}>
            {total > 0 && BUCKETS.map((b) => (
              alloc[b.key] > 0 ? <View key={b.key} style={{ flex: alloc[b.key], backgroundColor: b.color }} /> : null
            ))}
          </View>
          <Text style={[styles.totalNote, total !== 100 && { color: COLORS.expense }]}>
            {total === 100 ? 'Adds up to 100% ✓' : `Adds up to ${total}% — aim for 100%`}
          </Text>

          {BUCKETS.map((b) => (
            <View key={b.key} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: b.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{b.label}</Text>
                <Text style={styles.rowSub}>{b.sub}</Text>
              </View>
              <Text style={styles.rowAmt}>{formatMoney(inc * alloc[b.key] / 100)}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjust(b.key, -5)}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
                <Text style={styles.pct}>{alloc[b.key]}%</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjust(b.key, 5)}><Text style={styles.stepSign}>+</Text></TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={styles.hint}>A common starting point: 50% essentials · 20% savings · 15% investments · 15% fun. Adjust to fit your life.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  body: { padding: 20, paddingBottom: 44 },
  lbl: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, marginBottom: 6 },
  incomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  cur: { fontSize: 28, fontWeight: '700', color: COLORS.header, marginRight: 4 },
  incomeInput: { fontSize: 40, fontWeight: '800', color: COLORS.text, textAlign: 'center', minWidth: 120, padding: 0 },
  bar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.border, marginBottom: 8 },
  totalNote: { fontSize: 12.5, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  rowAmt: { fontSize: 15, fontWeight: '700', color: COLORS.text, width: 92, textAlign: 'right', marginRight: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: -2 },
  pct: { width: 44, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 18, lineHeight: 18 },
});
