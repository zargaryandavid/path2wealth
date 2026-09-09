import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { COLORS, formatMoney, groupDigits, currencySymbol, amountUsd } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';

const FIELD_H = 48;
const CURRENCIES = [
  { code: 'USD', label: 'USD $' }, { code: 'AMD', label: 'AMD ֏' },
  { code: 'EUR', label: 'EUR €' }, { code: 'GBP', label: 'GBP £' },
  { code: 'JPY', label: 'JPY ¥' }, { code: 'CHF', label: 'CHF' },
  { code: 'CAD', label: 'CAD $' }, { code: 'AUD', label: 'AUD $' },
];

function annualIncome(profile) {
  return parseFloat(String((profile && profile.income) || '').replace(/[^0-9.]/g, '')) * 12 || 0;
}

function rothTaxFree(account, profile) {
  const balance = Number(account.balance) || 0;
  const putIn = Math.min(Number(account.contributions != null ? account.contributions : balance) || 0, balance);
  const earnings = Math.max(0, balance - putIn);
  const age = (profile && profile.age) || '';
  const qualified = age === '55+';
  const amount = qualified ? balance : putIn;
  return { amount, putIn, earnings, qualified, age, yearly: annualIncome(profile) };
}

function showRothTax(account, profile) {
  const t = rothTaxFree(account, profile);
  const ageLine = t.age ? `Your profile age is ${t.age}.` : 'Add your age in Profile for a tighter estimate.';
  const body = t.qualified
    ? `${ageLine}\n\nAt 55+ we treat this as a qualified Roth. About ${formatMoney(t.amount, account.currency)} of ${account.name} is not taxable to withdraw.\n\n(The IRS cutoff is 59½ and a 5-year clock — confirm with a tax pro.)`
    : `${ageLine}\n\nBefore 59½, only contributions come out tax-free.\n\nNot taxable now: ${formatMoney(t.amount, account.currency)}\nEarnings that may be taxed: ${formatMoney(t.earnings, account.currency)}\n\n${t.yearly >= 150000 ? 'Your income may also limit new Roth contributions this year.\n\n' : ''}Hold again after you update the balance.`;
  Alert.alert('Roth IRA — not taxable', body, [{ text: 'OK' }]);
}

