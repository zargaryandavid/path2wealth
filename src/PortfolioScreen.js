import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, formatMoney, groupDigits } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';
import { extractTicker, fetchStockQuote } from './stockQuote';

const KINDS = [
  { key: 'Stock', label: 'Stock', full: 'Stock',          icon: 'chart-line',              color: '#4C8DFF' },
  { key: 'Metal', label: 'Metal', full: 'Precious metal', icon: 'gold',                    color: '#F5A623' },
  { key: 'Paper', label: 'Paper', full: 'Precious paper', icon: 'file-certificate-outline', color: '#B15CFF' },
  { key: 'Bond',  label: 'Bond',  full: 'Bond',           icon: 'note-text',               color: '#2CC9B5' },
];
const kindInfo = (k) => KINDS.find((x) => x.key === k) || KINDS[0];
const CYCLES = ['Monthly', 'Quarterly', '6 months', 'Yearly'];
const CURRENCIES = [
  { code: 'USD', sym: '$' }, { code: 'EUR', sym: '€' }, { code: 'GBP', sym: '£' },
  { code: 'JPY', sym: '¥' }, { code: 'CHF', sym: 'CHF ' }, { code: 'CAD', sym: 'C$' }, { code: 'AUD', sym: 'A$' },
];
const curSym = (code) => (CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]).sym;
function fmtCur(amount, code) {
  const s = formatMoney(amount);
  return code && code !== 'USD' ? curSym(code) + s.replace('$', '') : s;
}

