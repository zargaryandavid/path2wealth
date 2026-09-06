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
import { COLORS, EXPENSE_CATEGORIES, categoryInfo, formatMoney } from './src/theme';
import { CatIcon } from './src/Icons';
import { supabase, isSupabaseConfigured } from './src/supabase';
import { loadAll, saveProfile, syncTransactions } from './src/db';

const now = () => new Date().toISOString();
// Demo data only when there is no cloud backend configured.
const SEED = isSupabaseConfigured ? [] : [
  { id: '1', type: 'income',  amount: 3200, category: 'salary',    note: 'Monthly pay', recurring: true, repeatDay: 1, repeatMonths: 12, date: now() },
  { id: '2', type: 'expense', amount: 42.5, category: 'food',      note: 'Groceries',   date: now() },
  { id: '3', type: 'expense', amount: 60,   category: 'transport', note: 'Gas',         date: now() },
  { id: '4', type: 'expense', amount: 120,  category: 'shopping',  note: 'Shoes',       date: now() },
  { id: '5', type: 'expense', amount: 90,   category: 'bills',     note: 'Internet',    recurring: true, repeatDay: 1, repeatMonths: 12, date: now() },
];

const ALLOC_BUCKETS = [
  { key: 'essentials', label: 'Essentials', color: '#7C8CA3' },
  { key: 'savings', label: 'Savings', color: '#0EA47A' },
  { key: 'investments', label: 'Investments', color: '#4C8DFF' },
  { key: 'fun', label: 'Fun', color: '#F5A623' },
];

