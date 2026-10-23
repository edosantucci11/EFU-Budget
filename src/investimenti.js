/* =========================================================
   Investimenti
   Posizioni, valore nel tempo, grafici per periodo, promemoria,
   pagina Investimenti, aperta dal Patrimonio in Home.
   ========================================================= */

/* ---------- investimenti ---------- */
const INV_KINDS = [['etf', 'ETF', '📈'], ['stock', 'Azioni', '🏢'], ['fund', 'Fondo', '🧺'], ['bond', 'Obbligazioni', '📜'], ['crypto', 'Cripto', '🪙'], ['other', 'Altro', '💼']];
const invKind = k => INV_KINDS.find(x => x[0] === k) || INV_KINDS[5];
const invById = id => D.invest.find(p => p.id === id);
const invLast = p => (p.hist && p.hist.length ? p.hist[p.hist.length - 1] : { d: p.created || today(), v: p.invested || 0, i: p.invested || 0 });
const invValue = p => invLast(p).v;
function invTotals(list = D.invest) { let v = 0, i = 0; for (const p of list) { v += invValue(p); i += p.invested || 0; } return { v: r2(v), i: r2(i), g: r2(v - i), pct: i > 0 ? (v - i) / i : null }; }
function invSeries(list = D.invest) {
  const dates = Array.from(new Set(list.flatMap(p => (p.hist || []).map(h => h.d)))).sort();
  return dates.map(d => {
    let v = 0, i = 0;
    for (const p of list) { let last = null; for (const h of (p.hist || [])) { if (h.d <= d) last = h; else break; } if (last) { v += last.v; i += last.i; } }
    return { d, v: r2(v), i: r2(i) };
  });
}
function invPoint(p, d, v, i) {
  p.hist = (p.hist || []).filter(h => h.d !== d);
  p.hist.push({ d, v: r2(v), i: r2(i != null ? i : p.invested || 0) });
  p.hist.sort((a, b) => a.d.localeCompare(b.d));
}
const invGainHTML = (g, pc) => `<b class="num">${eur(g, { sign: true })}</b>${pc != null ? `<span> ${g >= 0 ? '+' : '−'}${pctDec(Math.abs(pc))}</span>` : ''}`;
const INV_RANGES = [['1d', '1G', 'Un giorno'], ['1w', '1S', 'Una settimana'], ['1m', '1M', 'Un mese'], ['3m', '3M', 'Tre mesi'], ['1y', '1A', 'Un anno'], ['all', 'Tutto', 'Tutto lo storico']];
const INV_DAYS = { '1w': 7, '1m': 31, '3m': 92, '1y': 366 };
/* porta la serie fino a oggi con l'ultimo valore noto, poi la taglia sul periodo scelto */
function invRange(s, r) {
  const t = today(), l = s[s.length - 1];
  if (l && l.d < t) s = s.concat([{ d: t, v: l.v, i: l.i }]);
  if (r === 'all' || s.length < 2) return s;
  if (r === '1d') { const prev = s.filter(x => x.d < t).pop(); return prev ? [prev].concat(s.filter(x => x.d >= t)) : s.filter(x => x.d >= t); }
  const from = addDays(t, -(INV_DAYS[r] || 366)), inside = s.filter(x => x.d > from), before = s.filter(x => x.d <= from).pop();
  return before ? [Object.assign({}, before, { d: from })].concat(inside) : inside;
}
const invRangeChips = (sel, attrs) => `<div class="inv-rng" role="group" aria-label="Periodo del grafico">${INV_RANGES.map(([k, l, a]) => `<button class="${sel === k ? 'on' : ''}" ${attrs} data-v="${k}" aria-label="${a}" aria-pressed="${sel === k}">${l}</button>`).join('')}</div>`;
/* variazione nel periodo, senza contare acquisti, vendite e versamenti del PAC */
function invDeltaHTML(series, r) {
  if (series.length < 2) return '';
  const a = series[0], b = series[series.length - 1], t = today();
  const contrib = r2(b.i - a.i), g = r2(b.v - a.v - contrib), base = a.v + Math.max(0, contrib) / 2, pc = base > 0 ? g / base : null;
  const wanted = r === '1d' ? null : r === 'all' ? a.d : addDays(t, -(INV_DAYS[r] || 366));
  let lbl;
  if (r === '1d') lbl = a.d === addDays(t, -1) ? 'Rispetto a ieri' : "Dall'ultimo aggiornamento, il " + shortDate(a.d);
  else if (a.d > wanted) lbl = 'Dal ' + shortDate(a.d) + ', il primo valore che ho';
  else lbl = { '1w': 'Nell\'ultima settimana', '1m': "Nell'ultimo mese", '3m': 'Negli ultimi 3 mesi', '1y': "Nell'ultimo anno", all: 'Dal ' + shortDate(a.d) }[r];
  const note = Math.abs(contrib) > 0.004 ? `<span class="muted sm"> Senza contare ${contrib > 0 ? 'i versamenti' : 'le vendite'} di ${eur(Math.abs(contrib))}.</span>` : '';
  return `<p class="inv-per">${esc(lbl)}: <span class="${g >= 0 ? 'pos' : 'neg'}">${invGainHTML(g, pc)}</span>${note}</p>`;
}
function invChart(series, h = 150) {
  if (series.length < 2) return '<p class="muted sm inv-nochart">Il grafico compare dal secondo aggiornamento del valore.</p>';
  const W = 340, H = h, pl = 2, pr = 2, pt = 8, pb = 20;
  const t0 = dateOf(series[0].d).getTime(), t1 = dateOf(series[series.length - 1].d).getTime(), span = Math.max(1, t1 - t0);
  const vals = series.flatMap(s => [s.v, s.i]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const padV = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1; lo -= padV; hi += padV;
  const X = d => (pl + (dateOf(d).getTime() - t0) / span * (W - pl - pr)).toFixed(1), Y = v => (pt + (hi - v) / (hi - lo) * (H - pt - pb)).toFixed(1);
  const line = series.map((s, j) => (j ? 'L' : 'M') + X(s.d) + ' ' + Y(s.v)).join(' ');
  const step = series.map((s, j) => (j ? `H${X(s.d)} V${Y(s.i)}` : `M${X(s.d)} ${Y(s.i)}`)).join(' ');
  const area = line + ` L${X(series[series.length - 1].d)} ${H - pb} L${X(series[0].d)} ${H - pb} Z`;
  const last = series[series.length - 1], col = last.v >= last.i ? 'var(--pos,#0A8A4A)' : '#FF385C';
  return `<svg class="inv-ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento del valore rispetto al capitale investito"><path d="${area}" style="fill:${col};opacity:.1"/><path d="${step}" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.4" stroke-dasharray="4 4"/><path d="${line}" fill="none" style="stroke:${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><text x="${pl}" y="${H - 5}" class="ax">${esc(shortDate(series[0].d))}</text><text x="${W - pr}" y="${H - 5}" text-anchor="end" class="ax">${esc(shortDate(last.d))}</text></svg><p class="inv-leg"><span><i style="background:${col}"></i>Valore</span><span><i class="dash"></i>Investito</span></p>`;
}
function investBlock() {
  if (!D.invest.length) return section('Investimenti', `<button class="empty-row" data-a="invOpen">${ic('plus', 18)} Aggiungi i tuoi investimenti e segui come vanno</button>`);
  const t = invTotals();
  return section('Investimenti', `<button class="inv-card" data-a="invOpen"><span class="inv-top"><span><span class="muted sm">Valore attuale</span><b class="num inv-v">${eur(t.v)}</b></span><span class="inv-g ${t.g >= 0 ? 'pos' : 'neg'}">${invGainHTML(t.g, t.pct)}</span></span>${invChart(invRange(invSeries(), '1y'), 110)}${invDue() ? '<span class="inv-due">È ora di aggiornare i valori</span>' : ''}</button>`);
}
function invRow(p) {
  const k = invKind(p.kind), v = invValue(p), g = v - (p.invested || 0), pc = p.invested > 0 ? g / p.invested : null;
  return `<button class="row" data-a="invView" data-id="${p.id}"><span class="row-ic av-e">${k[2]}</span><span class="rt">${esc(p.name)}<small>${esc([p.code, k[1], pxAuto(p) ? 'prezzo automatico' : p.sym ? 'mancano le quote' : '', 'aggiornato il ' + shortDate(invLast(p).d)].filter(Boolean).join(', '))}</small></span><span class="rv num inv-rv"><b>${eur(v)}</b>${pc != null ? `<small class="${g >= 0 ? 'pos' : 'neg'}">${g >= 0 ? '+' : '−'}${pctDec(Math.abs(pc))}</small>` : ''}</span></button>`;
}
const invFreq = () => (D.settings.invRemind == null ? 7 : Number(D.settings.invRemind));
function invDue() {
  const f = invFreq();
  if (!D || !D.invest.length || !f) return false;
  const oldest = D.invest.filter(p => !invFresh(p)).reduce((m, p) => { const d = p.seen && p.seen > invLast(p).d ? p.seen : invLast(p).d; return !m || d < m ? d : m; }, null);
  if (!oldest) return false;
  return dayDiff(oldest, today()) >= f;
}
function redrawInvest() { for (const s of UI.sheets) if (s.type === 'invest' || s.type === 'invView' || s.type === 'pac') drawSheet(s); if (UI.tab === 'invest' && D) render(); }
SHEETS.invest = {
  cls: 'tall',
  init: () => ({ range: 'all' }),
  render(st) {
    let h = sheetHead('Investimenti') + '<div class="sheet-body">';
    if (!D.invest.length) return h + `<p class="lead sm">Segna quanto hai investito in ETF, azioni, fondi o altro e aggiorna il valore quando vuoi: vedrai guadagno o perdita e il grafico dell'andamento. Una volta a settimana te lo ricordo io.</p><button class="btn primary w gap-t" data-a="invNew">${ic('plus', 18)} Aggiungi il primo investimento</button></div>`;
    const t = invTotals(), due = invDue();
    h += `<div class="inv-sum"><p class="muted sm">Valore attuale</p><p class="inv-big num">${eur(t.v)}</p><p class="inv-gl ${t.g >= 0 ? 'pos' : 'neg'}">${invGainHTML(t.g, t.pct)} <span class="muted">su ${eur(t.i)} investiti</span></p></div>`;
    h += `<div class="chips">${[['3m', '3 mesi'], ['1y', '1 anno'], ['all', 'Tutto']].map(([k, l]) => `<button class="chip ${st.range === k ? 'on' : ''}" data-a="pick" data-f="range" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += invChart(invRange(invSeries(), st.range), 170);
    h += `<button class="btn ${due ? 'primary' : 'dark'} w gap-t" data-a="invUpdateOpen">${ic('trend', 18)} Aggiorna i valori</button>`;
    h += fieldLabel('Le tue posizioni') + `<div class="list">${D.invest.slice().sort((a, b) => invValue(b) - invValue(a)).map(invRow).join('')}</div>`;
    h += `<button class="btn outline w gap-t" data-a="invNew">${ic('plus', 18)} Aggiungi investimento</button>`;
    h += pacSection() + pxSection();
    h += fieldLabel('Promemoria per aggiornare') + `<div class="chips wrap">${[[7, 'Ogni settimana'], [14, 'Ogni 2 settimane'], [30, 'Ogni mese'], [0, 'Mai']].map(([v, l]) => `<button class="chip ${invFreq() === v ? 'on' : ''}" data-a="invFreq" data-v="${v}">${l}</button>`).join('')}</div>`;
    return h + `<p class="muted sm gap-t">Quando è il momento, all'apertura dell'app ti chiedo i nuovi valori.</p></div>`;
  }
};
SHEETS.invPos = {
  cls: 'tall',
  init(p) {
    if (p.id) { const x = invById(p.id); return { id: x.id, name: x.name, code: x.code || '', kind: x.kind || 'etf', qty: x.qty ? numStr(x.qty, 6) : '', invested: numStr(x.invested || 0), value: numStr(invValue(x)), sym: x.sym || '', found: null }; }
    return { id: null, name: '', code: '', kind: 'etf', qty: '', invested: '', value: '', sym: '', found: null };
  },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica investimento' : 'Nuovo investimento') + '<div class="sheet-body">';
    h += `<label class="fld"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. Vanguard FTSE All-World" autocomplete="off"></label>`;
    h += `<label class="fld"><span>Codice, ISIN o ticker (facoltativo)</span><input data-in="set" data-f="code" value="${esc(st.code)}" placeholder="Es. IE00BK5BQT80 oppure VWCE" autocapitalize="characters" autocomplete="off"></label>`;
    h += pxSymField(st);
    h += fieldLabel('Tipo') + `<div class="chips wrap">${INV_KINDS.map(([k, l, e]) => `<button class="chip ${st.kind === k ? 'on' : ''}" data-a="pick" data-f="kind" data-v="${k}">${e} ${l}</button>`).join('')}</div>`;
    h += `<label class="fld"><span>Quanto hai investito in totale</span><input inputmode="decimal" data-in="set" data-f="invested" value="${esc(st.invested)}" placeholder="0,00"></label>`;
    h += `<label class="fld"><span>${st.id ? 'Valore attuale' : 'Quanto vale oggi'}</span><input inputmode="decimal" data-in="set" data-f="value" value="${esc(st.value)}" placeholder="0,00"></label>`;
    h += `<label class="fld"><span>Quote possedute (facoltativo)</span><input inputmode="decimal" data-in="set" data-f="qty" value="${esc(st.qty)}" placeholder="Es. 42"></label>`;
    h += '<p class="muted sm">Con le quote, quando aggiorni puoi scrivere solo il prezzo di una quota: il totale lo calcolo io.</p>';
    if (st.id) h += '<div class="danger-z"><button class="link danger" data-a="invDelete">Elimina investimento</button></div>';
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="invSave">${st.id ? 'Salva modifiche' : 'Aggiungi'}</button></footer>`;
  }
};
SHEETS.invView = {
  cls: 'tall',
  render(st, sh) {
    const p = invById(sh.props.id);
    if (!p) return sheetHead('Investimento') + '<div class="sheet-body"><p class="muted">Questo investimento è stato eliminato.</p></div>';
    const k = invKind(p.kind), v = invValue(p), g = v - (p.invested || 0), pc = p.invested > 0 ? g / p.invested : null;
    let h = sheetHead(p.name) + '<div class="sheet-body">';
    h += `<p class="muted sm">${esc([k[2] + ' ' + k[1], p.code, p.qty ? numStr(p.qty, 6) + ' quote' : ''].filter(Boolean).join(', '))}</p>`;
    h += `<div class="inv-sum"><p class="inv-big num">${eur(v)}</p><p class="inv-gl ${g >= 0 ? 'pos' : 'neg'}">${invGainHTML(g, pc)} <span class="muted">su ${eur(p.invested || 0)} investiti</span></p></div>`;
    const rg = st.range || 'all', ser = invRange(invSeries([p]), rg);
    h += invRangeChips(rg, 'data-a="pick" data-f="range"') + invChart(ser, 150) + invDeltaHTML(ser, rg);
    h += invViewExtra(p);
    h += `<div class="two-btn gap-t"><button class="btn dark" data-a="invUpdateOne" data-id="${p.id}">Aggiorna valore</button><button class="btn outline" data-a="invMoveOpen" data-id="${p.id}">Compra o vendi</button></div>`;
    const rows = (p.hist || []).filter(h => !h.y).slice().reverse(); // solo i valori registrati, non quelli stimati
    h += fieldLabel('Storico dei valori') + `<div class="list">${rows.map((x, j) => {
      const prev = rows[j + 1], d = prev ? x.v - prev.v - (x.i - prev.i) : null;
      return `<div class="row static"><span class="rt">${esc(shortDate(x.d))}<small>Investito ${eur(x.i)}</small></span><span class="rv num inv-rv"><b>${eur(x.v)}</b>${d != null ? `<small class="${d >= 0 ? 'pos' : 'neg'}">${eur(d, { sign: true })}</small>` : ''}</span>${rows.length > 1 ? `<button class="icon-btn ghost sm" data-a="invPtDel" data-id="${p.id}" data-d="${x.d}" aria-label="Elimina questo valore">${ic('close', 16)}</button>` : ''}</div>`;
    }).join('')}</div>`;
    return h + `<button class="btn outline w gap-t" data-a="invEdit" data-id="${p.id}">Modifica</button></div>`;
  }
};
SHEETS.invMove = {
  init: p => ({ id: p.id, dir: 'buy', amt: '' }),
  render(st) {
    const p = invById(st.id);
    let h = sheetHead('Compra o vendi') + '<div class="sheet-body">';
    h += `<p class="muted sm">${esc(p ? p.name : '')}</p><div class="chips">${[['buy', 'Acquisto'], ['sell', 'Vendita']].map(([k, l]) => `<button class="chip ${st.dir === k ? 'on' : ''}" data-a="pick" data-f="dir" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += `<label class="fld gap-t"><span>Importo</span><input inputmode="decimal" data-in="set" data-f="amt" value="${esc(st.amt)}" placeholder="0,00"></label>`;
    h += '<p class="muted sm">Un acquisto aumenta sia il capitale investito sia il valore; una vendita li riduce. Il guadagno maturato non cambia.</p>';
    return h + '</div><footer class="sheet-foot"><button class="btn primary w" data-a="invMoveSave">Salva</button></footer>';
  }
};
SHEETS.invUpdate = {
  cls: 'tall',
  init: p => ({ only: p.id || null, vals: {}, mode: {} }),
  render(st) {
    const list = D.invest.filter(p => (st.only ? p.id === st.only : !invFresh(p)));
    let h = sheetHead(st.only ? 'Aggiorna valore' : 'Aggiorna i tuoi investimenti') + '<div class="sheet-body">';
    if (!st.only) h += '<p class="lead sm">Scrivi quanto valgono oggi. Se lasci un campo vuoto, quell\'investimento resta com\'è.</p>';
    for (const p of list) {
      const last = invLast(p), unit = p.qty > 0 && st.mode[p.id] === 'unit';
      h += `<div class="upd-card"><div class="upd-h"><span class="av-e">${invKind(p.kind)[2]}</span><b>${esc(p.name)}</b></div>`;
      h += `<label class="fld"><span>${unit ? 'Prezzo di una quota oggi' : 'Valore totale oggi'}</span><input inputmode="decimal" data-in="invVal" data-id="${p.id}" value="${esc(st.vals[p.id] || '')}" placeholder="${esc(numStr(unit ? last.v / p.qty : last.v))}"></label>`;
      h += `<p class="muted sm">L'ultima volta ${eur(last.v)}, il ${esc(shortDate(last.d))}.${p.qty > 0 ? ` <button class="link" data-a="invUnit" data-id="${p.id}">${unit ? 'Scrivi il valore totale' : 'Scrivi il prezzo di una quota'}</button>` : ''}</p></div>`;
    }
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="invUpdSave">Salva</button>${st.only ? '' : '<button class="link w later" data-a="invLater">Ricordamelo domani</button>'}</footer>`;
  }
};
ACT.invNew = () => openSheet('invPos', {});
ACT.invView = el => openSheet('invView', { id: el.dataset.id });
ACT.invEdit = el => openSheet('invPos', { id: el.dataset.id });
ACT.invUpdateOpen = () => openSheet('invUpdate', {});
ACT.invUpdateOne = el => openSheet('invUpdate', { id: el.dataset.id });
ACT.invMoveOpen = el => openSheet('invMove', { id: el.dataset.id });
INP.invVal = el => { sheetOf(el).st.vals[el.dataset.id] = el.value; };
ACT.invUnit = el => { const sh = sheetOf(el), id = el.dataset.id; sh.st.mode[id] = sh.st.mode[id] === 'unit' ? 'tot' : 'unit'; sh.st.vals[id] = ''; drawSheet(sh); };
ACT.invSave = el => {
  const sh = sheetOf(el), st = sh.st, name = st.name.trim();
  if (!name) return toast("Scrivi il nome dell'investimento");
  const inv = strToNum(st.invested), val = strToNum(st.value), qty = strToNum(st.qty);
  if (!(inv > 0)) return toast('Scrivi quanto hai investito');
  const p = st.id ? invById(st.id) : { id: uid(), created: today(), hist: [] };
  if (!p) return closeSheet(sh);
  const oldInv = p.invested, oldVal = st.id ? invValue(p) : null;
  Object.assign(p, { name, code: st.code.trim().toUpperCase(), kind: st.kind, qty: qty > 0 ? qty : null, invested: r2(inv), sym: String(st.sym || '').trim().toUpperCase() || null });
  const v = st.value.trim() === '' || isNaN(val) ? (st.id ? oldVal : r2(inv)) : r2(val);
  if (!st.id) { invPoint(p, today(), v, p.invested); D.invest.push(p); }
  else if (Math.abs(v - oldVal) > 0.004 || Math.abs(p.invested - oldInv) > 0.004) invPoint(p, today(), v, p.invested);
  save(); closeSheet(sh); redrawInvest(); refresh();
  toast(st.id ? 'Investimento aggiornato' : 'Investimento aggiunto');
  if (pxAuto(p)) autoPrices(true);
};
ACT.invDelete = el => {
  const sh = sheetOf(el), p = invById(sh.st.id);
  if (!p) return;
  confirmBox(`Eliminare «${p.name}»?`, 'Sparisce anche lo storico dei valori. Potrai annullare subito dopo.', 'Elimina', () => {
    D.invest = D.invest.filter(x => x !== p);
    pacDropPos(p.id);
    save();
    UI.sheets.slice().forEach(s => { if (s.type === 'invPos' || (s.type === 'invView' && s.props.id === p.id)) closeSheet(s); });
    redrawInvest(); refresh(); toast('Investimento eliminato');
  });
};
ACT.invPtDel = el => {
  const p = invById(el.dataset.id);
  if (!p || (p.hist || []).filter(h => !h.y).length < 2) return;
  p.hist = p.hist.filter(h => h.d !== el.dataset.d);
  p.invested = invLast(p).i;
  save(); redrawInvest(); refresh(); toast('Valore eliminato');
};
ACT.invMoveSave = el => {
  const sh = sheetOf(el), st = sh.st, p = invById(st.id), amt = strToNum(st.amt);
  if (!p) return closeSheet(sh);
  if (!(amt > 0)) return toast("Scrivi l'importo");
  const s = st.dir === 'sell' ? -1 : 1, v = invValue(p);
  if (s < 0 && amt > v + 0.004) return toast('La vendita supera il valore attuale');
  p.invested = r2(Math.max(0, (p.invested || 0) + s * amt));
  invPoint(p, today(), Math.max(0, v + s * amt), p.invested);
  save(); closeSheet(sh); redrawInvest(); refresh();
  toast(s > 0 ? 'Acquisto registrato' : 'Vendita registrata');
};
ACT.invUpdSave = el => {
  const sh = sheetOf(el), st = sh.st, t = today();
  let n = 0;
  for (const p of D.invest) {
    if (st.only && p.id !== st.only) continue;
    const raw = String(st.vals[p.id] || '').trim();
    if (!raw) { p.seen = t; continue; }
    let v = strToNum(raw);
    if (!(v >= 0)) continue;
    if (p.qty > 0 && st.mode[p.id] === 'unit') v *= p.qty;
    invPoint(p, t, v, p.invested || 0); n++;
  }
  if (!n && st.only) return toast('Scrivi il nuovo valore');
  D.settings.invSnooze = null;
  save(); closeSheet(sh); redrawInvest(); refresh();
  toast(!n ? 'Valori confermati' : n === 1 ? 'Valore aggiornato' : `Aggiornati ${n} investimenti`);
};
ACT.invLater = el => { D.settings.invSnooze = today(); save({ undo: false }); closeSheet(sheetOf(el)); };
let INV_ASKED = false;
function invReminderCheck(tries = 0) {
  if (!D || INV_ASKED || D.settings.demo) return;
  if (UI.locked || UI.sheets.length) { if (tries < 40) setTimeout(() => invReminderCheck(tries + 1), 1500); return; }
  if (!invDue() || D.settings.invSnooze === today()) return;
  INV_ASKED = true;
  openSheet('invUpdate', {});
}
function demoInvest() {
  const start = addDays(today(), -7 * 26);
  const mkP = (name, code, kind, inv0, drift, vol, seed) => {
    let s = seed;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const p = { id: uid(), name, code, kind, qty: null, created: start, hist: [] };
    let v = inv0, inv = inv0;
    for (let w = 0; w <= 26; w++) {
      if (w && w % 4 === 0) { inv += 200; v += 200; }
      if (w) v *= 1 + drift + (r() - 0.5) * vol;
      p.hist.push({ d: addDays(start, w * 7), v: r2(v), i: inv });
    }
    p.invested = inv;
    return p;
  };
  return [mkP('Vanguard FTSE All-World', 'VWCE', 'etf', 6000, 0.0025, 0.035, 12345), mkP('iShares Core MSCI EM IMI', 'EIMI', 'etf', 1500, 0.0012, 0.05, 777)];
}


/* ---------- pagina Investimenti ---------- */
if (!UI.invRange) UI.invRange = 'all';
VIEWS.invest = () => {
  let h = `<header class="ph ph-back"><button class="icon-btn" data-a="tab" data-t="home" aria-label="Torna alla Home">${ic('left', 22)}</button><h1>Investimenti</h1></header>`;
  if (!D.invest.length) return h + `<div class="empty"><div class="empty-art">${ic('trend', 30)}</div><h3>Nessun investimento</h3><p>Segna quanto hai investito in ETF, azioni, fondi o altro e segui come vanno: guadagno o perdita, grafico, PAC e prezzi automatici.</p><button class="btn primary" data-a="invNew">${ic('plus', 18)} Aggiungi il primo investimento</button></div>`;
  const t = invTotals(), due = invDue();
  h += `<div class="inv-sum"><p class="muted sm">Valore attuale</p><p class="inv-big num">${eur(t.v)}</p><p class="inv-gl ${t.g >= 0 ? 'pos' : 'neg'}">${invGainHTML(t.g, t.pct)} <span class="muted">su ${eur(t.i)} investiti</span></p></div>`;
  const ser = invRange(invSeries(), UI.invRange);
  h += invRangeChips(UI.invRange, 'data-a="invRangeSet"') + invChart(ser, 170) + invDeltaHTML(ser, UI.invRange);
  h += `<button class="btn ${due ? 'primary' : 'dark'} w gap-t" data-a="invUpdateOpen">${ic('trend', 18)} ${due ? "È ora di aggiornare i valori" : 'Aggiorna i valori'}</button>`;
  h += section('Le tue posizioni', `<div class="list">${D.invest.slice().sort((a, b) => invValue(b) - invValue(a)).map(invRow).join('')}</div><button class="btn outline w gap-t" data-a="invNew">${ic('plus', 18)} Aggiungi investimento</button>`);
  h += `<section class="sec">${pacSection()}</section><section class="sec">${pxSection()}</section>`;
  h += `<section class="sec">${fieldLabel('Promemoria per aggiornare')}<div class="chips wrap">${[[7, 'Ogni settimana'], [14, 'Ogni 2 settimane'], [30, 'Ogni mese'], [0, 'Mai']].map(([v, l]) => `<button class="chip ${invFreq() === v ? 'on' : ''}" data-a="invFreq" data-v="${v}">${l}</button>`).join('')}</div><p class="muted sm gap-t">Quando è il momento, all'apertura dell'app ti chiedo i nuovi valori degli investimenti che non si aggiornano da soli.</p></section>`;
  return h;
};
ACT.invRangeSet = el => { UI.invRange = el.dataset.v; render(); };
ACT.invOpen = () => { UI.sheets.slice().reverse().forEach(s => closeSheet(s)); goTab('invest'); };
ACT.invFreq = el => { D.settings.invRemind = Number(el.dataset.v); save({ undo: false }); const sh = sheetOf(el); if (sh) drawSheet(sh); else render(); };

