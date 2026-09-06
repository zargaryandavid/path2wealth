import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { COLORS, formatMoney, groupDigits } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';

function annualIncome(profile) {
  return parseFloat(String((profile && profile.income) || '').replace(/[^0-9.]/g, '')) * 12 || 0;
}

// Roth IRA: contributions are always tax-free to withdraw. Earnings are tax-free
// only after 59½ (we use the 55+ age band from onboarding) and the 5-year rule.
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
    ? `${ageLine}\n\nAt 55+ we treat this as a qualified Roth. About ${formatMoney(t.amount)} of ${account.name} is not taxable to withdraw.\n\n(The IRS cutoff is 59½ and a 5-year clock — confirm with a tax pro.)`
    : `${ageLine}\n\nBefore 59½, only contributions come out tax-free.\n\nNot taxable now: ${formatMoney(t.amount)}\nEarnings that may be taxed: ${formatMoney(t.earnings)}\n\n${t.yearly >= 150000 ? 'Your income may also limit new Roth contributions this year.\n\n' : ''}Hold again after you update the balance.`;
  Alert.alert('Roth IRA — not taxable', body, [{ text: 'OK' }]);
}

export default function SavingsScreen({ visible, accounts = [], setAccounts, profile, onClose }) {
  const [name, setName] = useState('');
  const [bal, setBal] = useState('');
  const [kind, setKind] = useState('savings');

  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const setBalance = (id, v) => setAccounts(accounts.map((a) => a.id === id ? { ...a, balance: parseFloat(v.replace(/[^0-9.]/g, '')) || 0 } : a));
  const remove = (id) => setAccounts(accounts.filter((a) => a.id !== id));
  const add = () => {
    if (!name.trim() && kind !== 'roth') return;
    const balance = parseFloat(bal.replace(/[^0-9.]/g, '')) || 0;
    setAccounts([...accounts, {
      id: Date.now().toString(),
      name: name.trim() || 'Roth IRA',
      kind,
      balance,
      contributions: kind === 'roth' ? balance : undefined,
    }]);
    setName(''); setBal(''); setKind('savings');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Savings" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL SAVED</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            <Text style={styles.totalSub}>across {accounts.length} account{accounts.length === 1 ? '' : 's'}</Text>
          </View>

          <Text style={styles.section}>YOUR ACCOUNTS</Text>
          {accounts.map((a) => {
            const isRoth = a.kind === 'roth';
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
              <Text style={styles.acctName}>{a.name}</Text>
              {isRoth && (
                <Pressable
                  onLongPress={() => showRothTax(a, profile)}
                  delayLongPress={350}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.infoHit}
                >
                  <CatIcon name="information-outline" size={18} color={COLORS.header} />
                </Pressable>
              )}
              <View style={styles.acctBal}>
                <Text style={styles.acctCur}>$</Text>
                <TextInput style={styles.acctInput} value={groupDigits(String(a.balance || 0))}
                  onChangeText={(v) => setBalance(a.id, v)} keyboardType="decimal-pad" />
              </View>
              <TouchableOpacity onPress={() => remove(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CatIcon name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            );
          })}
          {accounts.length === 0 && <Text style={styles.empty}>No accounts yet — add one below.</Text>}
          {accounts.some((a) => a.kind === 'roth') && (
            <Text style={styles.rothHint}>Hold the shield or ⓘ on a Roth IRA to see how much is not taxable.</Text>
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
              <View style={styles.addBal}>
                <Text style={styles.acctCur}>$</Text>
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
  acctRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  acctIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA47A18', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  acctIconRoth: { backgroundColor: '#0EA47A28' },
  infoHit: { marginRight: 8 },
  acctName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kindChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  kindChipOn: { borderColor: COLORS.header, backgroundColor: '#0EA47A14' },
  kindText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  kindTextOn: { color: COLORS.header },
  acctBal: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  acctCur: { fontSize: 15, color: COLORS.header, fontWeight: '700', marginRight: 2 },
  acctInput: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 70, textAlign: 'right', padding: 0 },
  empty: { color: COLORS.textMuted, fontSize: 14, paddingVertical: 12 },
  rothHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 17 },
  addBox: { backgroundColor: COLORS.background, borderRadius: 14, padding: 12 },
  addName: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 10 },
  addBalRow: { flexDirection: 'row', gap: 10 },
  addBal: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12 },
  addBtn: { backgroundColor: COLORS.header, borderRadius: 10, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