// A transaction row. Real entries swipe to edit/delete; bond coupons are read-only.
function SwipeableTxRow({ t, onEdit, onDelete }) {
  const ref = React.useRef(null);
  const info = categoryInfo(t.type, t.category);
  const isIncome = t.type === 'income';
  const close = () => ref.current && ref.current.close();
  const rowInner = (
    <View style={styles.txRow}>
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
      if (d.profile) setProfile(d.profile);
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
    const h = setTimeout(() => { syncTransactions(user.id, transactions).catch(() => {}); }, 700);
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
    return { id: 'bond-' + h.id, bondId: h.id, type: 'income', amount: Math.round(perMonth * 100) / 100,
      category: 'dividends', note: h.name + ' coupon (per month)', recurring: true, repeatDay: 1, repeatMonths: 12, date: now() };
  }), [portfolio]);

  const allTx = useMemo(() => [...bondTx, ...transactions], [bondTx, transactions]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of allTx) { if (t.type === 'income') income += t.amount; else expense += t.amount; }
    return { income, expense, balance: income - expense };
  }, [allTx]);

  const donutData = useMemo(() => {
    const byCat = {};
    for (const t of allTx) { if (t.type !== 'expense') continue; byCat[t.category] = (byCat[t.category] || 0) + t.amount; }
    return EXPENSE_CATEGORIES.filter((c) => byCat[c.key]).map((c) => ({ key: c.key, label: c.label, value: byCat[c.key], color: c.color, icon: c.icon }));
  }, [allTx]);

  function openModal(type) { setEditEntry(null); setModalType(type); setModalVisible(true); }
  function editTx(t) { setEditEntry(t); setModalType(t.type); setModalVisible(true); }
  function deleteTx(id) { setTransactions((prev) => prev.filter((x) => x.id !== id)); }
  function handleSave(entry) {
    setTransactions((prev) => prev.some((x) => x.id === entry.id) ? prev.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...prev]);
    setSelectedKey(null); setModalVisible(false); setEditEntry(null);
  }

  async function handleSignIn(provider) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data && data.user) { setUser({ id: data.user.id }); return; }
      } catch (e) {}
    }
    setUser({ provider }); // fallback: works in-memory if cloud sign-in is unavailable
  }
  async function signOut() {
    setProfileOpen(false);
    if (isSupabaseConfigured) { try { await supabase.auth.signOut(); } catch (e) {} }
    setUser(null); setProfile(null); setTransactions(SEED); setLoaded(!isSupabaseConfigured);
  }

  if (!authReady) return <View style={{ flex: 1, backgroundColor: COLORS.header }} />;
  if (!user) return <LoginScreen onSignIn={handleSignIn} />;
  if (cloud && !loaded) return <View style={{ flex: 1, backgroundColor: COLORS.card }} />;
  if (!profile) return <OnboardingScreen onComplete={(answers) => setProfile(answers)} />;

  const recent = allTx.slice(0, 8);
  const profileIncome = parseFloat(String((profile && profile.income) || '').replace(/[^0-9.]/g, '')) || 0;
  const savingsTotal = savingsAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const portfolioTotal = portfolio.reduce((sum, h) => sum + (h.qty * h.price || 0), 0);
  const fireSources = [];
  if (savingsTotal) fireSources.push({ label: 'Savings', amount: savingsTotal });
  const byKind = {};
  portfolio.forEach((h) => { byKind[h.kind] = (byKind[h.kind] || 0) + (h.qty * h.price || 0); });
  [['Stock', 'Stocks'], ['Metal', 'Precious metals'], ['Paper', 'Precious paper'], ['Bond', 'Bonds']].forEach(([k, l]) => { if (byKind[k]) fireSources.push({ label: l, amount: byKind[k] }); });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setCalendarOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Open calendar">
              <CatIcon name="calendar-month" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.appName}>Path2Wealth</Text>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setProfileOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Open profile">
              <CatIcon name="account-circle" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{formatMoney(totals.balance)}</Text>
          <View style={styles.headerTotals}>
            <View style={styles.headerTotalItem}>
              <Text style={styles.headerTotalLabel}>Income</Text>
              <Text style={styles.headerIncome}>{formatMoney(totals.income)}</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerTotalItem}>
              <Text style={styles.headerTotalLabel}>Expenses</Text>
              <Text style={styles.headerExpense}>{formatMoney(totals.expense)}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.chartCard}>
            <View style={styles.chartTop}>
              <DonutChart data={donutData} selectedKey={selectedKey} onSelectSlice={setSelectedKey} centerTitle="Spent" size={150} strokeWidth={26} />
              <View style={styles.allocSummary}>
                <Text style={styles.allocSummaryTitle}>Suggested split</Text>
                {ALLOC_BUCKETS.map((b) => (
                  <View key={b.key} style={styles.allocSumRow}>
                    <View style={[styles.allocSumDot, { backgroundColor: b.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.allocSumLabel}>{b.label}</Text>
                      <Text style={styles.allocSumAmt}>{formatMoney(profileIncome * (alloc[b.key] || 0) / 100)}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.allocExpRow}>
                  <Text style={styles.allocExpLabel}>Expenses</Text>
                  <Text style={styles.allocExpAmt}>{formatMoney(profileIncome * ((alloc.essentials || 0) + (alloc.fun || 0)) / 100)}</Text>
                </View>
              </View>
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
            <TouchableOpacity style={[styles.toolRow, { borderBottomWidth: 0 }]} onPress={() => setTool('fire')}>
              <View style={[styles.toolIcon, { backgroundColor: '#EA433518' }]}><CatIcon name="fire" size={22} color="#EA4335" /></View>
              <View style={{ flex: 1 }}><Text style={styles.toolTitle}>FIRE forecast</Text><Text style={styles.toolSub}>See when you could retire</Text></View>
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

        <CalendarScreen visible={calendarOpen} transactions={transactions} onClose={() => setCalendarOpen(false)} />
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.header },
  header: {
    backgroundColor: COLORS.header, paddingHorizontal: 22, paddingBottom: 22,
    paddingTop: Platform.OS === 'android' ? 18 : 6,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  appName: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  balanceValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', marginTop: 2 },
  headerTotals: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  headerTotalItem: { flex: 1 },
  headerDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)' },
  headerTotalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 },
  headerIncome: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerExpense: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', paddingLeft: 14 },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 16 },
  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  chartTop: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  allocSummary: { flex: 1, paddingLeft: 10 },
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
  fabBar: { position: 'absolute', bottom: 26, alignSelf: 'center', flexDirection: 'row', gap: 22 },
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
