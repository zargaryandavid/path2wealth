import { formatMoney } from './theme';

// Whole-dollar money (no cents) — cleaner for the brief.
const m0 = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US');
};

function yearsLabel(hitMonth) {
  if (hitMonth == null) return null;
  const y = Math.floor(hitMonth / 12);
  const mo = hitMonth % 12;
  if (y <= 0) return mo ? `${mo} month${mo === 1 ? '' : 's'}` : 'this month';
  return `${y} year${y === 1 ? '' : 's'}${mo ? ` ${mo} mo` : ''}`;
}

// A short, four-part read of the household. Recomputes on every data change.
// Not a live model, not financial advice.
export function buildSituation({
  sources = [],
  monthlyBills = [],
  monthlyIncome = 0,
  monthlyInvest = 0,
  annualSpend = 0,
  start = 0,
  fireNumber = 0,
  hitMonth = null,
  goal = '',
  liquidSavings = 0,
  emergencyFund = 0,
  age = '',
}) {
  const assets = sources.reduce((s, x) => s + (Number(x.amount) || 0), 0) || Number(start) || 0;
  const bills = monthlyBills.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const annualBills = bills * 12;
  const saveRate = monthlyIncome > 0 ? (monthlyInvest / monthlyIncome) * 100 : 0;
  const funded = fireNumber > 0 && start >= fireNumber;
  const cash = liquidSavings > 0 ? liquidSavings : 0;
  const billsPct = monthlyIncome > 0 ? bills / monthlyIncome : 0;
  // The nest egg's job is to replace spending: 4% of a 25x pot = one year of spend.
  const targetMonthly = annualSpend > 0 ? annualSpend / 12 : (fireNumber * 0.04) / 12;
  const assetsMonthly = (assets * 0.04) / 12;

  const notes = [];

  // 1) FIRE — framed as the monthly retirement income the pot buys.
  if (funded) {
    notes.push(`FIRE: you're there. ${m0(assets)} in assets would safely pay about ${m0(assetsMonthly)}/mo for life (4% rule) — enough to cover your ${m0(targetMonthly)}/mo of spending. The job now is protecting the balance, not growing it.`);
  } else if (hitMonth != null) {
    notes.push(`FIRE: your ${m0(fireNumber)} target is the pot that pays about ${m0(targetMonthly)}/mo in retirement. At today's ${m0(monthlyInvest)}/mo saving you reach it in about ${yearsLabel(hitMonth)}.`);
  } else {
    notes.push(`FIRE: the ${m0(fireNumber)} target — which would pay about ${m0(targetMonthly)}/mo — is 50+ years out at this pace. Investing more each month or lowering retirement spending is what moves it.`);
  }

  // 2) Emergency fund — 5-6 months of bills vs what's on hand.
  if (bills > 0) {
    const have = emergencyFund > 0 ? emergencyFund : cash;
    const haveMonths = have / bills;
    const label = emergencyFund > 0 ? 'your emergency fund' : 'liquid savings';
    let verdict;
    if (haveMonths >= 6) verdict = 'fully covered';
    else if (haveMonths >= 5) verdict = 'right on target';
    else if (haveMonths >= 3) verdict = 'close — a bit more finishes it';
    else verdict = 'keep building';
    notes.push(`Emergency fund: aim for 5–6 months of bills = ${m0(bills * 5)}–${m0(bills * 6)}. As ${label} you have ${m0(have)} (about ${haveMonths.toFixed(1)} months) — ${verdict}.`);
  } else {
    notes.push(`Emergency fund: no repeating bills are tracked yet, so there's no target to size it against. Add rent, loans and subscriptions as repeating expenses and this will set a 5–6 month goal automatically.`);
  }

  // 3) Roth IRA — age-aware tax-advantaged account.
  const s = String(age);
  const is50plus = s.includes('55') || s.includes('60') || s.includes('65') || /\b(5[5-9]|6\d|7\d)\b/.test(s);
  const rothLimit = is50plus ? 8000 : 7000;
  notes.push(`Roth IRA: at your age you can put up to ${m0(rothLimit)}/yr (about ${m0(rothLimit / 12)}/mo)${is50plus ? ' — that includes the 50+ catch-up' : ''} into a Roth IRA. It's after-tax money that grows and comes out tax-free in retirement, so filling it first shields your gains from tax. You're already investing ${m0(monthlyInvest)}/mo — routing part of that here is an easy win.`);

  // 4) Bottleneck — the single biggest thing holding the plan back.
  let bottleneck;
  if (monthlyIncome > 0 && bills >= monthlyIncome) {
    bottleneck = `your bills (${m0(bills)}/mo) are nearly your whole income, so there's little left to invest. Closing that gap is the #1 priority.`;
  } else if (bills > 0 && cash / bills < 3) {
    bottleneck = `your cash cushion is under 3 months of bills — a surprise could force selling investments. Build the emergency fund before taking on more risk.`;
  } else if (saveRate > 0 && saveRate < 15) {
    bottleneck = `only ${Math.round(saveRate)}% of income is invested — the single biggest lever on your FIRE date. Freeing up bills lets you raise it.`;
  } else if (billsPct > 0.4) {
    bottleneck = `repeating bills eat ${Math.round(billsPct * 100)}% of income (${m0(bills)}/mo) — the main brake on your plan. Every ${m0(bills * 0.1)}/mo trimmed goes straight to investing.`;
  } else if (hitMonth == null || hitMonth > 360) {
    bottleneck = `your ${m0(annualSpend)}/yr retirement spending sets a ${m0(fireNumber)} target (25×). Lowering that number is the fastest way to pull the date in.`;
  } else {
    bottleneck = `nothing major stands out — bills, savings rate and cushion are all in a healthy range. Consistency is the whole game from here.`;
  }
  notes.push('Bottleneck: ' + bottleneck);

  return { assets, bills, annualBills, notes };
}
