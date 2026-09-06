// supabase.js — the single connection to your Supabase backend.
// It reads the URL + key from your .env.local file (never hard-coded here),
// so your secrets stay out of the code.

import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const looksLikeSecret = typeof anonKey === 'string' && anonKey.startsWith('sb_secret_');

// True only when BOTH values are filled in .env.local with a publishable/anon key.
export const isSupabaseConfigured = !!(url && anonKey && !looksLikeSecret);

const isWeb = Platform.OS === 'web';

// Native uses AsyncStorage. Web must use the default (localStorage) — passing
// AsyncStorage into GoTrue on web crashes signUp with "reading 'storage'".
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        ...(isWeb ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isWeb,
      },
    })
  : null;

export function authRedirectTo() {
  if (isWeb && typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin + '/';
  }
  return undefined;
}

// A quick, safe way to confirm the connection works.
export async function testSupabaseConnection() {
  if (!supabase) return { ok: false, reason: 'Not configured — fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local' };
  try {
    const { error } = await supabase.auth.getSession();
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e && e.message ? e.message : e) };
  }
}
