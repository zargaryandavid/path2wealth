import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { COLORS, groupDigits, formatMoney, CAT_ICON_PICK } from './theme';
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
function SelectField({ label, value, options, onChange, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.select} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && { color: COLORS.textMuted }]} numberOfLines={1}>{value || 'Select…'}</Text>
        <CatIcon name="chevron-down" size={18} color={COLORS.textMuted} />
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

function TextField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

function CustomCats({ label, items = [], onChange, accent }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(accent === COLORS.expense ? 'receipt' : 'cash');
  const [pick, setPick] = useState(null);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    onChange([...(items || []), { key: 'c-' + Date.now().toString(36), name: n, icon }]);
    setName('');
  };
  const patch = (key, fields) => onChange((items || []).map((x) => (x.key === key ? { ...x, ...fields } : x)));
  const pickTarget = pick && pick !== 'new' ? (items || []).find((x) => x.key === pick) : null;
  const pickIcon = pickTarget ? (pickTarget.icon || 'plus') : icon;
  return (
    <View style={styles.customBlock}>
      <View style={styles.customAdd}>
        <Text style={styles.customLineLabel}>{label}</Text>
        <TouchableOpacity style={styles.customIconBtn} onPress={() => setPick('new')}>
          <CatIcon name={icon} size={18} color={accent} />
        </TouchableOpacity>
        <TextInput
          style={styles.customNameInput}
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={COLORS.textMuted}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TouchableOpacity style={[styles.customAddBtn, { backgroundColor: accent }]} onPress={add}>
          <Text style={styles.customAddText}>+</Text>
        </TouchableOpacity>
      </View>
      {(items || []).map((c) => (
        <View key={c.key} style={styles.customRow}>
          <TouchableOpacity style={[styles.customIcon, { backgroundColor: accent + '18' }]} onPress={() => setPick(c.key)}>
            <CatIcon name={c.icon || 'plus'} size={18} color={accent} />
          </TouchableOpacity>
          <TextInput
            style={styles.customEditName}
            value={c.name}
            onChangeText={(t) => patch(c.key, { name: t })}
            placeholder="Name"
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity onPress={() => onChange(items.filter((x) => x.key !== c.key))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <CatIcon name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <Modal visible={!!pick} transparent animationType="fade" onRequestClose={() => setPick(null)}>
        <TouchableOpacity style={styles.pickBackdrop} activeOpacity={1} onPress={() => setPick(null)}>
          <View style={styles.pickSheet}>
            <Text style={styles.pickTitle}>Icon</Text>
            <View style={styles.iconGrid}>
              {CAT_ICON_PICK.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconCell, ic === pickIcon && { borderColor: accent, backgroundColor: accent + '18' }]}
                  onPress={() => {
                    if (pick === 'new') setIcon(ic);
                    else if (pick) patch(pick, { icon: ic });
                    setPick(null);
                  }}
                >
                  <CatIcon name={ic} size={22} color={COLORS.text} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function ProfileScreen({ visible, profile, alloc = {}, setAlloc = () => {}, onClose, onSave, onLogout, authEmail }) {
  const [p, setP] = useState(profile || {});
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const next = { ...(profile || {}) };
    if (!next.email && authEmail) next.email = authEmail;
    setP(next);
  }, [visible, authEmail]);

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
          <View style={styles.row}>
            <TextField label="First name" value={p.firstName} onChangeText={(t) => set('firstName', t)} placeholder="First" autoCapitalize="words" style={styles.col} />
            <TextField label="Last name" value={p.lastName} onChangeText={(t) => set('lastName', t)} placeholder="Last" autoCapitalize="words" style={styles.col} />
          </View>
          <View style={styles.row}>
            <TextField label="Email" value={p.email} onChangeText={(t) => set('email', t)} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" style={styles.col} />
            <TextField label="Phone number" value={p.phone} onChangeText={(t) => set('phone', t)} placeholder="(555) 000-0000" keyboardType="phone-pad" style={styles.col} />
          </View>
          <View style={styles.row}>
            <SelectField label="Gender" value={p.gender} options={GENDER} onChange={(v) => set('gender', v)} style={styles.col} />
            <SelectField label="Age" value={p.age} options={AGE} onChange={(v) => set('age', v)} style={styles.col} />
          </View>
          <View style={styles.row}>
            <View style={[styles.field, styles.col]}>
              <Text style={styles.fieldLabel}>Net income</Text>
              <View style={styles.money}>
                <Text style={styles.moneyCur}>$</Text>
                <TextInput style={styles.moneyInput} value={groupDigits(p.income || '')}
                  onChangeText={(t) => set('income', t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
              </View>
            </View>
            <View style={[styles.field, styles.col]}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.locRow}>
                <TextInput style={styles.locInput} value={p.location || ''} onChangeText={(t) => set('location', t)}
                  placeholder="City, Country" placeholderTextColor={COLORS.textMuted} />
                <TouchableOpacity style={styles.locBtn} onPress={useMyLocation} disabled={locating} activeOpacity={0.85} accessibilityLabel="Use location">
                  <IconPin color={COLORS.header} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <SelectField label="Profession" value={p.specialty} options={SPECIALTY} onChange={(v) => set('specialty', v)} style={styles.col} />
            <SelectField label="Main goal" value={p.goal} options={GOAL} onChange={(v) => set('goal', v)} style={styles.col} />
          </View>
          <View style={styles.row}>
            <SelectField label="Marriage status" value={p.maritalStatus} options={MARITAL} onChange={(v) => set('maritalStatus', v)} style={styles.col} />
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
              style={styles.col}
            />
          </View>
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

          <View style={styles.customSection}>
            <CustomCats
              label="Custom income"
              items={p.customIncome || []}
              onChange={(v) => set('customIncome', v)}
              accent={COLORS.income}
            />
            <View style={styles.customSep} />
            <CustomCats
              label="Custom expenses"
              items={p.customExpense || []}
              onChange={(v) => set('customExpense', v)}
              accent={COLORS.expense}
            />
          </View>

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
          <View style={styles.legal}>
            <Text style={styles.legalVer}>Path2Wealth v{(Constants.expoConfig && Constants.expoConfig.version) || '1.0.0'}</Text>
            <Text style={styles.legalOwn}>Owned by AI Automation LA LLC</Text>
            <Text style={styles.legalCopy}>© 2026 AI Automation LA LLC. All rights reserved.</Text>
          </View>
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
  body: { padding: 16, paddingBottom: 44 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: COLORS.card, minHeight: 46 },
  selectText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600', marginRight: 4 },
  textInput: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: COLORS.text, minHeight: 46 },
  money: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 10, minHeight: 46 },
  moneyCur: { fontSize: 16, color: COLORS.header, fontWeight: '700', marginRight: 4 },
  moneyInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  agesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageBox: { width: 72, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: COLORS.card },
  ageCap: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  ageInput: { fontSize: 16, fontWeight: '700', color: COLORS.text, paddingVertical: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingLeft: 10, paddingRight: 4, minHeight: 46 },
  locInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10, minWidth: 0 },
  locBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#0EA47A14' },
  customSection: {
    marginBottom: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  customSep: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 12 },
  customBlock: { width: '100%' },
  customLineLabel: { width: 118, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, color: COLORS.textMuted, textTransform: 'uppercase' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  customIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  customName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text, minWidth: 0 },
  customEditName: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: COLORS.text, paddingVertical: 4, paddingHorizontal: 0 },
  customAdd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customIconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  customNameInput: { flex: 1, minWidth: 0, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.text, minHeight: 36 },
  customAddBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  customAddText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: -1 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  iconCell: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
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
  legal: { marginTop: 22, marginBottom: 8, alignItems: 'center', paddingHorizontal: 12 },
  legalVer: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  legalOwn: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  legalCopy: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  pickBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 26 },
  pickSheet: { backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 8, maxHeight: '70%' },
  pickTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 18, paddingVertical: 10 },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  pickText: { fontSize: 16, color: COLORS.text },
});
