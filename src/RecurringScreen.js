import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { COLORS, categoryInfo, formatMoney, ordinal } from './theme';
import { CatIcon } from './Icons';
import { seriesIdOf } from './recurring';

function RecurringRow({ item, onEdit, onRemove }) {
  const info = categoryInfo(item.type, item.category);
  const isIncome = item.type === 'income';
  const day = item.repeatDay || 1;
  const months = item.repeatMonths || 12;
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: info.color + '22' }]}>
        <CatIcon name={info.icon} color={info.color} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{info.label}</Text>
        {!!item.note && <Text style={styles.note}>{item.note}</Text>}
        <Text style={styles.meta}>
          {ordinal(day)} each month · {months} cycle{months > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
          {isIncome ? '+' : '−'}{formatMoney(item.amount)}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actBtn} onPress={() => onEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CatIcon name="pencil-outline" size={18} color={COLORS.header} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={() => onRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CatIcon name="trash-can-outline" size={18} color={COLORS.expense} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function RecurringScreen({ visible, items, onClose, onEdit, onRemove }) {
  const [pending, setPending] = useState(null);
  const income = items.filter((t) => t.type === 'income');
  const expenses = items.filter((t) => t.type === 'expense');

  useEffect(() => {
    if (!visible) setPending(null);
  }, [visible]);

  function confirmRemove(item) {
    setPending(item);
  }

  function doRemove() {
    if (!pending) return;
    onRemove(seriesIdOf(pending));
    setPending(null);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.head}>
          <TouchableOpacity onPress={onClose} style={styles.headBtn}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Repeating</Text>
          <View style={styles.headBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {items.length === 0 && (
            <Text style={styles.empty}>No repeating income or expenses yet. Turn on “Repeat monthly” when you add one.</Text>
          )}

          {income.length > 0 && (
            <>
              <Text style={styles.section}>Earnings</Text>
              <View style={styles.card}>
                {income.map((t) => (
                  <RecurringRow key={t.id} item={t} onEdit={onEdit} onRemove={confirmRemove} />
                ))}
              </View>
            </>
          )}

          {expenses.length > 0 && (
            <>
              <Text style={styles.section}>Expenses</Text>
              <View style={styles.card}>
                {expenses.map((t) => (
                  <RecurringRow key={t.id} item={t} onEdit={onEdit} onRemove={confirmRemove} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
        {pending && (
          <View style={styles.confirmBar}>
            <Text style={styles.confirmText}>
              Remove {categoryInfo(pending.type, pending.category).label}
              {pending.note ? ` · ${pending.note}` : ''}?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setPending(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRemove} onPress={doRemove}>
                <Text style={styles.confirmRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  headBtn: { width: 46, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  back: { fontSize: 34, color: COLORS.text, marginTop: -6 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.text },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  empty: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 40, lineHeight: 22, paddingHorizontal: 16 },
  section: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 14, marginBottom: 10, marginLeft: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  note: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  amount: { fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  confirmBar: {
    marginHorizontal: 16, marginBottom: 20, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  confirmCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  confirmRemove: {
    flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.expense,
  },
  confirmRemoveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