// Donut showing the portfolio's mix by asset type.
function PortfolioPie({ holdings }) {
  const byKind = {};
  holdings.forEach((h) => { byKind[h.kind] = (byKind[h.kind] || 0) + (h.qty * h.price || 0); });
  const data = KINDS.filter((k) => byKind[k.key]).map((k) => ({ ...k, value: byKind[k.key] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const size = 118, sw = 22, r = (size - sw) / 2, c = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={styles.pieCard}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={c} originY={c}>
          {data.map((d) => {
            const dash = (d.value / total) * circ;
            const el = <Circle key={d.key} cx={c} cy={c} r={r} stroke={d.color} strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc} fill="none" />;
            acc += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.pieLegend}>
        {data.map((d) => (
          <View key={d.key} style={styles.pieRow}>
            <View style={[styles.pieDot, { backgroundColor: d.color }]} />
            <Text style={styles.pieLabel} numberOfLines={1}>{d.full}</Text>
            <Text style={styles.piePct}>{Math.round((d.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HoldingRow({ h, onEdit, onDelete }) {
  const ref = React.useRef(null);
  const ki = kindInfo(h.kind);
  const close = () => ref.current && ref.current.close();
  const extra = h.kind === 'Bond' && h.yield ? ` · ${h.yield}% ${h.cycle || 'Yearly'}` : '';
  return (
    <Swipeable ref={ref} overshootRight={false} renderRightActions={() => (
      <View style={styles.swipeActions}>
        <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#4C8DFF' }]} onPress={() => { close(); onEdit(h); }}>
          <CatIcon name="pencil" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: COLORS.expense }]} onPress={() => { close(); onDelete(h.id); }}>
          <CatIcon name="trash-can-outline" size={20} color="#FFFFFF" /><Text style={styles.swipeText}>Delete</Text>
        </TouchableOpacity>
      </View>
    )}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: ki.color + '22' }]}><CatIcon name={ki.icon} size={20} color={ki.color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{h.name}</Text>
          <Text style={styles.sub}>{ki.full} · {h.qty} × {fmtCur(h.price, h.currency)}{extra}</Text>
        </View>
        <Text style={styles.value}>{fmtCur(h.qty * h.price, h.currency)}</Text>
      </View>
    </Swipeable>
  );
}

export default function PortfolioScreen({ visible, holdings = [], setHoldings, onClose }) {
  const [kind, setKind] = useState('Stock');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [yld, setYld] = useState('');
  const [cycle, setCycle] = useState('Yearly');
  const [currency, setCurrency] = useState('USD');
  const [editId, setEditId] = useState(null);
  const [priceHint, setPriceHint] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const priceTouched = useRef(false);
  const skipLookup = useRef(false);

  useEffect(() => {
    if (!visible || kind !== 'Stock') { setLookingUp(false); setPriceHint(''); return; }
    if (skipLookup.current) { skipLookup.current = false; return; }
    const symbol = extractTicker(name);
    if (!symbol) { setLookingUp(false); setPriceHint(''); return; }
    priceTouched.current = false;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLookingUp(true);
      setPriceHint(`Looking up ${symbol}…`);
      try {
        const quote = await fetchStockQuote(symbol);
        if (cancelled) return;
        if (quote && !priceTouched.current) {
          setPrice(String(quote.price));
          setPriceHint(`${quote.symbol} · ${quote.name}`);
        } else if (!quote) {
          setPriceHint('No live price found — type it in');
        }
      } catch (e) {
        if (!cancelled) setPriceHint('Couldn’t fetch price — type it in');
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [name, kind, visible]);

  const total = holdings.reduce((s, h) => s + (h.qty * h.price || 0), 0);
  const remove = (id) => setHoldings(holdings.filter((h) => h.id !== id));
  const startEdit = (h) => {
    skipLookup.current = true;
    priceTouched.current = true;
    setEditId(h.id); setKind(h.kind); setName(h.name); setQty(String(h.qty)); setPrice(String(h.price)); setYld(String(h.yield || '')); setCycle(h.cycle || 'Yearly'); setCurrency(h.currency || 'USD');
    setPriceHint('');
  };
  const submit = () => {
    if (!name.trim()) return;
    const h = { id: editId || Date.now().toString(), kind, name: name.trim(), qty: parseFloat(qty) || 0, price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0 };
    if (kind === 'Bond') { h.yield = parseFloat(yld) || 0; h.cycle = cycle; h.currency = currency; }
    setHoldings(editId ? holdings.map((x) => (x.id === editId ? h : x)) : [...holdings, h]);
    setEditId(null); setName(''); setQty(''); setPrice(''); setYld(''); setCycle('Yearly'); setCurrency('USD');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle="dark-content" />
          <ScreenHeader title="Portfolio" onClose={onClose} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>PORTFOLIO VALUE</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
              <Text style={styles.totalSub}>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</Text>
            </View>

            {holdings.length > 0 && (<>
              <Text style={styles.section}>PORTFOLIO MIX</Text>
              <PortfolioPie holdings={holdings} />
            </>)}

            <Text style={styles.section}>YOUR HOLDINGS</Text>
            <View style={styles.holdCard}>
              {holdings.map((h) => <HoldingRow key={h.id} h={h} onEdit={startEdit} onDelete={remove} />)}
              {holdings.length === 0 && <Text style={styles.empty}>No holdings yet — add one below.</Text>}
            </View>
            <Text style={styles.hint}>Swipe a holding left to edit or delete.</Text>

            <Text style={styles.section}>{editId ? 'EDIT HOLDING' : 'ADD A HOLDING'}</Text>
            <View style={styles.addBox}>
              <View style={styles.kindRow}>
                {KINDS.map((k) => (
                  <TouchableOpacity key={k.key} style={[styles.kindChip, kind === k.key && { borderColor: k.color, backgroundColor: k.color + '18' }]} onPress={() => setKind(k.key)}>
                    <CatIcon name={k.icon} size={18} color={kind === k.key ? k.color : COLORS.textMuted} />
                    <Text style={[styles.kindText, kind === k.key && { color: k.color }]}>{k.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.field} value={name} onChangeText={setName}
                placeholder={kind === 'Stock' ? 'Name / ticker (e.g. AAPL)' : kind === 'Bond' ? 'Bond name (e.g. US Treasury)' : kind === 'Metal' ? 'e.g. Gold (oz)' : 'e.g. Gold ETF'}
                placeholderTextColor={COLORS.textMuted} />
              <View style={styles.qpRow}>
                <TextInput style={[styles.field, { flex: 1, marginBottom: 0 }]} value={qty} onChangeText={(t) => setQty(t.replace(/[^0-9.]/g, ''))}
                  placeholder="Quantity" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                <View style={styles.priceField}>
                  <Text style={styles.cur}>$</Text>
                  <TextInput style={styles.priceInput} value={groupDigits(price)} onChangeText={(t) => { priceTouched.current = true; setPrice(t.replace(/[^0-9.]/g, '')); }}
                    placeholder="Price" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                </View>
              </View>
              {kind === 'Stock' && (!!priceHint || lookingUp) && (
                <Text style={styles.priceHint}>{lookingUp ? `Looking up ${extractTicker(name) || 'ticker'}…` : priceHint}</Text>
              )}

              {kind === 'Bond' && (
                <View style={styles.bondBox}>
                  <View style={styles.qpRow}>
                    <View style={[styles.priceField, { flex: 1 }]}>
                      <TextInput style={styles.priceInput} value={yld} onChangeText={(t) => setYld(t.replace(/[^0-9.]/g, ''))}
                        placeholder="Yield" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
                      <Text style={styles.pctSuffix}>%</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                  </View>
                  <Text style={styles.bondLbl}>Payment cycle</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChips} keyboardShouldPersistTaps="handled">
                    {CYCLES.map((c) => (
                      <TouchableOpacity key={c} style={[styles.scrollChip, cycle === c && { backgroundColor: '#2CC9B5', borderColor: '#2CC9B5' }]} onPress={() => setCycle(c)}>
                        <Text style={[styles.scrollChipText, cycle === c && { color: '#FFFFFF' }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.bondLbl}>Currency</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChips} keyboardShouldPersistTaps="handled">
                    {CURRENCIES.map((c) => (
                      <TouchableOpacity key={c.code} style={[styles.scrollChip, currency === c.code && { backgroundColor: '#4C8DFF', borderColor: '#4C8DFF' }]} onPress={() => setCurrency(c.code)}>
                        <Text style={[styles.scrollChipText, currency === c.code && { color: '#FFFFFF' }]}>{c.sym} {c.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.bondHint}>Adding a bond automatically creates its coupon as recurring income (shown per month).</Text>
                </View>
              )}

              <TouchableOpacity style={styles.addBtn} onPress={submit}><Text style={styles.addBtnText}>{editId ? 'Update holding' : 'Add holding'}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  body: { padding: 20, paddingBottom: 44 },
  totalCard: { backgroundColor: '#4C8DFF', borderRadius: 20, padding: 22, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  totalValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginTop: 4 },
  totalSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textMuted, marginTop: 22, marginBottom: 10 },
  pieCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16, padding: 14 },
  pieLegend: { flex: 1, paddingLeft: 14 },
  pieRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pieDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  pieLabel: { flex: 1, fontSize: 13, color: COLORS.text },
  piePct: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  holdCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: COLORS.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  value: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  empty: { color: COLORS.textMuted, fontSize: 14, padding: 14 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  addBox: { backgroundColor: COLORS.background, borderRadius: 14, padding: 12 },
  kindRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kindChip: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  kindText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  field: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 10 },
  qpRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  priceHint: { fontSize: 12, color: COLORS.textMuted, marginTop: -4, marginBottom: 10 },
  priceField: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12 },
  cur: { color: COLORS.header, fontWeight: '700', marginRight: 4 },
  priceInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 11 },
  pctSuffix: { color: COLORS.textMuted, fontWeight: '700', marginLeft: 4 },
  bondBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: 10, marginBottom: 10 },
  bondLbl: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, marginTop: 2 },
  scrollChips: { gap: 8, paddingVertical: 2 },
  scrollChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  scrollChipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted },
  bondHint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 8, lineHeight: 16 },
  addBtn: { backgroundColor: COLORS.header, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
