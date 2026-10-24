
'use strict';
/* =========================================================
   EFU Budget · web app per iPhone
   I dati restano sul dispositivo: localStorage per i dati,
   IndexedDB per le foto degli scontrini.
   ========================================================= */
const APP_VERSION = '2.5.2';
const IS_PACKAGE = true; // la build installabile imposta true
const DATA_KEY = 'budget.iphone.v1';

/* ---------- utilità ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const r2 = n => { n = Number(n) || 0; return Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-7) / 100; };
const sum = a => r2(a.reduce((s, x) => s + (Number(x) || 0), 0));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const NF2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NF0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
function eur(n, o = {}) {
  if (HIDE && !o.show) return '•••• ' + baseSym();
  const v = r2(n);
  let s = NF2.format(Math.abs(v)) + ' ' + baseSym();
  if (v < 0) s = '−' + s; else if (o.sign && v > 0) s = '+' + s;
  return s;
}
const eur0 = n => HIDE ? '•••• ' + baseSym() : (r2(n) < 0 ? '−' : '') + NF0.format(Math.abs(Math.round(n))) + ' ' + baseSym();
const pct = x => Math.round(x * 100) + '%';
let HIDE = false;
function strToNum(s) {
  if (typeof s === 'number') return s;
  s = String(s || '').trim().replace(/\s/g, '').replace(/€/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
function numStr(n, maxDec = 2) {
  if (n == null || n === '' || !isFinite(n)) return '';
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: maxDec, useGrouping: false }).format(n);
}

/* ---------- date (stringhe YYYY-MM-DD in ora locale) ---------- */
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => isoOf(new Date());
const dateOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const mk = s => s.slice(0, 7);
const curMk = () => mk(today());
function addM(k, n) {
  let [y, m] = k.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return Math.floor(t / 12) + '-' + pad((t % 12 + 12) % 12 + 1);
}
function diffM(a, b) { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); }
const dim = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const endOf = k => k + '-' + pad(dim(k));
function addDays(s, n) { const d = dateOf(s); d.setDate(d.getDate() + n); return isoOf(d); }
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MESI_S = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
function monthName(k, withYear = true) { const [y, m] = k.split('-').map(Number); return cap(MESI[m - 1]) + (withYear ? ' ' + y : ''); }
function dayTitle(s) {
  const t = today();
  if (s === t) return 'Oggi';
  if (s === addDays(t, -1)) return 'Ieri';
  if (s === addDays(t, 1)) return 'Domani';
  const d = dateOf(s);
  let r = cap(GIORNI[d.getDay()]) + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
  if (d.getFullYear() !== new Date().getFullYear()) r += ' ' + d.getFullYear();
  return r;
}
function shortDate(s) {
  const d = dateOf(s);
  return d.getDate() + ' ' + MESI_S[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}
function relDays(s) {
  const n = daysBetween(today(), s);
  if (n === 0) return 'oggi';
  if (n === 1) return 'domani';
  if (n > 1) return 'tra ' + n + ' giorni';
  if (n === -1) return 'ieri';
  return n + ' giorni fa';
}
function serialToISO(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}
function isoToSerial(s) { const [y, m, d] = s.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000; }

/* ---------- costanti ---------- */
const PALETTE = ['#FF385C', '#FC642D', '#E8A200', '#00A699', '#2F6FED', '#6C5CE7', '#914669', '#E8488A', '#3BB273', '#7A8B99', '#A0522D', '#0B8A8A'];
const CURRENCIES = [
  ['USD', '$', 'Dollaro USA'], ['GBP', '£', 'Sterlina britannica'], ['CHF', 'CHF', 'Franco svizzero'], ['JPY', '¥', 'Yen giapponese'],
  ['CNY', 'CN¥', 'Yuan cinese'], ['CAD', 'C$', 'Dollaro canadese'], ['AUD', 'A$', 'Dollaro australiano'], ['SEK', 'kr', 'Corona svedese'],
  ['NOK', 'kr', 'Corona norvegese'], ['DKK', 'kr', 'Corona danese'], ['PLN', 'zł', 'Złoty polacco'], ['CZK', 'Kč', 'Corona ceca'],
  ['HUF', 'Ft', 'Fiorino ungherese'], ['RON', 'lei', 'Leu rumeno'], ['TRY', '₺', 'Lira turca'], ['AED', 'AED', 'Dirham degli Emirati'],
  ['MAD', 'MAD', 'Dirham marocchino'], ['EGP', 'E£', 'Sterlina egiziana'], ['THB', '฿', 'Baht thailandese'], ['BRL', 'R$', 'Real brasiliano'], ['MXN', 'MX$', 'Peso messicano']
];
const EURO = ['EUR', '€', 'Euro'];
const ALL_CUR = () => [EURO].concat(CURRENCIES);
const baseCur = () => (D && D.settings && D.settings.base) || 'EUR';
const curSym = c => (ALL_CUR().find(x => x[0] === c) || [c, c])[1];
const curName = c => (ALL_CUR().find(x => x[0] === c) || [c, c, c])[2];
const baseSym = () => curSym(baseCur());
const fmtCur = (n, c) => HIDE ? '•••• ' + curSym(c) : NF2.format(r2(n)) + ' ' + curSym(c);
const FREQS = [[1, 'Mensile'], [2, 'Bimestrale'], [3, 'Trimestrale'], [6, 'Semestrale'], [12, 'Annuale']];
const EMOJIS = ['🛒', '🏠', '💡', '⛽', '🚗', '🚆', '💊', '🩺', '🎬', '🍕', '🍝', '☕', '🍷', '👕', '👟', '📺', '📱', '💻', '🎮', '📚', '🎓', '🧸', '🐾', '🎁', '✈️', '🏖️', '🏋️', '⚽', '💇', '🧾', '🛡️', '🏦', '💳', '💶', '💼', '📈', '🐷', '🎯', '🔧', '🧹', '🌱', '🎵', '🏥', '👶', '💍', '🚲', '🅿️', '📦', '🏷️', '❤️', '🛟', '🏔️'];
const PEOPLE_EMOJI = ['🙂', '😀', '🧔', '👩', '👨', '👧', '👦', '👵', '👴', '🧑', '👱', '🐶'];
const DEFAULT_CATS = [
  ['Stipendio', 'in', 2000, '💼'], ['Altre entrate', 'in', 0, '💶'],
  ['Affitto / Mutuo', 'out', 700, '🏠'], ['Bollette', 'out', 150, '💡'], ['Spesa alimentare', 'out', 400, '🛒'],
  ['Trasporti / Carburante', 'out', 150, '⛽'], ['Salute', 'out', 50, '💊'], ['Svago', 'out', 100, '🎬'],
  ['Abbigliamento', 'out', 50, '👕'], ['Abbonamenti', 'out', 30, '📺'], ['Varie', 'out', 50, '📦']
];
const EMOJI_GUESS = [
  [/stipend|salar|busta/i, '💼'], [/entrat|rimbors|bonus|premi/i, '💶'], [/affitt|mutuo|casa|condomin/i, '🏠'],
  [/bollett|luce|gas|acqua|energia|internet|telefon/i, '💡'], [/spesa|aliment|supermerc|cibo/i, '🛒'],
  [/trasport|carbur|benzin|auto|moto|treno|bus/i, '⛽'], [/salut|medic|farmac|dentist/i, '💊'], [/svago|divert|tempo libero|uscit/i, '🎬'],
  [/abbigl|vestit|scarpe|moda/i, '👕'], [/abbonam|stream|palestr/i, '📺'], [/risparm|salvadan/i, '🐷'], [/ristor|bar|pizz|cena/i, '🍝'],
  [/viagg|vacanz|ferie/i, '✈️'], [/regal/i, '🎁'], [/figli|scuol|bimb|bambin/i, '🧸'], [/animal|cane|gatt|veterin/i, '🐾'],
  [/sport|fitness/i, '🏋️'], [/tecnolog|elettron|computer/i, '💻'], [/istruz|cors|libr|formaz/i, '📚'], [/tass|impost|tribut/i, '🧾'],
  [/assicur/i, '🛡️'], [/varie|altro|diverse/i, '📦']
];
const guessEmoji = name => { for (const [re, e] of EMOJI_GUESS) if (re.test(name)) return e; return '🏷️'; };
const KEYWORDS = [
  [/\b(supermercato|super|esselunga|coop|conad|lidl|carrefour|eurospin|penny|aldi|pam|alimentari|frutta|verdura|panificio|panetteria|macelleria|spesa)\b/i, ['spesa', 'aliment']],
  [/\b(benzina|carburante|pieno|diesel|gasolio|gpl|autostrada|telepass|treno|trenitalia|italo|bus|autobus|metro|taxi|parcheggio|pedaggio)\b/i, ['trasport', 'carbur', 'auto']],
  [/\b(luce|gas|acqua|bolletta|enel|internet|fibra|telefono|cellulare|ricarica|tari|rifiuti)\b/i, ['bollett']],
  [/\b(farmacia|medico|dentista|visita|ticket|analisi|ottico|fisioterapia)\b/i, ['salute', 'medic']],
  [/\b(cinema|pizza|pizzeria|ristorante|bar|aperitivo|concerto|teatro|pub|sushi|cena|pranzo|gelato|museo)\b/i, ['svago', 'ristor']],
  [/\b(vestiti|scarpe|maglia|maglione|pantaloni|giacca|abbigliamento|jeans|camicia)\b/i, ['abbigl']],
  [/\b(netflix|spotify|disney|prime|dazn|sky|palestra|abbonamento|icloud|youtube)\b/i, ['abbonam']],
  [/\b(affitto|mutuo|condominio)\b/i, ['affitt', 'mutuo']],
  [/\b(stipendio|busta|salario|paga)\b/i, ['stipend']]
];

/* ---------- dati ---------- */
let D = null;           // tutti i dati dell'app
let STORAGE_OK = true;  // false se il browser non permette di salvare
function blankData() {
  return {
    v: 1, created: today(),
    settings: { defaultAccount: null, pin: null, lockAfter: 60, lastBackup: null, rates: {}, demo: false, installHintClosed: false, base: 'EUR', partners: {}, aliases: {}, apSeen: [] },
    accounts: [], categories: [], movements: [], fixed: [], people: [], inbox: [], deleted: {}, invest: []
  };
}
function migrate(d) {
  const b = blankData();
  d.settings = Object.assign(b.settings, d.settings || {});
  for (const k of ['accounts', 'categories', 'movements', 'fixed', 'people']) if (!Array.isArray(d[k])) d[k] = [];
  if (!d.settings.rates || typeof d.settings.rates !== 'object') d.settings.rates = {};
  if (!Array.isArray(d.inbox)) d.inbox = [];
  if (!Array.isArray(d.invest)) d.invest = [];
  if (!d.deleted || typeof d.deleted !== 'object') d.deleted = {};
  return d;
}
function load() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const d = migrate(JSON.parse(raw));
    LAST_JSON = raw; LAST_ENT = entIndex(d);
    return d;
  } catch (e) { STORAGE_OK = false; return null; }
}
/* salvataggio, annulla e marcatura delle modifiche (serve al budget di coppia) */
const UNDO = [];
let LAST_JSON = null, LAST_ENT = null, UNDO_ARMED = false;
const SYNC_COLS = ['accounts', 'categories', 'people', 'fixed', 'movements', 'invest'];
function entIndex(d) {
  const m = new Map();
  for (const c of SYNC_COLS) for (const x of (d[c] || [])) { const { upd, ...rest } = x; m.set(c + ':' + x.id, JSON.stringify(rest)); }
  return m;
}
function stamp() {
  if (!LAST_ENT) return;
  const now = Date.now(), seen = new Set();
  if (!D.deleted) D.deleted = {};
  for (const c of SYNC_COLS) for (const x of D[c]) {
    const key = c + ':' + x.id;
    seen.add(key);
    if (c === 'movements' && !LAST_ENT.has(key) && !x.by) x.by = device().id;
    const { upd, ...rest } = x;
    if (LAST_ENT.get(key) !== JSON.stringify(rest)) { x.upd = now; delete D.deleted[x.id]; }
  }
  for (const key of LAST_ENT.keys()) if (!seen.has(key)) D.deleted[key.slice(key.indexOf(':') + 1)] = now;
}
function save(opts = {}) {
  invalidate();
  if (!D) return;
  if (!opts.noSync && syncAuto()) invalidate();
  if (!opts.noStamp) stamp();
  const json = JSON.stringify(D);
  if (LAST_JSON && LAST_JSON !== json && opts.undo !== false) { UNDO.push(LAST_JSON); if (UNDO.length > 12) UNDO.shift(); UNDO_ARMED = true; }
  LAST_JSON = json;
  LAST_ENT = entIndex(D);
  try { localStorage.setItem(DATA_KEY, json); STORAGE_OK = true; }
  catch (e) { STORAGE_OK = false; toast('Non riesco a salvare: spazio esaurito o salvataggio bloccato. Fai un backup.', null); }
}
function wipeStorage() { try { localStorage.removeItem(DATA_KEY); } catch (e) { } PhotoDB.clear().catch(() => { }); UNDO.length = 0; LAST_JSON = null; LAST_ENT = null; }

