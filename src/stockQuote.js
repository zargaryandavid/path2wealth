// Pull a live last price for a US ticker (Yahoo public chart endpoint — no API key).

export function extractTicker(raw) {
  const tokens = String(raw || '').trim().toUpperCase().split(/[\s,/]+/);
  for (const tok of tokens) {
    if (/^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/.test(tok)) return tok.replace(/\./g, '-');
  }
  return null;
}

export async function fetchStockQuote(ticker) {
  const symbol = extractTicker(ticker);
  if (!symbol) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  return {
    symbol: meta.symbol || symbol,
    name: meta.shortName || meta.longName || symbol,
    price: Number(price.toFixed(2)),
  };
}
