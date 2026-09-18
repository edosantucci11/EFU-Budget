// EFU Budget - ponte dei prezzi (Cloudflare Worker)
// Incolla tutto questo codice in un Worker di Cloudflare e premi Deploy.
// Chiede i prezzi a Yahoo Finance e li passa all'app, aggiungendo i permessi
// che servono a una web app per leggerli. Non salva niente.
// Facoltativo: in Settings > Variables and Secrets aggiungi KEY con una parola
// segreta e scrivila anche nell'app, così solo tu puoi usare il ponte.

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function yahoo(path) {
  let last = null;
  for (const host of HOSTS) {
    try {
      const r = await fetch(host + path, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, cf: { cacheTtl: 600, cacheEverything: true } });
      if (r.ok) return await r.json();
      last = new Error('Yahoo ha risposto ' + r.status);
    } catch (e) { last = e; }
  }
  throw last || new Error('Yahoo non raggiungibile');
}

async function quote(symbol) {
  try {
    const j = await yahoo('/v8/finance/chart/' + encodeURIComponent(symbol) + '?range=5d&interval=1d');
    const r = j && j.chart && j.chart.result && j.chart.result[0];
    const m = r && r.meta;
    if (!m) return { error: 'simbolo non trovato' };
    let price = m.regularMarketPrice;
    if (!(price > 0) && r.indicators && r.indicators.quote && r.indicators.quote[0]) {
      const closes = (r.indicators.quote[0].close || []).filter(x => x > 0);
      price = closes[closes.length - 1];
    }
    if (!(price > 0)) return { error: 'prezzo non disponibile' };
    return {
      price,
      currency: m.currency || null,
      time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
      name: m.longName || m.shortName || null,
      exchange: m.fullExchangeName || m.exchangeName || null
    };
  } catch (e) { return { error: String((e && e.message) || e) }; }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (env && env.KEY && url.searchParams.get('key') !== env.KEY) return json({ error: 'chiave non valida' }, 401);
    if (url.pathname.replace(/\/+$/, '').endsWith('/search')) {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json({ ok: true, results: [] });
      try {
        const j = await yahoo('/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=10&newsCount=0&listsCount=0');
        const results = (j.quotes || []).filter(x => x.symbol).map(x => ({ symbol: x.symbol, name: x.longname || x.shortname || x.symbol, exchange: x.exchDisp || x.exchange || '', type: x.quoteType || '' }));
        return json({ ok: true, results });
      } catch (e) { return json({ error: String((e && e.message) || e) }, 502); }
    }
    const symbols = [...new Set((url.searchParams.get('s') || '').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 40);
    if (!symbols.length) return json({ ok: true, service: 'EFU Budget prezzi', version: 1 });
    const quotes = {};
    await Promise.all(symbols.map(async s => { quotes[s] = await quote(s); }));
    return json({ ok: true, quotes });
  }
};