/* memo dei calcoli, azzerata a ogni salvataggio */
let MEMO = {};
const invalidate = () => { MEMO = {}; };
const memo = (k, fn) => (k in MEMO ? MEMO[k] : (MEMO[k] = fn()));

/* ---------- ricerca oggetti ---------- */
const accMap = () => memo('accMap', () => new Map(D.accounts.map(a => [a.id, a])));
const acc = id => accMap().get(id);
const cat = id => D.categories.find(c => c.id === id);
const person = id => D.people.find(p => p.id === id);
const isGoal = a => !!a && a.kind === 'goal';
const liquidAccounts = () => D.accounts.filter(a => !a.archived && (a.kind !== 'goal' && a.kind !== 'invest'));
const goals = () => D.accounts.filter(a => !a.archived && a.kind === 'goal');
const activeCats = type => D.categories.filter(c => !c.archived && (!type || c.type === type));
function defaultAccountId() {
  const a = acc(D.settings.defaultAccount);
  if (a && !a.archived && (!isGoal(a) && a.kind !== 'invest')) return a.id;
  const l = liquidAccounts()[0];
  return l ? l.id : null;
}
function nextColor(list) {
  const used = {};
  for (const x of list) used[x.color] = (used[x.color] || 0) + 1;
  let best = PALETTE[0], n = Infinity;
  for (const c of PALETTE) { const u = used[c] || 0; if (u < n) { n = u; best = c; } }
  return best;
}
function newCategory(name, type, budget = 0, emoji) {
  return { id: uid(), name, type, budget: r2(budget), emoji: emoji || guessEmoji(name), color: nextColor(D ? D.categories : []), archived: false };
}
function defaultCategories() {
  return DEFAULT_CATS.map(([n, t, b, e], i) => ({ id: uid(), name: n, type: t, budget: b, emoji: e, color: PALETTE[i % PALETTE.length], archived: false }));
}
const accName = id => (acc(id) ? acc(id).name : 'Conto eliminato');

