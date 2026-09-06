import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { COLORS, categoryInfo, formatMoney } from './theme';
import { CatIcon } from './Icons';
import { parseKey } from './recurring';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function compact(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  if (v >= 100) return String(Math.round(v));
  return v.toFixed(v % 1 ? 0 : 0);
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function CalendarScreen({ visible, transactions = [], onClose }) {
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const [filter, setFilter] = useState(null); // 'income' | 'expense' | null

  useEffect(() => {
    if (visible) {
      setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelected(today);
      setFilter(null);
    }
  }, [visible, today]);

  const byDay = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const k = t.occurredOn || (t.date && String(t.date).slice(0, 10));
      if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      if (!map[k]) map[k] = { income: 0, expense: 0, items: [] };
      if (t.type === 'income') map[k].income += Number(t.amount) || 0;
      else map[k].expense += Number(t.amount) || 0;
      map[k].items.push(t);
    }
    Object.values(map).forEach((g) => g.items.sort((a, b) => String(b.occurredOn || b.date).localeCompare(String(a.occurredOn || a.date))));
    return map;
  }, [transactions]);

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const selectedKey = dayKey(selected);
  const dayGroup = byDay[selectedKey] || { income: 0, expense: 0, items: [] };
  const dayList = dayGroup.items.filter((t) => !filter || t.type === filter);

  function shiftMonth(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function pickDay(d) {
    setSelected(d);
    setFilter(null);
  }

  function toggleFilter(kind) {
    setFilter((prev) => (prev === kind ? null : kind));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>Calendar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CatIcon name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthBtn}>
              <CatIcon name="chevron-left" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthBtn}>
              <CatIcon name="chevron-right" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={w + i} style={styles.weekDay}>{w}</Text>)}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={`e-${i}`} style={styles.cell} />;
              const k = dayKey(d);
              const g = byDay[k];
              const isSel = k === selectedKey;
              const isToday = k === dayKey(today);
              return (
                <TouchableOpacity key={k} style={[styles.cell, isSel && styles.cellSel]} onPress={() => pickDay(d)}>
                  <Text style={[styles.cellNum, isToday && styles.cellToday, isSel && styles.cellNumSel]}>{d.getDate()}</Text>
                  {g ? (
                    <View style={styles.cellAmt}>
                      {g.income > 0 && <Text style={styles.incTiny}>+{compact(g.income)}</Text>}
                      {g.expense > 0 && <Text style={styles.expTiny}>−{compact(g.expense)}</Text>}
                    </View>
                  ) : <View style={styles.cellAmt} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dayHead}>
            <Text style={styles.dayTitle}>
              {selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, styles.tabIncome, filter === 'income' && styles.tabIncomeOn]}
                onPress={() => toggleFilter('income')}
              >
                <Text style={[styles.tabLabel, filter === 'income' && styles.tabLabelOn]}>Income</Text>
                <Text style={[styles.tabAmt, { color: COLORS.income }]}>+{formatMoney(dayGroup.income)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, styles.tabExpense, filter === 'expense' && styles.tabExpenseOn]}
                onPress={() => toggleFilter('expense')}
              >
                <Text style={[styles.tabLabel, filter === 'expense' && styles.tabLabelOn]}>Expenses</Text>
                <Text style={[styles.tabAmt, { color: COLORS.expense }]}>−{formatMoney(dayGroup.expense)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
            {dayList.length === 0 && (
              <Text style={styles.empty}>
                {filter === 'income' ? 'No income on this day.' : filter === 'expense' ? 'No expenses on this day.' : 'No income or expenses on this day.'}
              </Text>
            )}
            {dayList.map((t) => {
              const info = categoryInfo(t.type, t.category);
              const isIncome = t.type === 'income';
              const d = parseKey(t.occurredOn || t.date);
              return (
                <View key={t.id} style={styles.txRow}>
                  <View style={styles.txDay}>
                    <Text style={styles.txDayNum}>{d ? d.getDate() : '–'}</Text>
                    <Text style={styles.txDayMon}>{d ? d.toLocaleDateString(undefined, { month: 'short' }) : ''}</Text>
                  </View>
                  <View style={[styles.txIcon, { backgroundColor: info.color + '22' }]}>
                    <CatIcon name={info.icon} color={info.color} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txLabel}>{info.label}</Text>
                    {!!t.note && <Text style={styles.txNote}>{t.note}</Text>}
                  </View>
                  <Text style={[styles.txAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
                    {isIncome ? '+' : '−'}{formatMoney(t.amount)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default CalendarScreen;

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,32,0.35)' },
  sheet: {
    height: '92%', backgroundColor: COLORS.card, borderTopLeftRadius: 26, borderTopRightRadius: 26,
  },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginTop: 10, marginBottom: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 8 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '14.285%', minHeight: 58, alignItems: 'center', paddingVertical: 4, borderRadius: 10 },
  cellSel: { backgroundColor: '#0EA47A14' },
  cellNum: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  cellNumSel: { color: COLORS.header },
  cellToday: { color: COLORS.header, textDecorationLine: 'underline' },
  cellAmt: { minHeight: 28, alignItems: 'center', marginTop: 2 },
  incTiny: { fontSize: 9, fontWeight: '700', color: COLORS.income, lineHeight: 12 },
  expTiny: { fontSize: 9, fontWeight: '700', color: COLORS.expense, lineHeight: 12 },
  dayHead: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  dayTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 10 },
  tab: { flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1.5 },
  tabIncome: { backgroundColor: '#0EA47A12', borderColor: '#0EA47A33' },
  tabIncomeOn: { backgroundColor: '#0EA47A22', borderColor: COLORS.income },
  tabExpense: { backgroundColor: '#E5484D12', borderColor: '#E5484D33' },
  tabExpenseOn: { backgroundColor: '#E5484D22', borderColor: COLORS.expense },
  tabLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  tabLabelOn: { color: COLORS.text },
  tabAmt: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  list: { flex: 1 },
  listBody: { paddingHorizontal: 14, paddingBottom: 28 },
  empty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 22, fontSize: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  txDay: { width: 34, alignItems: 'center', marginRight: 8 },
  txDayNum: { fontSize: 15, fontWeight: '800', color: COLORS.header, lineHeight: 18 },
  txDayMon: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  txNote: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '700' },
});
