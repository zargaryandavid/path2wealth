import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, groupDigits, formatMoney } from './theme';
import { IconPin, CatIcon } from './Icons';

const AGE = ['18–24', '25–34', '35–44', '45–54', '55+'];
const GENDER = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SPECIALTY = ['Technology', 'Healthcare', 'Finance', 'Design & Creative', 'Education', 'Business / Founder', 'Engineering', 'Sales & Marketing', 'Legal', 'Trades', 'Student', 'Other'];
const GOAL = ['Save more', 'Invest', 'Pay off debt', 'Reach FIRE', 'Just track spending'];
const MARITAL = ['Single', 'Married', 'Partnered', 'Divorced', 'Widowed', 'Prefer not to say'];
const KIDS_QTY = ['0', '1', '2', '3', '4', '5', '6'];
const ALLOC_BUCKETS = [
  { key: 'essentials',  label: 'Spent',       sub: 'Rent, food, bills',   color: '#7C8CA3' },
  { key: 'savings',     label: 'Savings',     sub: 'Emergency + goals',   color: '#0EA47A' },
  { key: 'investments', label: 'Investments', sub: 'Stocks, retirement',  color: '#4C8DFF' },
  { key: 'fun',         label: 'Fun',         sub: 'Guilt-free spending', color: '#FF7AC6' },
];