/* ---------- movimenti: effetti su conti e budget ---------- */
// effetto sul saldo dei conti: [[idConto, delta], ...]
function effects(m) {
  switch (m.type) {
    case 'out': return m.paidBy ? [] : [[m.accountId, -m.amount]];
    case 'in': return [[m.accountId, m.amount]];
    case 'transfer': return [[m.accountId, -m.amount], [m.toAccountId, m.amount]];
    case 'settle': return [[m.accountId, m.dir === 'in' ? m.amount : -m.amount]];
  }
  return [];
}
// quota che conta nel budget (la mia parte se la spesa è divisa)
const eff = m => (m.split ? m.split.mine : m.amount);

function balancesAt(dateIso) {
  return memo('bal' + dateIso, () => {
    const res = {};
    for (const a of D.accounts) res[a.id] = (!a.initialDate || a.initialDate <= dateIso) ? (a.initial || 0) : 0;
    for (const m of D.movements) {
      if (m.date > dateIso) continue;
      for (const [id, d] of effects(m)) {
        const a = acc(id);
        if (!a || (a.initialDate && m.date < a.initialDate)) continue;
        res[id] += d;
      }
    }
    for (const k in res) res[k] = r2(res[k]);
    return res;
  });
}
function availAt(dateIso) { const b = balancesAt(dateIso); return sum(liquidAccounts().map(a => b[a.id])); }

