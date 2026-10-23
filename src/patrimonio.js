/* =========================================================
   Patrimonio netto
   Conti e contanti + salvadanai + investimenti − debito delle carte
   ± crediti e debiti con le persone, a una data e mese per mese.
   ========================================================= */
function personBalanceAt(pid, d) {
  let b = 0;
  for (const m of D.movements) {
    if (m.date > d) continue;
    if (m.type === 'out' && m.split) {
      if (!m.paidBy) b += (m.split.shares && m.split.shares[pid]) || 0;
      else if (m.paidBy === pid) b -= m.split.mine;
    } else if (m.type === 'settle' && m.personId === pid) b += m.dir === 'in' ? -m.amount : m.amount;
  }
  return b;
}
// valore degli investimenti a una data: l'ultimo valore noto di ogni posizione
function invValueAt(d) {
  let v = 0;
  for (const p of D.invest) {
    let last = null;
    for (const h of (p.hist || [])) { if (h.d <= d) last = h; else break; }
    if (last) v += last.v;
    else if (!(p.hist || []).length && (p.created || '0000') <= d) v += p.invested || 0;
  }
  return v;
}
function nwAt(d) {
  const b = balancesAt(d);
  let cash = 0, cards = 0, goalsV = 0, invAcc = 0;
  for (const a of D.accounts) {
    if (a.archived) continue;
    const v = b[a.id] || 0;
    if (a.kind === 'goal') goalsV += v;
    else if (a.kind === 'invest') invAcc += v;
    else if (a.kind === 'card') cards += v;
    else cash += v;
  }
  // con le posizioni registrate conta il loro valore; il conto «Investimenti» ne rispecchia solo i versamenti
  const inv = D.invest.length ? invValueAt(d) : invAcc;
  const ppl = (D.people || []).reduce((s, p) => s + personBalanceAt(p.id, d), 0);
  const r = { cash: r2(cash), cards: r2(cards), goals: r2(goalsV), inv: r2(inv), ppl: r2(ppl) };
  r.tot = r2(r.cash + r.cards + r.goals + r.inv + r.ppl);
  return r;
}
// primo mese con dati: il più vecchio tra movimenti e saldi iniziali dei conti
function nwStartMk() {
  let d = today();
  for (const m of D.movements) if (m.date < d) d = m.date;
  for (const a of D.accounts) if (a.initialDate && a.initialDate < d) d = a.initialDate;
  for (const p of D.invest) for (const h of (p.hist || []).slice(0, 1)) if (h.d < d) d = h.d;
  return mk(d);
}
// valori a fine mese (per il mese in corso: oggi) degli n mesi che finiscono con k
function nwSeries(k, n = 12) {
  return memo('nw' + k + ':' + n, () => {
    const ck = curMk(), start = nwStartMk(), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const m = addM(k, -i);
      if (m < start || m > ck) continue;
      const d = m === ck ? today() : endOf(m);
      out.push(Object.assign({ k: m, d }, nwAt(d)));
    }
    return out;
  });
}
const nwMonth = k => MESI[Number(k.slice(5)) - 1];
function nwChart(ser, h = 120, labels = true) {
  if (ser.length < 2) return '<p class="muted sm">Il grafico compare dal secondo mese con dei movimenti.</p>';
  const W = 340, H = h, pt = 10, pb = labels ? 20 : 6, px = 6;
  const vals = ser.map(s => s.tot);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.05 || 1; lo -= pad; hi += pad;
  const X = i => (px + i / (ser.length - 1) * (W - 2 * px)).toFixed(1), Y = v => (pt + (hi - v) / (hi - lo) * (H - pt - pb)).toFixed(1);
  const line = ser.map((s, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(s.tot)).join(' ');
  const area = line + ` L${X(ser.length - 1)} ${H - pb} L${X(0)} ${H - pb} Z`;
  const last = ser[ser.length - 1];
  let s = `<svg class="chart nw-ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Patrimonio netto a fine mese, da ${nwMonth(ser[0].k)} a ${nwMonth(last.k)}: da ${esc(eur(ser[0].tot))} a ${esc(eur(last.tot))}">`;
  s += `<path d="${area}" style="fill:var(--accent);opacity:.08"/>`;
  if (lo < 0 && hi > 0) s += `<line class="zero" x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  s += `<path class="ln" d="${line}"/>`;
  ser.forEach((p, i) => { s += `<circle class="dot" cx="${X(i)}" cy="${Y(p.tot)}" r="${i === ser.length - 1 ? 4 : 2.5}"/>`; });
  if (labels) {
    s += `<text class="ax" x="${X(0)}" y="${H - 4}">${MESI_S[Number(ser[0].k.slice(5)) - 1]} ${ser[0].k.slice(2, 4)}</text>`;
    s += `<text class="ax" x="${X(ser.length - 1)}" y="${H - 4}" text-anchor="end">${MESI_S[Number(last.k.slice(5)) - 1]} ${last.k.slice(2, 4)}</text>`;
  }
  return s + '</svg>';
}
function nwParts(v) {
  return [['🏦', 'Conti e contanti', v.cash], ['🐷', 'Salvadanai', v.goals], ['📈', 'Investimenti', v.inv], ['💳', v.cards < 0 ? 'Debito delle carte' : 'Carte', v.cards], ['👥', v.ppl >= 0 ? 'Ti devono' : 'Devi ad altri', v.ppl]]
    .filter(p => Math.abs(p[2]) >= 0.005);
}
const nwDeltaHTML = (a, b, k) => {
  if (!a) return '';
  const d = r2(b.tot - a.tot);
  return `<span class="inv-g ${d >= 0 ? 'pos' : 'neg'}"><b class="num">${eur(d, { sign: true })}</b><small>rispetto a fine ${nwMonth(a.k).toLowerCase()}</small></span>`;
};
// sezione nelle Statistiche del mese
function nwBlock(k) {
  const ser = nwSeries(k), cur = ser[ser.length - 1];
  if (!cur) return '';
  const prev = ser.length > 1 ? ser[ser.length - 2] : null;
  return section('Patrimonio netto', `<button class="inv-card nw-card" data-a="nwOpen" data-k="${k}"><span class="inv-top"><span><span class="muted sm">${k === curMk() ? 'Oggi' : 'A fine ' + nwMonth(k).toLowerCase()}</span><b class="num nw-v">${eur(cur.tot)}</b></span>${nwDeltaHTML(prev, cur, k)}</span>${nwChart(ser, 110)}<span class="nw-parts">${nwParts(cur).map(p => `<span>${p[0]} ${p[1]} <b class="num">${eur(p[2])}</b></span>`).join('')}</span></button>`);
}
// sezione nelle Statistiche dell'anno
function nwYearBlock(y) {
  const ck = curMk(), endK = y + '-12' < ck ? y + '-12' : ck;
  if (endK < y + '-01') return '';
  const ser = nwSeries(endK, Number(endK.slice(5))).filter(s => s.k.startsWith(y));
  if (!ser.length) return '';
  const first = nwSeries(y + '-01', 2), before = first.length === 2 ? first[0] : null;
  const cur = ser[ser.length - 1];
  const delta = before ? `<span class="inv-g ${cur.tot - before.tot >= 0 ? 'pos' : 'neg'}"><b class="num">${eur(r2(cur.tot - before.tot), { sign: true })}</b><small>da inizio ${y}</small></span>` : '';
  return section('Patrimonio netto', `<button class="inv-card nw-card" data-a="nwOpen" data-k="${endK}"><span class="inv-top"><span><span class="muted sm">${endK === ck ? 'Oggi' : 'A fine ' + y}</span><b class="num nw-v">${eur(cur.tot)}</b></span>${delta}</span>${nwChart(ser, 110)}</button>`);
}
// riga nella Home, sotto il disponibile: solo se aggiunge qualcosa (salvadanai, investimenti, carte, persone)
// in Home: una sola riga col patrimonio; salvadanai e investimenti sono nel dettaglio
function wealthBlock() {
  const v = nwAt(today()), gs = goals(), bal = balancesAt(today()), parts = [];
  if (gs.length) parts.push(`<span>Salvadanai <b class="num">${eur(sum(gs.map(g => bal[g.id] || 0)))}</b></span>`);
  if (D.invest.length) { const t = invTotals(); parts.push(`<span>Investimenti <b class="num">${eur(t.v)}</b> <small class="${t.g >= 0 ? 'pos' : 'neg'}">${t.g >= 0 ? '+' : '−'}${eur(Math.abs(t.g))}</small></span>`); }
  return section('Patrimonio', `<button class="nw-tile" data-a="nwOpen" data-k="${curMk()}"><span class="nw-tl"><span class="muted sm">Patrimonio netto</span><b class="num nw-tv">${eur(v.tot)}</b><span class="nw-tp">${parts.length ? parts.join('') : '<span>Qui trovi salvadanai e investimenti</span>'}</span>${invDue() ? '<span class="inv-due">Investimenti da aggiornare</span>' : ''}</span>${ic('right', 18)}</button>`);
}
ACT.nwOpen = el => openSheet('netWorth', { k: (el && el.dataset.k) || curMk() });
SHEETS.netWorth = {
  cls: 'tall',
  render(st, sh) {
    const k = sh.props.k, ser = nwSeries(k, 13), cur = ser[ser.length - 1];
    let h = sheetHead('Patrimonio netto');
    h += '<div class="sheet-body">';
    if (!cur) return h + '<p class="muted">Ancora nessun dato.</p></div>';
    const show = ser.slice(-12), prev = ser.length > 1 ? ser[ser.length - 2] : null;
    h += `<div class="nw-top"><p class="muted sm">${k === curMk() ? 'Oggi' : 'A fine ' + nwMonth(k).toLowerCase() + ' ' + k.slice(0, 4)}</p><p class="hero-n">${bigAmount(cur.tot)}</p><p>${nwDeltaHTML(prev, cur, k)}</p></div>`;
    h += nwChart(show, 160);
    if (k === curMk()) h += goalsBlock(balancesAt(today())) + investBlock();
    h += section('Com\'è composto', `<div class="list">${nwParts(cur).map(p => `<div class="row static"><span class="row-ic av-e">${p[0]}</span><span class="rt">${p[1]}</span><b class="num ${p[2] < 0 ? 'neg' : ''}">${eur(p[2])}</b></div>`).join('')}</div>`);
    h += section('Mese per mese', `<div class="list nw-table">${show.slice().reverse().map((s, i, a) => { const p = a[i + 1]; const d = p ? r2(s.tot - p.tot) : null; return `<div class="row static"><span class="rt">${nwMonth(s.k)} ${s.k.slice(0, 4)}${s.k === curMk() ? '<small>fino a oggi</small>' : ''}</span><span class="nw-tr"><b class="num">${eur(s.tot)}</b>${d == null ? '' : `<small class="${d >= 0 ? 'pos' : 'neg'}">${eur(d, { sign: true })}</small>`}</span></div>`; }).join('')}</div>`);
    h += `<p class="muted sm gap-t">Somma di conti e contanti, salvadanai e valore degli investimenti, meno il debito delle carte di credito, più o meno quello che tu e le persone vi dovete. Per gli investimenti conta l'ultimo valore noto a quella data.</p>`;
    return h + '</div>';
  }
};

