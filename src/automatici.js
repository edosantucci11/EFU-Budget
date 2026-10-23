/* =========================================================
   Aggiornamenti automatici
   Prezzi tramite il ponte Cloudflare, piani di accumulo (PAC),
   interessi sulla liquidità dei conti.
   ========================================================= */
const PONTE_CODE = /*PONTE*/;
function syncAuto() {
  let ch = false;
  if (syncPAC()) { ch = true; invalidate(); }
  if (syncCardDebits()) { ch = true; invalidate(); }
  if (syncInterest()) { ch = true; invalidate(); }
  return ch;
}

/* ---------- prezzi automatici tramite il ponte ---------- */
const PX_DEFAULT = 'https://efu-prezzi.edo-santucci.workers.dev';
const pxUrl = () => { if (!D) return ''; const u = D.settings.pxUrl; return u === undefined || u === null ? PX_DEFAULT : u; };
function pxEndpoint(path, params) {
  const u = new URL(pxUrl().replace(/\/+$/, '') + path);
  for (const k in params) u.searchParams.set(k, params[k]);
  if (D.settings.pxKey) u.searchParams.set('key', D.settings.pxKey);
  return u.toString();
}
const pxAuto = p => !!(pxUrl() && p.sym && p.qty > 0);
let PX_RUN = null;
/* se un aggiornamento è già in corso, chi lo richiede riceve lo stesso risultato invece di un errore */
function autoPrices(force) {
  if (!D || !pxUrl()) return Promise.resolve(null);
  if (PX_RUN) return PX_RUN;
  const withSym = D.invest.filter(p => p.sym);
  if (!withSym.length) return Promise.resolve({ n: 0, errs: [], report: [] });
  if (!force && Date.now() - (D.settings.pxLast || 0) < 3 * 3600e3) return Promise.resolve(null);
  PX_RUN = pxRun(withSym).then(async r => {
    // una volta al giorno completa lo storico con le chiusure di borsa, per grafici senza buchi
    if (r && (force || D.settings.pxHistAt !== today())) {
      try {
        const old = D.settings.pxHistOld, n = await pxHistory();
        if (n || D.settings.pxHistOld !== old) { redrawInvest(); const ae = document.activeElement; if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) refresh(); }
      } catch (e) { }
    }
    return r;
  }).finally(() => { PX_RUN = null; });
  return PX_RUN;
}
/* ---------- storico: i giorni in cui l'app non era aperta ----------
   Tra due valori registrati davvero, il valore segue l'andamento del prezzo di chiusura.
   I punti stimati hanno y: 1 e non sostituiscono mai un valore registrato. */
