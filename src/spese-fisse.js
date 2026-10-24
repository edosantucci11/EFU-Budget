/* =========================================================
   Spese fisse mese per mese
   Registrare in anticipo, saltare, ripristinare; totali del mese;
   addebiti della carta di credito nel mese.
   ========================================================= */
function fixedMonthRows(k) {
  const done = new Map();
  for (const m of D.movements) { if (m.fixedId) done.set(m.fixedId + '|' + m.fixedKey, m); if (m.sinkOf) done.set('S' + m.sinkOf + '|' + m.sinkKey, m); }
  const rows = [];
  for (const f of D.fixed) {
    for (const o of occurrences(f, k, k)) {
      if (o.k < trackStart(f) || (f.pac && f.pac.from && o.due < f.pac.from)) continue;
      rows.push({ f, k: o.k, due: o.due, m: done.get(f.id + '|' + o.k), skipped: (f.skipped || []).includes(o.k), sink: false });
    }
    for (const s of sinkOccurrences(f, k)) if (s.k === k) rows.push({ f, k, due: s.due, m: done.get('S' + f.id + '|' + k), skipped: (f.sinkSkipped || []).includes(k), sink: true, amt: s.amt });
  }
  return rows.sort((a, b) => a.due.localeCompare(b.due) || a.f.name.localeCompare(b.f.name));
}
const fxRowType = r => (r.sink ? 'save' : r.f.type === 'in' ? 'in' : r.f.type === 'out' ? 'out' : 'save');
const fxRowAmt = r => (r.m ? r.m.amount : r.sink ? r.amt : estimateAmount(r.f));
function fxMonthRow(r) {
  const f = r.f, t = today(), ty = fxRowType(r), amt = fxRowAmt(r), approx = !r.m && !r.sink && f.variable;
  const tg = r.sink ? null : fixedTarget(f), title = r.sink ? 'Quota per ' + f.name : f.name;
  const em = r.sink ? '🗓️' : f.pac ? '🔁' : (tg && tg.emoji) || '📌';
  let st = '', act = '';
  if (r.m) st = `<span class="st ok">${ic('check', 14)} Registrata il ${esc(shortDate(r.m.date))}</span>`;
  else if (r.skipped) { st = '<span class="st">Saltata</span>'; act = `<button class="link sm" data-a="fxUnskip" data-id="${f.id}" data-k="${r.k}" data-s="${r.sink ? 1 : 0}">Ripristina</button>`; }
  else if (f.pac) st = `<span class="st">Acquisto automatico il ${esc(shortDate(r.due))}</span>`;
  else {
    const late = r.due < t, fut = r.due > t;
    st = `<span class="st${late ? ' late' : ''}">${late ? 'Scaduta il ' + esc(shortDate(r.due)) : fut ? 'Scade il ' + esc(shortDate(r.due)) : 'Scade oggi'}</span>`;
    const reg = r.sink ? 'sinkDo' : 'fxConfirm', skip = r.sink ? 'sinkSkip' : 'fxSkip';
    act = `<button class="link sm" data-a="${skip}" data-id="${f.id}" data-k="${r.k}">Salta</button><button class="btn dark sm" data-a="${reg}" data-id="${f.id}" data-k="${r.k}">${fut ? 'Registra ora' : r.sink ? 'Metti da parte' : f.variable ? 'Inserisci importo' : 'Registra'}</button>`;
  }
  const tap = r.m ? `data-a="fxMovOpen" data-id="${r.m.id}"` : `data-a="fxEdit" data-id="${f.id}"`;
  const val = ty === 'in' ? eur(amt, { sign: true }) : ty === 'out' ? eur(-amt) : eur(amt);
  return `<div class="fxm${r.skipped ? ' dim' : ''}"><button class="fxm-top" ${tap}>${avatar(em, tg && tg.color)}<span class="fxm-t"><b>${esc(title)}</b>${st}</span><b class="num fxm-v ${ty === 'in' ? 'pos' : ty === 'out' ? 'out' : ''}">${approx ? '≈ ' : ''}${val}</b></button>${act ? `<div class="fxm-act">${act}</div>` : ''}</div>`;
}
function fxTotals(rows, k) {
  const t = today(), s = { in: 0, out: 0, save: 0, fund: 0, leftOut: 0, leftIn: 0, done: 0, n: 0 };
  for (const r of rows) {
    if (r.skipped) continue;
    const ty = fxRowType(r), a = fxRowAmt(r);
    s[ty] += a; s.n++;
    if (ty === 'out' && r.f.sink) s.fund += a;
    if (r.m) s.done++;
    else if (ty === 'out' || ty === 'save') s.leftOut += a;
    else s.leftIn += a;
  }
  const avg = { in: 0, out: 0, save: 0 };
  for (const f of D.fixed) {
    if (f.paused || fixedEnded(f)) continue;
    const a = estimateAmount(f) / (Number(f.freq) || 1), ty = f.type === 'in' ? 'in' : f.type === 'out' ? 'out' : 'save';
    avg[ty] += a;
  }
  const diff = s.in - (s.out - s.fund) - s.save, mn = monthName(k).toLowerCase(), row = (l, v, cls = '') => `<div class="r ${cls}"><span>${l}</span><b class="num">${v}</b></div>`;
  let h = `<div class="fx-tot"><p class="fx-tot-h">Totale di ${esc(mn)}</p>`;
  h += row('Entrate fisse', eur(s.in, { sign: true }), 'pos') + row('Uscite fisse', eur(-s.out), 'out');
  if (s.fund > 0.004) h += `<p class="muted sm fx-note2">di cui ${eur(s.fund)} pagati con gli accantonamenti</p>`;
  if (s.save > 0.004) h += row('Risparmi, accantonamenti e PAC', eur(-s.save));
  h += row('Differenza', eur(diff, { sign: true }), 'sum ' + (diff >= 0 ? 'pos' : 'neg'));
  h += `<p class="muted sm">Registrate ${s.done} su ${s.n}${s.leftOut > 0.004 ? `, ancora da pagare ${eur(s.leftOut)}` : ''}${s.leftIn > 0.004 ? `, da incassare ${eur(s.leftIn)}` : ''}.</p>`;
  h += `<p class="muted sm">In media al mese, contando anche le voci non mensili: entrate ${eur(avg.in)}, uscite ${eur(avg.out)}${avg.save > 0.004 ? `, risparmi ${eur(avg.save)}` : ''}.</p>`;
  return h + '</div>';
}
/* addebiti delle carte di credito che cadono nel mese k: già registrati, in arrivo o del ciclo ancora aperto */
function cardDebitRows(k) {
  const t = today(), rows = [];
  for (const a of D.accounts.filter(isCredit)) {
    for (const cyc of [addM(k, -1), k]) {
      const dd = cardDebitDate(a, cyc);
      if (mk(dd) !== k || dd < (a.autoFrom || t) || (a.skipDebits || []).includes(cyc)) continue;
      const m = D.movements.find(x => x.id === cardDebitId(a, cyc)), amt = m ? m.amount : cardSpent(a, cyc);
      const running = t > cardClose(a, addM(cyc, -1)) && t <= cardClose(a, cyc);
      if (!m && !(amt > 0.004) && !running) continue;
      rows.push({ a, cyc, dd, close: cardClose(a, cyc), m, amt });
    }
  }
  return rows.sort((x, y) => x.dd.localeCompare(y.dd) || x.a.name.localeCompare(y.a.name));
}
function cardDebitRow(r) {
  const t = today(), from = acc(r.m ? r.m.accountId : r.a.payFrom), su = from ? ' su ' + esc(from.name) : '', open = !r.m && t <= r.close;
  let st;
  if (r.m) st = `<span class="st ok">${ic('check', 14)} Addebitato il ${esc(shortDate(r.m.date))}${su}${r.m.manual ? ', importo corretto a mano' : ''}</span>`;
  else if (open) st = `<span class="st">Speso finora: il ciclo chiude il ${esc(shortDate(r.close))}, addebito il ${esc(shortDate(r.dd))}${su}</span>`;
  else st = `<span class="st">Estratto chiuso il ${esc(shortDate(r.close))}, addebito il ${esc(shortDate(r.dd))}${su}</span>`;
  const tap = r.m ? `data-a="fxMovOpen" data-id="${r.m.id}"` : `data-a="accEdit" data-id="${r.a.id}"`;
  return `<div class="fxm"><button class="fxm-top" ${tap}>${avatar(r.a.emoji || '💳')}<span class="fxm-t"><b>Addebito ${esc(r.a.name)}</b>${st}</span><b class="num fxm-v out">${open ? '≈ ' : ''}${eur(-r.amt)}</b></button></div>`;
}
function cardDebitSection(k) {
  const rows = cardDebitRows(k);
  if (!rows.length) return '';
  const n = new Set(rows.map(r => r.a.id)).size;
  return section(n === 1 ? 'Addebito della carta di credito' : 'Addebiti delle carte di credito', `<div class="fxlist">${rows.map(cardDebitRow).join('')}</div><p class="muted sm gap-t">Non entra nei totali delle voci fisse: le spese con la carta sono già contate il giorno in cui le fai. Qui vedi quando e quanto uscirà dal conto.</p>`);
}
function planFixed() {
  const k = UI.month, ck = curMk();
  if (!D.fixed.length) return D.accounts.some(isCredit) ? `<div class="msw-row">${monthSwitcher()}</div>` + cardDebitSection(k) + planFixedOld() : planFixedOld();
  const rows = fixedMonthRows(k);
  let h = `<div class="msw-row">${monthSwitcher()}</div>`;
  if (k === ck) {
    const older = pendingFixed(ck).filter(p => p.k < ck && !p.f.auto);
    if (older.length) h += `<button class="notice" data-a="fxMonthGo" data-k="${older[0].k}">${ic('repeat', 20)}<div><b>${older.length === 1 ? 'Una voce' : older.length + ' voci'} di mesi precedenti da registrare</b><span>Tocca per andare a ${esc(monthName(older[0].k).toLowerCase())}.</span></div></button>`;
  }
  if (k > ck) h += '<p class="muted sm">Se paghi qualcosa in anticipo, tocca <b>Registra ora</b>: la registro con la data di oggi e non te la chiedo più quando arriva la scadenza.</p>';
  h += section('Voci del mese', rows.length ? `<div class="fxlist">${rows.map(fxMonthRow).join('')}</div>${fxTotals(rows, k)}` : '<p class="muted">Nessuna voce fissa in questo mese.</p>');
  h += cardDebitSection(k);
  const active = D.fixed.filter(f => !fixedEnded(f)), ended = D.fixed.filter(fixedEnded);
  active.sort((a, b) => { const x = nextOcc(a), y = nextOcc(b); return (x ? x.due : '9').localeCompare(y ? y.due : '9'); });
  h += section('Tutte le voci fisse', `<div class="mlist">${active.map(fixedRow).join('')}</div><button class="btn outline w gap-t" data-a="fxNew">${ic('plus', 18)} Nuova voce fissa</button>`, null, 'Tocca una voce per modificarla, metterla in pausa o eliminarla.');
  if (ended.length) h += section('Concluse', `<div class="mlist dim">${ended.map(fixedRow).join('')}</div>`);
  if (active.some(f => !f.paused && !f.auto)) h += `<button class="btn outline w gap-t" data-a="fxIcs">${ic('calendar', 18)} Promemoria nel calendario</button><p class="muted sm">Crea un file con le scadenze dei prossimi 12 mesi, con un avviso alle 9 del giorno: aprilo con Calendario.</p>`;
  return h;
}
/* ---------- scadenze delle voci fisse in un file .ics per il calendario ---------- */
function fixedIcs() {
  const ck = curMk(), to = addM(ck, 11), t = today(), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EFU Budget//Scadenze//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:EFU Budget'];
  const e = s => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const d8 = s => s.replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  let n = 0;
  for (const f of D.fixed) {
    if (f.paused || f.auto || fixedEnded(f)) continue;
    const amt = estimateAmount(f), what = f.type === 'in' ? 'Entrata' : f.type === 'transfer' ? 'Trasferimento' : 'Spesa';
    for (const o of occurrences(f, ck, to)) {
      if (o.due < t) continue;
      L.push('BEGIN:VEVENT', 'UID:' + f.id + '-' + o.k + '@efu-budget', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d8(o.due), 'DTEND;VALUE=DATE:' + d8(addDays(o.due, 1)),
        'SUMMARY:' + e(f.name + ' · ' + (f.variable ? 'circa ' : '') + eur(amt)), 'DESCRIPTION:' + e(what + ' fissa di EFU Budget. Quando arriva registrala dall\'app.'), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(f.name), 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
      n++;
    }
  }
  L.push('END:VCALENDAR');
  return { text: L.join('\r\n') + '\r\n', n };
}
ACT.fxIcs = () => {
  const { text, n } = fixedIcs();
  if (!n) return toast('Nessuna scadenza nei prossimi 12 mesi.', null);
  openSheet('fileReady', { blob: new Blob([text], { type: 'text/calendar' }), name: 'EFU_scadenze.ics', kind: 'ics', hint: `${n} scadenze. Nel menu scegli <b>Calendario</b>, oppure salva il file su File e aprilo: l'iPhone propone di aggiungerle. Se cambi le voci fisse, crea un file nuovo.` });
};
ACT.fxMovOpen = el => openSheet('mov', { id: el.dataset.id });
ACT.fxMonthGo = el => { UI.month = el.dataset.k; refresh(); };
ACT.fxUnskip = el => {
  const f = D.fixed.find(x => x.id === el.dataset.id), k = el.dataset.k;
  if (!f) return;
  if (el.dataset.s === '1') f.sinkSkipped = (f.sinkSkipped || []).filter(x => x !== k);
  else f.skipped = (f.skipped || []).filter(x => x !== k);
  save(); refresh(); toast('Voce ripristinata');
};

