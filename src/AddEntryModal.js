import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatMoney, groupDigits, ordinal } from './theme';
import { CatIcon } from './Icons';

// Simple stepper: −  value  +
function Stepper({ label, value, onDec, onInc }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={onDec}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={onInc}><Text style={styles.stepSign}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// The pop-up sheet for adding money in (+) or out (-).
// Everyday flow is just amount + category. Recurring is tucked behind the Repeat button.
export default function AddEntryModal({ visible, initialType = 'expense', initialEntry = null, onClose, onSave }) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [categoryKey, setCategoryKey] = useState(null);
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [repeatDay, setRepeatDay] = useState(new Date().getDate());
  const [repeatMonths, setRepeatMonths] = useState(12);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const editing = !!initialEntry;

  useEffect(() => {
    if (!visible) return;
    if (initialEntry) {
      setType(initialEntry.type);
      setAmount(String(initialEntry.amount ?? ''));
      setCategoryKey(initialEntry.category || null);
      setNote(initialEntry.note || '');
      setRecurring(!!initialEntry.recurring);
      setRepeatDay(initialEntry.repeatDay || new Date().getDate());
      setRepeatMonths(initialEntry.repeatMonths || 12);
    } else {
      setType(initialType);
      setAmount('');
      setCategoryKey(null);
      setNote('');
      setRecurring(false);
      setRepeatDay(new Date().getDate());
      setRepeatMonths(12);
    }
  }, [visible, initialType, initialEntry]);

  const numericAmount = parseFloat(amount) || 0;
  const canSave = numericAmount > 0 && !!categoryKey;
  const accent = type === 'income' ? COLORS.income : COLORS.expense;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: initialEntry?.id || Date.now().toString(),
      type,
      amount: numericAmount,
      category: categoryKey,
      note: note.trim(),
      recurring,
      repeatDay,
      repeatMonths,
      date: initialEntry?.date || new Date().toISOString(),
    });
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {/* Expense / Income toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: COLORS.expense }]}
              onPress={() => { setType('expense'); setCategoryKey(null); }}
            >
              <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>−  Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: COLORS.income }]}
              onPress={() => { setType('income'); setCategoryKey(null); }}
            >
              <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>+  Income</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountRow}>
            <Text style={[styles.amountCurrency, { color: accent }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: accent }]}
              value={groupDigits(amount)}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Category picker — all shown, no scrolling */}
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.catGrid}>
            {categories.map((c) => {
              const active = c.key === categoryKey;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catItem, active && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                  onPress={() => setCategoryKey(c.key)}
                >
                  <CatIcon name={c.icon} size={22} color={active ? c.color : COLORS.text} />
                  <Text style={styles.catLabel}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Repeat — only appears once a category is chosen */}
          {!!categoryKey && (<>
          <TouchableOpacity
            style={[styles.repToggle, recurring && { borderColor: COLORS.header, backgroundColor: '#0EA47A14' }]}
            onPress={() => setRecurring((r) => !r)}
            activeOpacity={0.85}
          >
            <CatIcon name="autorenew" size={20} color={recurring ? COLORS.header : COLORS.textMuted} />
            <Text style={[styles.repToggleText, recurring && { color: COLORS.header }]}>Repeat monthly</Text>
          </TouchableOpacity>

          {recurring && (
            <View style={styles.repPanel}>
              <Stepper label="Day of month" value={ordinal(repeatDay)}
                onDec={() => setRepeatDay((d) => clamp(d - 1, 1, 31))}
                onInc={() => setRepeatDay((d) => clamp(d + 1, 1, 31))} />
              <Stepper label="Payment cycles" value={`${repeatMonths} mo`}
                onDec={() => setRepeatMonths((m) => clamp(m - 1, 1, 36))}
                onInc={() => setRepeatMonths((m) => clamp(m + 1, 1, 36))} />
              <Text style={styles.repHelp}>
                Repeats on the {ordinal(repeatDay)} each month · {repeatMonths} time{repeatMonths > 1 ? 's' : ''} (max 36 = 3 years).
              </Text>
            </View>
          )}
          </>)}

          {/* Optional note */}
          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accent, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveText}>{editing ? 'Update' : 'Save'} {numericAmount > 0 ? formatMoney(numericAmount) : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: 14 },
  toggle: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 14, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  toggleText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#FFFFFF' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  amountCurrency: { fontSize: 32, fontWeight: '700', marginRight: 4 },
  amountInput: { fontSize: 44, fontWeight: '700', minWidth: 100, textAlign: 'center', padding: 0 },
  sectionLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10, marginTop: 8, fontWeight: '700', letterSpacing: 0.5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  catItem: {
    width: '22.6%', aspectRatio: 1, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, gap: 5,
  },
  catLabel: { fontSize: 11, color: COLORS.text },
  repToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12, backgroundColor: COLORS.card,
  },
  repToggleText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  repPanel: { marginTop: 10, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.background },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  stepLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: -2 },
  stepValue: { minWidth: 60, textAlign: 'center', fontSize: 15, fontWeight: '700', color: COLORS.text },
  repHelp: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 6, lineHeight: 17 },
  note: {
    backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, marginTop: 14,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.background },
  cancelText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