function monthStats(k) {
  return memo('ms' + k, () => {
    let inc = 0, out = 0, saved = 0, n = 0;
    const byCat = {};
    for (const m of D.movements) {
      if (mk(m.date) !== k) continue;
      n++;
      if (m.type === 'in') { inc += m.amount; byCat[m.categoryId] = (byCat[m.categoryId] || 0) + m.amount; }
      else if (m.type === 'out') { const e = eff(m); out += e; byCat[m.categoryId] = (byCat[m.categoryId] || 0) + e; }
      else if (m.type === 'transfer') {
        const fg = isGoal(acc(m.accountId)), tg = isGoal(acc(m.toAccountId));
        if (tg && !fg) saved += m.amount; else if (fg && !tg) saved -= m.amount;
      }
    }
    for (const c in byCat) byCat[c] = r2(byCat[c]);
    inc = r2(inc); out = r2(out);
    return { inc, out, net: r2(inc - out), saved: r2(saved), n, byCat, rate: inc > 0 ? (inc - out) / inc : null };
  });
}
const monthMovs = k => D.movements.filter(m => mk(m.date) === k);
const sortMovs = arr => arr.sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));

/* ---------- spese fisse ---------- */
const dueDate = (f, k) => k + '-' + pad(Math.min(f.day, dim(k)));
function occurrences(f, fromK, toK) {
  const out = [];
  if (!f || f.paused || !f.start) return out;
  const i0 = Math.max(0, Math.ceil(diffM(f.start, fromK) / f.freq));
  for (let i = i0; i < i0 + 600; i++) {
    const k = addM(f.start, i * f.freq);
    if (k > toK) break;
    if (f.count && i >= f.count) break;
    if (f.end && k > f.end) break;
    if (k < fromK) continue;
    out.push({ k, n: i + 1, due: dueDate(f, k) });
  }
  return out;
}
function doneSet() {
  return memo('done', () => {
    const s = new Set();
    for (const m of D.movements) { if (m.fixedId) s.add(m.fixedId + '|' + m.fixedKey); if (m.sinkOf) s.add('S' + m.sinkOf + '|' + m.sinkKey); }
    for (const f of D.fixed) { for (const k of (f.skipped || [])) s.add(f.id + '|' + k); for (const k of (f.sinkSkipped || [])) s.add('S' + f.id + '|' + k); }
    return s;
  });
}
const trackStart = f => (f.trackFrom && f.trackFrom > f.start ? f.trackFrom : f.start);
// occorrenze non ancora registrate né saltate, fino al mese toK (comprese quelle arretrate)
function pendingFixed(toK = curMk()) {
  return memo('pend' + toK, () => {
    const done = doneSet(), res = [];
    for (const f of D.fixed) {
      for (const o of occurrences(f, trackStart(f), toK)) if (!done.has(f.id + '|' + o.k)) res.push(Object.assign({ f }, o));
      for (const s of sinkOccurrences(f, toK)) if (!done.has('S' + f.id + '|' + s.k)) res.push(s);
    }
    return res.sort((a, b) => a.due.localeCompare(b.due));
  });
}
function nextOcc(f) {
  const done = doneSet();
  return occurrences(f, trackStart(f), addM(curMk(), 36)).find(o => !done.has(f.id + '|' + o.k)) || null;
}
function estimateAmount(f) {
  if (!f.variable) return f.amount;
  const past = D.movements.filter(m => m.fixedId === f.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return past.length ? r2(past.reduce((s, m) => s + m.amount, 0) / past.length) : f.amount;
}
// effetto di una voce fissa sul disponibile (conti non salvadanaio)
function fixedAvailDelta(f, amt) {
  const liq = id => { const a = acc(id); return !!a && (!isGoal(a) && a.kind !== 'invest'); };
  if (f.type === 'out') return f.sink ? 0 : (liq(f.accountId) ? -amt : 0);
  if (f.type === 'in') return liq(f.accountId) ? amt : 0;
  if (f.type === 'transfer') return (liq(f.accountId) ? -amt : 0) + (liq(f.toAccountId) ? amt : 0);
  return 0;
}
function forecast() {
  return memo('fc', () => {
    const k = curMk();
    const base = availAt(endOf(k));
    let delta = 0, count = 0, outSum = 0;
    for (const p of pendingFixed(k)) {
      const d = pendDelta(p);
      delta += d; count++;
      if (d < 0) outSum += -d;
    }
    return { base, end: r2(base + delta), count, outSum: r2(outSum) };
  });
}
function fixedLabel(f) {
  const fr = { 1: 'Ogni mese', 2: 'Ogni 2 mesi', 3: 'Ogni 3 mesi', 6: 'Ogni 6 mesi', 12: 'Ogni anno' }[f.freq] || ('Ogni ' + f.freq + ' mesi');
  if (f.freq === 12) { const [, m] = f.start.split('-').map(Number); return fr + ', il ' + f.day + ' ' + MESI[m - 1]; }
  return fr + ', il giorno ' + f.day;
}
function fixedEnded(f) {
  if (!f.count && !f.end) return false;
  return !nextOcc(f);
}
function fixedTarget(f) { return f.type === 'transfer' ? acc(f.toAccountId) : cat(f.categoryId); }

/* ---------- avvisi dentro l'app ---------- */
function alerts() {
  return memo('alerts', () => {
    const k = curMk(), ms = monthStats(k), res = [];
    for (const c of activeCats('out')) {
      if (!(c.budget > 0)) continue;
      const s = ms.byCat[c.id] || 0, p = s / c.budget;
      if (s > c.budget + 0.005) res.push({ kind: 'over', c, p, s });
      else if (p >= 0.8 && s < c.budget - 0.005) res.push({ kind: 'near', c, p, s });
    }
    return res.sort((a, b) => b.p - a.p);
  });
}
const dueBadge = () => pendingFixed(curMk()).filter(p => p.due <= today()).length;

/* ---------- persone e spese divise ---------- */
// > 0: la persona ti deve dei soldi; < 0: sei tu a doverne
function personBalance(pid) {
  let b = 0;
  for (const m of D.movements) {
    if (m.type === 'out' && m.split) {
      if (!m.paidBy) b += (m.split.shares && m.split.shares[pid]) || 0;
      else if (m.paidBy === pid) b -= m.split.mine;
    } else if (m.type === 'settle' && m.personId === pid) b += m.dir === 'in' ? -m.amount : m.amount;
  }
  return r2(b);
}
function splitShares(amount, n) {
  const each = Math.floor(amount / (n + 1) * 100) / 100;
  return { each, mine: r2(amount - each * n) };
}

/* ---------- suggerimenti dalle descrizioni ---------- */
function descIndex() {
  return memo('desc', () => {
    const map = new Map();
    for (const m of D.movements) {
      if (!m.description || (m.type !== 'in' && m.type !== 'out')) continue;
      const key = m.type + '|' + m.description.trim().toLowerCase();
      const e = map.get(key) || { text: m.description.trim(), type: m.type, n: 0, last: '', cat: null, acc: null };
      e.n++;
      if (m.date >= e.last) { e.last = m.date; e.cat = m.categoryId; e.acc = m.accountId; e.text = m.description.trim(); }
      map.set(key, e);
    }
    return Array.from(map.values());
  });
}
function suggest(q, type) {
  q = q.trim().toLowerCase();
  const all = descIndex().filter(e => e.type === type);
  const by = (a, b) => b.n - a.n || b.last.localeCompare(a.last);
  if (q.length < 2) return all.sort(by).slice(0, 6);
  const st = [], inc = [];
  for (const e of all) {
    const t = e.text.toLowerCase();
    if (t === q) continue;
    if (t.startsWith(q)) st.push(e); else if (t.includes(q)) inc.push(e);
  }
  return st.sort(by).concat(inc.sort(by)).slice(0, 4);
}
/* ---------- categorie intelligenti: l'app impara dalle tue scelte ---------- */
// Parole che non dicono nulla sul negozio: sigle societarie, diciture dei pagamenti, articoli
const CAT_NOISE = new Set(('spa srl srls snc sas sapa coop soc societa ltd inc gmbh sa sl bv the www com it eu net org ' +
  'pos pagamento pagam pag acquisto acq presso carta card visa mastercard maestro contactless apple pay google paypal ' +
  'sumup satispay nexi web online shop store negozio punto vendita filiale via viale piazza corso ' +
  'del della dello dei degli delle di da in e il lo la gli le per con su al alla allo ai agli alle dal dalla nr num').split(' '));
function catTokens(desc) {
  return String(desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(t => t.length >= 2 && !/\d/.test(t) && !CAT_NOISE.has(t));
}
function catLearn() {
  return memo('catLearn', () => {
    const ex = new Map(), key = new Map(), first = new Map(), tok = new Map();
    const add = (map, k, m) => {
      const e = map.get(k) || { by: {}, list: [], text: m.description.trim(), last: '' };
      e.by[m.categoryId] = (e.by[m.categoryId] || 0) + 1;
      e.list.push({ d: m.date, c: m.categoryId });
      if (m.date >= e.last) { e.last = m.date; e.text = m.description.trim(); }
      map.set(k, e);
    };
    for (const m of D.movements) {
      if ((m.type !== 'in' && m.type !== 'out') || !m.categoryId || !m.description || !m.description.trim()) continue;
      const t = m.type + '|', tk = catTokens(m.description);
      add(ex, t + m.description.trim().toLowerCase(), m);
      if (tk.length) { add(key, t + tk.slice(0, 2).join(' '), m); if (tk[0].length >= 3) add(first, t + tk[0], m); }
      for (const w of new Set(tk)) if (w.length >= 4) add(tok, t + w, m);
    }
    return { ex, key, first, tok };
  });
}
// La scelta più frequente; ma se le ultime due volte hai scelto un'altra categoria, vince la nuova abitudine
function catPick(e, ok) {
  const l = e.list.filter(x => ok(x.c)).sort((a, b) => b.d.localeCompare(a.d));
  if (!l.length) return null;
  const cnt = {}, pos = {};
  l.forEach((x, i) => { cnt[x.c] = (cnt[x.c] || 0) + 1; if (pos[x.c] == null) pos[x.c] = i; });
  let id = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || pos[a] - pos[b])[0], recent = false;
  if (l.length >= 3 && l[0].c === l[1].c && l[0].c !== id) { id = l[0].c; recent = true; }
  return { id, n: cnt[id], tot: l.length, recent };
}
function guessCategoryInfo(desc, type) {
  const q = String(desc || '').trim().toLowerCase();
  if (q.length < 2) return null;
  const ok = id => { const c = cat(id); return !!c && !c.archived && c.type === type; };
  const L = catLearn(), t = type + '|', tk = catTokens(q);
  const why = (p, e) => p.recent ? `come le ultime due volte per «${e.text}»` : p.n === 1 ? `come l'ultima volta per «${e.text}»` : p.n === p.tot ? `come le altre ${p.n} volte per «${e.text}»` : `come ${p.n} volte su ${p.tot} per «${e.text}»`;
  const tries = [[L.ex, t + q], [L.key, tk.length ? t + tk.slice(0, 2).join(' ') : ''], [L.first, tk.length && tk[0].length >= 3 ? t + tk[0] : '']];
  for (const [map, k] of tries) {
    const e = k && map.get(k), p = e && catPick(e, ok);
    if (p) return { id: p.id, why: why(p, e) };
  }
  // parole in comune con descrizioni già usate: serve una maggioranza chiara
  const score = {}; let tot = 0, ref = null;
  for (const w of new Set(tk)) {
    const e = w.length >= 4 && L.tok.get(t + w);
    if (!e) continue;
    for (const [c, n] of Object.entries(e.by)) if (ok(c)) { score[c] = (score[c] || 0) + n; tot += n; if (!ref) ref = e; }
  }
  const best = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
  if (best && score[best] >= 2 && score[best] / tot >= 0.7) return { id: best, why: `da descrizioni simili, come «${ref.text}»` };
  for (const [re, keys] of KEYWORDS) {
    if (!re.test(q)) continue;
    const c = activeCats(type).find(c => keys.some(k => c.name.toLowerCase().includes(k)));
    if (c) return { id: c.id, why: 'dalla descrizione' };
  }
  return null;
}
function guessCategory(desc, type) { const g = guessCategoryInfo(desc, type); return g ? g.id : null; }
function allTags() {
  return memo('tags', () => {
    const n = {};
    for (const m of D.movements) for (const t of (m.tags || [])) n[t] = (n[t] || 0) + 1;
    return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b));
  });
}
// movimenti già presenti per firma, contati: due spese uguali nello stesso file restano due
function sigCounter(list, sig) {
  const n = new Map();
  for (const m of list) { const k = sig(m); n.set(k, (n.get(k) || 0) + 1); }
  return k => { const c = n.get(k) || 0; if (c) n.set(k, c - 1); return c > 0; };
}
const normTag = t => String(t || '').trim().replace(/^#+/, '').toLowerCase().replace(/[\s,]+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24);

/* ---------- foto degli scontrini (IndexedDB) ---------- */
const PhotoDB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('IndexedDB non disponibile'));
      const r = indexedDB.open('budget-foto', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  function run(mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction('p', mode), req = fn(t.objectStore('p'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  return {
    put: (id, rec) => run('readwrite', s => s.put(rec, id)),
    get: id => run('readonly', s => s.get(id)),
    del: id => run('readwrite', s => s.delete(id)),
    keys: () => run('readonly', s => s.getAllKeys()),
    clear: () => run('readwrite', s => s.clear())
  };
})();
const PHOTO_URLS = new Map();
async function photoURL(id) {
  if (PHOTO_URLS.has(id)) return PHOTO_URLS.get(id);
  const rec = await PhotoDB.get(id);
  if (!rec) return null;
  const url = URL.createObjectURL(new Blob([rec.buf], { type: rec.type || 'image/jpeg' }));
  PHOTO_URLS.set(id, url);
  return url;
}
async function compressImage(file, max = 1600, q = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Immagine non leggibile')); i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
    return blob || file;
  } finally { URL.revokeObjectURL(url); }
}
const blobToRec = async b => ({ type: b.type || 'image/jpeg', buf: await b.arrayBuffer() });

/* ---------- salvataggio file (share sheet su iPhone) ---------- */
let CAP_DOWNLOADS = null;
let CAP_READY = null;
function initCapabilities() {
  if (window.claude && typeof window.claude.use === 'function') {
    CAP_READY = window.claude.use('downloads').then(ns => { CAP_DOWNLOADS = ns; return ns; }).catch(() => null);
  } else CAP_READY = Promise.resolve(null);
}
const inClaudeViewer = () => !!(window.claude && typeof window.claude.use === 'function');
// da chiamare direttamente dal tocco dell'utente
async function deliverFile(filename, blob) {
  if (inClaudeViewer()) {
    const ns = CAP_DOWNLOADS || await CAP_READY;
    if (!ns) { toast('In questa anteprima non si possono salvare file.'); return false; }
    try { await ns.save({ filename, data: blob }); return true; }
    catch (e) {
      if (e && e.code === 'declined') return false;
      if (e && e.code === 'rate_limited') { toast('Attendi un attimo e riprova.'); return false; }
      toast('Il file non è stato salvato.');
      return false;
    }
  }
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  return true;
}

/* ---------- libreria Excel, caricata solo quando serve ---------- */
let XLSX_P = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (XLSX_P) return XLSX_P;
  const srcs = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
  XLSX_P = new Promise((res, rej) => {
    let i = 0;
    const next = () => {
      if (i >= srcs.length) { XLSX_P = null; return rej(new Error('Per leggere o creare file Excel serve la connessione a internet (solo la prima volta).')); }
      const s = document.createElement('script');
      s.src = srcs[i++];
      s.onload = () => (window.XLSX ? res(window.XLSX) : next());
      s.onerror = () => { s.remove(); next(); };
      document.head.appendChild(s);
    };
    next();
  });
  return XLSX_P;
}