function closeOnOrBefore(points, d) { let c = null; for (const [pd, v] of points) { if (pd <= d) c = v; else break; } return c; }
async function pxHistory() {
  const t = today();
  const list = D.invest.filter(p => pxAuto(p) && (p.hist || []).some(h => !h.y));
  if (!list.length) return 0;
  const start = list.map(p => p.hist.find(h => !h.y).d).sort()[0];
  const days = dayDiff(start, t);
  const range = days <= 5 ? '5d' : days <= 28 ? '1mo' : days <= 88 ? '3mo' : days <= 180 ? '6mo' : days <= 360 ? '1y' : '2y';
  let j;
  try { j = await getJSON(pxEndpoint('/history', { s: Array.from(new Set(list.map(p => p.sym))).join(','), range }), 15000); }
  catch (e) { return 0; }
  if (!j || !j.history) { D.settings.pxHistOld = true; save({ undo: false }); return 0; } // ponte della versione precedente
  D.settings.pxHistOld = false;
  let n = 0;
  for (const p of list) {
    const h = j.history[p.sym];
    if (!h || !h.points || !h.points.length) continue;
    const real = p.hist.filter(x => !x.y), have = new Set(real.map(x => x.d)), add = [];
    for (const [d, c] of h.points) {
      if (d < real[0].d || d >= t || have.has(d)) continue;
      let prev = null;
      for (const x of real) { if (x.d <= d) prev = x; else break; }
      const ref = prev && closeOnOrBefore(h.points, prev.d);
      if (!ref) continue;
      add.push({ d, v: r2(prev.v * c / ref), i: prev.i, y: 1 });
    }
    p.hist = real.concat(add).sort((a, b) => a.d.localeCompare(b.d));
    n += add.length;
  }
  D.settings.pxHistAt = t;
  save({ undo: false });
  return n;
}
async function pxRun(withSym) {
  try {
    let j;
    try { j = await getJSON(pxEndpoint('', { s: Array.from(new Set(withSym.map(p => p.sym))).join(',') }), 12000); }
    catch (e) { throw new Error('il ponte non risponde (' + ((e && e.message) || e) + ')'); }
    if (!j || !j.quotes) throw new Error((j && j.error) || 'risposta del ponte non valida');
    let n = 0;
    const errs = [], report = [], t = today();
    for (const p of withSym) {
      const q = j.quotes[p.sym], it = { id: p.id, name: p.name, sym: p.sym, qty: p.qty || 0 };
      report.push(it);
      if (!q || !(q.price > 0)) { it.err = q && q.error && !/non trovato/i.test(q.error) ? 'Prezzo non ricevuto: ' + q.error : q && q.error ? 'Simbolo non trovato su Yahoo Finance' : 'Nessun prezzo ricevuto per questo simbolo'; errs.push(p.sym); continue; }
      let price = q.price, cur = String(q.currency || baseCur());
      Object.assign(it, { price: q.price, cur: q.currency || cur, time: q.time || null });
      if (cur === 'GBp' || cur === 'GBX') { price /= 100; cur = 'GBP'; }
      else if (cur === 'ZAc') { price /= 100; cur = 'ZAR'; }
      else if (cur === 'ILA') { price /= 100; cur = 'ILS'; }
      cur = cur.toUpperCase();
      let rate = 1;
      if (cur !== baseCur()) { const r = await fxRate(cur, baseCur(), t); if (!r) { it.err = `Prezzo ricevuto, ma il cambio ${cur} non è disponibile: riprova più tardi`; errs.push(p.sym); continue; } rate = r.rate; }
      it.unit = Math.round(price * rate * 1e6) / 1e6;
      if (!(p.qty > 0)) { it.warn = 'aggiungi il numero di quote per aggiornare il valore'; continue; }
      p.px = { price: q.price, cur: q.currency || cur, unit: it.unit, at: q.time || new Date().toISOString() };
      it.value = r2(p.qty * it.unit);
      invPoint(p, t, it.value, p.invested || 0);
      n++;
    }
    D.settings.pxLast = Date.now();
    D.settings.pxErr = errs.length ? 'Problemi con ' + errs.join(', ') + ': tocca Aggiorna ora per i dettagli.' : '';
    save({ undo: false });
    return { n, errs, report };
  } catch (e) {
    D.settings.pxErr = 'Prezzi non aggiornati: ' + ((e && e.message) || e);
    save({ undo: false });
    return null;
  } finally {
    redrawInvest();
    const ae = document.activeElement;
    if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) refresh();
  }
}
function pxSymField(st) {
  let h = `<label class="fld"><span>Simbolo per i prezzi automatici (facoltativo)</span><input data-in="set" data-f="sym" value="${esc(st.sym || '')}" placeholder="Es. VWCE.DE oppure ENEL.MI" autocapitalize="characters" autocomplete="off"></label>`;
  if (!pxUrl()) return h + '<p class="muted sm">Per aggiornare il valore da solo serve il ponte dei prezzi: <button class="link" data-a="pxSetupOpen">configuralo</button>.</p>';
  h += '<button class="link" data-a="pxFind">Trova il simbolo dal nome o dall\'ISIN</button>';
  if (st.findBusy) h += '<p class="muted sm">Cerco…</p>';
  else if (st.found) h += st.found.length ? `<div class="list px-found">${st.found.map(r => `<button class="row" data-a="pxPick" data-s="${esc(r.symbol)}"><span class="rt">${esc(r.symbol)}<small>${esc([r.name, r.exchange].filter(Boolean).join(', '))}</small></span>${st.sym === r.symbol ? ic('check', 18) : ''}</button>`).join('')}</div>` : '<p class="muted sm">Nessun risultato: prova con l\'ISIN o con un altro nome.</p>';
  return h + '<p class="muted sm">Con simbolo e numero di quote il valore si aggiorna da solo quando apri l\'app.</p>';
}
ACT.pxFind = async el => {
  const sh = sheetOf(el), st = sh.st, q = String(st.code || st.name || '').trim();
  if (!q) return toast("Scrivi prima il nome o l'ISIN");
  st.findBusy = true; drawSheet(sh);
  try { const j = await getJSON(pxEndpoint('/search', { q }), 10000); st.found = (j && j.results) || []; }
  catch (e) { st.found = null; toast('Il ponte non risponde'); }
  st.findBusy = false;
  if (sheetOpen(sh)) drawSheet(sh);
};
ACT.pxPick = el => { const sh = sheetOf(el); sh.st.sym = el.dataset.s; drawSheet(sh); };
function pxSection() {
  let h = fieldLabel('Prezzi automatici');
  if (!pxUrl()) return h + `<p class="muted sm">Collega il ponte gratuito e il valore di ETF e azioni si aggiorna da solo quando apri l'app.</p><button class="btn outline w gap-t" data-a="pxSetupOpen">Configura i prezzi automatici</button>`;
  const n = D.invest.filter(pxAuto).length, last = D.settings.pxLast ? new Date(D.settings.pxLast) : null;
  const miss = D.invest.filter(p => p.sym && !(p.qty > 0)).length;
  h += `<p class="muted sm">${n ? `${n} ${n === 1 ? 'investimento si aggiorna' : 'investimenti si aggiornano'} da soli.` : 'Aggiungi simbolo e quote a un investimento per aggiornarlo da solo.'}${miss ? ` ${miss} ${miss === 1 ? 'ha' : 'hanno'} il simbolo ma non le quote: aggiungile per aggiornare il valore.` : ''}${last ? ' Ultimo aggiornamento: ' + esc(last.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '.' : ''}</p>`;
  if (D.settings.pxErr) h += `<p class="warn-t">${esc(D.settings.pxErr)}</p>`;
  if (D.settings.pxHistOld) h += `<p class="muted sm">Per avere i grafici di settimana e mese completi anche nei giorni in cui non apri l'app, aggiorna il codice del ponte su Cloudflare: tocca <b>Configura</b>, copia il codice nuovo e incollalo nel Worker al posto del vecchio.</p>`;
  return h + '<div class="two-btn gap-t"><button class="btn dark" data-a="pxNow">Aggiorna ora</button><button class="btn outline" data-a="pxSetupOpen">Impostazioni</button></div>';
}
ACT.pxNow = async () => {
  toast('Aggiorno i prezzi…', null);
  document.body.classList.add('px-busy'); // i valori lasciano il posto a un segnaposto animato
  let r;
  try { r = await autoPrices(true); } finally { document.body.classList.remove('px-busy'); }
  openSheet('pxReport', { r, err: r ? '' : D.settings.pxErr });
};
SHEETS.pxReport = {
  cls: 'tall',
  render(st, sh) {
    const r = sh.props.r;
    let h = sheetHead('Verifica dei prezzi') + '<div class="sheet-body">';
    if (!r) return h + `<p class="warn-t">${esc(sh.props.err || 'Prezzi non aggiornati.')}</p><p class="muted sm gap-t">Controlla la connessione e riprova. Se il problema resta, apri nel browser ${esc(pxUrl().replace(/\/+$/, ''))}/?s=VWCE.DE e manda a chi ti aiuta quello che compare.</p></div>`;
    if (!r.report.length) return h + '<p class="muted">Nessun investimento ha un simbolo: aprine uno, tocca Modifica e usa «Trova il simbolo dal nome o dall\'ISIN».</p></div>';
    h += `<p class="lead sm">${r.n ? `Aggiornati ${r.n} ${r.n === 1 ? 'investimento' : 'investimenti'}.` : 'Nessun valore aggiornato.'}${r.errs.length ? ` ${r.errs.length} con problemi, spiegati qui sotto.` : ''}</p>`;
    h += `<div class="list">${r.report.map(x => {
      const okv = x.value != null, when = x.time ? new Date(x.time).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const det = x.err || [x.sym + ': ' + numStr(x.price, 4) + ' ' + (x.cur || ''), when ? 'prezzo del ' + when : '', x.unit != null && String(x.cur).toUpperCase() !== baseCur() ? 'una quota vale ' + eur(x.unit) : '', x.warn || (okv ? numStr(x.qty, 6) + ' quote' : '')].filter(Boolean).join(', ');
      return `<div class="row static"><span class="row-ic av-e">${okv ? '✅' : x.warn ? '🟡' : '⚠️'}</span><span class="rt">${esc(x.name)}<small class="wrap">${esc(det)}</small></span>${okv ? `<span class="rv num"><b>${eur(x.value)}</b></span>` : ''}</div>`;
    }).join('')}</div>`;
    return h + '<p class="foot-note">I prezzi arrivano da Yahoo Finance con circa 15 minuti di ritardo; a borsa chiusa vedi l\'ultimo prezzo di chiusura. Se un simbolo non viene trovato, apri l\'investimento, tocca Modifica e usa «Trova il simbolo dal nome o dall\'ISIN».</p></div>';
  }
};
SHEETS.pxSetup = {
  cls: 'tall',
  init: () => ({ url: pxUrl(), key: D.settings.pxKey || '', test: null, busy: false }),
  render(st) {
    let h = sheetHead('Prezzi automatici') + '<div class="sheet-body">';
    h += "<p class=\"lead sm\">Il ponte è un piccolo programma gratuito che metti sul tuo account Cloudflare: chiede i prezzi a Yahoo Finance e li passa all'app. Si configura una volta sola, meglio dal PC.</p>";
    h += fieldLabel('Crea il ponte') + `<ol class="steps">
      <li>Vai su <b>dash.cloudflare.com</b>, crea un account gratuito ed entra.</li>
      <li>Apri <b>Workers &amp; Pages</b>, tocca <b>Create</b> e scegli di partire da <b>Hello World</b>.</li>
      <li>Chiamalo <b>efu-prezzi</b> e tocca <b>Deploy</b>.</li>
      <li>Tocca <b>Edit code</b>, cancella tutto e incolla il codice del ponte: è nel file <b>ponte-prezzi.js</b> dentro lo zip, oppure lo copi con il pulsante qui sotto. Poi tocca <b>Deploy</b>.</li>
      <li>Copia l'indirizzo del Worker, del tipo <b>https://efu-prezzi.tuonome.workers.dev</b>, e incollalo qui sotto.</li></ol>`;
    h += `<button class="btn outline w gap-t" data-a="pxCopy">${ic('file', 18)} Copia il codice del ponte</button>`;
    h += fieldLabel("Collega l'app") + `<label class="fld"><span>Indirizzo del ponte</span><input data-in="set" data-f="url" value="${esc(st.url)}" placeholder="https://efu-prezzi.tuonome.workers.dev" inputmode="url" autocapitalize="off" autocomplete="off"></label>`;
    h += `<label class="fld"><span>Parola segreta (facoltativa)</span><input data-in="set" data-f="key" value="${esc(st.key)}" placeholder="Solo se l'hai impostata su Cloudflare" autocapitalize="off" autocomplete="off"></label>`;
    if (st.busy) h += '<p class="muted sm">Provo il collegamento…</p>';
    else if (st.test) h += `<p class="sm ${st.test.ok ? 'pos' : 'neg'}">${esc(st.test.msg)}</p>`;
    h += "<p class=\"foot-note\">I prezzi arrivano da Yahoo Finance attraverso un servizio non ufficiale: di solito hanno circa 15 minuti di ritardo e in futuro potrebbero smettere di funzionare. L'app li aggiorna al massimo ogni 3 ore, quando la apri. Al ponte arrivano solo i simboli dei titoli, nessun tuo dato.</p>";
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="pxTest">Prova e salva</button>${pxUrl() ? '<button class="link w later" data-a="pxOff">Scollega il ponte</button>' : ''}</footer>`;
  }
};
ACT.pxSetupOpen = () => openSheet('pxSetup', {});
ACT.pxCopy = async () => {
  try { await navigator.clipboard.writeText(PONTE_CODE); toast('Codice copiato: incollalo su Cloudflare', null); }
  catch (e) { toast('Non riesco a copiarlo: usa il file ponte-prezzi.js dello zip', null); }
};
ACT.pxTest = async el => {
  const sh = sheetOf(el), st = sh.st;
  let url = String(st.url || '').trim();
  if (!/^https:\/\/\S+$/i.test(url)) return toast("Incolla l'indirizzo completo, che inizia con https://");
  url = url.replace(/\/+$/, '');
  st.busy = true; st.test = null; drawSheet(sh);
  const prevU = D.settings.pxUrl, prevK = D.settings.pxKey;
  D.settings.pxUrl = url; D.settings.pxKey = String(st.key || '').trim() || null;
  let ok = false, msg = '';
  try {
    const j = await getJSON(pxEndpoint('', {}), 10000);
    if (j && j.ok && j.service) { ok = true; msg = 'Collegato: il ponte funziona.'; }
    else msg = j && j.error ? 'Il ponte risponde con un errore: ' + j.error : "A quell'indirizzo non trovo il ponte di EFU Budget.";
  } catch (e) { msg = "Non riesco a raggiungere il ponte: controlla l'indirizzo e la parola segreta."; }
  if (ok) {
    const sample = (D.invest.find(p => p.sym) || {}).sym || 'VWCE.DE';
    try {
      const j = await getJSON(pxEndpoint('', { s: sample }), 12000), q = j && j.quotes && j.quotes[sample];
      msg += q && q.price > 0 ? ` Prova: ${sample} vale ${numStr(q.price, 4)} ${q.currency || ''}.` : ` Però non ho ricevuto il prezzo di ${sample}${q && q.error ? ': ' + q.error : ''}.`;
    } catch (e) { }
  }
  if (!ok) { D.settings.pxUrl = prevU; D.settings.pxKey = prevK; }
  save({ undo: false });
  st.busy = false; st.test = { ok, msg };
  if (sheetOpen(sh)) drawSheet(sh);
  if (ok) autoPrices(true);
};
ACT.pxOff = el => { D.settings.pxUrl = ''; D.settings.pxKey = null; D.settings.pxErr = ''; save({ undo: false }); closeSheet(sheetOf(el)); redrawInvest(); toast('Ponte scollegato', null); };

/* ---------- piani di accumulo (PAC) ---------- */
function investAccount() {
  let a = D.accounts.find(x => x.kind === 'invest' && !x.archived);
  if (!a) { a = { id: 'inv-acc', name: 'Investimenti', emoji: '📈', kind: 'invest', initial: 0, initialDate: today(), archived: false }; D.accounts.push(a); }
  return a;
}
/* acquisto (amt > 0) o annullamento (amt < 0) alla data d: aggiorna capitale, valore, storico e quote */
function invBuy(p, d, amt, dq) {
  const hist = p.hist || (p.hist = []);
  let prev = null;
  for (const h of hist) { if (h.d <= d) prev = h; else break; }
  for (const h of hist) if (h.d > d) { h.v = r2(Math.max(0, h.v + amt)); h.i = r2(Math.max(0, h.i + amt)); }
  if (prev && prev.d === d) { prev.v = r2(Math.max(0, prev.v + amt)); prev.i = r2(Math.max(0, prev.i + amt)); }
  else { hist.push({ d, v: r2(Math.max(0, (prev ? prev.v : 0) + amt)), i: r2(Math.max(0, (prev ? prev.i : 0) + amt)) }); hist.sort((a, b) => a.d.localeCompare(b.d)); }
  p.invested = r2(Math.max(0, (p.invested || 0) + amt));
  if (dq == null) dq = p.qty > 0 && p.px && p.px.unit > 0 ? Math.round(amt / p.px.unit * 1e6) / 1e6 : 0;
  if (dq && p.qty > 0) p.qty = Math.max(0, Math.round((p.qty + dq) * 1e6) / 1e6);
  return { invId: p.id, amt, qty: dq };
}
function syncPAC() {
  if (!D || !D.fixed) return false;
  let ch = false;
  const t = today();
  for (const f of D.fixed) {
    if (!f.pac || f.paused) continue;
    const log = f.pac.log || (f.pac.log = {});
    for (const o of occurrences(f, trackStart(f), curMk())) {
      if (o.due > t || (f.pac.from && o.due < f.pac.from) || log[o.k] || (f.skipped || []).includes(o.k)) continue;
      const id = 'pac-' + f.id + '-' + o.k;
      if (!D.movements.some(m => m.id === id)) D.movements.push({ id, ts: dateOf(o.due).getTime(), type: 'transfer', date: o.due, amount: f.amount, accountId: f.accountId, toAccountId: investAccount().id, description: f.name, note: '', tags: [], fixedId: f.id, fixedKey: o.k, pacOf: f.id });
      log[o.k] = (f.pac.alloc || []).filter(a => a.amt > 0 && invById(a.invId)).map(a => invBuy(invById(a.invId), o.due, a.amt));
      ch = true;
    }
  }
  return ch;
}
function pacUndo(m) {
  const f = D.fixed.find(x => x.id === m.pacOf);
  if (!f || !f.pac) return;
  for (const e of ((f.pac.log || {})[m.fixedKey] || [])) { const p = invById(e.invId); if (p) invBuy(p, m.date, -e.amt, -(e.qty || 0)); }
  if (f.pac.log) delete f.pac.log[m.fixedKey];
  f.skipped = (f.skipped || []).concat(m.fixedKey);
}
function pacDropPos(invId) {
  for (const f of D.fixed) {
    if (!f.pac) continue;
    f.pac.alloc = (f.pac.alloc || []).filter(a => a.invId !== invId);
    f.amount = r2(f.pac.alloc.reduce((s, a) => s + a.amt, 0));
    if (!f.pac.alloc.length) f.paused = true;
  }
}
function pacNext(f) {
  const t = today(), o = occurrences(f, curMk(), addM(curMk(), 13)).find(x => x.due >= t && (!f.pac.from || x.due >= f.pac.from));
  return o ? o.due : null;
}
const pacFreqLabel = f => ({ 1: 'ogni mese', 2: 'ogni 2 mesi', 3: 'ogni 3 mesi' }[f.freq] || 'ogni ' + f.freq + ' mesi');
function pacSection() {
  const list = D.fixed.filter(f => f.pac);
  let h = fieldLabel('Piani di accumulo (PAC)');
  if (list.length) h += `<div class="list">${list.map(f => {
    const n = pacNext(f), from = acc(f.accountId);
    return `<button class="row" data-a="pacEdit" data-id="${f.id}"><span class="row-ic av-e">🔁</span><span class="rt">${esc(f.name)}<small>${esc((f.paused ? 'In pausa' : n ? 'Prossimo acquisto il ' + shortDate(n) : 'Nessun acquisto in programma') + (from ? ', da ' + from.name : ''))}</small></span><span class="rv num inv-rv"><b>${eur(f.amount)}</b><small>${pacFreqLabel(f)}</small></span></button>`;
  }).join('')}</div>`;
  else h += "<p class=\"muted sm\">Con un PAC l'app sposta i soldi dal conto agli investimenti alla data giusta e aggiorna da sola quanto hai investito.</p>";
  return h + `<button class="btn outline w gap-t" data-a="pacNew">${ic('plus', 18)} Nuovo PAC</button>`;
}
function invViewExtra(p) {
  let h = '';
  for (const f of D.fixed.filter(x => x.pac && !x.paused)) { const a = (f.pac.alloc || []).find(x => x.invId === p.id); if (a) h += `<p class="muted sm">🔁 Nel ${esc(f.name)}: ${eur(a.amt)} ${pacFreqLabel(f)}.</p>`; }
  if (p.sym) h += `<p class="muted sm">${pxAuto(p) ? 'Prezzo automatico' : 'Simbolo'}: ${esc(p.sym)}${p.px ? `, ultimo prezzo ${esc(numStr(p.px.price, 4))} ${esc(p.px.cur || '')}` : ''}.</p>`;
  return h;
}
SHEETS.pac = {
  cls: 'tall',
  init(p) {
    const f = p.id ? D.fixed.find(x => x.id === p.id) : null, alloc = {};
    if (f) for (const a of (f.pac.alloc || [])) alloc[a.invId] = numStr(a.amt);
    const first = f ? (pacNext(f) || dayIn(f.start, f.day)) : addM(curMk(), 1) + '-01';
    return { id: f ? f.id : null, name: f ? f.name : 'PAC', accountId: f ? f.accountId : ((liquidAccounts().find(a => a.kind === 'bank') || liquidAccounts()[0] || {}).id || null), freq: String(f ? f.freq : 1), first, alloc, paused: f ? !!f.paused : false };
  },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica PAC' : 'Nuovo PAC') + '<div class="sheet-body">';
    h += '<p class="lead sm">Alla data di ogni acquisto i soldi escono dal conto scelto e vengono aggiunti agli investimenti indicati: non devi registrare niente.</p>';
    h += `<label class="fld"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. PAC Trade Republic" autocomplete="off"></label>`;
    h += fieldLabel('Preleva dal conto') + `<div class="chips wrap">${liquidAccounts().filter(a => !isCredit(a)).map(a => `<button class="chip ${st.accountId === a.id ? 'on' : ''}" data-a="pick" data-f="accountId" data-v="${a.id}">${esc(a.emoji || '🏦')} ${esc(a.name)}</button>`).join('')}</div>`;
    h += fieldLabel('Ogni quanto') + `<div class="chips wrap">${[['1', 'Ogni mese'], ['2', 'Ogni 2 mesi'], ['3', 'Ogni 3 mesi']].map(([v, l]) => `<button class="chip ${String(st.freq) === v ? 'on' : ''}" data-a="pick" data-f="freq" data-v="${v}">${l}</button>`).join('')}</div>`;
    h += `<label class="fld gap-t"><span>${st.id ? 'Prossimo acquisto' : 'Primo acquisto'}</span><input type="date" value="${esc(st.first)}" data-ch="date" data-f="first"></label>`;
    h += fieldLabel('Quanto in ogni titolo');
    if (!D.invest.length) h += '<p class="muted sm">Prima aggiungi almeno un investimento.</p>';
    else h += D.invest.map(p => `<label class="fld"><span>${esc(invKind(p.kind)[2] + ' ' + p.name)}</span><input inputmode="decimal" data-in="pacAmt" data-id="${p.id}" value="${esc(st.alloc[p.id] || '')}" placeholder="0,00"></label>`).join('');
    h += `<button class="link" data-a="invNew">+ Aggiungi un altro titolo</button><p class="pac-tot">${esc(pacTotText(st))}</p>`;
    if (st.id) h += swRow('In pausa', 'paused', st.paused, 'Finché è in pausa non viene fatto nessun acquisto.');
    h += "<p class=\"muted sm gap-t\">Gli acquisti prima di questa data non vengono aggiunti: se ne hai già fatti, sono compresi in quanto hai investito. Se cancelli un acquisto dai movimenti, l'app lo toglie anche dall'investimento.</p>";
    if (st.id) h += '<div class="danger-z"><button class="link danger" data-a="pacDelete">Elimina PAC</button></div>';
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="pacSave">${st.id ? 'Salva modifiche' : 'Crea PAC'}</button></footer>`;
  }
};
function pacTotText(st) {
  const tot = Object.values(st.alloc).reduce((s, v) => s + (strToNum(v) || 0), 0);
  return `Totale ${eur(tot)} ${{ 1: 'al mese', 2: 'ogni 2 mesi', 3: 'ogni 3 mesi' }[String(st.freq)] || ''}`;
}
INP.pacAmt = el => { const sh = sheetOf(el); sh.st.alloc[el.dataset.id] = el.value; const t = $('.pac-tot', sheetEl(sh)); if (t) t.textContent = pacTotText(sh.st); };
ACT.pacNew = () => openSheet('pac', {});
ACT.pacEdit = el => openSheet('pac', { id: el.dataset.id });
ACT.pacSave = el => {
  const sh = sheetOf(el), st = sh.st;
  const alloc = Object.entries(st.alloc).map(([invId, v]) => ({ invId, amt: r2(strToNum(v) || 0) })).filter(a => a.amt > 0 && invById(a.invId));
  if (!alloc.length) return toast('Scrivi quanto investire in almeno un titolo');
  if (!acc(st.accountId)) return toast('Scegli il conto da cui prelevare');
  if (!st.first) return toast('Scegli la data del primo acquisto');
  const start = mk(st.first), day = Number(st.first.slice(8)), freq = Number(st.freq) || 1;
  let f = st.id ? D.fixed.find(x => x.id === st.id) : null;
  const isNew = !f;
  if (!f) { f = { id: uid(), skipped: [], created: today(), pac: { alloc: [], log: {} } }; D.fixed.push(f); }
  const moved = isNew || f.start !== start || f.day !== day || Number(f.freq) !== freq;
  Object.assign(f, { name: st.name.trim() || 'PAC', type: 'transfer', amount: r2(alloc.reduce((s, a) => s + a.amt, 0)), variable: false, accountId: st.accountId, toAccountId: investAccount().id, freq, start, day, note: '', paused: !!st.paused, count: null, end: null, auto: true });
  delete f.categoryId;
  f.pac.alloc = alloc;
  if (moved) { f.trackFrom = start; f.pac.from = st.first; }
  save(); closeSheet(sh); redrawInvest(); refresh();
  toast(isNew ? 'PAC creato' : 'PAC aggiornato');
};
ACT.pacDelete = el => {
  const sh = sheetOf(el), f = D.fixed.find(x => x.id === sh.st.id);
  if (!f) return;
  confirmBox(`Eliminare «${f.name}»?`, 'Gli acquisti già fatti restano negli investimenti e nei movimenti.', 'Elimina', () => {
    D.fixed = D.fixed.filter(x => x !== f);
    save(); closeSheet(sh); redrawInvest(); refresh(); toast('PAC eliminato');
  });
};
{
  const fxEdit0 = ACT.fxEdit;
  ACT.fxEdit = el => { const f = D.fixed.find(x => x.id === el.dataset.id); if (f && f.pac) return openSheet('pac', { id: f.id }); fxEdit0(el); };
}
function demoPac(d, bankId) {
  if (!d.invest || d.invest.length < 2) return;
  if (!d.accounts.some(a => a.kind === 'invest')) d.accounts.push({ id: 'inv-acc', name: 'Investimenti', emoji: '📈', kind: 'invest', initial: 0, initialDate: today(), archived: false });
  const k = addM(curMk(), 1);
  d.fixed.push({ id: uid(), skipped: [], created: today(), trackFrom: k, name: 'PAC mensile', type: 'transfer', amount: 200, variable: false, accountId: bankId, toAccountId: 'inv-acc', freq: 1, start: k, day: 5, note: '', paused: false, count: null, end: null, auto: true, pac: { alloc: [{ invId: d.invest[0].id, amt: 150 }, { invId: d.invest[1].id, amt: 50 }], log: {}, from: k + '-05' } });
}

/* ---------- interessi sulla liquidità ---------- */
function intPeriod(i, date) {
  if (i.freq === 12) return date.slice(0, 4);
  if (i.freq === 3) return date.slice(0, 4) + '-Q' + (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1);
  return date.slice(0, 7);
}
function intRange(i, key) {
  if (i.freq === 12) return [key + '-01-01', key + '-12-31', dayIn((Number(key) + 1) + '-01', i.day)];
  if (i.freq === 3) { const k1 = key.slice(0, 4) + '-' + pad((Number(key.slice(6)) - 1) * 3 + 1), k3 = addM(k1, 2); return [k1 + '-01', endOf(k3), dayIn(addM(k3, 1), i.day)]; }
  return [key + '-01', endOf(key), dayIn(addM(key, 1), i.day)];
}
function intGross(a, from, to, excludeId) {
  const i = a.interest, deltas = {};
  let bal = balancesAt(addDays(from, -1))[a.id] || 0, sum = 0;
  for (const m of D.movements) {
    if (m.date < from || m.date > to || m.id === excludeId || (a.initialDate && m.date < a.initialDate)) continue;
    for (const [id, d] of effects(m)) if (id === a.id) deltas[m.date] = (deltas[m.date] || 0) + d;
  }
  if (a.initialDate && a.initialDate >= from && a.initialDate <= to && a.initial) deltas[a.initialDate] = (deltas[a.initialDate] || 0) + a.initial;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    bal += deltas[d] || 0;
    const b = i.cap ? Math.min(bal, i.cap) : bal;
    if (b > 0) sum += b * i.rate / 100 / 365;
  }
  return sum;
}
function interestCat() {
  let c = D.categories.find(x => !x.archived && x.type === 'in' && x.name === 'Interessi');
  if (!c) { c = newCategory('Interessi', 'in', 0, '💶'); D.categories.push(c); }
  return c;
}
const hasInterest = a => !!(a && a.interest && a.interest.rate > 0 && !a.archived && a.kind !== 'goal' && a.kind !== 'card' && a.kind !== 'invest');
function syncInterest() {
  if (!D || !D.accounts) return false;
  let ch = false;
  const t = today();
  for (const a of D.accounts) {
    if (!hasInterest(a)) continue;
    const i = a.interest, start = [i.from || t, a.initialDate || i.from || t].sort().pop();
    for (let key = intPeriod(i, start), guard = 0; guard < 400; key = intPeriod(i, addDays(intRange(i, key)[1], 1)), guard++) {
      const [p0, p1, pay] = intRange(i, key);
      if (pay > t) break;
      if ((i.skip || []).includes(key)) continue;
      const id = 'int-' + a.id + '-' + key, cur = D.movements.find(m => m.id === id);
      if (cur && cur.manual) continue;
      const from = p0 < start ? start : p0, net = r2(intGross(a, from, p1, id) * (1 - (i.tax || 0) / 100));
      if (net >= 0.01) {
        const want = { type: 'in', date: pay, amount: net, accountId: a.id, categoryId: interestCat().id, description: 'Interessi ' + a.name, note: `Tasso ${numStr(i.rate, 3)}% lordo${i.tax ? ', tasse ' + numStr(i.tax, 2) + '%' : ''}, dal ${shortDate(from)} al ${shortDate(p1)}`, interestOf: a.id, period: key, tags: [] };
        if (!cur) { D.movements.push(Object.assign({ id, ts: dateOf(pay).getTime() }, want)); ch = true; invalidate(); }
        else if (Math.abs(cur.amount - net) > 0.004 || cur.date !== pay || cur.accountId !== a.id) { Object.assign(cur, want); ch = true; invalidate(); }
      } else if (cur) { D.movements = D.movements.filter(m => m !== cur); ch = true; invalidate(); }
    }
  }
  return ch;
}
function interestNow(a) {
  const i = a.interest, t = today(), start = [i.from || t, a.initialDate || t].sort().pop();
  const key = intPeriod(i, t), [p0, p1, pay] = intRange(i, key), from = p0 < start ? start : p0;
  const gross = from <= t ? intGross(a, from, t < p1 ? t : p1) : 0;
  return { gross: r2(gross), net: r2(gross * (1 - (i.tax || 0) / 100)), pay };
}
function applyInterestSettings(a, st) {
  if (st.kind !== 'card' && st.intOn) {
    const prev = a.interest || {};
    const next = { rate: strToNum(st.intRate), freq: Number(st.intFreq) || 1, day: parseInt(st.intDay, 10) || 1, tax: strToNum(st.intTax) || 0, cap: strToNum(st.intCap) > 0 ? strToNum(st.intCap) : null, from: prev.from || today(), skip: prev.skip || [] };
    if (a.interest && ['rate', 'freq', 'day', 'tax', 'cap'].some(k => (prev[k] || null) !== (next[k] || null))) for (const m of D.movements) if (m.interestOf === a.id) m.manual = true;
    a.interest = next;
  } else if (a.interest) a.interest = null;
}
{
  const S = SHEETS.account, init0 = S.init, render0 = S.render, save0 = ACT.accSave;
  S.init = p => {
    const st = init0(p), a = p.id ? acc(p.id) : null, i = a && a.interest;
    return Object.assign(st, { intOn: !!(i && i.rate > 0), intRate: i ? numStr(i.rate, 3) : '', intFreq: String(i ? i.freq : 1), intDay: String(i ? i.day : 1), intTax: i ? numStr(i.tax || 0, 2) : '26', intCap: i && i.cap ? numStr(i.cap) : '' });
  };
  S.render = (st, sh) => {
    const h = render0(st, sh);
    if (st.kind === 'card') return h;
    let c = swRow('Interessi sulla liquidità', 'intOn', st.intOn, "Per i conti che remunerano il saldo, come Trade Republic: calcolo gli interessi giorno per giorno e li accredito da solo.");
    if (st.intOn) {
      c += `<div class="two-fld"><label class="fld"><span>Tasso annuo lordo %</span><input inputmode="decimal" data-in="set" data-f="intRate" value="${esc(st.intRate)}" placeholder="Es. 2,25"></label><label class="fld"><span>Tasse sugli interessi %</span><input inputmode="decimal" data-in="set" data-f="intTax" value="${esc(st.intTax)}" placeholder="26"></label></div>`;
      c += fieldLabel('Accredito') + `<div class="chips wrap">${[['1', 'Ogni mese'], ['3', 'Ogni 3 mesi'], ['12', 'Ogni anno']].map(([v, l]) => `<button class="chip ${st.intFreq === v ? 'on' : ''}" data-a="pick" data-f="intFreq" data-v="${v}">${l}</button>`).join('')}</div>`;
      c += `<div class="two-fld gap-t"><label class="fld"><span>Giorno di accredito</span><input inputmode="numeric" data-in="set" data-f="intDay" value="${esc(st.intDay)}" placeholder="1"></label><label class="fld"><span>Interessi fino a € (facoltativo)</span><input inputmode="decimal" data-in="set" data-f="intCap" value="${esc(st.intCap)}" placeholder="Es. 50000"></label></div>`;
      c += "<p class=\"muted sm\">Gli interessi del periodo vengono accreditati il giorno indicato del mese successivo, al netto delle tasse. In Italia sugli interessi si paga il 26%: se la banca te li accredita lordi, scrivi 0.</p>";
      const a = st.id && acc(st.id);
      if (a && hasInterest(a)) { const n = interestNow(a); c += `<div class="cc-now"><span>Maturati finora in questo periodo: <b class="num">${eur(n.gross)}</b> lordi, <b class="num">${eur(n.net)}</b> netti</span><span>Accredito il ${esc(shortDate(n.pay))}</span></div>`; }
    }
    const i = h.indexOf('<div class="danger-z">') >= 0 ? h.indexOf('<div class="danger-z">') : h.lastIndexOf('</div><footer');
    return h.slice(0, i) + c + h.slice(i);
  };
  ACT.accSave = el => {
    const st = sheetOf(el).st;
    if (st.kind !== 'card' && st.intOn) {
      const r = strToNum(st.intRate), tx = strToNum(st.intTax || '0'), d = parseInt(st.intDay, 10);
      if (!(r > 0 && r < 100)) return toast('Scrivi il tasso annuo, per esempio 2,25');
      if (!(tx >= 0 && tx < 100)) return toast('Le tasse vanno da 0 a 99%');
      if (!(d >= 1 && d <= 31)) return toast('Il giorno di accredito va da 1 a 31');
    }
    save0(el);
  };
}

const invFresh = p => pxAuto(p) && dayDiff(invLast(p).d, today()) < 3;

