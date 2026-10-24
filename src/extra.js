/* =========================================================
   Versione 1.1
   Annulla · import da altre app e dalla banca · valuta principale
   accantonamenti per le spese non mensili · budget di coppia
   pagamenti Apple Pay tramite Comandi Rapidi
   ========================================================= */
ACT.undoLast = () => undoLast();

/* ---------- identità di questo telefono (non finisce nei backup) ---------- */
let DEVICE = null;
function device() {
  if (DEVICE) return DEVICE;
  try { DEVICE = JSON.parse(localStorage.getItem('budget.iphone.device') || 'null'); } catch (e) { DEVICE = null; }
  if (!DEVICE || !DEVICE.id) { DEVICE = { id: uid(), name: '' }; try { localStorage.setItem('budget.iphone.device', JSON.stringify(DEVICE)); } catch (e) { } }
  return DEVICE;
}
function setDeviceName(n) { device().name = n; try { localStorage.setItem('budget.iphone.device', JSON.stringify(DEVICE)); } catch (e) { } }

/* ---------- accantonamenti per le spese non mensili ---------- */
function sinkGoal() {
  let g = D.accounts.find(a => a.sys === 'sink' && !a.archived);
  if (!g) { g = { id: uid(), name: 'Accantonamenti', emoji: '🗓️', kind: 'goal', sys: 'sink', initial: 0, initialDate: null, target: 0, deadline: '', color: '#7A8B99', archived: false }; D.accounts.push(g); }
  return g;
}
function sinkCard(p) {
  const f = p.f;
  return `<div class="pcard"><div class="pc-top">${avatar('🗓️', '#7A8B99')}<div class="pc-t"><b>${esc(f.name)}</b><span class="muted">Quota di ${MESI[Number(p.k.slice(5)) - 1]} da accantonare, la spesa arriva il ${shortDate(dueDate(f, p.occK))}</span></div><b class="num">${eur(p.amt)}</b></div>
  <div class="pc-act"><button class="link sm" data-a="sinkSkip" data-id="${f.id}" data-k="${p.k}">Salta questo mese</button><button class="btn dark sm" data-a="sinkDo" data-id="${f.id}" data-k="${p.k}">Metti da parte</button></div></div>`;
}
ACT.fxSink = el => { const sh = sheetOf(el), st = sh.st; st.sink = !(st.sink == null ? Number(st.freq) >= 3 : st.sink); drawSheet(sh); };
ACT.sinkDo = el => {
  hap('ok');
  const f = D.fixed.find(x => x.id === el.dataset.id), k = el.dataset.k;
  if (!f) return;
  const p = sinkOccurrences(f, k > curMk() ? k : curMk()).find(x => x.k === k);
  if (!p) return;
  const t = today(), g = sinkGoal();
  D.movements.push({ id: uid(), ts: Date.now(), type: 'transfer', date: p.due <= t ? p.due : t, amount: p.amt, description: 'Quota per ' + f.name, accountId: f.accountId, toAccountId: g.id, tags: [], note: '', sinkOf: f.id, sinkKey: k });
  save(); refresh();
  toast(`Messi da parte ${eur(p.amt)} per «${f.name}»`);
};
ACT.sinkSkip = el => {
  const f = D.fixed.find(x => x.id === el.dataset.id);
  if (!f) return;
  f.sinkSkipped = (f.sinkSkipped || []).concat(el.dataset.k);
  save(); refresh(); toast('Quota saltata per questo mese');
};

/* ---------- valuta principale ---------- */
SHEETS.currency = {
  render: (st, sh) => {
    const b = baseCur(), list = ALL_CUR().filter(x => x[0] === b).concat(ALL_CUR().filter(x => x[0] !== b));
    return `${sheetHead('Valuta')}<div class="sheet-body"><div class="list">${list.map(([c, s, n]) => `<button class="row" data-a="curPick" data-c="${c}"><span class="cur-s">${esc(s)}</span><span class="rt">${esc(n)}<small>${c}${c === b ? ', valuta principale' : D.settings.rates[c] ? ', ultimo cambio ' + numStr(D.settings.rates[c], 5) + ' ' + esc(baseSym()) : ''}</small></span>${sh.props.cur === c ? ic('check', 20) : ''}</button>`).join('')}</div></div>`;
  }
};
const hasMoney = () => D.movements.length > 0 || D.accounts.some(a => a.initial) || D.categories.some(c => c.budget) || D.fixed.length > 0;
SHEETS.baseCur = {
  cls: 'tall',
  init: () => ({ cur: baseCur(), mode: 'convert', rate: '', jump: false }),
  after(sh, el) { if (sh.st.jump) { sh.st.jump = false; const b = $('.sheet-body', el); if (b) b.scrollTop = 0; } },
  render(st) {
    const old = baseCur(), changed = st.cur !== old;
    let h = sheetHead('Valuta principale') + '<div class="sheet-body"><p class="lead sm">È la valuta di saldi, budget e statistiche. Le spese fatte in altre valute vengono convertite in questa.</p>';
    h += swRow('Cambi aggiornati da internet', 'fxAuto', fxOn(), 'Scarico solo i tassi ufficiali della Banca centrale europea: i tuoi dati non lasciano il telefono.', 'fxToggle');
    if (changed && hasMoney()) {
      h += `<div class="opts">${[['convert', 'Converti tutti gli importi', 'Moltiplico saldi, movimenti, budget e spese fisse per il cambio che indichi.'], ['label', 'Cambia solo il simbolo', "I numeri restano uguali: utile se all'inizio avevi scelto la valuta sbagliata."]].map(([k, l, d]) => `<button class="opt ${st.mode === k ? 'on' : ''}" data-a="pick" data-f="mode" data-v="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`;
      if (st.mode === 'convert') h += `<label class="fld"><span>1 ${esc(old)} vale quanti ${esc(st.cur)}?</span><input inputmode="decimal" data-in="set" data-f="rate" value="${esc(st.rate)}" placeholder="Es. 1,08"></label>` + fxNoteHTML(st, strToNum(st.rate), 'left');
    }
    h += fieldLabel('Scegli la valuta') + `<div class="list">${ALL_CUR().map(([c, s, n]) => `<button class="row" data-a="baseCurPick" data-v="${c}"><span class="cur-s">${esc(s)}</span><span class="rt">${esc(n)}<small>${c}${c === old ? ', quella attuale' : ''}</small></span>${st.cur === c ? ic('check', 20) : ''}</button>`).join('')}</div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="baseGo" ${changed ? '' : 'disabled'}>${changed ? 'Usa ' + esc(curName(st.cur)) : 'Scegli una valuta diversa'}</button></footer>`;
  }
};
ACT.openBaseCur = () => openSheet('baseCur', {});
ACT.baseCurPick = el => { const sh = sheetOf(el); Object.assign(sh.st, { cur: el.dataset.v, jump: true, rate: '', fx: null, rateManual: false }); drawSheet(sh); baseFx(sh); };
function convertBase(k, old, nu, convert) {
  const R = v => r2((Number(v) || 0) * k);
  for (const m of D.movements) {
    if (m.cur === nu) {
      m.amount = r2(m.orig);
      if (m.split) { const s = splitShares(m.amount, Object.keys(m.split.shares || {}).length); m.split.mine = s.mine; for (const p in m.split.shares) m.split.shares[p] = s.each; }
      delete m.cur; delete m.orig; delete m.rate;
      continue;
    }
    if (!convert) continue;
    m.amount = R(m.amount);
    if (m.cur) m.rate = Math.round(m.rate * k * 1e6) / 1e6;
    if (m.split) { m.split.mine = R(m.split.mine); for (const p in m.split.shares) m.split.shares[p] = R(m.split.shares[p]); }
  }
  if (convert) {
    for (const a of D.accounts) { a.initial = R(a.initial); if (a.target) a.target = R(a.target); }
    for (const c of D.categories) c.budget = R(c.budget);
    for (const f of D.fixed) f.amount = R(f.amount);
    for (const x of (D.inbox || [])) x.amount = R(x.amount);
    const rates = {};
    for (const c in D.settings.rates) if (c !== nu) rates[c] = Math.round(D.settings.rates[c] * k * 1e6) / 1e6;
    rates[old] = Math.round(k * 1e6) / 1e6;
    D.settings.rates = rates;
  } else D.settings.rates = {};
}
ACT.baseGo = el => {
  const sh = sheetOf(el), st = sh.st, old = baseCur(), nu = st.cur;
  if (nu === old) return;
  const convert = hasMoney() && st.mode === 'convert';
  const k = convert ? strToNum(st.rate) : 1;
  if (convert && !(k > 0)) return toast('Scrivi il cambio, per esempio 1,08');
  convertBase(k, old, nu, convert);
  D.settings.base = nu;
  save(); closeSheet(sh); refresh();
  toast('Valuta principale: ' + curName(nu));
};