// A dropdown field: shows the current value, opens a picker list when tapped.
function SelectField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.select} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && { color: COLORS.textMuted }]}>{value || 'Select…'}</Text>
        <CatIcon name="chevron-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.pickBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickSheet}>
            <Text style={styles.pickTitle}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <TouchableOpacity key={o} style={styles.pickRow} onPress={() => { onChange(o); setOpen(false); }}>
                  <Text style={[styles.pickText, o === value && { color: COLORS.header, fontWeight: '700' }]}>{o}</Text>
                  {o === value && <CatIcon name="check" size={18} color={COLORS.header} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function ProfileScreen({ visible, profile, alloc = {}, setAlloc = () => {}, onClose, onSave, onLogout }) {
  const [p, setP] = useState(profile || {});
  const [locating, setLocating] = useState(false);

  useEffect(() => { if (visible) setP({ ...(profile || {}) }); }, [visible]);

  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const incomeNum = parseFloat(String(p.income || '').replace(/[^0-9.]/g, '')) || 0;
  const allocTotal = ALLOC_BUCKETS.reduce((s, b) => s + (alloc[b.key] || 0), 0);
  const adjustAlloc = (k, d) => setAlloc({ ...alloc, [k]: Math.max(0, Math.min(100, (alloc[k] || 0) + d)) });

  async function useMyLocation() {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const g = geo && geo[0];
      if (g) set('location', [g.city || g.subregion || g.region, g.country].filter(Boolean).join(', ') || 'My location');
    } catch (e) { /* keep manual entry */ } finally { setLocating(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.head}>
          <TouchableOpacity onPress={onClose} style={styles.headBtn}><Text style={styles.back}>‹</Text></TouchableOpacity>
          <Text style={styles.title}>Edit profile</Text>
          <TouchableOpacity onPress={() => onSave(p)} style={styles.headBtn}><Text style={styles.save}>Save</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <SelectField label="Age" value={p.age} options={AGE} onChange={(v) => set('age', v)} />
          <SelectField label="Gender" value={p.gender} options={GENDER} onChange={(v) => set('gender', v)} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Net monthly income</Text>
            <View style={styles.money}>
              <Text style={styles.moneyCur}>$</Text>
              <TextInput style={styles.moneyInput} value={groupDigits(p.income || '')}
                onChangeText={(t) => set('income', t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput style={styles.textInput} value={p.location || ''} onChangeText={(t) => set('location', t)}
              placeholder="City, Country" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={styles.locBtn} onPress={useMyLocation} disabled={locating} activeOpacity={0.85}>
              <IconPin color={COLORS.header} />
              <Text style={styles.locText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
            </TouchableOpacity>
          </View>

          <SelectField label="Profession" value={p.specialty} options={SPECIALTY} onChange={(v) => set('specialty', v)} />
          <SelectField label="Main money goal" value={p.goal} options={GOAL} onChange={(v) => set('goal', v)} />
          <SelectField label="Marriage status" value={p.maritalStatus} options={MARITAL} onChange={(v) => set('maritalStatus', v)} />
          <SelectField
            label="Kids"
            value={p.kidsQty != null ? String(p.kidsQty) : ''}
            options={KIDS_QTY}
            onChange={(v) => {
              const n = parseInt(v, 10) || 0;
              const ages = (Array.isArray(p.kidsAges) ? p.kidsAges : []).slice(0, n);
              while (ages.length < n) ages.push('');
              setP((prev) => ({ ...prev, kidsQty: n, kidsAges: ages }));
            }}
          />
          {(Number(p.kidsQty) || 0) > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Kids’ ages</Text>
              <View style={styles.agesRow}>
                {(p.kidsAges || []).slice(0, Number(p.kidsQty) || 0).map((age, i) => (
                  <View key={i} style={styles.ageBox}>
                    <Text style={styles.ageCap}>#{i + 1}</Text>
                    <TextInput
                      style={styles.ageInput}
                      value={String(age ?? '')}
                      onChangeText={(t) => {
                        const next = [...(p.kidsAges || [])];
                        next[i] = t.replace(/[^0-9]/g, '').slice(0, 2);
                        set('kidsAges', next);
                      }}
                      keyboardType="number-pad"
                      placeholder="Age"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Smart allocation</Text>
            <Text style={styles.allocHint}>Split your monthly income. This drives the Suggested split on the home screen.</Text>
            <View style={styles.allocBar}>
              {allocTotal > 0 && ALLOC_BUCKETS.map((b) => (
                alloc[b.key] > 0 ? <View key={b.key} style={{ flex: alloc[b.key], backgroundColor: b.color }} /> : null
              ))}
            </View>
            <Text style={[styles.allocTotal, allocTotal !== 100 && { color: COLORS.expense }]}>
              {allocTotal === 100 ? 'Adds up to 100% ✓' : `Adds up to ${allocTotal}% — aim for 100%`}
            </Text>
            {ALLOC_BUCKETS.map((b) => (
              <View key={b.key} style={styles.allocRow}>
                <View style={[styles.allocDot, { backgroundColor: b.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.allocLabel}>{b.label}</Text>
                  <Text style={styles.allocSub}>{b.sub}</Text>
                </View>
                <Text style={styles.allocAmt}>{formatMoney(incomeNum * (alloc[b.key] || 0) / 100)}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAlloc(b.key, -5)}>
                    <Text style={styles.stepSign}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.pct}>{alloc[b.key] || 0}%</Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAlloc(b.key, 5)}>
                    <Text style={styles.stepSign}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headBtn: { minWidth: 60, paddingVertical: 6 },
  back: { fontSize: 30, color: COLORS.text, marginTop: -4 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  save: { fontSize: 15, fontWeight: '700', color: COLORS.header, textAlign: 'right' },
  body: { padding: 20, paddingBottom: 44 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 7 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: COLORS.card },
  selectText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  textInput: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  money: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14 },
  moneyCur: { fontSize: 18, color: COLORS.header, fontWeight: '700', marginRight: 6 },
  moneyInput: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 12 },
  agesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageBox: { width: 72, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.card },
  ageCap: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  ageInput: { fontSize: 16, fontWeight: '700', color: COLORS.text, paddingVertical: 4 },
  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, borderWidth: 1.5, borderColor: COLORS.header, backgroundColor: '#0EA47A14', borderRadius: 12, paddingVertical: 11 },
  locText: { color: COLORS.header, fontSize: 13, fontWeight: '700' },
  allocHint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12, lineHeight: 18 },
  allocBar: { flexDirection: 'row', height: 14, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.border, marginBottom: 8 },
  allocTotal: { fontSize: 12.5, color: COLORS.textMuted, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  allocDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  allocLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  allocSub: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },
  allocAmt: { fontSize: 13, fontWeight: '700', color: COLORS.text, width: 78, textAlign: 'right', marginRight: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: -2 },
  pct: { width: 40, textAlign: 'center', fontSize: 13, fontWeight: '700', color: COLORS.text },
  logout: { marginTop: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  logoutText: { color: COLORS.expense, fontSize: 15, fontWeight: '700' },
  pickBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 26 },
  pickSheet: { backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 8, maxHeight: '70%' },
  pickTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 18, paddingVertical: 10 },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  pickText: { fontSize: 16, color: COLORS.text },
});
