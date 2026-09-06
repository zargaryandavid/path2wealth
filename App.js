import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DonutChart from './src/DonutChart';
import AddEntryModal from './src/AddEntryModal';
import ProfileScreen from './src/ProfileScreen';
import AllocationScreen from './src/AllocationScreen';
import SavingsScreen from './src/SavingsScreen';
import FireScreen from './src/FireScreen';
import PortfolioScreen from './src/PortfolioScreen';
import LoginScreen from './src/LoginScreen';
import OnboardingScreen from './src/OnboardingScreen';
import CalendarScreen from './src/CalendarScreen';
import RecurringScreen from './src/RecurringScreen';
import { COLORS, EXPENSE_CATEGORIES, categoryInfo, formatMoney } from './src/theme';
import { CatIcon } from './src/Icons';
import { supabase, isSupabaseConfigured, authRedirectTo } from './src/supabase';
import { loadAll, saveProfile, syncTransactions } from './src/db';
import { calendarItems, firstPaymentOn, postedOccurrences, seriesIdOf, todayKey } from './src/recurring';

const today = todayKey();
// Demo data only when there is no cloud backend configured.
const SEED = isSupabaseConfigured ? [] : [
  { id: '1', type: 'income',  amount: 3200, category: 'salary',    note: 'Monthly pay', recurring: true, repeatDay: 1, repeatMonths: 12, occurredOn: firstPaymentOn(1), date: firstPaymentOn(1) },
  { id: '2', type: 'expense', amount: 42.5, category: 'food',      note: 'Groceries',   date: today, occurredOn: today },
  { id: '3', type: 'expense', amount: 60,   category: 'transport', note: 'Gas',         date: today, occurredOn: today },
  { id: '4', type: 'expense', amount: 120,  category: 'shopping',  note: 'Shoes',       date: today, occurredOn: today },
  { id: '5', type: 'expense', amount: 90,   category: 'bills',     note: 'Internet',    recurring: true, repeatDay: 1, repeatMonths: 12, occurredOn: firstPaymentOn(1), date: firstPaymentOn(1) },
];

const ALLOC_BUCKETS = [
  { key: 'essentials', label: 'Spent', color: '#7C8CA3' },
  { key: 'savings', label: 'Savings', color: '#0EA47A' },
  { key: 'investments', label: 'Investments', color: '#4C8DFF' },
  { key: 'fun', label: 'Fun', color: '#F5A623' },
];

// Whole-dollar formatter (no cents) for the suggested split.
function moneyWhole(amount) {
  const n = Math.round(Number(amount) || 0);
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US');
}

function txDayParts(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: '–', mon: '' };
  return { day: String(d.getDate()), mon: d.toLocaleDateString(undefined, { month: 'short' }) };
}

