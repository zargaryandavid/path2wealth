import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { daysInMonth, toKey } from './recurring';
import { ordinal } from './theme';

const CHANNEL = 'reminders';
const DAYS_BEFORE = 3;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function cardLabel(card) {
  const name = String(card && card.name || '').trim() || 'Credit card';
  const last4 = String(card && card.last4 || '').replace(/\D/g, '').slice(-4);
  return last4 ? `${name} ${last4}` : name;
}

export function notifyDayOfMonth(dueDay, daysBefore = DAYS_BEFORE) {
  const due = Math.min(31, Math.max(1, Number(dueDay) || 1));
  const n = due - daysBefore;
  return n >= 1 ? n : 28 + n;
}

export function nextDueOn(dueDay, from = new Date()) {
  const day = Math.min(31, Math.max(1, Number(dueDay) || 1));
  const y = from.getFullYear();
  const m = from.getMonth();
  const thisMonth = new Date(y, m, Math.min(day, daysInMonth(y, m)));
  if (toKey(thisMonth) >= toKey(from)) return thisMonth;
  const nm = m + 1;
  const ny = y + Math.floor(nm / 12);
  const month = nm % 12;
  return new Date(ny, month, Math.min(day, daysInMonth(ny, month)));
}

export function daysUntilDue(dueDay, from = new Date()) {
  const due = nextDueOn(dueDay, from);
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((b - a) / 86400000);
}

export function dueHint(card, from = new Date()) {
  const days = daysUntilDue(card.dueDay, from);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 3) return `Due in ${days} days`;
  return `Due the ${ordinal(card.dueDay || 1)}`;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Payment reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return false;
  await ensureAndroidChannel();
  return true;
}

export async function syncCardNotification(card) {
  if (Platform.OS === 'web') return { ...card, notifId: null };
  if (card.notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(card.notifId); } catch (e) {}
  }
  if (!card.notify) return { ...card, notifId: null };
  const ok = await requestReminderPermission();
  if (!ok) return { ...card, notify: false, notifId: null };
  const day = notifyDayOfMonth(card.dueDay);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Credit card payment',
      body: `${cardLabel(card)} is due in ${DAYS_BEFORE} days.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour: 9,
      minute: 0,
      channelId: CHANNEL,
    },
  });
  return { ...card, notifId: id, notify: true };
}

export async function cancelCardNotification(card) {
  if (Platform.OS === 'web' || !card || !card.notifId) return;
  try { await Notifications.cancelScheduledNotificationAsync(card.notifId); } catch (e) {}
}