function CurrencyPick({ value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const selected = CURRENCIES.find((c) => c.code === value) || CURRENCIES[0];
  const sym = currencySymbol(selected.code);
  return (
    <>
      <TouchableOpacity
        style={compact ? styles.curPickCompact : styles.curPick}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={compact ? styles.curPickSym : styles.curPickText} numberOfLines={1}>
          {compact ? sym : selected.label}
        </Text>
        <Text style={compact ? styles.curPickChevCompact : styles.curPickChev}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.pickBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickSheet}>
            {CURRENCIES.map((c) => {
              const on = c.code === value;
              return (
                <TouchableOpacity key={c.code} style={[styles.pickRow, on && styles.pickRowOn]} onPress={() => { onChange(c.code); setOpen(false); }}>
                  <Text style={[styles.pickText, on && styles.pickTextOn]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function SavingsScreen({ visible, accounts = [], setAccounts, profile, onClose }) {
  const [name, setName] = useState('');
  const [bal, setBal] = useState('');
  const [kind, setKind] = useState('savings');
  const [currency, setCurrency] = useState('USD');

  const total = accounts.reduce((s, a) => s + amountUsd(a.balance, a.currency), 0);
  const patch = (id, fields) => setAccounts(accounts.map((a) => (a.id === id ? { ...a, ...fields } : a)));
  const remove = (id) => setAccounts(accounts.filter((a) => a.id !== id));
  const add = () => {
    if (!name.trim() && kind !== 'roth') return;
    const balance = parseFloat(bal.replace(/[^0-9.]/g, '')) || 0;
    setAccounts([...accounts, {
      id: Date.now().toString(),
      name: name.trim() || 'Roth IRA',
      kind,
      balance,
      currency,
      contributions: kind === 'roth' ? balance : undefined,
    }]);
    setName(''); setBal(''); setKind('savings'); setCurrency('USD');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Savings" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL SAVED</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            <Text style={styles.totalSub}>across {accounts.length} account{accounts.length === 1 ? '' : 's'}</Text>
          </View>

          <Text style={styles.section}>MY ACCOUNTS</Text>
          {accounts.map((a) => {
            const isRoth = a.kind === 'roth';
            const code = a.currency || 'USD';
            return (
              <View key={a.id} style={styles.acctRow}>
                <Pressable
                  style={[styles.acctIcon, isRoth && styles.acctIconRoth]}
                  onLongPress={() => isRoth && showRothTax(a, profile)}
                  delayLongPress={350}
                  disabled={!isRoth}
                >
                  <CatIcon name={isRoth ? 'shield-check' : 'piggy-bank'} size={20} color={COLORS.header} />
                </Pressable>
                <TextInput
                  style={styles.acctName}
                  value={a.name}
                  onChangeText={(v) => patch(a.id, { name: v })}
                  placeholder="Account name"
                  placeholderTextColor={COLORS.textMuted}
                  numberOfLines={1}
                />
                <CurrencyPick value={code} onChange={(c) => patch(a.id, { currency: c })} compact />
                <TextInput
                  style={styles.acctInput}
                  value={groupDigits(String(a.balance || 0))}
                  onChangeText={(v) => patch(a.id, { balance: parseFloat(v.replace(/[^0-9.]/g, '')) || 0 })}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity onPress={() => remove(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.acctClose}>
                  <CatIcon name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
          {accounts.length === 0 && <Text style={styles.empty}>No accounts yet — add one below.</Text>}
          {accounts.some((a) => a.kind === 'roth') && (
            <Text style={styles.rothHint}>Hold the shield on a Roth IRA to see how much is not taxable.</Text>
          )}

          <Text style={styles.section}>ADD AN ACCOUNT</Text>
          <View style={styles.addBox}>
            <View style={styles.kindRow}>
              <TouchableOpacity style={[styles.kindChip, kind === 'savings' && styles.kindChipOn]} onPress={() => setKind('savings')}>
                <CatIcon name="piggy-bank" size={16} color={kind === 'savings' ? COLORS.header : COLORS.textMuted} />
                <Text style={[styles.kindText, kind === 'savings' && styles.kindTextOn]}>Savings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.kindChip, kind === 'roth' && styles.kindChipOn]} onPress={() => { setKind('roth'); if (!name.trim()) setName('Roth IRA'); }}>
                <CatIcon name="shield-check" size={16} color={kind === 'roth' ? COLORS.header : COLORS.textMuted} />
                <Text style={[styles.kindText, kind === 'roth' && styles.kindTextOn]}>Roth IRA</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.addName} value={name} onChangeText={setName}
              placeholder={kind === 'roth' ? 'Roth IRA' : 'Account name (e.g. Vacation)'} placeholderTextColor={COLORS.textMuted} />
            <View style={styles.addBalRow}>
              <CurrencyPick value={currency} onChange={setCurrency} />
              <View style={styles.addBal}>
                <Text style={styles.acctCur}>{currencySymbol(currency)}</Text>
                <TextInput style={styles.acctInput} value={groupDigits(bal)}
                  onChangeText={(v) => setBal(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={add}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  body: { padding: 20, paddingBottom: 44 },
  totalCard: { backgroundColor: COLORS.header, borderRadius: 20, padding: 22, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  totalValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', marginTop: 4 },
  totalSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, marginTop: 22, marginBottom: 10 },
  acctRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', height: FIELD_H, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  acctIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA47A18', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 },
  acctIconRoth: { backgroundColor: '#0EA47A28' },
  acctName: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, fontSize: 15, fontWeight: '600', color: COLORS.text, paddingVertical: 0, paddingHorizontal: 4 },
  acctCur: { fontSize: 15, color: COLORS.header, fontWeight: '700', marginRight: 4, includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 },
  acctInput: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 52, maxWidth: 96, flexShrink: 0, padding: 0, marginLeft: 6, marginRight: 4,
    textAlign: 'right', includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20,
  },
  acctClose: { flexShrink: 0 },
  empty: { color: COLORS.textMuted, fontSize: 14, paddingVertical: 12 },
  rothHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 17 },
  addBox: { backgroundColor: COLORS.background, borderRadius: 14, padding: 12 },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kindChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: FIELD_H, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  kindChipOn: { borderColor: COLORS.header, backgroundColor: '#0EA47A14' },
  kindText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  kindTextOn: { color: COLORS.header },
  addName: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, height: FIELD_H, fontSize: 15, color: COLORS.text, marginBottom: 10, paddingVertical: 0 },
  addBalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, height: FIELD_H },
  addBtn: { backgroundColor: COLORS.header, borderRadius: 10, paddingHorizontal: 22, height: FIELD_H, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 },
  curPick: {
    height: FIELD_H, width: 104, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.card, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center',
  },
  curPickCompact: {
    height: 32, width: 48, flexGrow: 0, flexShrink: 0, marginLeft: 4,
    paddingHorizontal: 6, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
    backgroundColor: COLORS.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  curPickText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
  curPickSym: { fontSize: 16, fontWeight: '700', color: COLORS.header, lineHeight: 20, includeFontPadding: false },
  curPickChev: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  curPickChevCompact: { fontSize: 11, color: COLORS.textMuted, marginLeft: 2, lineHeight: 16, includeFontPadding: false },
  pickBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 28 },
  pickSheet: { backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden' },
  pickRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  pickRowOn: { backgroundColor: '#0EA47A14' },
  pickText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  pickTextOn: { color: COLORS.header },
});
