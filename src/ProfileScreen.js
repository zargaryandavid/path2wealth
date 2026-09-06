import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, groupDigits } from './theme';
import { IconPin, CatIcon } from './Icons';

const AGE = ['18–24', '25–34', '35–44', '45–54', '55+'];
const GENDER = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SPECIALTY = ['Technology', 'Healthcare', 'Finance', 'Design & Creative', 'Education', 'Business / Founder', 'Engineering', 'Sales & Marketing', 'Legal', 'Trades', 'Student', 'Other'];
const GOAL = ['Save more', 'Invest', 'Pay off debt', 'Reach FIRE', 'Just track spending'];

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

export default function ProfileScreen({ visible, profile, onClose, onSave, onLogout }) {
  const [p, setP] = useState(profile || {});
  const [locating, setLocating] = useState(false);

  useEffect(() => { if (visible) setP({ ...(profile || {}) }); }, [visible]);

  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

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

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, borderWidth: 1.5, borderColor: COLORS.header, backgroundColor: '#0EA47A14', borderRadius: 12, paddingVertical: 11 },
  locText: { color: COLORS.header, fontSize: 13, fontWeight: '700' },
  logout: { marginTop: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  logoutText: { color: COLORS.expense, fontSize: 15, fontWeight: '700' },
  pickBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 26 },
  pickSheet: { backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 8, maxHeight: '70%' },
  pickTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 18, paddingVertical: 10 },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  pickText: { fontSize: 16, color: COLORS.text },
});
