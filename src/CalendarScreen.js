import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { GestureHandlerRootView, Swipeable, ScrollView } from 'react-native-gesture-handler';
import { COLORS, categoryInfo, formatMoney, amountUsd } from './theme';
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

function CalendarTxRow({ t, onEdit, onDelete }) {
  const ref = React.useRef(null);
  const info = categoryInfo(t.type, t.category);
  const isIncome = t.type === 'income';
  const d = parseKey(t.occurredOn || t.date);
  const close = () => ref.current && ref.current.close();
  const rowInner = (
    <View style={styles.txRow}>
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
        {isIncome ? '+' : '−'}{formatMoney(t.amount, t.currency)}
      </Text>
    </View>
  );
  if (t.bondId || !onEdit) return rowInner;
  return (
    <Swipeable
      ref={ref}
      overshootRight={false}
      friction={2}
      rightThreshold={36}
      activeOffsetX={[-12, 12]}
      failOffsetY={[-16, 16]}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#4C8DFF' }]} onPress={() => { close(); onEdit(t); }}>
            <CatIcon name="pencil" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: COLORS.expense }]} onPress={() => { close(); onDelete(t.id); }}>
            <CatIcon name="trash-can-outline" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {rowInner}
    </Swipeable>
  );
}

function CalendarScreen({ visible, transactions = [], onClose, onEdit, onDelete }) {
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
      const usd = amountUsd(t.amount, t.currency);
      if (t.type === 'income') map[k].income += usd;
      else map[k].expense += usd;
      map[k].items.push(t);
    }
    Object.values(map).forEach((g) => g.items.sort((a, b) => String(b.occurredOn || b.date).localeCompare(String(a.occurredOn || a.date))));
    return map;
  }, [transactions]);

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const selectedKey = dayKey(selected);
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-`;
  const monthGroup = useMemo(() => {
    const g = { income: 0, expense: 0, items: [] };
    Object.entries(byDay).forEach(([k, day]) => {
      if (!k.startsWith(monthPrefix)) return;
      g.income += day.income;
      g.expense += day.expense;
      g.items.push(...day.items);
    });
    g.items.sort((a, b) => String(a.occurredOn || a.date).localeCompare(String(b.occurredOn || b.date)));
    return g;
  }, [byDay, monthPrefix]);
  const dayGroup = byDay[selectedKey] || { income: 0, expense: 0, items: [] };
  const listSource = filter ? monthGroup.items : dayGroup.items;
  const dayList = listSource.filter((t) => !filter || t.type === filter);

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
      <GestureHandlerRootView style={{ flex: 1 }}>
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
            <View style={styles.monthCenter}>
              <Text style={styles.monthLabel}>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</Text>
              <TouchableOpacity
                onPress={() => {
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelected(today);
                  setFilter(null);
                }}
                style={styles.todayJump}
              >
                <Text style={styles.todayJumpText}>Today</Text>
              </TouchableOpacity>
            </View>
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
                <TouchableOpacity key={k} style={[styles.cell, isSel && styles.cellSel, isToday && styles.cellTodayBg]} onPress={() => pickDay(d)}>
                  <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                    <Text style={[styles.cellNum, isSel && styles.cellNumSel, isToday && styles.cellNumToday]}>{d.getDate()}</Text>
                  </View>
                  {isToday && <Text style={styles.todayTag}>Today</Text>}
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
                <Text style={[styles.tabLabel, filter === 'income' && styles.tabLabelOn]}>Income · this month</Text>
                <Text style={[styles.tabAmt, { color: COLORS.income }]}>+{formatMoney(monthGroup.income)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, styles.tabExpense, filter === 'expense' && styles.tabExpenseOn]}
                onPress={() => toggleFilter('expense')}
              >
                <Text style={[styles.tabLabel, filter === 'expense' && styles.tabLabelOn]}>Expenses · this month</Text>
                <Text style={[styles.tabAmt, { color: COLORS.expense }]}>−{formatMoney(monthGroup.expense)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listBody} showsVerticalScrollIndicator={false}>
            {dayList.length === 0 && (
              <Text style={styles.empty}>
                {filter === 'income' ? 'No planned income this month.' : filter === 'expense' ? 'No planned expenses this month.' : 'No income or expenses on this day.'}
              </Text>
            )}
            {dayList.length > 0 && <Text style={styles.swipeHint}>Swipe a row left to edit or delete it.</Text>}
            {dayList.map((t) => (
              <CalendarTxRow key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
      </GestureHandlerRootView>
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
  monthCenter: { alignItems: 'center', flex: 1 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  todayJump: { marginTop: 2, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: '#0EA47A18' },
  todayJumpText: { fontSize: 11, fontWeight: '800', color: COLORS.header, letterSpacing: 0.3 },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '14.285%', minHeight: 62, alignItems: 'center', paddingVertical: 4, borderRadius: 10 },
  cellSel: { backgroundColor: '#0EA47A14' },
  cellTodayBg: { backgroundColor: '#0EA47A10' },
  dayBadge: { minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  dayBadgeToday: { backgroundColor: COLORS.header, borderRadius: 11, minWidth: 22, paddingHorizontal: 5 },
  cellNum: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  cellNumSel: { color: COLORS.header },
  cellNumToday: { color: '#FFFFFF' },
  todayTag: { fontSize: 8, fontWeight: '800', color: COLORS.header, marginTop: 1, letterSpacing: 0.2 },
  cellAmt: { minHeight: 22, alignItems: 'center', marginTop: 1 },
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
  swipeHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  txDay: { width: 34, alignItems: 'center', marginRight: 8 },
  txDayNum: { fontSize: 15, fontWeight: '800', color: COLORS.header, lineHeight: 18 },
  txDayMon: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  txNote: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