/* ---------- import da altre app e dall'estratto conto ---------- */
function detectDelim(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 20);
  let best = ',', score = -1;
  for (const d of [';', ',', '\t', '|']) {
    const n = lines.map(l => l.split(d).length - 1);
    const s = n.filter(x => x > 0).length * 100 + Math.min(...n);
    if (s > score) { score = s; best = d; }
  }
  return best;
}
function parseDelimited(text, d) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === '') q = true;
    else if (ch === d) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function parseAmount(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).trim();
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s) || /[-−–]/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return NaN;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (ld > -1 && s.split('.').length > 2) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? NaN : (neg ? -n : n);
}
const validDate = (y, mo, d) => { y = +y; mo = +mo; d = +d; return (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100) ? y + '-' + pad(mo) + '-' + pad(d) : null; };
function monthIndex(w) {
  w = String(w).toLowerCase().slice(0, 3);
  const it = MESI_S.indexOf(w); if (it >= 0) return it + 1;
  const en = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(w);
  return en >= 0 ? en + 1 : 0;
}
function anyDate(v, order = 'dmy') {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 20000 && v < 80000 ? serialToISO(v) : null;
  if (v instanceof Date) return isNaN(v) ? null : isoOf(v);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return validDate(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return order === 'mdy' ? validDate(y, m[1], m[2]) : validDate(y, m[2], m[1]); }
  m = s.match(/^(\d{1,2})\s+([a-zà-ú]{3,})\.?\s+(\d{4})/i);
  if (m) { const mi = monthIndex(m[2]); return mi ? validDate(m[3], mi, m[1]) : null; }
  m = s.match(/^([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) { const mi = monthIndex(m[1]); return mi ? validDate(m[3], mi, m[2]) : null; }
  return null;
}
function dateOrder(data, col) {
  if (col === '' || col == null) return 'dmy';
  let dmy = false, mdy = false;
  for (const r of data.slice(0, 500)) {
    const m = String(r[+col] == null ? '' : r[+col]).match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) dmy = true;
    if (+m[2] > 12) mdy = true;
  }
  return mdy && !dmy ? 'mdy' : 'dmy';
}
const HEAD_ANY = /^(data|date|giorno|importo|amount|ammontare|valore|descrizione|description|causale|categoria|category|tipo|type|note|nota|notes|memo|conto|account|valuta|divisa|currency|entrate|uscite|dare|avere|addebiti|accrediti|inflow|outflow|payee|beneficiario|esercente|merchant|dettagli|wallet|portafoglio|operazione)/i;
function guessColumns(head, data) {
  const h = head.map(x => String(x || '').trim().toLowerCase()), used = new Set();
  const find = res => { for (const re of res) { const i = h.findIndex((x, j) => !used.has(j) && re.test(x)); if (i >= 0) { used.add(i); return String(i); } } return ''; };
  const m = {};
  m.cDate = find([/^data (operazione|contabile|transazione|movimento)/, /^(data|date|giorno|datum|fecha)$/, /^data(?!.*valuta)/, /date/]);
  m.cAmt = find([/^(importo|amount|ammontare|valore|somma)(\s*\(.*\))?$/, /importo|amount|ammontare/]);
  m.cOut = m.cAmt ? '' : find([/^(uscite|uscita|addebiti|addebito|dare|outflow|debit|debito|spese)(\s*\(.*\))?$/]);
  m.cIn = m.cAmt ? '' : find([/^(entrate|entrata|accrediti|accredito|avere|inflow|credit|credito)(\s*\(.*\))?$/]);
  m.cDesc = find([/^(descrizione|description|causale|dettagli|beneficiario|payee|merchant|esercente|titolo|nome|name|descrizione operazione)$/, /descrizione|description|causale|payee|merchant|esercente/]);
  m.cCat = find([/^(categoria|category|category name|categoria principale)$/, /categor/]);
  m.cType = find([/^(tipo|type|transaction type|tipo operazione|tipo movimento)$/]);
  m.cNote = find([/^(note|nota|notes|memo|commento|comment)$/]);
  const sample = data.slice(0, 40), cols = head.map((_, j) => j);
  const best = fn => { let b = -1, bs = 0; for (const j of cols) { if (used.has(j)) continue; const s = sample.reduce((a, r) => a + fn(r[j]), 0); if (s > bs) { bs = s; b = j; } } return [b, bs]; };
  if (!m.cDate) { const [b, s] = best(v => (anyDate(v) ? 1 : 0)); if (b >= 0 && s >= sample.length / 2) { m.cDate = String(b); used.add(b); } }
  if (!m.cAmt && !m.cIn && !m.cOut) { const [b, s] = best(v => (v !== '' && !isNaN(parseAmount(v)) && !anyDate(v) ? 1 : 0)); if (b >= 0 && s >= sample.length / 2) { m.cAmt = String(b); used.add(b); } }
  if (!m.cDesc) { const [b] = best(v => (typeof v === 'string' && isNaN(parseAmount(v)) ? v.length : 0)); if (b >= 0) { m.cDesc = String(b); used.add(b); } }
  return m;
}
function prepareImport(rows, name) {
  rows = rows.map(r => r.map(c => (c == null ? '' : c))).filter(r => r.some(c => String(c).trim() !== ''));
  if (!rows.length) throw new Error('Il file è vuoto.');
  let hi = -1, top = 0;
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const sc = rows[i].filter(c => typeof c === 'string' && HEAD_ANY.test(c.trim())).length;
    if (sc > top) { top = sc; hi = i; }
  }
  if (top < 2) hi = -1;
  const width = Math.max(...rows.slice(0, 300).map(r => r.length));
  const head = Array.from({ length: width }, (_, i) => (hi >= 0 && String(rows[hi][i] || '').trim()) || 'Colonna ' + (i + 1));
  const data = rows.slice(hi + 1);
  const st = Object.assign({ stage: 'map', name, head, data, catMap: {}, accountId: D ? defaultAccountId() : null }, guessColumns(head, data));
  if (st.cDesc === '' && st.cNote !== '') { st.cDesc = st.cNote; st.cNote = ''; }
  st.order = dateOrder(data, st.cDate);
  st.sign = (st.cType === '' && st.cAmt !== '' && !data.some(r => parseAmount(r[+st.cAmt]) < 0)) ? 'allOut' : 'auto';
  if (st.cDate === '' || (st.cAmt === '' && st.cIn === '' && st.cOut === '')) st.warn = 'Non ho riconosciuto tutte le colonne: scegli qui sotto quale contiene la data e quale l\'importo.';
  return st;
}
function csvRecords(st) {
  const ix = k => (st[k] === '' || st[k] == null ? -1 : Number(st[k]));
  const iD = ix('cDate'), iA = ix('cAmt'), iI = ix('cIn'), iO = ix('cOut'), iS = ix('cDesc'), iC = ix('cCat'), iT = ix('cType'), iN = ix('cNote');
  const out = [];
  for (const r of st.data) {
    const date = iD >= 0 ? anyDate(r[iD], st.order) : null;
    let amt = NaN;
    if (iA >= 0) amt = parseAmount(r[iA]);
    else if (iI >= 0 || iO >= 0) {
      const a = iI >= 0 ? parseAmount(r[iI]) : NaN, b = iO >= 0 ? parseAmount(r[iO]) : NaN;
      if (!isNaN(a) || !isNaN(b)) amt = (isNaN(a) ? 0 : Math.abs(a)) - (isNaN(b) ? 0 : Math.abs(b));
    }
    if (!date || isNaN(amt) || Math.abs(amt) < 0.005) continue;
    let type = null;
    if (iT >= 0) {
      const t = String(r[iT] || '').toLowerCase();
      if (/trasfer|transfer|giroconto/.test(t)) type = 'skip';
      else if (/entrat|incom|credit|accredit|avere|ricav|^in$/.test(t)) type = 'in';
      else if (/uscit|spes|expense|debit|addebit|dare|^out$/.test(t)) type = 'out';
    }
    if (!type) type = st.sign === 'allOut' ? 'out' : st.sign === 'invert' ? (amt > 0 ? 'out' : 'in') : (amt > 0 ? 'in' : 'out');
    out.push({ date, amount: r2(Math.abs(amt)), type, desc: iS >= 0 ? String(r[iS] == null ? '' : r[iS]).trim() : '', cat: iC >= 0 ? String(r[iC] == null ? '' : r[iC]).trim() : '', note: iN >= 0 ? String(r[iN] == null ? '' : r[iN]).trim() : '' });
  }
  return out;
}
const availCats = type => (D ? activeCats(type).map(c => c.name) : DEFAULT_CATS.filter(x => x[1] === type).map(x => x[0]));
function defaultMap(type, name) {
  const names = availCats(type), n = name.toLowerCase();
  const exact = names.find(x => x.toLowerCase() === n);
  if (exact) return 'c:' + exact;
  if (n.length >= 4) { const part = names.find(x => { const y = x.toLowerCase(); return y.includes(n) || n.includes(y); }); if (part) return 'c:' + part; }
  for (const [re, keys] of KEYWORDS) if (re.test(n)) { const c = names.find(x => keys.some(k => x.toLowerCase().includes(k))); if (c) return 'c:' + c; }
  return 'new';
}
function catGroups(recs) {
  const m = new Map();
  for (const r of recs) { if (!r.cat) continue; const k = r.type + '|' + r.cat, g = m.get(k) || { key: k, type: r.type, cat: r.cat, n: 0 }; g.n++; m.set(k, g); }
  return Array.from(m.values()).sort((a, b) => b.n - a.n);
}
function importPickHTML(st) {
  return sheetHead('Importa i tuoi dati') + `<div class="sheet-body"><p class="lead sm">Scegli uno di questi file:</p><div class="list">
    <div class="row static"><span class="row-ic">${ic('download', 21)}</span><span class="rt">Un file esportato da EFU Budget<small>L'Excel di Esporta oppure il backup: reimporta tutti i dati</small></span></div>
    <div class="row static"><span class="row-ic">${ic('file', 21)}</span><span class="rt">Il file Excel del tuo budget<small>Movimenti, categorie con il budget e saldo iniziale</small></span></div>
    <div class="row static"><span class="row-ic">${ic('upload', 21)}</span><span class="rt">L'esportazione di un'altra app<small>Money Lover, Wallet, Spendee, Monefy, Money Manager, YNAB e simili, in CSV o Excel</small></span></div>
    <div class="row static"><span class="row-ic">${ic('wallet', 21)}</span><span class="rt">L'estratto conto della banca<small>Il file CSV o Excel che scarichi dall'home banking</small></span></div></div>
    <p class="muted sm gap-t">Le colonne le riconosco da solo e prima di importare puoi controllarle. Il file viene letto solo su questo dispositivo.</p>${st.err ? `<p class="err">${esc(st.err)}</p>` : ''}</div>
    <footer class="sheet-foot"><label class="btn primary w ${st.busy ? 'is-busy' : ''}">${st.busy ? 'Leggo il file…' : 'Scegli il file'}<input type="file" class="vh" accept=".json,application/json,.csv,.txt,.tsv,.xlsx,.xls,.xlsm,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-ch="anyFile" ${st.busy ? 'disabled' : ''}></label></footer>`;
}
function importMapHTML(st) {
  const recs = csvRecords(st), ok = recs.filter(r => r.type !== 'skip'), skipped = recs.length - ok.length;
  const dates = ok.map(r => r.date).sort();
  const inc = sum(ok.filter(r => r.type === 'in').map(r => r.amount)), out = sum(ok.filter(r => r.type === 'out').map(r => r.amount));
  const sel = (f, label) => `<label class="fld"><span>${label}</span><select data-ch="anyCol" data-f="${f}"><option value="">Nessuna</option>${st.head.map((hh, i) => `<option value="${i}" ${String(st[f]) === String(i) ? 'selected' : ''}>${esc(hh)}</option>`).join('')}</select></label>`;
  const chips = (f, opts) => `<div class="chips wrap">${opts.map(([v, l]) => `<button class="chip ${st[f] === v ? 'on' : ''}" data-a="pick" data-f="${f}" data-v="${v}">${l}</button>`).join('')}</div>`;
  let h = sheetHead('Controlla e importa') + '<div class="sheet-body">';
  h += `<p class="lead sm">${esc(st.name)}: ${ok.length} ${ok.length === 1 ? 'movimento' : 'movimenti'}${dates.length ? ` dal ${shortDate(dates[0])} al ${shortDate(dates[dates.length - 1])}` : ''}.</p>`;
  if (st.note) h += `<p class="warn-t">${esc(st.note)}</p>`;
  if (st.warn && !ok.length) h += `<p class="warn-t">${esc(st.warn)}</p>`;
  h += `<div class="kgrid two"><div class="k"><span>Entrate</span><b class="num pos">${eur(inc)}</b></div><div class="k"><span>Uscite</span><b class="num out">${eur(out)}</b></div></div>`;
  if (skipped) h += `<p class="muted sm gap-t">${skipped} trasferimenti tra conti verranno saltati.</p>`;
  h += fieldLabel('Colonne del file') + sel('cDate', 'Data') + sel('cAmt', 'Importo') + sel('cIn', 'Entrate, se in una colonna a parte') + sel('cOut', 'Uscite, se in una colonna a parte') + sel('cDesc', 'Descrizione') + sel('cCat', 'Categoria') + sel('cType', 'Tipo (entrata o uscita)') + sel('cNote', 'Note');
  h += fieldLabel('Le date sono scritte come') + chips('order', [['dmy', 'Giorno/mese/anno'], ['mdy', 'Mese/giorno/anno']]);
  if (st.cType === '' && st.cAmt !== '') h += fieldLabel('Segno degli importi') + chips('sign', [['auto', 'Negativi sono uscite'], ['allOut', 'Sono tutte uscite'], ['invert', 'Positivi sono uscite']]);
  if (D && liquidAccounts().length > 1) h += fieldLabel('Sul conto') + accChips('accountId', st.accountId, false);
  if (st.cCat !== '') {
    const groups = catGroups(ok);
    h += fieldLabel('Categorie del file') + `<div class="list">${groups.map(g => {
      const v = st.catMap[g.key] || (st.catMap[g.key] = defaultMap(g.type, g.cat));
      return `<div class="map-row"><span><b>${esc(g.cat)}</b><small>${g.n} ${g.type === 'in' ? (g.n === 1 ? 'entrata' : 'entrate') : (g.n === 1 ? 'uscita' : 'uscite')}</small></span><select data-ch="anyCat" data-k="${esc(g.key)}" aria-label="Categoria per ${esc(g.cat)}"><option value="new" ${v === 'new' ? 'selected' : ''}>Crea «${esc(g.cat)}»</option><option value="guess" ${v === 'guess' ? 'selected' : ''}>Dalla descrizione</option>${availCats(g.type).map(n => `<option value="${esc('c:' + n)}" ${v === 'c:' + n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    }).join('')}</div>`;
  } else h += '<p class="muted sm gap-t">Il file non ha una colonna categoria: userò i suggerimenti dalla descrizione, oppure «Varie».</p>';
  if (ok.length) h += fieldLabel('Anteprima') + `<div class="mlist">${ok.slice(0, 5).map(r => {
    const t = r.cat ? (st.catMap[r.type + '|' + r.cat] || 'new') : 'guess';
    const cn = t === 'new' ? r.cat : t === 'guess' ? 'categoria dalla descrizione' : t.slice(2);
    return `<div class="mrow static"><span class="mrow-m"><span class="mt">${esc(r.desc || 'Senza descrizione')}</span><span class="ms">${esc(shortDate(r.date))}, ${esc(cn)}</span></span><span class="ma num ${r.type === 'in' ? 'pos' : 'out'}">${eur(r.type === 'in' ? r.amount : -r.amount, { sign: true })}</span></div>`;
  }).join('')}</div>`;
  if (!D || !liquidAccounts().length) h += '<p class="muted sm gap-t">Creerò un «Conto principale» con saldo iniziale zero: potrai correggerlo nelle impostazioni.</p>';
  h += '<p class="muted sm gap-t">I movimenti già presenti, con stessa data, descrizione e importo, non verranno duplicati.</p>';
  return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="anyGo" ${ok.length ? '' : 'disabled'}>Importa ${ok.length} ${ok.length === 1 ? 'movimento' : 'movimenti'}</button></footer>`;
}
SHEETS.importAny = { cls: 'tall', init: () => ({ stage: 'pick', err: '', busy: false }), render: st => (st.stage === 'map' ? importMapHTML(st) : importPickHTML(st)) };
ACT.openImportAny = () => openSheet('importAny', {});
CHG.anyFile = async el => {
  const sh = sheetOf(el), f = el.files && el.files[0];
  if (!f || !sh) return;
  sh.st.busy = true; sh.st.err = ''; drawSheet(sh);
  try {
    let rows, note = '';
    if (/\.json$/i.test(f.name) || /json/i.test(f.type)) {
      let obj = null;
      try { obj = JSON.parse(await f.text()); } catch (e) { }
      if (obj && obj.type === 'budget-sync') throw new Error('Questo è un file del budget di coppia: aprilo da Budget di coppia → Ricevi.');
      if (!obj || !obj.data) throw new Error('Il file scelto non è un backup di EFU Budget.');
      closeSheet(sh); await restoreBackupObj(obj); return;
    }
    if (/\.(xlsx|xlsm|xls)$/i.test(f.name) || /spreadsheet|excel/i.test(f.type)) {
      const XLSX = await loadXLSX();
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const full = readFullData(XLSX, wb);
      if (full) { closeSheet(sh); await restoreBackupObj(full); return; }
      const mv = wb.Sheets.Movimenti, cellv = a => String(mv && mv[a] ? mv[a].v : '').trim().toLowerCase();
      if (mv && wb.Sheets.Categorie && cellv('B7') === 'data') { const res = parseBudgetWorkbook(XLSX, wb); closeSheet(sh); openSheet('import', { res }); return; }
      if (mv && cellv('A1') === 'data' && cellv('E1') === 'tipo') { rows = XLSX.utils.sheet_to_json(mv, { header: 1, raw: true, defval: '' }); note = 'Questo file è stato esportato da una versione precedente di EFU Budget e contiene solo i movimenti: i trasferimenti tra conti verranno saltati. Per trasferire tutto, esporta di nuovo con la versione attuale.'; }
      else for (const n of wb.SheetNames) { const r = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }); if (!rows || r.length > rows.length) rows = r; }
    } else {
      let text = await f.text();
      if (text.includes('\ufffd')) text = new TextDecoder('windows-1252').decode(await f.arrayBuffer());
      text = text.replace(/^\ufeff/, '');
      rows = parseDelimited(text, detectDelim(text));
    }
    Object.assign(sh.st, prepareImport(rows || [], f.name));
    if (note) sh.st.note = note;
  } catch (e) { sh.st.err = e.message || 'Non riesco a leggere il file.'; }
  sh.st.busy = false;
  drawSheet(sh);
};
CHG.anyCol = el => { const sh = sheetOf(el), f = el.dataset.f; sh.st[f] = el.value; if (f === 'cDate') sh.st.order = dateOrder(sh.st.data, el.value); if (f === 'cAmt' && el.value !== '') { sh.st.cIn = ''; sh.st.cOut = ''; } if ((f === 'cIn' || f === 'cOut') && el.value !== '') sh.st.cAmt = ''; drawSheet(sh); };
CHG.anyCat = el => { const sh = sheetOf(el); sh.st.catMap[el.dataset.k] = el.value; drawSheet(sh); };
function fallbackCat(type) {
  const c = activeCats(type).find(x => /varie|altre|altro/i.test(x.name)) || activeCats(type)[0];
  if (c) return c;
  const n = newCategory(type === 'in' ? 'Altre entrate' : 'Varie', type, 0);
  D.categories.push(n);
  return n;
}
ACT.anyGo = el => {
  const sh = sheetOf(el), st = sh.st, recs = csvRecords(st).filter(r => r.type !== 'skip');
  if (!D) { D = blankData(); D.categories = defaultCategories(); }
  if (!liquidAccounts().length) {
    const first = recs.map(r => r.date).sort()[0];
    const a = { id: uid(), name: 'Conto principale', emoji: '🏦', kind: 'bank', initial: 0, initialDate: first ? mk(first) + '-01' : today(), archived: false };
    D.accounts.push(a); D.settings.defaultAccount = a.id;
  }
  invalidate();
  const accId = acc(st.accountId) && !isGoal(acc(st.accountId)) ? st.accountId : defaultAccountId();
  const sig = m => [m.date, String(m.description != null ? m.description : m.desc || '').trim().toLowerCase(), r2(m.amount).toFixed(2)].join('|');
  const seen = new Set(D.movements.map(sig));
  const byName = (type, name) => D.categories.find(c => !c.archived && c.type === type && c.name.toLowerCase() === name.toLowerCase());
  let added = 0, dup = 0;
  const now = Date.now();
  for (const r of recs) {
    if (seen.has(sig(r))) { dup++; continue; }
    const t = r.cat ? (st.catMap[r.type + '|' + r.cat] || defaultMap(r.type, r.cat)) : 'guess';
    let c = null;
    if (t === 'guess') c = cat(guessCategory(r.desc, r.type));
    else { const name = t === 'new' ? r.cat : t.slice(2); c = byName(r.type, name); if (!c) { c = newCategory(name, r.type, 0); D.categories.push(c); } }
    if (!c) c = fallbackCat(r.type);
    D.movements.push({ id: uid(), ts: now + added, type: r.type, date: r.date, amount: r.amount, description: r.desc, note: r.note, tags: [], accountId: accId, categoryId: c.id });
    seen.add(sig(r)); added++;
  }
  save(); closeSheet(sh);
  UI.tab = 'home'; UI.month = curMk();
  const last = recs.map(r => r.date).sort().pop();
  if (last && !monthMovs(curMk()).length) UI.month = mk(last);
  refresh();
  toast(`Importati ${added} movimenti${dup ? ', ' + dup + ' erano già presenti' : ''}`);
};

/* ---------- budget di coppia: scambio di file, senza cloud ---------- */
function syncPackage() {
  const dv = device();
  if (!D.settings.household) { D.settings.household = uid(); save({ undo: false }); }
  const data = {};
  for (const c of SYNC_COLS) data[c] = D[c];
  return { type: 'budget-sync', v: 1, household: D.settings.household, from: dv.id, fromName: dv.name || 'Senza nome', at: new Date().toISOString(), base: baseCur(), data, deleted: D.deleted || {} };
}
function mergeSync(pkg) {
  const res = { add: 0, upd: 0, del: 0 };
  const alias = D.settings.aliases || (D.settings.aliases = {});
  const A = id => (id && alias[id]) || id;
  const REFS = ['accountId', 'toAccountId', 'categoryId', 'personId', 'paidBy', 'fixedId', 'sinkOf'];
  const remap = o => {
    const x = JSON.parse(JSON.stringify(o));
    x.id = A(x.id);
    for (const f of REFS) if (x[f]) x[f] = A(x[f]);
    if (x.split && x.split.shares) { const s = {}; for (const k in x.split.shares) s[A(k)] = x.split.shares[k]; x.split.shares = s; }
    return x;
  };
  const del = D.deleted || (D.deleted = {});
  for (const c of SYNC_COLS) {
    const list = D[c], byId = new Map(list.map(x => [x.id, x])), theirIds = new Set((pkg.data[c] || []).map(x => x.id));
    for (const inc0 of (pkg.data[c] || [])) {
      const iu = inc0.upd || 0;
      let id = A(inc0.id), loc = byId.get(id);
      if (del[id] && del[id] >= iu && !loc) continue;
      if (!loc && (c === 'accounts' || c === 'categories' || c === 'people')) {
        const nm = String(inc0.name || '').trim().toLowerCase();
        const twin = list.find(x => !theirIds.has(x.id) && String(x.name || '').trim().toLowerCase() === nm && (c !== 'categories' || x.type === inc0.type) && (c !== 'accounts' || (x.kind === 'goal') === (inc0.kind === 'goal')));
        if (twin) { alias[inc0.id] = twin.id; id = twin.id; loc = twin; }
      }
      if (!loc) { const x = remap(inc0); list.push(x); byId.set(x.id, x); res.add++; }
      else if (iu > (loc.upd || 0)) { const x = remap(inc0); x.id = loc.id; for (const k of Object.keys(loc)) delete loc[k]; Object.assign(loc, x); res.upd++; }
    }
  }
  for (const [id0, t] of Object.entries(pkg.deleted || {})) {
    const id = A(id0);
    for (const c of SYNC_COLS) {
      const i = D[c].findIndex(x => x.id === id);
      if (i >= 0 && (D[c][i].upd || 0) <= t) { D[c].splice(i, 1); res.del++; }
    }
    if (!del[id] || del[id] < t) del[id] = t;
  }
  D.settings.partners = D.settings.partners || {};
  D.settings.partners[pkg.from] = pkg.fromName;
  if (!D.settings.household) D.settings.household = pkg.household;
  D.settings.lastSync = { at: today(), name: pkg.fromName };
  return res;
}
SETTINGS.share = () => {
  const dv = device(), ls = D.settings.lastSync, ps = Object.values(D.settings.partners || {});
  let h = sheetHead('Budget di coppia', { back: true, grab: false }) + '<div class="sheet-body">';
  h += `<p class="lead sm">Per tenere lo stesso budget in due senza un cloud: ognuno registra le spese sul proprio telefono e ogni tanto vi mandate un file di aggiornamento, con WhatsApp, AirDrop o Mail. L'app unisce i movimenti senza doppioni e mostra chi li ha inseriti.</p>`;
  h += `<label class="fld"><span>Il tuo nome</span><input data-in="devName" value="${esc(dv.name)}" placeholder="Es. Mario" autocomplete="off"></label>`;
  h += `<div class="two-btn"><button class="btn dark" data-a="syncSend">${ic('share', 18)} Invia</button><label class="btn outline">${ic('download', 18)} Ricevi<input type="file" class="vh" accept="application/json,.json" data-ch="syncFile"></label></div>`;
  if (ls) h += `<p class="muted sm gap-t">Ultimo aggiornamento ricevuto il ${esc(shortDate(ls.at))} da ${esc(ls.name)}.</p>`;
  if (ps.length) h += `<p class="muted sm">Budget condiviso con ${esc(ps.join(', '))}.</p>`;
  h += fieldLabel('Come si usa') + `<ol class="steps"><li>Tocca <b>Invia</b> e manda il file all'altra persona.</li><li>Lei lo salva in File e nell'app tocca <b>Ricevi</b>. Se non ha ancora l'app, nella schermata di benvenuto sceglie «Apri un budget condiviso».</li><li>Poi fa lo stesso verso di te. Basta ogni tanto, per esempio la domenica.</li></ol>`;
  h += '<p class="foot-note">Se tutti e due modificate lo stesso movimento, vale la modifica più recente. Le foto degli scontrini restano sul telefono di chi le ha scattate; codice di blocco e impostazioni restano personali.</p>';
  return h + '</div>';
};
INP.devName = el => setDeviceName(el.value.trim());
ACT.syncSend = el => {
  const dv = device();
  if (!dv.name) { toast("Scrivi prima il tuo nome, così l'altra persona sa da chi arriva"); const i = $('[data-in="devName"]', sheetEl(sheetOf(el))); if (i) i.focus(); return; }
  const blob = new Blob([JSON.stringify(syncPackage())], { type: 'application/json' });
  const slug = dv.name.normalize('NFD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '') || 'budget';
  openSheet('fileReady', { blob, name: `EFU_Budget_condiviso_${slug}_${today()}.json`, kind: 'sync' });
};
CHG.syncFile = async el => {
  const f = el.files && el.files[0];
  if (!f) return;
  let pkg;
  try { pkg = JSON.parse(await f.text()); } catch (e) { return toast('Il file scelto non è un aggiornamento valido.'); }
  if (!pkg || pkg.type !== 'budget-sync' || !pkg.data) return toast(pkg && pkg.app === 'budget-iphone' ? 'Questo è un backup: per usarlo scegli «Ripristina da backup».' : 'Il file scelto non è un aggiornamento del budget condiviso.');
  if (pkg.from === device().id) return toast("Questo file l'hai creato tu: va aperto sull'altro telefono.");
  if (D && pkg.base && pkg.base !== baseCur() && hasMoney()) return toast(`L'altro telefono usa ${curName(pkg.base)} come valuta principale: scegliete la stessa valuta.`);
  const go = () => {
    const fresh = !D;
    if (fresh) { D = blankData(); D.settings.base = pkg.base || 'EUR'; }
    invalidate();
    const r = mergeSync(pkg);
    invalidate();
    const da = acc(D.settings.defaultAccount);
    if (!da || isGoal(da) || da.archived) { const l = D.accounts.find(a => !a.archived && (a.kind !== 'goal' && a.kind !== 'invest')); D.settings.defaultAccount = l ? l.id : null; }
    save({ noStamp: true, undo: false });
    UNDO.length = 0;
    UI.sheets.slice().forEach(s => { if (s.type !== 'settings') closeSheet(s); });
    if (fresh) { UI.tab = 'home'; UI.month = curMk(); }
    refresh();
    toast(`Da ${pkg.fromName}: ${r.add} ${r.add === 1 ? 'novità' : 'novità'}, ${r.upd} modifiche, ${r.del} eliminazioni`);
  };
  if (D && D.settings.household && pkg.household && pkg.household !== D.settings.household && hasMoney()) return confirmBox('Unire due budget diversi?', `Il file di ${esc(pkg.fromName)} viene da un altro budget. Se lo unisci, qui troverai i movimenti di entrambi.`, 'Unisci', go, false);
  go();
};

/* ---------- pagamenti Apple Pay tramite Comandi Rapidi ---------- */
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function parseWalletLines(text) {
  const out = [];
  for (const raw of String(text).replace(/^\ufeff/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const p = line.split(';').map(x => x.trim());
    if (p.length < 2) continue;
    const date = anyDate(p[0]), amount = Math.abs(parseAmount(p[1]));
    if (!date || !(amount > 0)) continue;
    out.push({ sig: fnv(line), date, amount: r2(amount), merchant: (p.length >= 4 ? p.slice(2, -1) : p.slice(2)).join(';').replace(/^"|"$/g, ''), card: p.length >= 4 ? p[p.length - 1] : '' });
  }
  return out;
}
CHG.walletFile = async el => {
  const f = el.files && el.files[0];
  if (!f) return;
  let text;
  try { text = await f.text(); } catch (e) { return toast('Non riesco a leggere il file.'); }
  const rows = parseWalletLines(text);
  if (!rows.length) return toast('Nel file non trovo pagamenti: controlla il comando rapido.');
  const seen = new Set(D.settings.apSeen || []);
  const fresh = rows.filter(r => !seen.has(r.sig));
  if (!fresh.length) return toast('Nessun pagamento nuovo da importare.');
  D.inbox = (D.inbox || []).concat(fresh.map(r => ({ id: uid(), date: r.date, amount: r.amount, merchant: r.merchant, card: r.card })));
  D.settings.apSeen = Array.from(seen).concat(fresh.map(r => r.sig)).slice(-5000);
  save(); refresh();
  toast(`${fresh.length} ${fresh.length === 1 ? 'pagamento da controllare' : 'pagamenti da controllare'} nella Home`);
};
SETTINGS.applepay = () => {
  const n = (D.inbox || []).length;
  let h = sheetHead('Pagamenti con Apple Pay', { back: true, grab: false }) + '<div class="sheet-body">';
  h += `<p class="lead sm">Ogni volta che paghi con l'iPhone o l'Apple Watch in un negozio, un'automazione di Comandi Rapidi scrive il pagamento in un file su iCloud Drive. Qui lo importi e lo confermi.</p>`;
  h += `<div class="ap-step"><span class="ap-n">1</span><div><b>Crea l'automazione</b><span>Una volta sola, circa due minuti. Serve iOS 17 o successivo.</span></div></div>`;
  h += `<a class="btn dark w" href="shortcuts://">${ic('repeat', 20)} Apri Comandi Rapidi</a>`;
  h += `<ol class="steps">
    <li>Tocca <b>Automazione</b>, poi <b>+</b>.</li>
    <li>Scegli <b>Wallet</b> (prima di iOS 26 si chiama <b>Transazione</b>), seleziona le tue carte, scegli <b>Esegui immediatamente</b> e tocca <b>Avanti</b>.</li>
    <li>Tocca <b>Nuova automazione vuota</b> e aggiungi l'azione <b>Testo</b>. Dentro inserisci, separati da punto e virgola: <b>Data corrente</b>, poi da <b>Input comando rapido</b> scegli <b>Importo</b>, <b>Esercente</b> e <b>Carta</b>.</li>
    <li>Aggiungi l'azione <b>Aggiungi a file di testo</b> (<i>Append to Text File</i>) e come file scrivi <b>Budget/pagamenti.txt</b>.</li></ol>
    <p class="muted sm gap-t">La data va bene nel formato che propone l'iPhone. Ogni pagamento diventa una riga come questa:</p><p class="code">18 set 2026, 10:22;12,50 €;Esselunga;Carta di credito</p>`;
  h += `<div class="ap-step"><span class="ap-n">2</span><div><b>Importa i pagamenti</b><span>Quando vuoi: ogni sera o a fine settimana.</span></div></div>`;
  h += `<label class="btn outline w">${ic('upload', 20)} Scegli il file pagamenti.txt<input type="file" class="vh" accept=".txt,.csv,text/plain" data-ch="walletFile"></label>`;
  if (n) h += `<p class="muted sm gap-t">${n} ${n === 1 ? 'pagamento aspetta' : 'pagamenti aspettano'} di essere controllati nella Home.</p>`;
  h += `<p class="foot-note">Perché non basta un tasto: Apple non permette a nessuna app di installare un'automazione, e l'importo e l'esercente si possono leggere solo dentro l'automazione stessa. Funziona con i pagamenti contactless, non con quelli online. I pagamenti arrivano «da controllare» perché a volte l'automazione scatta anche per un pagamento rifiutato. Reimportare lo stesso file non crea doppioni.</p>`;
  return h + '</div>';
};
function cardAccount(card) {
  const c = String(card || '').toLowerCase().trim();
  if (!c) return defaultAccountId();
  const a = liquidAccounts().find(x => { const n = x.name.toLowerCase(); return c.includes(n) || n.includes(c); });
  return a ? a.id : defaultAccountId();
}
function inboxBlock() {
  const list = (D.inbox || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return '';
  const cards = list.slice(0, 4).map(x => {
    const c = cat(guessCategory(x.merchant || '', 'out'));
    return `<div class="pcard"><button class="pc-top" data-a="inboxEdit" data-id="${x.id}">${avatar(c ? c.emoji : '💳', c ? c.color : null)}<span class="pc-t"><b>${esc(x.merchant || 'Pagamento')}</b><span class="muted">${esc(shortDate(x.date))}${x.card ? ', ' + esc(x.card) : ''}${c ? ', ' + esc(c.name) : ''}</span></span><b class="num out">${eur(-x.amount)}</b></button><div class="pc-act"><button class="link sm" data-a="inboxSkip" data-id="${x.id}">Ignora</button><button class="btn dark sm" data-a="inboxDo" data-id="${x.id}">${c ? 'Registra' : 'Scegli categoria'}</button></div></div>`;
  }).join('');
  const withG = list.filter(x => guessCategory(x.merchant || '', 'out')).length;
  return section('Pagamenti da controllare', `<div class="pcards">${cards}</div>${list.length > 4 ? `<p class="muted sm gap-t">E altri ${list.length - 4}.</p>` : ''}${withG > 1 ? `<button class="btn outline w gap-t" data-a="inboxAll">Registra i ${withG} con la categoria suggerita</button>` : ''}`);
}
const inboxItem = id => (D.inbox || []).find(x => x.id === id);
function inboxToMovement(x, catId) {
  D.movements.push({ id: uid(), ts: Date.now(), type: 'out', date: x.date, amount: x.amount, description: x.merchant || 'Pagamento con Apple Pay', note: '', tags: [], accountId: cardAccount(x.card), categoryId: catId, src: 'applepay' });
  D.inbox = D.inbox.filter(y => y.id !== x.id);
}
ACT.inboxEdit = el => {
  const x = inboxItem(el.dataset.id);
  if (!x) return;
  openSheet('mov', { type: 'out', step: 'details', amt: x.amount, date: x.date, description: x.merchant, categoryId: guessCategory(x.merchant || '', 'out'), accountId: cardAccount(x.card), inboxId: x.id, lockType: true, title: 'Pagamento con Apple Pay' });
};
ACT.inboxDo = el => {
  const x = inboxItem(el.dataset.id);
  if (!x) return;
  const g = guessCategory(x.merchant || '', 'out');
  if (!g) return ACT.inboxEdit(el);
  inboxToMovement(x, g);
  save(); refresh(); toast('Pagamento registrato');
};
ACT.inboxSkip = el => { D.inbox = (D.inbox || []).filter(y => y.id !== el.dataset.id); save(); refresh(); toast('Pagamento ignorato'); };
ACT.inboxAll = () => {
  let n = 0;
  for (const x of (D.inbox || []).slice()) { const g = guessCategory(x.merchant || '', 'out'); if (g) { inboxToMovement(x, g); n++; } }
  save(); refresh();
  toast(n ? `Registrati ${n} pagamenti` : 'Nessun pagamento con una categoria suggerita');
};

/* ---------- impostazioni: pagina principale aggiornata ---------- */
SETTINGS.main = function () {
  const ps = Object.values(D.settings.partners || {}), nIn = (D.inbox || []).length;
  let h = sheetHead('Impostazioni', { grab: false }) + '<div class="sheet-body">';
  h += `<div class="set-hero"><span class="app-ic">${appIconSVG(52)}</span><div><b>EFU Budget</b><span class="muted">I tuoi dati restano su questo dispositivo</span></div></div>`;
  if (UNDO.length) h += `<button class="notice undo-n" data-a="undoLast">${ic('undo', 20)}<div><b>Annulla l'ultima modifica</b><span>Torna indietro di un passo, anche se il messaggio è già sparito.</span></div></button>`;
  h += `<h3 class="set-h">Aiuto</h3><div class="list">${setRow('help', 'Guida e soluzioni<small>Tutte le funzioni spiegate e i problemi più comuni</small>', '', 'data-a="setPage" data-p="guide"')}</div>`;
  h += `<h3 class="set-h">Il tuo denaro</h3><div class="list">${setRow('wallet', 'Conti', liquidAccounts().length, 'data-a="setPage" data-p="accounts"')}${setRow('tag', 'Categorie', activeCats().length, 'data-a="setPage" data-p="categories"')}${setRow('people', 'Persone e spese divise', D.people.length || '', 'data-a="setPage" data-p="people"')}${setRow('globe', 'Valuta principale', esc(curName(baseCur()) + ' (' + baseSym() + ')'), 'data-a="openBaseCur"')}${setRow('trend', 'Investimenti', D.invest.length || '', 'data-a="invOpen"')}</div>`;
  h += `<h3 class="set-h">Insieme e in automatico</h3><div class="list">${setRow('people', 'Budget di coppia', ps.length ? esc('Con ' + ps.join(', ')) : 'Non attivo', 'data-a="setPage" data-p="share"')}${setRow('wallet', 'Pagamenti con Apple Pay', nIn ? nIn + ' da controllare' : '', 'data-a="setPage" data-p="applepay"')}</div>`;
  h += `<h3 class="set-h">Personalizza</h3><div class="list">${setRow('home', 'Sezioni della Home', (D.settings.homeOff || []).length ? (D.settings.homeOff || []).length + ' nascoste' : '', 'data-a="setPage" data-p="home"')}</div>${badgeRowHTML()}`;
  h += `<h3 class="set-h">Sicurezza</h3><div class="list">${setRow('lock', 'Codice di blocco', D.settings.pin ? 'Attivo' : 'Non attivo', 'data-a="setPage" data-p="security"')}</div>${swRow("Nascondi gli importi all'apertura", 'hideOnOpen', !!D.settings.hideOnOpen, "Ogni volta che apri l'app gli importi sono coperti: per vederli tocca l'occhio in alto nella Home.", 'hideOpenToggle')}`;
  h += `<h3 class="set-h">Dati</h3><div class="list">${setRow('upload', 'Importa dati<small>Excel del budget, altre app, estratto conto</small>', '', 'data-a="openImportAny"')}${setRow('download', 'Esporta i dati<small>Excel con tutto, da reimportare anche su un altro telefono</small>', '', 'data-a="openExport"')}${setRow('file', 'Backup completo', D.settings.lastBackup ? 'Ultimo il ' + shortDate(D.settings.lastBackup) : 'Mai fatto', 'data-a="backup"')}<label class="row"><span class="row-ic">${ic('upload', 21)}</span><span class="rt">Ripristina tutto da un file<small>Esportazione Excel o backup</small></span><span class="rv"></span>${ic('right', 18)}<input type="file" class="vh" accept="application/json,.json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-ch="restoreFile"></label></div>`;
  h += `<p class="foot-note">Versione ${APP_VERSION}. I dati sono salvati solo in questa app, su questo dispositivo: fai un backup ogni tanto e conservalo su File o iCloud Drive.</p>`;
  return h + '<div class="danger-z"><button class="link danger" data-a="wipe">Cancella tutti i dati</button></div></div>';
};

/* ---------- cambi aggiornati da internet: BCE via Frankfurter, con riserva ---------- */
const FX_KEY = 'budget.iphone.fx';
let FXC = null, FX_NET = 0;
const fxOn = () => !D || D.settings.fxAuto !== false;
function fxCache() { if (!FXC) { try { FXC = JSON.parse(localStorage.getItem(FX_KEY) || '{}') || {}; } catch (e) { FXC = {}; } } return FXC; }
function fxStore() {
  const c = fxCache(), keys = Object.keys(c);
  if (keys.length > 400) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - 300).forEach(k => delete c[k]);
  try { localStorage.setItem(FX_KEY, JSON.stringify(c)); } catch (e) { }
}
async function getJSON(url, ms = 7000) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = setTimeout(() => { if (ctl) ctl.abort(); }, ms);
  try {
    FX_NET++;
    const r = await fetch(url, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(tm); }
}
/* quanto vale 1 `from` in `to` alla data indicata (per le date passate: l'ultimo giorno lavorativo disponibile) */
async function fxRate(from, to, date) {
  if (from === to) return { rate: 1, date: date || today(), src: '' };
  const day = !date || date >= today() ? 'latest' : date;
  const key = day + '|' + from + '|' + to, c = fxCache(), hit = c[key];
  if (hit && (day !== 'latest' || Date.now() - hit.t < 6 * 3600e3)) return hit;
  let res = null;
  try {
    const j = await getJSON(`https://api.frankfurter.dev/v1/${day}?base=${from}&symbols=${to}`);
    if (j && j.rates && j.rates[to] > 0) res = { rate: j.rates[to], date: j.date || date || today(), src: 'BCE' };
  } catch (e) { }
  if (!res) {
    const f = from.toLowerCase(), t = to.toLowerCase();
    for (const u of [`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/${f}.json`, `https://${day}.currency-api.pages.dev/v1/currencies/${f}.json`]) {
      try { const j = await getJSON(u); if (j && j[f] && j[f][t] > 0) { res = { rate: j[f][t], date: j.date || date || today(), src: 'mercato' }; break; } } catch (e) { }
    }
  }
  if (!res) return hit || null;
  res.rate = Math.round(res.rate * 1e6) / 1e6;
  res.t = Date.now();
  c[key] = res; fxStore();
  return res;
}
const sheetOpen = sh => UI.sheets.includes(sh);
function fxNoteHTML(st, rate, cls = '') {
  if (!fxOn()) return '';
  if (st.fxBusy) return `<p class="fx-note ${cls}">Controllo il cambio del giorno…</p>`;
  const f = st.fx;
  if (f && f.cur === st.cur && Math.abs(f.rate - rate) < 1e-6) return `<p class="fx-note ${cls}">${f.src === 'BCE' ? 'Cambio ufficiale BCE' : 'Cambio di mercato'} del ${esc(shortDate(f.date))}. <button class="link" data-a="fxRefresh">Aggiorna</button></p>`;
  if (st.fxErr) return `<p class="fx-note ${cls}">Non riesco a scaricare il cambio: scrivilo tu. <button class="link" data-a="fxRefresh">Riprova</button></p>`;
  return `<p class="fx-note ${cls}"><button class="link" data-a="fxRefresh">Usa il cambio del giorno</button></p>`;
}
async function fxAuto(sh, force) {
  const st = sh.st, base = baseCur();
  if (!fxOn() || st.type === 'transfer' || !st.cur || st.cur === base) return;
  if (!force && (st.rateManual || st.mode === 'edit')) return;
  const cur = st.cur, date = st.date;
  st.fxBusy = true; st.fxErr = false;
  if (sheetOpen(sh)) drawSheet(sh);
  const r = await fxRate(cur, base, date);
  if (!sheetOpen(sh) || st.cur !== cur || st.date !== date) return;
  st.fxBusy = false;
  if (r) { st.rate = r.rate; st.fx = { cur, rate: r.rate, date: r.date, src: r.src }; st.rateManual = false; }
  else st.fxErr = true;
  drawSheet(sh);
}
async function baseFx(sh, force) {
  const st = sh.st, old = baseCur(), nu = st.cur;
  if (!fxOn() || nu === old || st.mode !== 'convert' || (!force && st.rateManual)) return;
  st.fxBusy = true; st.fxErr = false; drawSheet(sh);
  const r = await fxRate(old, nu, today());
  if (!sheetOpen(sh) || st.cur !== nu) return;
  st.fxBusy = false;
  if (r) { st.rate = numStr(r.rate, 6); st.fx = { cur: nu, rate: r.rate, date: r.date, src: r.src }; st.rateManual = false; }
  else st.fxErr = true;
  drawSheet(sh);
}
ACT.fxRefresh = el => { const sh = sheetOf(el); if (!sh) return; if (sh.type === 'baseCur') baseFx(sh, true); else fxAuto(sh, true); };
ACT.fxToggle = el => { D.settings.fxAuto = !fxOn(); save({ undo: false }); drawSheet(sheetOf(el)); };
{
  const chgDate = CHG.date, pick = ACT.pick, set = INP.set;
  CHG.date = (el, e) => { const sh = sheetOf(el); chgDate(el, e); if (sh && sh.type === 'mov' && el.dataset.f === 'date') fxAuto(sh); };
  ACT.pick = (el, e) => {
    const sh = sheetOf(el);
    pick(el, e);
    if (!sh) return;
    if (sh.type === 'mov' && el.dataset.f === 'date') fxAuto(sh);
    if (sh.type === 'baseCur' && el.dataset.f === 'mode' && el.dataset.v === 'convert') baseFx(sh);
  };
  INP.set = (el, e) => { set(el, e); const sh = sheetOf(el); if (sh && sh.type === 'baseCur' && el.dataset.f === 'rate') sh.st.rateManual = true; };
}

