import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { COLORS, groupDigits } from './theme';
import { GENDER_ICONS, IconPin } from './Icons';
import { STEPS } from './onboardingSteps';

export default function OnboardingScreen({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [locating, setLocating] = useState(false);

  const step = STEPS[index];
  const value = answers[step.key];
  const isLast = index === STEPS.length - 1;
  const answered =
    step.type === 'chips' ? !!value :
    step.type === 'wheel' ? true :
    !!(value && String(value).trim().length);

  // A wheel always shows a value under the line, so default it to the first option.
  React.useEffect(() => {
    if (step.type === 'wheel' && answers[step.key] == null) {
      setAnswers((p) => ({ ...p, [step.key]: step.options[0] }));
    }
  }, [index]);

  const setValue = (v) => setAnswers((p) => ({ ...p, [step.key]: v }));
  const next = () => (isLast ? onComplete(answers) : setIndex((i) => i + 1));
  const back = () => index > 0 && setIndex((i) => i - 1);

  async function useMyLocation() {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const g = geo && geo[0];
      if (g) {
        const city = g.city || g.subregion || g.region || '';
        const country = g.country || '';
        const text = [city, country].filter(Boolean).join(', ');
        setValue(text || 'My location');
      }
    } catch (e) {
      // leave the field for manual entry
    } finally {
      setLocating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.progressRow}>
        <TouchableOpacity onPress={back} disabled={index === 0} style={styles.iconBtn}>
          <Text style={[styles.backArrow, index === 0 && { opacity: 0 }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={[styles.progressSeg, i <= index && styles.progressSegActive]} />
          ))}
        </View>
        <TouchableOpacity onPress={next} style={styles.iconBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
          <Text style={styles.stepCount}>Question {index + 1} of {STEPS.length}</Text>
          <Text style={styles.question}>{step.question}</Text>
          {!!step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

          <View style={[{ marginTop: 24 }, step.type === 'wheel' && { flex: 1 }]}>
            {step.type === 'chips' &&
              step.options.map((o) => {
                const opt = typeof o === 'string' ? { label: o } : o;
                const active = value === opt.label;
                const Ico = opt.icon ? GENDER_ICONS[opt.icon] : null;
                return (
                  <TouchableOpacity key={opt.label} style={[styles.chip, active && styles.chipActive]} onPress={() => setValue(opt.label)}>
                    {Ico && <View style={styles.chipIcon}><Ico color={active ? COLORS.header : COLORS.text} /></View>}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}

            {step.type === 'wheel' && (
              <View style={styles.wheelWrap}>
                <Picker
                  selectedValue={value != null ? value : step.options[0]}
                  onValueChange={(v) => setValue(v)}
                  itemStyle={styles.wheelItem}
                >
                  {step.options.map((o) => <Picker.Item key={o} label={o} value={o} />)}
                </Picker>
              </View>
            )}

            {step.type === 'text' && (
              <>
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={setValue}
                  placeholder={step.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                />
                {step.key === 'location' && (
                  <TouchableOpacity style={styles.locBtn} onPress={useMyLocation} disabled={locating} activeOpacity={0.85}>
                    <IconPin color={COLORS.header} />
                    <Text style={styles.locBtnText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {step.type === 'money' && (
              <View style={styles.moneyRow}>
                <Text style={styles.moneyCur}>$</Text>
                <TextInput
                  style={styles.moneyInput}
                  value={groupDigits(value || '')}
                  onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, { opacity: answered ? 1 : 0.4 }]}
            onPress={next}
            disabled={!answered}
          >
            <Text style={styles.continueText}>{isLast ? 'Finish' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, gap: 10 },
  iconBtn: { width: 46, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  backArrow: { fontSize: 34, color: COLORS.text, marginTop: -6 },
  skipText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: COLORS.border },
  progressSegActive: { backgroundColor: COLORS.header },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 8 },
  stepCount: { fontSize: 13, color: COLORS.header, fontWeight: '700', marginBottom: 12 },
  question: { fontSize: 27, fontWeight: '800', color: COLORS.text, lineHeight: 34 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginTop: 10, lineHeight: 21 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 17, paddingHorizontal: 18, marginBottom: 12, backgroundColor: COLORS.card,
  },
  chipActive: { borderColor: COLORS.header, backgroundColor: '#0EA47A14' },
  chipIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.header },
  wheelWrap: {
    marginTop: 6, flex: 1, minHeight: 300, justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16,
    backgroundColor: COLORS.card, overflow: 'hidden',
  },
  wheelItem: { fontSize: 22, color: COLORS.text, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 16, fontSize: 18, color: COLORS.text,
  },
  locBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14,
    borderWidth: 1.5, borderColor: COLORS.header, backgroundColor: '#0EA47A14',
    borderRadius: 14, paddingVertical: 14,
  },
  locBtnText: { color: COLORS.header, fontSize: 15, fontWeight: '700' },
  moneyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 6 },
  moneyCur: { fontSize: 30, fontWeight: '700', color: COLORS.header, marginRight: 4 },
  moneyInput: { flex: 1, fontSize: 42, fontWeight: '800', color: COLORS.text, textAlign: 'center', padding: 0 },
  footer: { paddingHorizontal: 24, paddingBottom: 34, paddingTop: 8 },
  continueBtn: { backgroundColor: COLORS.header, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  continueText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
