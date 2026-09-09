import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, TextInput, Switch, Platform,
} from 'react-native';
import { COLORS, ordinal } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';
import { cardLabel, dueHint, syncCardNotification, cancelCardNotification } from './cardReminders';

const DAYS_BEFORE = 3;

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

export default function CreditCardReminderScreen({ visible, cards = [], setCards, onClose }) {
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [dueDay, setDueDay] = useState(new Date().getDate());
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [permHint, setPermHint] = useState('');

  const reset = () => { setName(''); setLast4(''); setDueDay(new Date().getDate()); setNotify(true); setPermHint(''); };

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const draft = {
      id: Date.now().toString(),
      name: name.trim(),
      last4: last4.replace(/\D/g, '').slice(-4),
      dueDay: Math.min(31, Math.max(1, dueDay)),
      notify: !!notify && Platform.OS !== 'web',
    };
    const saved = await syncCardNotification(draft);
    if (draft.notify && !saved.notify) setPermHint('Notifications are off for Path2Wealth — enable them in Settings to get the 3-day reminder.');
    else setPermHint('');
    setCards([...(cards || []), saved]);
    reset();
    setBusy(false);
  };

  const toggleNotify = async (card, on) => {
    setBusy(true);
    const next = await syncCardNotification({ ...card, notify: on });
    if (on && !next.notify) setPermHint('Notifications are off for Path2Wealth — enable them in Settings.');
    setCards(cards.map((c) => (c.id === card.id ? next : c)));
    setBusy(false);
  };

  const remove = async (card) => {
    await cancelCardNotification(card);
    setCards(cards.filter((c) => c.id !== card.id));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Card reminders" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <Text style={styles.lead}>
            We’ll remind you {DAYS_BEFORE} days before each due date with a popup on your phone.
          </Text>

          {cards.length === 0 && (
            <Text style={styles.empty}>No cards yet — add Bank of America 4483 (or any card) below.</Text>
          )}

          {cards.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: '#5B6CFF18' }]}>
                <CatIcon name="credit-card-outline" size={22} color="#5B6CFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{cardLabel(c)}</Text>
                <Text style={styles.cardMeta}>{dueHint(c)} · the {ordinal(c.dueDay)} each month</Text>
                <View style={styles.notifyRow}>
                  <Text style={styles.notifyLbl}>Phone notification · {DAYS_BEFORE} days before</Text>
                  <Switch
                    value={!!c.notify}
                    onValueChange={(v) => toggleNotify(c, v)}
                    disabled={busy || Platform.OS === 'web'}
                    trackColor={{ false: COLORS.border, true: '#0EA47A66' }}
                    thumbColor={c.notify ? COLORS.header : '#f4f4f4'}
                  />
                </View>
              </View>
              <TouchableOpacity onPress={() => remove(c)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CatIcon name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.section}>ADD A CARD</Text>
          <View style={styles.addBox}>
            <TextInput
              style={styles.field}
              value={name}
              onChangeText={setName}
              placeholder="Card name (e.g. Bank of America)"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.field}
              value={last4}
              onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="Last 4 digits (e.g. 4483)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Stepper
              label="Due date"
              value={ordinal(dueDay)}
              onDec={() => setDueDay((d) => (d <= 1 ? 31 : d - 1))}
              onInc={() => setDueDay((d) => (d >= 31 ? 1 : d + 1))}
            />
            <View style={styles.notifyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifyLbl}>Enable popup / phone notification</Text>
                <Text style={styles.notifySub}>{DAYS_BEFORE} days before the due date, around 9:00 AM</Text>
              </View>
              <Switch
                value={notify && Platform.OS !== 'web'}
                onValueChange={setNotify}
                disabled={Platform.OS === 'web'}
                trackColor={{ false: COLORS.border, true: '#0EA47A66' }}
                thumbColor={notify ? COLORS.header : '#f4f4f4'}
              />
            </View>
            {Platform.OS === 'web' && (
              <Text style={styles.warn}>Phone notifications need the iOS or Android app — they don’t fire in the browser.</Text>
            )}
            {!!permHint && <Text style={styles.warn}>{permHint}</Text>}
            <TouchableOpacity style={[styles.addBtn, busy && { opacity: 0.6 }]} onPress={add} disabled={busy}>
              <Text style={styles.addBtnText}>Add reminder</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  body: { padding: 20, paddingBottom: 44 },
  lead: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 16 },
  empty: { color: COLORS.textMuted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardMeta: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, marginTop: 18, marginBottom: 10 },
  addBox: { backgroundColor: COLORS.background, borderRadius: 14, padding: 12 },
  field: {
    backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, marginBottom: 10,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  stepSign: { fontSize: 20, color: COLORS.text, fontWeight: '700', marginTop: -2 },
  stepValue: { minWidth: 52, textAlign: 'center', fontSize: 15, fontWeight: '700', color: COLORS.text },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  notifyLbl: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  notifySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  warn: { fontSize: 12, color: COLORS.expense, lineHeight: 17, marginBottom: 10 },
  addBtn: { backgroundColor: COLORS.header, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
