import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Pressable } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, formatMoney, groupDigits, holdingValueUsd, currencySymbol } from './theme';
import ScreenHeader from './ScreenHeader';
import { CatIcon } from './Icons';
import { extractTicker, fetchStockQuote } from './stockQuote';
import { todayKey, parseKey, toKey, formatKey } from './recurring';

const KINDS = [
  { key: 'Stock', label: 'Stock', full: 'Stock',          icon: 'chart-line',              color: '#4C8DFF' },
  { key: 'Metal', label: 'Metal', full: 'Precious metal', icon: 'gold',                    color: '#F5A623' },
  { key: 'Paper', label: 'Paper', full: 'Precious paper', icon: 'file-certificate-outline', color: '#B15CFF' },
  { key: 'Bond',   label: 'Bond',   full: 'Bond',           icon: 'note-text',               color: '#2CC9B5' },
  { key: 'Realty', label: 'Realty', full: 'Real estate',    icon: 'office-building',         color: '#3FB984' },
];
const kindInfo = (k) => KINDS.find((x) => x.key === k) || KINDS[0];
const CYCLES = ['Monthly', 'Quarterly', '6 months', 'Yearly'];
const CURRENCIES = [
  { code: 'USD', sym: '$' }, { code: 'EUR', sym: '€' }, { code: 'GBP', sym: '£' },
  { code: 'JPY', sym: '¥' }, { code: 'CHF', sym: 'CHF ' }, { code: 'CAD', sym: 'C$' }, { code: 'AUD', sym: 'A$' },
  { code: 'AMD', sym: '֏' },
];
const curSym = (code) => currencySymbol(code);
function fmtCur(amount, code) {
  return formatMoney(amount, code || 'USD');
}
const currencyChipLabel = (c) => (c.code === 'AMD' ? '֏ AMD (Armenian drams)' : `${c.sym} ${c.code}`);
const SLICE_COLORS = ['#4C8DFF', '#2CC9B5', '#F5A623', '#B15CFF', '#FF6B6B', '#7C8CA3', '#FF7AC6', '#3FB984', '#FF8A4C', '#5B6CFF', '#2E8B57', '#C0392B', '#16A085'];
const CURRENCY_META = {
  USD: { color: '#4C8DFF', label: 'USD $' },
  AMD: { color: '#F5A623', label: 'AMD ֏' },
  EUR: { color: '#B15CFF', label: 'EUR €' },
  GBP: { color: '#7C8CA3', label: 'GBP £' },
  JPY: { color: '#FF6B6B', label: 'JPY ¥' },
  CHF: { color: '#2CC9B5', label: 'CHF' },
  CAD: { color: '#3FB984', label: 'CAD $' },
  AUD: { color: '#FF8A4C', label: 'AUD $' },
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const picked = parseKey(value) || new Date();
  const [cursor, setCursor] = useState(() => new Date(picked.getFullYear(), picked.getMonth(), 1));
  useEffect(() => {
    if (!open) return;
    const d = parseKey(value) || new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [open, value]);
  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const selKey = toKey(picked);
  const today = todayKey();
  return (
    <>
      <TouchableOpacity style={styles.dateField} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <CatIcon name="calendar" size={18} color={COLORS.header} />
        <Text style={styles.selectValue} numberOfLines={1}>{formatKey(value) || 'Pick a date'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.calSheet} onPress={() => {}}>
            <View style={styles.calMonthRow}>
              <TouchableOpacity onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} style={styles.calNav}>
                <CatIcon name="chevron-left" size={26} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={styles.calMonth}>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const n = new Date();
                    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
                    onChange(todayKey(n));
                    setOpen(false);
                  }}
                >
                  <Text style={styles.calToday}>Today</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} style={styles.calNav}>
                <CatIcon name="chevron-right" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.calWeek}>
              {WEEKDAYS.map((w, i) => <Text key={w + i} style={styles.calWeekDay}>{w}</Text>)}
            </View>
            <View style={styles.calGrid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`e-${i}`} style={styles.calCell} />;
                const k = toKey(d);
                const on = k === selKey;
                const isToday = k === today;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.calCell, on && styles.calCellOn, isToday && !on && styles.calCellToday]}
                    onPress={() => { onChange(k); setOpen(false); }}
                  >
                    <Text style={[styles.calDay, on && styles.calDayOn, isToday && !on && styles.calDayToday]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function LinePicker({ value, onChange, items }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((it) => it.value === value);
  return (
    <>
      <TouchableOpacity style={styles.selectWrap} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.selectValue} numberOfLines={1}>{selected?.label}</Text>
        <Text style={styles.selectChevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.selectBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.selectSheet}>
            <ScrollView bounces={false} style={styles.selectList} keyboardShouldPersistTaps="handled">
              {items.map((it) => {
                const active = it.value === value;
                return (
                  <TouchableOpacity
                    key={it.value}
                    style={[styles.selectOption, active && styles.selectOptionOn]}
                    onPress={() => { onChange(it.value); setOpen(false); }}
                  >
                    <Text style={[styles.selectOptionText, active && styles.selectOptionTextOn]} numberOfLines={1}>
                      {it.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function piePct(part, total) {
  if (!total) return '0%';
  const p = (part / total) * 100;
  if (p > 0 && p < 1) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}

function MiniPie({ title, data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const size = 78, sw = 14, r = (size - sw) / 2, c = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={styles.miniPieCard}>
      <Text style={styles.miniPieTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.miniPieBody}>
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
        <ScrollView style={styles.miniLegend} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {data.map((d) => (
            <View key={d.key} style={styles.pieRow}>
              <View style={[styles.pieDot, { backgroundColor: d.color, marginTop: 3 }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.miniLabel} numberOfLines={1}>{d.label}</Text>
                <Text style={styles.miniAmt} numberOfLines={1}>{d.amountLabel || formatMoney(d.value)}</Text>
              </View>
              <Text style={styles.miniPct}>{piePct(d.value, total)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function MixGrid({ holdings }) {
  const byKind = {};
  holdings.forEach((h) => { byKind[h.kind] = (byKind[h.kind] || 0) + holdingValueUsd(h); });
  const kindData = KINDS.filter((k) => byKind[k.key]).map((k) => ({
    key: k.key, label: k.label, color: k.color, value: byKind[k.key], amountLabel: formatMoney(byKind[k.key]),
  }));

  const byCur = {};
  holdings.filter((h) => h.kind === 'Bond').forEach((h) => {
    const code = h.currency || 'USD';
    if (!byCur[code]) byCur[code] = { native: 0, usd: 0 };
    byCur[code].native += (h.qty * h.price || 0);
    byCur[code].usd += holdingValueUsd(h);
  });
  const curData = Object.keys(byCur).map((code) => {
    const meta = CURRENCY_META[code] || { color: '#7C8CA3', label: code };
    return { key: code, label: meta.label, color: meta.color, value: byCur[code].usd, amountLabel: fmtCur(byCur[code].native, code) };
  });

  const named = (list) => list
    .map((h, i) => ({
      key: h.id, label: h.name, color: SLICE_COLORS[i % SLICE_COLORS.length],
      value: holdingValueUsd(h), amountLabel: fmtCur(h.qty * h.price, h.currency),
    }))
    .filter((d) => d.value > 0);

  const cells = [
    kindData.length ? { title: 'Asset mix', data: kindData } : null,
    curData.length ? { title: 'Bond currency', data: curData } : null,
    holdings.some((h) => h.kind === 'Stock') ? { title: 'Stocks', data: named(holdings.filter((h) => h.kind === 'Stock')) } : null,
    holdings.some((h) => h.kind === 'Bond') ? { title: 'Bonds', data: named(holdings.filter((h) => h.kind === 'Bond')) } : null,
  ].filter((c) => c && c.data.length);

  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  if (!rows.length) return null;
  return (
    <View>
      {rows.map((row, i) => (
        <View key={i} style={styles.pieGrid}>
          {row.map((cell) => <View key={cell.title} style={styles.pieCell}><MiniPie title={cell.title} data={cell.data} /></View>)}
          {row.length === 1 && <View style={styles.pieCell} />}
        </View>
      ))}
    </View>
  );
}

function HoldingRow({ h, onEdit, onDelete, onPress }) {
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
      <Pressable style={styles.row} onPress={onPress}>
        <View style={[styles.icon, { backgroundColor: ki.color + '22' }]}><CatIcon name={ki.icon} size={20} color={ki.color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{h.name}</Text>
          <Text style={styles.sub}>{ki.full} · {h.qty} × {fmtCur(h.price, h.currency)}{extra}</Text>
        </View>
        <Text style={styles.value}>{fmtCur(h.qty * h.price, h.currency)}</Text>
      </Pressable>
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
  const [couponStart, setCouponStart] = useState(todayKey());
  const [editId, setEditId] = useState(null);
  const [filterKind, setFilterKind] = useState('All');
  const [filterCur, setFilterCur] = useState('All');
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

  const presentKinds = KINDS.filter((k) => holdings.some((h) => h.kind === k.key));
  const bondCurrencies = [...new Set(holdings.filter((h) => h.kind === 'Bond').map((h) => h.currency || 'USD'))];

  useEffect(() => {
    if (filterKind !== 'All' && !holdings.some((h) => h.kind === filterKind)) setFilterKind('All');
    if (filterCur !== 'All' && !bondCurrencies.includes(filterCur)) setFilterCur('All');
  }, [holdings, filterKind, filterCur]);
  const total = holdings.reduce((s, h) => s + holdingValueUsd(h), 0);
  const visibleHoldings = holdings.filter((h) => {
    if (filterKind !== 'All' && h.kind !== filterKind) return false;
    if (filterKind === 'Bond' && filterCur !== 'All' && (h.currency || 'USD') !== filterCur) return false;
    return true;
  });
  const remove = (id) => setHoldings(holdings.filter((h) => h.id !== id));
  const startEdit = (h) => {
    skipLookup.current = true;
    priceTouched.current = true;
    setEditId(h.id); setKind(h.kind); setName(h.name); setQty(String(h.qty)); setPrice(String(h.price)); setYld(String(h.yield || '')); setCycle(h.cycle || 'Yearly'); setCurrency(h.currency || 'USD'); setCouponStart(h.couponStart || todayKey());
    setPriceHint('');
  };
  const cancelEdit = () => {
    skipLookup.current = true;
    priceTouched.current = false;
    setEditId(null); setName(''); setQty(''); setPrice(''); setYld(''); setCycle('Yearly'); setCurrency('USD'); setCouponStart(todayKey()); setKind('Stock'); setPriceHint('');
  };
  const applyKindFilter = (next) => {
    if (editId) cancelEdit();
    setFilterKind(next);
    if (next !== 'Bond') setFilterCur('All');
  };
  const applyCurFilter = (next) => {
    if (editId) cancelEdit();
    setFilterCur(next);
  };
  const submit = () => {
    if (!name.trim()) return;
    const h = { id: editId || Date.now().toString(), kind, name: name.trim(), qty: parseFloat(qty) || 0, price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0 };
    if (kind === 'Bond') {
      const start = /^\d{4}-\d{2}-\d{2}$/.test(couponStart) ? couponStart : todayKey();
      h.yield = parseFloat(yld) || 0;
      h.cycle = cycle;
      h.currency = currency;
      h.couponStart = start;
    }
    setHoldings(editId ? holdings.map((x) => (x.id === editId ? h : x)) : [...holdings, h]);
    cancelEdit();
  };

  const formBox = (
    <View style={[styles.addBox, editId && styles.inlineEdit]}>
      <View style={styles.kindRow}>
        {KINDS.map((k) => (
          <TouchableOpacity key={k.key} style={[styles.kindChip, kind === k.key && { borderColor: k.color, backgroundColor: k.color + '18' }]} onPress={() => setKind(k.key)}>
            <CatIcon name={k.icon} size={18} color={kind === k.key ? k.color : COLORS.textMuted} />
            <Text style={[styles.kindText, kind === k.key && { color: k.color }]}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {kind === 'Bond' ? (
        <>
          <View style={styles.qpRow}>
            <TextInput style={[styles.field, { flex: 1, marginBottom: 0 }]} value={name} onChangeText={setName}
              placeholder="Bond name (e.g. US Treasury)" placeholderTextColor={COLORS.textMuted} />
            <View style={{ flex: 1 }}>
              <LinePicker
                value={currency}
                onChange={setCurrency}
                items={CURRENCIES.map((c) => ({ label: currencyChipLabel(c), value: c.code }))}
              />
            </View>
          </View>
          <View style={styles.qpRow}>
            <View style={styles.priceField}>
              <Text style={styles.cur}>{curSym(currency)}</Text>
              <TextInput style={styles.priceInput} value={groupDigits(price)} onChangeText={(t) => { priceTouched.current = true; setPrice(t.replace(/[^0-9.]/g, '')); }}
                placeholder="Price" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            </View>
            <View style={styles.yieldField}>
              <TextInput
                style={styles.yieldInput}
                value={yld}
                onChangeText={(t) => setYld(t.replace(/[^0-9.]/g, ''))}
                placeholder="Yield"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.pctSuffix}>%</Text>
            </View>
          </View>
          <View style={styles.qpRow}>
            <TextInput style={[styles.field, { flex: 1, marginBottom: 0 }]} value={qty} onChangeText={(t) => setQty(t.replace(/[^0-9.]/g, ''))}
              placeholder="Quantity" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
            <View style={{ flex: 1 }}>
              <LinePicker
                value={cycle}
                onChange={setCycle}
                items={CYCLES.map((c) => ({ label: c, value: c }))}
              />
            </View>
          </View>
          <DateField value={couponStart} onChange={setCouponStart} />
          <Text style={styles.bondHint}>Coupons land on the calendar from this date, on the payment cycle, for 24 months.</Text>
        </>
      ) : (
        <>
          <TextInput style={styles.field} value={name} onChangeText={setName}
            placeholder={kind === 'Stock' ? 'Name / ticker (e.g. AAPL)' : kind === 'Metal' ? 'e.g. Gold (oz)' : 'e.g. Gold ETF'}
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
        </>
      )}
      <View style={styles.formActions}>
        {editId && (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.addBtn, editId && { flex: 2 }]} onPress={submit}>
          <Text style={styles.addBtnText}>{editId ? 'Update holding' : 'Add holding'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle="dark-content" />
          <ScreenHeader title="Portfolio" onClose={onClose} />
          <ScrollView contentContainerStyle={[styles.body, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
            <Pressable onPress={editId ? cancelEdit : undefined}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>PORTFOLIO VALUE</Text>
                <Text style={styles.totalValue}>{formatMoney(total)}</Text>
                <Text style={styles.totalSub}>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</Text>
              </View>

              {holdings.length > 0 && (<>
                <Text style={styles.section}>PORTFOLIO MIX</Text>
                <MixGrid holdings={holdings} />
              </>)}

              <Text style={styles.section}>YOUR HOLDINGS</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
              {[{ key: 'All', label: 'All', color: COLORS.header }, ...presentKinds].map((k) => {
                const on = filterKind === k.key;
                const count = k.key === 'All' ? holdings.length : holdings.filter((h) => h.kind === k.key).length;
                return (
                  <TouchableOpacity
                    key={k.key}
                    style={[styles.filterChip, on && { borderColor: k.color, backgroundColor: k.color + '18' }]}
                    onPress={() => applyKindFilter(k.key)}
                  >
                    <Text style={[styles.filterChipText, on && { color: k.color }]}>{k.label}{count ? ` ${count}` : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {filterKind === 'Bond' && bondCurrencies.length > 0 && (
              <View style={styles.filterRow}>
                {[{ key: 'All', label: 'All currencies', color: '#2CC9B5' }, ...bondCurrencies.map((code) => ({
                  key: code,
                  label: (CURRENCY_META[code] || { label: code }).label,
                  color: (CURRENCY_META[code] || { color: '#7C8CA3' }).color,
                }))].map((c) => {
                  const on = filterCur === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.filterChip, on && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                      onPress={() => applyCurFilter(c.key)}
                    >
                      <Text style={[styles.filterChipText, on && { color: c.color }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={styles.holdCard}>
              {visibleHoldings.map((h) => (
                <View key={h.id}>
                  <HoldingRow h={h} onEdit={startEdit} onDelete={remove} onPress={editId ? cancelEdit : undefined} />
                  {editId === h.id && (
                    <Pressable onPress={() => {}}>
                      <Text style={styles.inlineTitle}>Edit {h.name}</Text>
                      {formBox}
                    </Pressable>
                  )}
                </View>
              ))}
              {holdings.length === 0 && <Text style={styles.empty}>No holdings yet — add one below.</Text>}
              {holdings.length > 0 && visibleHoldings.length === 0 && (
                <Text style={styles.empty}>No holdings match this filter.</Text>
              )}
            </View>
            <Pressable onPress={editId ? cancelEdit : undefined} style={{ flexGrow: 1 }}>
              <Text style={styles.hint}>Swipe a holding left to edit or delete.</Text>
              {!editId && (
                <>
                  <Text style={styles.section}>ADD A HOLDING</Text>
                  {formBox}
                </>
              )}
            </Pressable>
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
  pieGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pieCell: { flex: 1, minWidth: 0 },
  miniPieCard: { backgroundColor: COLORS.background, borderRadius: 16, padding: 10, minHeight: 168 },
  miniPieTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, letterSpacing: 0.2 },
  miniPieBody: { flexDirection: 'row', alignItems: 'flex-start' },
  miniLegend: { flex: 1, maxHeight: 110, marginLeft: 8 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  miniAmt: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 1 },
  miniPct: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginLeft: 4 },
  pieRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  pieDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  filterChipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted },
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
  inlineTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: '#4C8DFF', marginHorizontal: 12, marginTop: 8, marginBottom: 4 },
  inlineEdit: { marginHorizontal: 10, marginBottom: 12, marginTop: 2, borderWidth: 1.5, borderColor: '#4C8DFF' },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border },
  cancelText: { color: COLORS.text, fontSize: 15, fontWeight: '700', includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 },
  addBtnGrow: { flex: 1 },
  kindRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kindChip: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  kindText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  field: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 10 },
  qpRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  priceHint: { fontSize: 12, color: COLORS.textMuted, marginTop: -4, marginBottom: 10 },
  priceField: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12 },
  cur: { color: COLORS.header, fontWeight: '700', marginRight: 4 },
  priceInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 11 },
  pctSuffix: { color: COLORS.textMuted, fontWeight: '700', marginLeft: 8, fontSize: 16 },
  yieldField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12,
  },
  yieldInput: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text, paddingVertical: 0 },
  dateField: {
    height: 48, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  calSheet: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginHorizontal: 20 },
  calMonthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  calNav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calMonth: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  calToday: { fontSize: 13, fontWeight: '700', color: COLORS.header, marginTop: 2 },
  calWeek: { flexDirection: 'row', marginBottom: 4 },
  calWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  calCellOn: { backgroundColor: COLORS.header },
  calCellToday: { backgroundColor: '#0EA47A18' },
  calDay: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  calDayOn: { color: '#FFFFFF' },
  calDayToday: { color: COLORS.header },
  selectWrap: {
    height: 48, marginBottom: 0, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
  },
  selectValue: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  selectChevron: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8 },
  selectBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 28 },
  selectSheet: { backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', maxHeight: 320 },
  selectList: { maxHeight: 320 },
  selectOption: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  selectOptionOn: { backgroundColor: '#0EA47A14' },
  selectOptionText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  selectOptionTextOn: { color: COLORS.header },
  bondHint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: -2, marginBottom: 10, lineHeight: 16 },
  addBtn: { flex: 1, backgroundColor: COLORS.header, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', includeFontPadding: false, textAlignVertical: 'center', lineHeight: 20 },
});