/* ---------- accantonamenti: quote mensili per le spese non mensili ---------- */
function sinkOccurrences(f, toK) {
  if (!f || !f.sink || f.paused || f.type !== 'out' || !(f.freq > 1) || !f.start) return [];
  const from = f.sinkFrom || f.trackFrom || f.start, total = estimateAmount(f), res = [];
  for (const o of occurrences(f, from, addM(toK, f.freq))) {
    const s0 = addM(o.k, -(f.freq - 1)), s = s0 < from ? from : s0, n = diffM(s, o.k) + 1;
    if (n < 1) continue;
    const per = Math.floor(total / n * 100) / 100;
    for (let i = 0, k = s; i < n && k <= toK; i++, k = addM(k, 1)) res.push({ f, k, sink: true, occK: o.k, due: dueDate(f, k), amt: i === n - 1 ? r2(total - per * (n - 1)) : per });
  }
  return res;
}
function pendDelta(p) {
  if (p.sink) { const a = acc(p.f.accountId); return a && (!isGoal(a) && a.kind !== 'invest') ? -p.amt : 0; }
  return fixedAvailDelta(p.f, estimateAmount(p.f));
}
function undoLast() {
  const prev = UNDO.pop();
  if (!prev) return toast("Non c'è niente da annullare", null);
  D = migrate(JSON.parse(prev));
  save({ undo: false });
  UNDO_ARMED = false;
  refresh();
  toast('Modifica annullata', null);
}

/* ---------- date e percentuali ---------- */
const dayDiff = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
const pctDec = x => (Math.round(x * 1000) / 10).toLocaleString('it-IT') + '%';