// A transaction row. Real entries swipe to edit/delete; bond coupons are read-only.
function SwipeableTxRow({ t, onEdit, onDelete }) {
  const ref = React.useRef(null);
  const info = categoryInfo(t.type, t.category);
  const isIncome = t.type === 'income';
  const close = () => ref.current && ref.current.close();
  const day = txDayParts(t.date);
  const rowInner = (
    <View style={styles.txRow}>
      <View style={styles.txDay}>
        <Text style={styles.txDayNum}>{day.day}</Text>
        <Text style={styles.txDayMon}>{day.mon}</Text>
      </View>
      <View style={[styles.txIcon, { backgroundColor: info.color + '22' }]}>
        <CatIcon name={info.icon} color={info.color} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.txLabelRow}>
          <Text style={styles.txLabel}>{info.label}</Text>
          {t.recurring && (
            <View style={styles.repTag}>
              <CatIcon name="autorenew" size={11} color={COLORS.header} />
              <Text style={styles.repTagText}>Monthly</Text>
            </View>
          )}
        </View>
        {!!t.note && <Text style={styles.txNote}>{t.note}</Text>}
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
        {isIncome ? '+' : '−'}{formatMoney(t.amount)}
      </Text>
    </View>
  );
  if (t.bondId) return rowInner; // bond coupons are auto-generated, not editable
  if (t.recurring) return rowInner; // edit/delete repeating items on the Repeating screen
  return (
    <Swipeable
      ref={ref}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#4C8DFF' }]} onPress={() => { close(); onEdit(t); }}>
            <CatIcon name="pencil" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: COLORS.expense }]} onPress={() => { close(); onDelete(t.id); }}>
            <CatIcon name="trash-can-outline" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {rowInner}
    </Swipeable>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState(SEED);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [editEntry, setEditEntry] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tool, setTool] = useState(null);
  const [planOpen, setPlanOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [splitOpen, setSplitOpen] = useState(true);
  const [alloc, setAlloc] = useState({ essentials: 50, savings: 20, investments: 15, fun: 15 });
  const [savingsAccounts, setSavingsAccounts] = useState([
    { id: 's1', name: 'Emergency Fund', balance: 5000 },
    { id: 's2', name: 'HYSA', balance: 12000 },
  ]);
  const [portfolio, setPortfolio] = useState([
    { id: 'p1', kind: 'Stock', name: 'AAPL', qty: 10, price: 220 },
    { id: 'p2', kind: 'Metal', name: 'Gold (oz)', qty: 2, price: 2400 },
  ]);

  const cloud = isSupabaseConfigured && !!(user && user.id);

  // ── Auth: restore session, listen for changes ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session && data.session.user ? { id: data.session.user.id } : null);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s && s.user ? { id: s.user.id } : null);
    });
    return () => { try { sub.subscription.unsubscribe(); } catch (e) {} };
  }, []);

  // ── Load this user's cloud data on sign-in ──
  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    setLoaded(false);
    loadAll(user.id).then((d) => {
      if (!alive) return;
      setProfile(d.profile);
      setTransactions(d.transactions);
      setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [user && user.id]);

  // ── Save profile + transactions to the cloud (best-effort, debounced) ──
  useEffect(() => {
    if (!cloud || !loaded || !profile) return;
    saveProfile(user.id, profile).catch(() => {});
  }, [profile, loaded]);

  useEffect(() => {
    if (!cloud || !loaded) return;
    const h = setTimeout(() => {
      syncTransactions(user.id, transactions).then((res) => {
        if (res && res.error) console.warn('Supabase transaction save failed:', res.error.message);
      }).catch((e) => console.warn('Supabase transaction save failed:', e));
    }, 700);
    return () => clearTimeout(h);
  }, [transactions, loaded]);

  // ── Local persistence for savings / portfolio / allocation (survives reload on this phone) ──
  useEffect(() => {
    AsyncStorage.getItem('p2w_local').then((v) => {
      if (!v) return;
      try {
        const d = JSON.parse(v);
        if (d.savingsAccounts) setSavingsAccounts(d.savingsAccounts);
        if (d.portfolio) setPortfolio(d.portfolio);
        if (d.alloc) setAlloc(d.alloc);
      } catch (e) {}
    }).catch(() => {});
  }, []);
  useEffect(() => {
    AsyncStorage.setItem('p2w_local', JSON.stringify({ savingsAccounts, portfolio, alloc })).catch(() => {});
  }, [savingsAccounts, portfolio, alloc]);

  // Bond coupons are derived from the portfolio (never stored).
  const bondTx = useMemo(() => portfolio.filter((h) => h.kind === 'Bond' && h.yield).map((h) => {
    const perMonth = ((h.qty * h.price) * (h.yield || 0) / 100) / 12;
    const start = firstPaymentOn(1);
    return { id: 'bond-' + h.id, bondId: h.id, type: 'income', amount: Math.round(perMonth * 100) / 100,
      category: 'dividends', note: h.name + ' coupon (per month)', recurring: true, repeatDay: 1, repeatMonths: 12,
      occurredOn: start, date: start };
  }), [portfolio]);

  const allTx = useMemo(() => [...bondTx, ...transactions], [bondTx, transactions]);
  const postedTx = useMemo(() => postedOccurrences(allTx), [allTx]);
  const calTx = useMemo(() => calendarItems(allTx), [allTx]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of postedTx) { if (t.type === 'income') income += t.amount; else expense += t.amount; }
    return { income, expense, balance: income - expense };
  }, [postedTx]);

  const donutData = useMemo(() => {
    const byCat = {};
    for (const t of postedTx) { if (t.type !== 'expense') continue; byCat[t.category] = (byCat[t.category] || 0) + t.amount; }
    return EXPENSE_CATEGORIES.filter((c) => byCat[c.key]).map((c) => ({ key: c.key, label: c.label, value: byCat[c.key], color: c.color, icon: c.icon }));
  }, [postedTx]);

  function openModal(type) { setEditEntry(null); setModalType(type); setModalVisible(true); }
  function editTx(t) {
    const id = seriesIdOf(t);
    const src = transactions.find((x) => x.id === id) || t;
    setEditEntry(src);
    setModalType(src.type);
    setModalVisible(true);
  }
  function deleteTx(id) {
    const realId = String(id).split('@')[0];
    setTransactions((prev) => prev.filter((x) => x.id !== realId && x.id !== id));
  }
  function handleSave(entry) {
    setTransactions((prev) => prev.some((x) => x.id === entry.id) ? prev.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...prev]);
    setSelectedKey(null); setModalVisible(false); setEditEntry(null);
  }

  async function handleEmailAuth(mode, email, password) {
    if (mode === 'apple' || mode === 'google') {
      await handleSignIn(mode);
      return;
    }
    if (!isSupabaseConfigured) {
      setUser({ id: 'local', email });
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: authRedirectTo() },
        });
        if (error) { setAuthError(error.message); return; }
        if (data.session && data.user) { setUser({ id: data.user.id }); return; }
        setPendingEmail(email);
        setAuthError('Check your email for a 6-digit code, then verify.');
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(error.message); return; }
      if (data.user) setUser({ id: data.user.id });
    } catch (e) {
      setAuthError(e.message || String(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerify(email, token) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: String(token).trim(), type: 'signup' });
      if (error) { setAuthError(error.message); return; }
      if (data.user) {
        setPendingEmail('');
        setUser({ id: data.user.id });
      }
    } catch (e) {
      setAuthError(e.message || String(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResend(email) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) setAuthError(error.message);
    } catch (e) {
      setAuthError(e.message || String(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignIn(provider) {
    // Apple / Google still stubbed — reuse an existing session instead of minting a new anonymous user.
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) { setUser({ id: session.user.id }); return; }
      } catch (e) {}
    }
    setUser({ provider });
  }

  async function signOut() {
    setProfileOpen(false);
    if (isSupabaseConfigured) { try { await supabase.auth.signOut(); } catch (e) {} }
    setUser(null); setProfile(null); setTransactions(SEED); setLoaded(!isSupabaseConfigured);
    setPendingEmail(''); setAuthError('');
  }

  if (!authReady) return <View style={{ flex: 1, backgroundColor: COLORS.header }} />;
  if (!user) {
    return (
      <LoginScreen
        onSignIn={handleEmailAuth}
        onVerify={handleVerify}
        onResend={handleResend}
        pendingEmail={pendingEmail}
        onCancelVerify={() => { setPendingEmail(''); setAuthError(''); }}
        busy={authBusy}
        error={authError}
      />
    );
  }
  if (cloud && !loaded) return <View style={{ flex: 1, backgroundColor: COLORS.card }} />;
  if (!profile) return <OnboardingScreen onComplete={(answers) => setProfile(answers)} />;

  const recent = postedTx.slice(0, 8);
  const profileIncome = parseFloat(String((profile && profile.income) || '').replace(/[^0-9.]/g, '')) || 0;
  const savingsTotal = savingsAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const portfolioTotal = portfolio.reduce((sum, h) => sum + (h.qty * h.price || 0), 0);
  const fireSources = [];
  if (savingsTotal) fireSources.push({ label: 'Savings', amount: savingsTotal });
  const byKind = {};
  portfolio.forEach((h) => { byKind[h.kind] = (byKind[h.kind] || 0) + (h.qty * h.price || 0); });
  [['Stock', 'Stocks'], ['Metal', 'Precious metals'], ['Paper', 'Precious paper'], ['Bond', 'Bonds']].forEach(([k, l]) => { if (byKind[k]) fireSources.push({ label: l, amount: byKind[k] }); });

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.appName}>Path2Wealth</Text>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setProfileOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Open profile">
              <CatIcon name="account-circle" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{moneyWhole(totals.balance)}</Text>
          <View style={styles.headerTotals}>
            <View style={styles.headerTotalItem}>
              <Text style={styles.headerTotalLabel}>Income</Text>
              <Text style={styles.headerIncome}>{formatMoney(totals.income)}</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerExpenseCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTotalLabel}>Expenses</Text>
                <Text style={styles.headerExpense}>{formatMoney(totals.expense)}</Text>
              </View>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setCalendarOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Open calendar">
                <CatIcon name="calendar-month" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bodyWrap}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>Monthly expenses</Text>
              <TouchableOpacity onPress={() => setSplitOpen(!splitOpen)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CatIcon name={splitOpen ? 'eye-outline' : 'eye-off-outline'} size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.chartTop}>
              <DonutChart data={donutData} selectedKey={selectedKey} onSelectSlice={setSelectedKey} centerTitle="Spent" size={150} strokeWidth={26} />
              {splitOpen && (
              <View style={styles.allocSummary}>
                <Text style={styles.allocSummaryTitle}>Suggested split</Text>
                {ALLOC_BUCKETS.map((b) => (
                  <View key={b.key} style={styles.allocSumRow}>
                    <View style={[styles.allocSumDot, { backgroundColor: b.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.allocSumLabel}>{b.label}</Text>
                      <Text style={styles.allocSumAmt}>{moneyWhole(profileIncome * (alloc[b.key] || 0) / 100)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              )}
            </View>
            <View style={styles.legend}>
              {donutData.length === 0 && (
                <Text style={styles.emptyHint}>No expenses yet — tap the red − button to add one.</Text>
              )}
              {donutData.map((d) => {
                const active = selectedKey === d.key;
                const pct = totals.expense ? Math.round((d.value / totals.expense) * 100) : 0;
                return (
                  <TouchableOpacity key={d.key} style={[styles.legendRow, active && styles.legendRowActive]} onPress={() => setSelectedKey(active ? null : d.key)}>
                    <View style={styles.legendIcon}><CatIcon name={d.icon} color={d.color} size={20} /></View>
                    <Text style={styles.legendLabel}>{d.label}</Text>
                    <Text style={styles.legendPct}>{pct}%</Text>
                    <Text style={styles.legendAmount}>{formatMoney(d.value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.sectionHead} onPress={() => setPlanOpen((o) => !o)} activeOpacity={0.7}>
            <Text style={styles.sectionHeadText}>Plan your money</Text>
            <CatIcon name={planOpen ? 'chevron-up' : 'chevron-down'} size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          {planOpen && (
          <View style={styles.listCard}>
            <TouchableOpacity style={styles.toolRow} onPress={() => setTool('allocate')}>
              <View style={[styles.toolIcon, { backgroundColor: '#0EA47A18' }]}><CatIcon name="calculator-variant" size={22} color={COLORS.header} /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>Smart Allocation</Text><Text style={styles.toolSub}>Split income into savings, investing & fun</Text></View>
              <CatIcon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolRow} onPress={() => setTool('savings')}>
              <View style={[styles.toolIcon, { backgroundColor: '#F5A62318' }]}><CatIcon name="piggy-bank" size={22} color="#F5A623" /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>Savings</Text><Text style={styles.toolSub}>Track savings across your accounts</Text></View>
              <CatIcon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolRow} onPress={() => setTool('portfolio')}>
              <View style={[styles.toolIcon, { backgroundColor: '#4C8DFF18' }]}><CatIcon name="chart-box" size={22} color="#4C8DFF" /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>Portfolio</Text><Text style={styles.toolSub}>Stocks, precious metals, paper & bonds</Text></View>
              <CatIcon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolRow} onPress={() => setTool('fire')}>
              <View style={[styles.toolIcon, { backgroundColor: '#EA433518' }]}><CatIcon name="fire" size={22} color="#EA4335" /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>FIRE forecast</Text><Text style={styles.toolSub}>See when you could retire</Text></View>
              <CatIcon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolRow, { borderBottomWidth: 0 }]} onPress={() => setTool('recurring')}>
              <View style={[styles.toolIcon, { backgroundColor: '#0EA47A18' }]}><CatIcon name="autorenew" size={22} color={COLORS.header} /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>Repeating</Text><Text style={styles.toolSub}>Edit or delete monthly income & expenses</Text></View>
              <CatIcon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          )}

          <TouchableOpacity style={styles.sectionHead} onPress={() => setRecentOpen((o) => !o)} activeOpacity={0.7}>
            <Text style={styles.sectionHeadText}>Recent activity</Text>
            <CatIcon name={recentOpen ? 'chevron-up' : 'chevron-down'} size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          {recentOpen && (<>
            <Text style={styles.swipeHint}>Swipe a row left to edit or delete it.</Text>
            <View style={styles.listCard}>
              {recent.length === 0 && <Text style={styles.emptyHint}>Nothing here yet.</Text>}
              {recent.map((t) => (
                <SwipeableTxRow key={t.id} t={t} onEdit={editTx} onDelete={deleteTx} />
              ))}
            </View>
          </>)}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.fabBar}>
          <TouchableOpacity style={[styles.fab, { backgroundColor: COLORS.expense }]} onPress={() => openModal('expense')}>
            <Text style={styles.fabText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, { backgroundColor: COLORS.income }]} onPress={() => openModal('income')}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>

        <AddEntryModal
          visible={modalVisible}
          initialType={modalType}
          editEntry={editEntry}
          onClose={() => { setModalVisible(false); setEditEntry(null); }}
          onSave={handleSave}
        />

        <CalendarScreen visible={calendarOpen} transactions={calTx} onClose={() => setCalendarOpen(false)} />
        <ProfileScreen
          visible={profileOpen}
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onSave={(p) => { setProfile(p); setProfileOpen(false); }}
          onLogout={() => { setProfileOpen(false); signOut(); }}
        />

        <AllocationScreen visible={tool === 'allocate'} income={profileIncome} alloc={alloc} setAlloc={setAlloc} onClose={() => setTool(null)} />
        <SavingsScreen visible={tool === 'savings'} accounts={savingsAccounts} setAccounts={setSavingsAccounts} onClose={() => setTool(null)} />
        <PortfolioScreen visible={tool === 'portfolio'} holdings={portfolio} setHoldings={setPortfolio} onClose={() => setTool(null)} />
        <FireScreen visible={tool === 'fire'} currentSavings={savingsTotal + portfolioTotal} monthlyContribution={Math.round(profileIncome * 0.35)} annualExpensesGuess={Math.round(profileIncome * 12 * 0.6)} sources={fireSources} onClose={() => setTool(null)} />
        <RecurringScreen
          visible={tool === 'recurring'}
          items={transactions.filter((t) => t.recurring && !t.bondId)}
          onClose={() => setTool(null)}
          onEdit={(item) => { setTool(null); editTx(item); }}
          onRemove={(id) => deleteTx(id)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerSafe: { backgroundColor: COLORS.header },
  bodyWrap: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.header, paddingHorizontal: 22, paddingBottom: 22,
    paddingTop: Platform.OS === 'android' ? 18 : 6,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  appName: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  balanceValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', marginTop: 2 },
  headerTotals: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  headerTotalItem: { flex: 1 },
  headerDivider: { width: 1.5, height: 42, backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 16 },
  headerExpenseCol: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  headerTotalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  headerIncome: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerExpense: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 16 },
  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  chartTop: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  allocSummary: { flex: 1, paddingLeft: 22 },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  chartTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  allocSummaryTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 },
  allocSumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  allocSumDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  allocSumLabel: { fontSize: 11.5, color: COLORS.textMuted },
  allocSumAmt: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  allocExpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 8 },
  allocExpLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  allocExpAmt: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  legend: { width: '100%', marginTop: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderRadius: 10 },
  legendRowActive: { backgroundColor: COLORS.background },
  legendIcon: { width: 24, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  legendLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  legendPct: { fontSize: 13, color: COLORS.textMuted, width: 44, textAlign: 'right' },
  legendAmount: { fontSize: 15, color: COLORS.text, fontWeight: '600', width: 90, textAlign: 'right' },
  emptyHint: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },
  sectionHeadText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  swipeHint: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4, marginTop: -4, marginBottom: 8 },
  listCard: {
    backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  txDay: { width: 34, alignItems: 'center', marginRight: 8 },
  txDayNum: { fontSize: 15, fontWeight: '800', color: COLORS.header, lineHeight: 18 },
  txDayMon: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  txLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  repTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#0EA47A14', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  repTagText: { fontSize: 11, fontWeight: '700', color: COLORS.header },
  txNote: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  fabBar: { position: 'absolute', bottom: 26, alignSelf: 'center', flexDirection: 'row', gap: 24 },
  fab: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', marginTop: -2 },
  toolRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  toolIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toolTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  toolSub: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },
});
