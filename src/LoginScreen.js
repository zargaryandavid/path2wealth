import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from './theme';
import { IconApple, IconGoogle } from './Icons';

function LogoMark({ size = 92 }) {
  const r = size / 2 - 10;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const segs = [
    { color: '#F5A623', frac: 0.3 },
    { color: '#4C8DFF', frac: 0.25 },
    { color: '#B15CFF', frac: 0.2 },
    { color: '#2CC9B5', frac: 0.25 },
  ];
  let acc = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} originX={c} originY={c}>
        {segs.map((s, i) => {
          const dash = s.frac * circ;
          const el = (
            <Circle
              key={i} cx={c} cy={c} r={r} stroke={s.color} strokeWidth={10}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc} fill="none"
            />
          );
          acc += dash;
          return el;
        })}
      </G>
    </Svg>
  );
}

export default function LoginScreen({ onSignIn, onVerify, onResend, pendingEmail, onCancelVerify, busy, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('signin');

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !busy;
  const canVerify = String(code).replace(/\s/g, '').length >= 6 && !busy;

  function oauthSoon(name) {
    Alert.alert(`${name} coming soon`, 'This Supabase project has email sign-in enabled. Use email below for now.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.top}>
        <LogoMark />
        <Text style={styles.title}>Path2Wealth</Text>
        <Text style={styles.tagline}>Your money, beautifully simple.</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={[styles.authBtn, styles.appleBtn]} activeOpacity={0.85} onPress={() => oauthSoon('Apple')}>
          <IconApple size={19} color="#FFFFFF" />
          <Text style={styles.appleText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.authBtn, styles.googleBtn]} activeOpacity={0.85} onPress={() => oauthSoon('Google')}>
          <IconGoogle size={19} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.or}>or email</Text>

        {pendingEmail ? (
          <>
            <Text style={styles.verifyHint}>We sent a 6-digit code to {pendingEmail}. Check inbox and spam.</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              placeholder="Verification code"
              placeholderTextColor={COLORS.textMuted}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.authBtn, styles.emailBtn, !canVerify && { opacity: 0.5 }]}
              disabled={!canVerify}
              onPress={() => onVerify(pendingEmail, code)}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.emailText}>Verify code</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onResend(pendingEmail)} disabled={busy}>
              <Text style={styles.switch}>Resend code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancelVerify}>
              <Text style={styles.switch}>Use a different email</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password (6+ characters)"
              placeholderTextColor={COLORS.textMuted}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.authBtn, styles.emailBtn, !canSubmit && { opacity: 0.5 }]}
              disabled={!canSubmit}
              onPress={() => onSignIn(mode, email.trim(), password)}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.emailText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              <Text style={styles.switch}>
                {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.text, marginTop: 18 },
  tagline: { fontSize: 15, color: COLORS.textMuted, marginTop: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 28 },
  authBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 16, marginBottom: 12, borderWidth: 1.5,
  },
  appleBtn: { backgroundColor: '#000000', borderColor: '#000000' },
  appleText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  googleBtn: { backgroundColor: '#FFFFFF', borderColor: COLORS.border },
  googleText: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  or: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginVertical: 8 },
  verifyHint: { fontSize: 14, color: COLORS.text, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 10, backgroundColor: COLORS.background,
  },
  error: { color: COLORS.expense, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  emailBtn: { backgroundColor: COLORS.header, borderColor: COLORS.header },
  emailText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  switch: { textAlign: 'center', color: COLORS.header, fontSize: 14, fontWeight: '600', marginTop: 4 },
  legal: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 18, lineHeight: 17 },
});
