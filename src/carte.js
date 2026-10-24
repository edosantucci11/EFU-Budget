/* =========================================================
   Carte di credito
   Ciclo contabile, addebito automatico sul conto, riquadro in Home.
   ========================================================= */

/* ---------- carte di credito: ciclo contabile e addebito automatico ---------- */
const isCredit = a => !!a && !a.archived && a.kind === 'card' && !!a.credit && a.closeDay >= 1 && a.payDay >= 1 && !!a.payFrom && a.payFrom !== a.id;
const dayIn = (k, d) => k + '-' + pad(Math.min(Number(d), dim(k)));
const cardClose = (a, k) => dayIn(k, a.closeDay);
function cardDebitDate(a, k) { const c = cardClose(a, k); let d = dayIn(k, a.payDay); if (d <= c) d = dayIn(addM(k, 1), a.payDay); return d; }
const cardCycle = (a, date) => { const k = mk(date); return date <= cardClose(a, k) ? k : addM(k, 1); };
/* quanto è stato speso con la carta nel ciclo che chiude nel mese k, al netto di rimborsi e pagamenti fatti a mano */
function cardSpent(a, k) {
  const from = cardClose(a, addM(k, -1)), to = cardClose(a, k);
  let t = 0;
  for (const m of D.movements) {
    if (m.cardDebit === a.id || m.date <= from || m.date > to) continue;
    for (const [id, d] of effects(m)) if (id === a.id) t -= d;
  }
  return r2(t);
}
const cardDebitId = (a, k) => 'cd-' + a.id + '-' + k;
function syncCardDebits() {
  if (!D || !D.accounts) return false;
  let changed = false;
  const t = today();
  for (const a of D.accounts) {
    if (!isCredit(a)) continue;
    const from = a.autoFrom || t, last = cardCycle(a, t);
    for (let k = addM(cardCycle(a, from), -1); k <= last; k = addM(k, 1)) {
      const dd = cardDebitDate(a, k);
      if (dd < from || dd > t || (a.skipDebits || []).includes(k)) continue;
      const id = cardDebitId(a, k), cur = D.movements.find(m => m.id === id);
      if (cur && cur.manual) continue;
      const amt = cardSpent(a, k);
      if (amt > 0.004) {
        const want = { type: 'transfer', date: dd, amount: amt, accountId: a.payFrom, toAccountId: a.id, description: 'Addebito ' + a.name, note: 'Estratto chiuso il ' + shortDate(cardClose(a, k)), cardDebit: a.id, cycle: k, tags: [] };
        if (!cur) { D.movements.push(Object.assign({ id, ts: dateOf(dd).getTime() }, want)); changed = true; }
        else if (cur.amount !== amt || cur.accountId !== a.payFrom || cur.date !== dd || cur.description !== want.description) { Object.assign(cur, want); changed = true; }
      } else if (cur) { D.movements = D.movements.filter(m => m !== cur); changed = true; }
    }
  }
  return changed;
}
function cardNext(a, t = today()) {
  const k = cardCycle(a, t), pk = addM(k, -1), nk = cardDebitDate(a, pk) > t ? pk : k;
  return { k, spent: cardSpent(a, k), nk, amt: cardSpent(a, nk), date: cardDebitDate(a, nk) };
}
function cardsBlock() {
  const cards = D.accounts.filter(isCredit);
  if (!cards.length) return '';
  return section(cards.length === 1 ? 'Carta di credito' : 'Carte di credito', `<div class="cclist">${cards.map(a => {
    const n = cardNext(a), from = acc(a.payFrom);
    return `<button class="ccard" data-a="accEdit" data-id="${a.id}">${avatar(a.emoji || '💳')}<span class="cc-m"><b>${esc(a.name)}</b><span>Speso in questo ciclo <b class="num">${eur(n.spent)}</b>, chiude il ${esc(shortDate(cardClose(a, n.k)))}</span><span>${n.amt > 0.004 ? `Addebito di <b class="num">${eur(n.amt)}</b> il ${esc(shortDate(n.date))}${from ? ' su ' + esc(from.name) : ''}` : 'Nessun addebito in arrivo'}</span></span></button>`;
  }).join('')}</div>`);
}
function cardExample(st) {
  const c = parseInt(st.closeDay, 10), p = parseInt(st.payDay, 10);
  if (!(c >= 1 && c <= 31 && p >= 1 && p <= 31)) return 'Esempio: con chiusura il 15 e addebito il 10, le spese fino al 15 settembre vengono scalate il 10 ottobre; quelle dal 16 settembre passano al ciclo dopo.';
  const f = { closeDay: c, payDay: p }, k = mk(today()), cd = cardClose(f, k);
  return `Le spese fino al ${shortDate(cd)} verranno scalate il ${shortDate(cardDebitDate(f, k))}; quelle dal ${shortDate(addDays(cd, 1))} passano al ciclo successivo. Ci penso io in automatico.`;
}
function applyCardSettings(a, st) {
  if (st.kind === 'card' && st.credit) {
    const was = isCredit(a);
    Object.assign(a, { credit: true, closeDay: parseInt(st.closeDay, 10), payDay: parseInt(st.payDay, 10), payFrom: st.payFrom });
    if (!was || !a.autoFrom) a.autoFrom = today();
  } else if (a.credit) a.credit = false;
}
{
  const S = SHEETS.account, init0 = S.init, render0 = S.render, save0 = ACT.accSave;
  S.init = p => {
    const st = init0(p), a = p.id ? acc(p.id) : null, others = liquidAccounts().filter(x => (!a || x.id !== a.id) && x.kind !== 'card');
    const def = (a && a.payFrom) || ((others.find(x => x.kind === 'bank') || others[0] || {}).id) || null;
    return Object.assign(st, { credit: !!(a && a.credit), closeDay: a && a.closeDay ? String(a.closeDay) : '', payDay: a && a.payDay ? String(a.payDay) : '', payFrom: def });
  };
  S.render = (st, sh) => {
    const h = render0(st, sh);
    if (st.kind !== 'card') return h;
    let c = swRow('Carta di credito con addebito mensile', 'credit', st.credit, 'Le spese si accumulano e una volta al mese il totale viene scalato da un altro conto.');
    if (st.credit) {
      const others = liquidAccounts().filter(x => x.id !== st.id && x.kind !== 'card');
      c += `<div class="two-fld"><label class="fld"><span>Giorno di chiusura</span><input inputmode="numeric" data-in="set" data-f="closeDay" value="${esc(st.closeDay)}" placeholder="Es. 15"></label><label class="fld"><span>Giorno di addebito</span><input inputmode="numeric" data-in="set" data-f="payDay" value="${esc(st.payDay)}" placeholder="Es. 10"></label></div>`;
      c += fieldLabel('Addebitata sul conto') + (others.length ? `<div class="chips wrap">${others.map(x => `<button class="chip ${st.payFrom === x.id ? 'on' : ''}" data-a="pick" data-f="payFrom" data-v="${x.id}">${esc(x.emoji || '🏦')} ${esc(x.name)}</button>`).join('')}</div>` : '<p class="muted sm">Aggiungi prima il conto corrente da cui viene addebitata.</p>');
      c += `<p class="muted sm gap-t">${esc(cardExample(st))}</p>`;
      const a = st.id && acc(st.id);
      if (a && isCredit(a)) { const n = cardNext(a); c += `<div class="cc-now"><span>Ciclo in corso: <b class="num">${eur(n.spent)}</b>, chiude il ${esc(shortDate(cardClose(a, n.k)))}</span><span>Prossimo addebito: <b class="num">${eur(n.amt)}</b> il ${esc(shortDate(n.date))}</span></div>`; }
    }
    const i = h.indexOf('<div class="danger-z">') >= 0 ? h.indexOf('<div class="danger-z">') : h.lastIndexOf('</div><footer');
    return h.slice(0, i) + c + h.slice(i);
  };
  ACT.accSave = el => {
    const st = sheetOf(el).st;
    if (st.kind === 'card' && st.credit) {
      const c = parseInt(st.closeDay, 10), p = parseInt(st.payDay, 10);
      if (!(c >= 1 && c <= 31)) return toast('Scrivi il giorno di chiusura, da 1 a 31');
      if (!(p >= 1 && p <= 31)) return toast('Scrivi il giorno di addebito, da 1 a 31');
      if (!st.payFrom || !acc(st.payFrom) || st.payFrom === st.id) return toast('Scegli il conto da cui viene addebitata');
    }
    save0(el);
  };
}

