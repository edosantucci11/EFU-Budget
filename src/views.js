/* =========================================================
   Schermate principali
   ========================================================= */
function bigAmount(n) {
  if (HIDE) return `<span class="big num">••••<span class="big-d"> ${esc(baseSym())}</span></span>`;
  const v = r2(n), [i, d] = NF2.format(Math.abs(v)).split(',');
  return `<span class="big num">${v < 0 ? '−' : ''}${i}<span class="big-d">,${d} ${esc(baseSym())}</span></span>`;
}
function monthSwitcher() {
  return `<div class="msw"><button class="icon-btn sm" data-a="month" data-d="-1" aria-label="Mese precedente">${ic('left', 18)}</button><button class="msw-l" data-a="pickMonth" aria-label="Scegli il mese">${monthName(UI.month)}</button><button class="icon-btn sm" data-a="month" data-d="1" aria-label="Mese successivo">${ic('right', 18)}</button></div>`;
}
function section(title, body, link, sub) {
  return `<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2>${link ? `<button class="lnk" data-a="${link.a}" ${link.attrs || ''}>${esc(link.label)}</button>` : ''}</div>${sub ? `<p class="sec-s">${sub}</p>` : ''}${body}</section>`;
}
function bar(p, color) {
  const cls = p > 1.00001 ? 'over' : p >= 0.8 && p < 0.99999 ? 'near' : '';
  return `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(1, p)) * 100}%;${cls ? '' : 'background:' + color}"></i></div>`;
}
function progress(p, color) {
  return `<div class="bar ${p >= 1 ? 'done' : ''}"><i style="width:${Math.max(0, Math.min(1, p || 0)) * 100}%;${p >= 1 ? '' : 'background:' + (color || 'var(--accent)')}"></i></div>`;
}
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

/* ---------- HOME ---------- */
VIEWS.home = () => {
  const k = UI.month, ck = curMk(), isCur = k === ck;
  const bal = balancesAt(isCur ? today() : endOf(k));
  const avail = sum(liquidAccounts().map(a => bal[a.id]));
  const gs = goals(), inGoals = sum(gs.map(a => bal[a.id]));
  const ms = monthStats(k);
  const mName = MESI[Number(k.slice(5)) - 1];
  let h = `<header class="ph home-h">${monthSwitcher()}<span class="h-acts"><button class="icon-btn" data-a="hideToggle" aria-label="${HIDE ? 'Mostra gli importi' : 'Nascondi gli importi'}">${ic(HIDE ? 'eyeOff' : 'eye', 22)}</button><button class="icon-btn" data-a="settings" aria-label="Impostazioni">${ic('settings', 22)}</button></span></header>`;
  h += notices();
  h += `<section class="hero">
    <p class="hero-l">${isCur ? 'Disponibile oggi' : k < ck ? 'Disponibile a fine ' + mName : 'Disponibile con i movimenti già inseriti'}</p>
    <p class="hero-n">${bigAmount(avail)}</p>
    ${heroSub(gs.length, inGoals)}
    ${isCur && homeOn('forecast') ? summaryRow() : ''}
    ${isCur && homeOn('nw') ? nwHomeLink() : ''}
    ${homeOn('pills') ? accountPills(bal) : ''}
    ${homeOn('strip') ? spendStrip(ms) : ''}
    ${homeOn('kpis') ? `<div class="kpis">
      <div class="kpi"><span>Entrate</span><b class="num pos">${eur(ms.inc)}</b></div>
      <div class="kpi"><span>Uscite</span><b class="num out">${eur(ms.out)}</b></div>
      <div class="kpi"><span>Risultato</span><b class="num">${eur(ms.net, { sign: true })}</b></div>
    </div>` : ''}
    ${ms.rate != null && homeOn('kpis') ? `<p class="hero-rate">${ms.rate >= 0 ? 'Hai risparmiato il ' + pct(ms.rate) + ' delle entrate' : 'Hai speso più di quanto è entrato'}${ms.saved > 0 ? ', e messo ' + eur(ms.saved) + ' nei salvadanai' : ''}.</p>` : ''}
  </section>`;
  const ctx = { k, isCur, bal, gs, ms };
  h += homeOrder(isCur).map(id => { const b = HOME_BLOCKS.find(x => x[0] === id); return b ? b[2](ctx) : ''; }).join('');
  h += backupReminder();
  return h;
};
/* ---------- Home: sezioni da mostrare e loro ordine ---------- */
const HOME_HERO = [['forecast', 'Previsione e spesa al giorno'], ['pills', 'Saldi dei conti'], ['nw', 'Patrimonio netto'], ['strip', 'Spese per categoria'], ['kpis', 'Entrate, uscite e risultato']];
const HOME_BLOCKS = [
  ['alerts', 'Avvisi su budget e scadenze', c => c.isCur ? alertsBlock() : ''],
  ['pending', 'Voci fisse da registrare', c => c.isCur ? pendingBlock() : ''],
  ['inbox', 'Pagamenti Apple Pay da controllare', c => c.isCur ? inboxBlock() : ''],
  ['cards', 'Carta di credito', c => c.isCur ? cardsBlock() : ''],
  ['budget', 'Budget del mese', c => budgetBlock(c.k)],
  ['goals', 'Salvadanai', c => c.gs.length || c.isCur ? goalsBlock(c.bal) : ''],
  ['invest', 'Investimenti', c => c.isCur ? investBlock() : ''],
  ['recap', 'Il mese in breve', c => c.ms.n ? recapCard(c.k) : ''],
  ['recent', 'Ultimi movimenti', c => recentBlock(c.k)],
];
const homeOn = id => !((D.settings.homeOff || []).includes(id));
function homeSaved() {
  const all = HOME_BLOCKS.map(b => b[0]), o = (D.settings.homeOrder || []).filter(id => all.includes(id));
  all.forEach((id, i) => { if (!o.includes(id)) { const prev = all.slice(0, i).reverse().find(x => o.includes(x)); o.splice(prev ? o.indexOf(prev) + 1 : 0, 0, id); } });
  return o;
}
function homeUrgent() {
  const t = today(), u = [];
  if (alerts().length || pendingFixed(curMk()).some(p => p.due < t)) u.push('alerts');
  if (pendingFixed(curMk()).some(p => p.due <= t && !p.f.auto)) u.push('pending');
  if ((D.inbox || []).length) u.push('inbox');
  return u;
}
function homeOrder(isCur) {
  let o = homeSaved().filter(homeOn);
  if (isCur && D.settings.homeUrgent !== false) { const u = homeUrgent().filter(homeOn); o = u.concat(o.filter(id => !u.includes(id))); }
  return o;
}
ACT.homeTog = el => {
  const id = el.dataset.k, off = new Set(D.settings.homeOff || []);
  if (off.has(id)) off.delete(id); else off.add(id);
  D.settings.homeOff = Array.from(off);
  save({ undo: false }); drawSheet(sheetOf(el)); render();
};
ACT.homeMove = el => {
  const o = homeSaved(), i = o.indexOf(el.dataset.k), j = i + Number(el.dataset.d);
  if (i < 0 || j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]];
  D.settings.homeOrder = o;
  hap();
  save({ undo: false }); drawSheet(sheetOf(el)); render();
  const b = $(`#sheets .sheet-wrap:last-child [data-a="homeMove"][data-k="${el.dataset.k}"][data-d="${el.dataset.d}"]`); if (b && !b.disabled) b.focus();
};
ACT.homeUrgentTog = el => { D.settings.homeUrgent = D.settings.homeUrgent === false; save({ undo: false }); drawSheet(sheetOf(el)); render(); };
ACT.homeReset = el => { delete D.settings.homeOrder; delete D.settings.homeOff; delete D.settings.homeUrgent; save({ undo: false }); drawSheet(sheetOf(el)); render(); toast('Home come all\'inizio', null); };
const homeSw = (id, on, label) => `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Mostra ${esc(label)}" data-a="homeTog" data-k="${id}"></button>`;
/* ---------- numero sull'icona dell'app: voci fisse scadute o di oggi, pagamenti da controllare ---------- */
const badgeOk = () => 'setAppBadge' in navigator;
function badgeCount() { const t = today(); return pendingFixed(curMk()).filter(p => p.due <= t && !p.f.auto).length + (D.inbox || []).length; }
function updateBadge() {
  if (!D || !badgeOk()) return;
  try {
    if (!D.settings.badge) { navigator.clearAppBadge().catch(() => { }); return; }
    const n = badgeCount();
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => { });
  } catch (e) { }
}
function badgeRowHTML() {
  const sub = badgeOk() ? 'Quante voci fisse sono scadute o da registrare oggi, più i pagamenti Apple Pay da controllare. Si aggiorna ogni volta che apri l\'app.' : 'Funziona con l\'app installata sulla schermata Home e iOS 16.4 o successivo.';
  return swRow("Numero sull'icona", 'badge', !!D.settings.badge, sub, 'badgeTog');
}
ACT.badgeTog = async el => {
  const sh = sheetOf(el);
  if (D.settings.badge) { D.settings.badge = false; save({ undo: false }); updateBadge(); drawSheet(sh); return; }
  if (!badgeOk()) return toast("Qui non è disponibile: apri l'app dalla sua icona sulla schermata Home (iOS 16.4 o successivo).", null);
  // su iPhone il numero sull'icona richiede il permesso per le notifiche: l'app non ne invia
  try { if (window.Notification && Notification.permission !== 'granted') await Notification.requestPermission(); } catch (e) { }
  if (window.Notification && Notification.permission === 'denied') return toast("Permesso negato: riattivalo in Impostazioni dell'iPhone, Notifiche, EFU Budget.", null);
  D.settings.badge = true; save({ undo: false }); updateBadge(); drawSheet(sh);
  toast("Fatto: l'app non manda notifiche, mostra solo il numero sull'icona", null);
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') updateBadge(); });
function notices() {
  let h = '';
  if (!STORAGE_OK) h += `<div class="notice warn">${ic('alert', 20)}<div><b>I dati non vengono salvati</b><span>Questo browser blocca il salvataggio. Esporta un backup prima di chiudere.</span></div></div>`;
  if (D.settings.demo) h += `<div class="notice demo">${ic('info', 20)}<div><b>Stai guardando dati di esempio</b><span>Esplora pure: quando vuoi, cancellali e inizia con i tuoi.</span></div><button class="btn dark sm" data-a="demoExit">Inizia</button></div>`;
  if (IS_PACKAGE && !isStandalone() && !D.settings.installHintClosed && /iPhone|iPad|iPod/.test(navigator.userAgent)) h += `<div class="notice">${ic('share', 20)}<div><b>Installa EFU Budget sul telefono</b><span>Tocca i tre puntini accanto all'indirizzo, poi Condividi e «Aggiungi alla schermata Home», con «Apri come app web» attivo. Si aprirà a schermo intero e funzionerà anche offline.</span></div><button class="icon-btn ghost sm" data-a="installClose" aria-label="Chiudi">${ic('close', 18)}</button></div>`;
  return h;
}
function accountPills(bal) {
  const la = liquidAccounts();
  if (la.length < 2) return '';
  return `<div class="accgrid">${la.map(a => `<button class="acc-tile" data-a="accSum" data-id="${a.id}" aria-label="Riepilogo di ${esc(a.name)}, ${esc(eur(bal[a.id]))}"><span class="pe" aria-hidden="true">${esc(a.emoji || '🏦')}</span><span class="acc-t"><span class="acc-n">${esc(a.name)}</span><b class="num ${bal[a.id] < 0 ? 'neg' : ''}">${eur(bal[a.id])}</b></span></button>`).join('')}</div>`;
}
function spendParts(ms, type = 'out') {
  return Object.entries(ms.byCat).map(([id, v]) => ({ c: cat(id), v })).filter(p => p.c && p.c.type === type && p.v > 0).sort((a, b) => b.v - a.v);
}
function spendStrip(ms) {
  const parts = spendParts(ms), tot = sum(parts.map(p => p.v));
  if (!(tot > 0)) return '';
  return `<div class="strip" role="img" aria-label="${esc('Uscite per categoria: ' + parts.slice(0, 4).map(p => p.c.name + ' ' + pct(p.v / tot)).join(', ') + (parts.length > 4 ? ' e altre ' + (parts.length - 4) : ''))}">${parts.map(p => `<i style="flex-grow:${p.v};background:${p.c.color}" title="${esc(p.c.name)}"></i>`).join('')}</div>
  <div class="strip-l">${parts.slice(0, 3).map(p => `<span><i style="background:${p.c.color}"></i>${esc(p.c.name)} ${pct(p.v / tot)}</span>`).join('')}${parts.length > 3 ? `<span class="muted">e altre ${parts.length - 3}</span>` : ''}</div>`;
}
/* riassunto sotto il disponibile: come finisce il mese e quanto si può spendere al giorno */
function dailyInfo() {
  const ck = curMk(), t = today(), left = dim(ck) - Number(t.slice(8)) + 1;
  const cs = activeCats('out').filter(c => c.budget > 0);
  if (cs.length) {
    const ms = monthStats(ck), rest = r2(sum(cs.map(c => c.budget)) - sum(cs.map(c => ms.byCat[c.id] || 0)));
    if (rest < 0) return { v: 'Superato', cls: 'neg', s: 'di ' + eur0(-rest) + ' questo mese', p: 'budget' };
    return { v: '≈ ' + eur0(rest / left), cls: '', s: 'restano ' + eur0(rest) + ' in ' + left + (left === 1 ? ' giorno' : ' giorni'), p: 'budget' };
  }
  const end = forecast().end;
  return { v: '≈ ' + eur0(Math.max(0, end) / left), cls: end < 0 ? 'neg' : '', s: 'per finire il mese sopra zero', p: 'fixed' };
}
function summaryRow() {
  const f = forecast(), d = dailyInfo();
  return `<div class="sumrow"><button class="sum-c" data-a="planGo" data-p="fixed"><span>A fine mese</span><b class="num ${f.end < 0 ? 'neg' : ''}">${eur(f.end)}</b><small>${f.count ? `con ${f.count} ${f.count === 1 ? 'voce fissa' : 'voci fisse'} da registrare` : 'voci fisse tutte registrate'}</small></button><button class="sum-c" data-a="planGo" data-p="${d.p}"><span>${d.p === 'budget' ? 'Budget al giorno' : 'Al giorno'}</span><b class="num ${d.cls}">${d.v}</b><small>${d.s}</small></button></div>`;
}
function alertsBlock() {
  const al = alerts(), t = today();
  const late = pendingFixed(curMk()).filter(p => p.due < t);
  if (!al.length && !late.length) return '';
  const n = al.length + (late.length ? 1 : 0);
  if (n > 1) {
    // più avvisi: un solo riquadro, che si apre con un tocco
    const over = al.filter(a => a.kind === 'over').length, kinds = [];
    if (late.length) kinds.push(late.length === 1 ? '1 voce fissa scaduta' : late.length + ' voci fisse scadute');
    if (over) kinds.push(over === 1 ? '1 budget superato' : over + ' budget superati');
    if (al.length - over) kinds.push((al.length - over) === 1 ? '1 budget quasi finito' : (al.length - over) + ' budget quasi finiti');
    let h = `<div class="alerts"><button class="alert ${over || late.length ? 'over' : 'near'} al-sum" data-a="alertsTog" aria-expanded="${!!UI.alertsOpen}">${ic('alert', 20)}<span class="al-t"><b>${n} cose da sistemare</b><small>${esc(cap(kinds.join(', ')))}</small></span>${ic(UI.alertsOpen ? 'up' : 'down', 18)}</button>`;
    if (UI.alertsOpen) h += `<div class="al-list">${alertItems(al, late)}</div>`;
    return h + '</div>';
  }
  return '<div class="alerts">' + alertItems(al, late) + '</div>';
}
ACT.alertsTog = () => { UI.alertsOpen = !UI.alertsOpen; hap(); render(); };
function alertItems(al, late) {
  let h = '';
  if (late.length) h += `<button class="alert late" data-a="planGo" data-p="fixed">${ic('repeat', 20)}<span>${late.length === 1 ? `«${esc(late[0].f.name)}» è scaduta e non è ancora registrata` : `${late.length} voci fisse scadute da registrare`}</span></button>`;
  for (const a of al) h += `<button class="alert ${a.kind}" data-a="catEdit" data-id="${a.c.id}">${ic('alert', 20)}<span>${a.kind === 'over' ? `${esc(a.c.name)}: budget superato di ${eur(a.s - a.c.budget)}` : `${esc(a.c.name)}: hai già usato il ${pct(a.p)} del budget`}</span></button>`;
  return h;
}
function pendingCard(p) {
  if (p.sink) return sinkCard(p);
  const f = p.f, t = fixedTarget(f), now = today();
  const late = p.due < now, isToday = p.due === now;
  const status = late ? `Scaduta il ${shortDate(p.due)}` : isToday ? 'Scade oggi' : `Scade ${relDays(p.due)}, il ${shortDate(p.due)}`;
  const amt = estimateAmount(f);
  const sign = f.type === 'in' ? 1 : f.type === 'out' ? -1 : 0;
  return `<div class="pcard"><div class="pc-top">${avatar(t ? t.emoji : '🔁', t ? t.color : null)}<div class="pc-t"><b>${esc(f.name)}</b><span class="${late ? 'neg' : isToday ? 'acc' : 'muted'}">${status}${f.count ? `, rata ${p.n} di ${f.count}` : ''}</span></div><b class="num ${sign > 0 ? 'pos' : sign < 0 ? 'out' : ''}">${f.variable ? '≈ ' : ''}${sign ? eur(sign * amt, { sign: sign > 0 }) : eur(amt)}</b></div>
  <div class="pc-act"><button class="link sm" data-a="fxSkip" data-id="${f.id}" data-k="${p.k}">Salta questo mese</button><button class="btn dark sm" data-a="fxConfirm" data-id="${f.id}" data-k="${p.k}">${f.variable ? 'Inserisci importo' : 'Registra'}</button></div></div>`;
}
function pendingBlock() {
  const lim = addDays(today(), 7);
  const list = pendingFixed(curMk()).filter(p => p.due <= lim && !p.f.auto);
  if (!list.length) return '';
  return section('Da registrare', `<div class="pcards">${list.slice(0, 4).map(pendingCard).join('')}</div>`, { label: 'Tutte le voci fisse', a: 'planGo', attrs: 'data-p="fixed"' });
}
function budgetRow(c, s) {
  const p = c.budget > 0 ? s / c.budget : 0, left = r2(c.budget - s);
  return `<button class="brow" data-a="catEdit" data-id="${c.id}">${avatar(c.emoji, c.color)}<span class="brow-m"><span class="brow-t"><span class="nm">${esc(c.name)}</span><span class="num">${eur(s)} <small>di ${eur0(c.budget)}</small></span></span>${bar(p, c.color)}<span class="brow-s ${left < -0.005 ? 'neg' : p >= 0.8 && left > 0.005 ? 'warn' : 'muted'}">${left > 0.005 ? 'Restano ' + eur(left) : left < -0.005 ? 'Superato di ' + eur(-left) : 'Budget raggiunto'}</span></span></button>`;
}
function budgetBlock(k) {
  const ms = monthStats(k), cs = activeCats('out').filter(c => c.budget > 0);
  if (!cs.length) return section('Budget del mese', `<button class="empty-row" data-a="planGo" data-p="budget">${ic('plus', 18)} Imposta un budget mensile per le categorie di spesa</button>`);
  const tb = sum(cs.map(c => c.budget)), ts = sum(cs.map(c => ms.byCat[c.id] || 0));
  const rows = cs.map(c => ({ c, s: ms.byCat[c.id] || 0 })).sort((a, b) => b.s / b.c.budget - a.s / a.c.budget).slice(0, 4);
  return section('Budget del mese', `<div class="bud-tot"><p><b class="num">${eur(ts)}</b> <span class="muted">spesi su ${eur(tb)}</span></p>${bar(tb ? ts / tb : 0, 'var(--ink)')}</div><div class="brows">${rows.map(r => budgetRow(r.c, r.s)).join('')}</div>`, { label: 'Vedi tutto', a: 'planGo', attrs: 'data-p="budget"' });
}
function goalsBlock(bal) {
  const gs = goals();
  const cards = gs.map(g => {
    const v = bal[g.id] || 0, p = g.target > 0 ? v / g.target : null;
    return `<button class="gcard" data-a="goalOpen" data-id="${g.id}"><span class="g-e" style="background:${tint(g.color)}">${esc(g.emoji || '🐷')}</span><span class="g-n">${esc(g.name)}</span><b class="num">${eur(v)}</b>${g.target > 0 ? `<span class="g-t">di ${eur0(g.target)}</span>${progress(p, g.color)}` : '<span class="g-t">Senza obiettivo</span>'}</button>`;
  }).join('');
  return section('Salvadanai', `<div class="hs">${cards}<button class="gcard add" data-a="goalNew"><span class="g-e">${ic('plus', 22)}</span><span class="g-n">Nuovo salvadanaio</span><span class="g-t">Metti da parte senza che conti come spesa</span></button></div>`, gs.length ? { label: 'Gestisci', a: 'planGo', attrs: 'data-p="goals"' } : null);
}
function recapCard(k) {
  const parts = spendParts(monthStats(k)).slice(0, 5);
  const max = parts.length ? parts[0].v : 1;
  const art = parts.length ? parts.map(p => `<i style="height:${Math.max(18, p.v / max * 100)}%;background:${p.c.color}"></i>`).join('') : '<i style="height:60%;background:var(--accent)"></i>';
  return `<button class="recap" data-a="recap" data-k="${k}"><span class="recap-art" aria-hidden="true">${art}</span><span class="recap-t"><b>Il tuo ${MESI[Number(k.slice(5)) - 1]} in breve</b><span>Entrate, uscite e qualche curiosità sul mese</span></span>${ic('right', 18)}</button>`;
}
function recentBlock(k) {
  const list = sortMovs(monthMovs(k)).slice(0, 5);
  if (!list.length) return `<div class="empty"><div class="empty-art">${ic('wallet', 30)}</div><h3>Nessun movimento in ${monthName(k).toLowerCase()}</h3><p>Tocca + per registrare una spesa o un'entrata: bastano pochi secondi.</p><button class="btn primary" data-a="add">Aggiungi movimento</button></div>`;
  return section('Ultimi movimenti', `<div class="mlist">${list.map(m => movRow(m)).join('')}</div>`, { label: 'Vedi tutti', a: 'seeMonth', attrs: `data-k="${k}"` });
}
function backupReminder() {
  if (D.settings.demo || D.movements.length < 15) return '';
  const lb = D.settings.lastBackup;
  if (lb && daysBetween(lb, today()) < 30) return '';
  return `<div class="notice gap-t">${ic('download', 20)}<div><b>${lb ? 'Ultimo backup il ' + shortDate(lb) : 'Non hai ancora fatto un backup'}</b><span>I dati sono solo su questo dispositivo: salvane una copia su File o iCloud Drive.</span></div><button class="btn dark sm" data-a="backup">Backup</button></div>`;
}

/* ---------- riga movimento ---------- */
function movRow(m) {
  let emoji, color, title, sub = [], amt, cls, small = '';
  if (m.type === 'transfer') {
    const a = acc(m.accountId), b = acc(m.toAccountId);
    const toGoal = isGoal(b) && !isGoal(a), fromGoal = isGoal(a) && !isGoal(b), g = toGoal ? b : fromGoal ? a : null;
    emoji = g ? (g.emoji || '🐷') : '⇄'; color = g ? g.color : '#7A8B99';
    title = m.description || (toGoal ? 'Messo da parte' : fromGoal ? 'Prelevato dal salvadanaio' : 'Trasferimento');
    sub.push('Da ' + esc(a ? a.name : '?') + ' a ' + esc(b ? b.name : '?'));
    amt = eur(m.amount); cls = 'neu';
  } else if (m.type === 'settle') {
    const p = person(m.personId);
    emoji = p ? (p.emoji || '🙂') : '🙂'; color = '#7A8B99';
    title = (m.dir === 'in' ? 'Rimborso da ' : 'Rimborso a ') + (p ? p.name : '?');
    sub.push(esc(accName(m.accountId)));
    amt = eur(m.dir === 'in' ? m.amount : -m.amount, { sign: true }); cls = 'neu';
  } else {
    const c = cat(m.categoryId);
    emoji = c ? c.emoji : '🏷️'; color = c ? c.color : '#7A8B99';
    title = m.description || (c ? c.name : 'Senza categoria');
    if (m.description) sub.push(esc(c ? c.name : 'Senza categoria'));
    if (m.accountId && m.accountId !== D.settings.defaultAccount && !m.paidBy && liquidAccounts().length > 1) sub.push(esc(accName(m.accountId)));
    if (m.type === 'in') { amt = eur(m.amount, { sign: true }); cls = 'pos'; }
    else if (m.paidBy) { amt = eur(-m.split.mine); cls = 'out'; small = 'pagato da ' + esc(person(m.paidBy) ? person(m.paidBy).name : '?'); }
    else { amt = eur(-m.amount); cls = 'out'; if (m.split) small = 'tua parte ' + eur(m.split.mine); }
    if (m.cur && m.cur !== baseCur()) small = fmtCur(m.orig, m.cur) + (small ? ', ' + small : '');
  }
  if (m.by && D.settings.partners && D.settings.partners[m.by]) sub.push(esc(D.settings.partners[m.by]));
  for (const t of (m.tags || []).slice(0, 2)) sub.push('#' + esc(t));
  const flags = (m.photoId ? ic('camera', 14) : '') + (m.split ? ic('people', 14) : '') + (m.fixedId ? ic('repeat', 14) : '');
  return `<button class="mrow" data-a="movOpen" data-id="${m.id}">${avatar(emoji, color)}<span class="mrow-m"><span class="mt">${esc(title)}</span><span class="ms">${flags ? `<span class="flags">${flags}</span>` : ''}${sub.join(', ')}</span></span><span class="ma num ${cls}">${amt}${small ? `<small>${small}</small>` : ''}</span></button>`;
}

/* ---------- MOVIMENTI ---------- */
VIEWS.movs = () => `<header class="ph"><h1>Movimenti</h1></header>
  <div class="search"><span class="s-ic">${ic('search', 20)}</span><input type="search" id="q" value="${esc(UI.q)}" placeholder="Cerca descrizione, nota, #tag o importo" data-in="search" autocomplete="off" autocorrect="off" enterkeyhint="search" aria-label="Cerca nei movimenti"><button class="s-x" data-a="clearQ" aria-label="Cancella la ricerca">${ic('close', 16)}</button></div>
  <div class="chips" id="fchips">${filterChips()}</div>
  <div id="mvList">${movListHTML()}</div>`;
function periodRange(p) {
  if (!p || p === 'all') return [null, null];
  const [t, v] = p.split(':');
  if (t === 'm') return [v + '-01', endOf(v)];
  if (t === 'y') return [v + '-01-01', v + '-12-31'];
  return [null, null];
}
function periodLabel(p) {
  if (p === 'all') return 'Tutto';
  const [t, v] = p.split(':');
  return t === 'm' ? monthName(v) : 'Anno ' + v;
}
function activeFilterCount(f = UI.filters) {
  return (f.type !== 'all' ? 1 : 0) + (f.cats.length ? 1 : 0) + (f.accs.length ? 1 : 0) + (f.tags.length ? 1 : 0) + (f.photo ? 1 : 0) + (f.split ? 1 : 0) + (f.fx ? 1 : 0);
}
function filterChips() {
  const f = UI.filters, ck = curMk();
  const per = [['m:' + ck, 'Questo mese'], ['m:' + addM(ck, -1), 'Mese scorso'], ['y:' + ck.slice(0, 4), "Quest'anno"], ['all', 'Tutto']];
  const n = activeFilterCount();
  let h = `<button class="chip ${n ? 'on' : ''}" data-a="openFilters">${ic('sliders', 16)} Filtri${n ? ` <b class="cnt">${n}</b>` : ''}</button>`;
  const sv = D.settings.searches || [], curS = searchKey(), hit = sv.find(s => searchKey(s) === curS);
  h += sv.map((s, i) => `<button class="chip sv ${searchKey(s) === curS ? 'on' : ''}" data-a="searchUse" data-i="${i}">${ic('bookmark', 14)} ${esc(s.name)}</button>`).join('');
  if ((n || (UI.q || '').trim()) && !hit) h += `<button class="chip dashed" data-a="searchSave">${ic('plus', 14)} Salva ricerca</button>`;
  if (hit) h += `<button class="chip dashed" data-a="searchDel" data-i="${sv.indexOf(hit)}" aria-label="Elimina la ricerca salvata ${esc(hit.name)}">${ic('close', 14)} Togli</button>`;
  if (!per.some(p => p[0] === f.period)) h += `<button class="chip on" data-a="setPeriod" data-p="m:${ck}" aria-label="Rimuovi il periodo">${esc(periodLabel(f.period))} ${ic('close', 14)}</button>`;
  return h + per.map(([p, l]) => `<button class="chip ${f.period === p ? 'on' : ''}" data-a="setPeriod" data-p="${p}">${l}</button>`).join('');
}
/* ---------- ricerche salvate ---------- */
const searchKey = (s = { q: UI.q, f: UI.filters }) => JSON.stringify([(s.q || '').trim().toLowerCase(), s.f.period, s.f.type, s.f.cats.slice().sort(), s.f.accs.slice().sort(), s.f.tags.slice().sort(), !!s.f.photo, !!s.f.split, !!s.f.fx]);
function searchName() {
  const f = UI.filters, q = (UI.q || '').trim(), p = [];
  if (q) p.push(q);
  f.cats.forEach(id => { const c = cat(id); if (c) p.push(c.name); });
  f.accs.forEach(id => { const a = acc(id); if (a) p.push(a.name); });
  f.tags.forEach(t => p.push('#' + t));
  if (f.type !== 'all') p.push({ out: 'Uscite', in: 'Entrate', transfer: 'Trasferimenti' }[f.type]);
  if (f.period !== 'm:' + curMk()) p.push(periodLabel(f.period).toLowerCase());
  return (p.join(', ') || 'Ricerca').slice(0, 40);
}
ACT.searchSave = () => {
  const sv = D.settings.searches || (D.settings.searches = []);
  if (sv.length >= 8) return toast('Puoi salvare fino a 8 ricerche: togline una.', null);
  sv.push({ name: searchName(), q: UI.q || '', f: JSON.parse(JSON.stringify(UI.filters)) });
  hap('ok'); save({ undo: false }); refresh();
  toast('Ricerca salvata: la trovi tra i filtri', null);
};
ACT.searchUse = el => {
  const s = (D.settings.searches || [])[Number(el.dataset.i)];
  if (!s) return;
  if (searchKey(s) === searchKey()) { UI.filters = blankFilters(); UI.q = ''; }
  else { UI.filters = Object.assign(blankFilters(), JSON.parse(JSON.stringify(s.f))); UI.q = s.q || ''; }
  UI.limit = 0; hap(); render();
};
ACT.searchDel = el => {
  const sv = D.settings.searches || [], s = sv[Number(el.dataset.i)];
  if (!s) return;
  sv.splice(Number(el.dataset.i), 1);
  save(); refresh();
  toast(`Ricerca «${s.name}» tolta`);
};
function filteredMovs(f = UI.filters, q = UI.q) {
  q = (q || '').trim().toLowerCase();
  const [from, to] = periodRange(f.period);
  const qn = /^[\d.,\s€+-]+$/.test(q) ? strToNum(q) : null;
  return sortMovs(D.movements.filter(m => {
    if (from && m.date < from) return false;
    if (to && m.date > to) return false;
    if (f.type !== 'all') { if (f.type === 'transfer') { if (m.type !== 'transfer' && m.type !== 'settle') return false; } else if (m.type !== f.type) return false; }
    if (f.cats.length && !f.cats.includes(m.categoryId)) return false;
    if (f.accs.length && !(f.accs.includes(m.accountId) || f.accs.includes(m.toAccountId))) return false;
    if (f.tags.length && !(m.tags || []).some(t => f.tags.includes(t))) return false;
    if (f.photo && !m.photoId) return false;
    if (f.split && !m.split) return false;
    if (f.fx && !(m.cur && m.cur !== baseCur())) return false;
    if (q) {
      if (qn != null && qn > 0 && (Math.abs(m.amount - qn) < 0.005 || (m.split && Math.abs(m.split.mine - qn) < 0.005) || (m.orig && Math.abs(m.orig - qn) < 0.005))) return true;
      const c = cat(m.categoryId), p = person(m.personId);
      const hay = [m.description, m.note, (m.tags || []).map(t => '#' + t).join(' '), c && c.name, accName(m.accountId), m.toAccountId && accName(m.toAccountId), p && p.name].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }));
}
function movListHTML() {
  const list = filteredMovs();
  const any = UI.q || activeFilterCount();
  if (!list.length) return `<div class="empty sm"><h3>Nessun movimento</h3><p>${any ? 'Nessun risultato: prova a cambiare la ricerca o i filtri.' : 'In questo periodo non ci sono movimenti.'}</p>${any ? '<button class="btn outline sm" data-a="resetFilters">Azzera ricerca e filtri</button>' : ''}</div>`;
  let inc = 0, out = 0;
  for (const m of list) { if (m.type === 'in') inc += m.amount; else if (m.type === 'out') out += eff(m); }
  let h = `<div class="mv-sum"><span>${list.length} ${list.length === 1 ? 'movimento' : 'movimenti'}</span><span class="num pos">${eur(inc, { sign: true })}</span><span class="num out">${eur(-out)}</span></div>`;
  const lim = UI.limit || 250;
  let day = null, buf = [];
  const flush = () => {
    if (!buf.length) return;
    const net = sum(buf.map(m => m.type === 'in' ? m.amount : m.type === 'out' ? -eff(m) : 0));
    h += `<div class="dayh"><span>${dayTitle(day)}</span><span class="num">${net ? eur(net, { sign: true }) : ''}</span></div><div class="mlist">${buf.map(m => movRow(m)).join('')}</div>`;
    buf = [];
  };
  for (const m of list.slice(0, lim)) { if (m.date !== day) { flush(); day = m.date; } buf.push(m); }
  flush();
  if (list.length > lim) h += `<button class="btn outline w gap-t" data-a="moreMovs">Mostra altri ${Math.min(250, list.length - lim)}</button>`;
  return h;
}

/* ---------- PIANIFICA ---------- */
VIEWS.plan = () => {
  const tabs = [['fixed', 'Spese fisse'], ['budget', 'Budget'], ['goals', 'Salvadanai']];
  return `<header class="ph"><h1>Pianifica</h1></header><nav class="utabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${UI.planTab === k}" class="${UI.planTab === k ? 'on' : ''}" data-a="planTab" data-k="${k}">${l}</button>`).join('')}</nav>${UI.planTab === 'budget' ? planBudget() : UI.planTab === 'goals' ? planGoals() : planFixed()}`;
};
function fixedRow(f) {
  const t = fixedTarget(f), nx = nextOcc(f), amt = estimateAmount(f);
  const sign = f.type === 'in' ? 1 : f.type === 'out' ? -1 : 0;
  let sub = fixedLabel(f);
  if (f.variable) sub += ', importo variabile';
  if (f.sink) sub += ', accantonata ogni mese';
  const next = nx ? `Prossima il ${shortDate(nx.due)}${f.count ? `, rata ${nx.n} di ${f.count}` : ''}` : (f.paused ? 'In pausa' : 'Conclusa');
  return `<button class="mrow" data-a="fxEdit" data-id="${f.id}">${avatar(t ? t.emoji : '🔁', t ? t.color : null)}<span class="mrow-m"><span class="mt">${esc(f.name)}</span><span class="ms">${esc(sub)}</span><span class="ms">${next}</span></span><span class="ma num ${sign > 0 ? 'pos' : sign < 0 ? 'out' : 'neu'}">${f.variable ? '≈ ' : ''}${sign ? eur(sign * amt, { sign: sign > 0 }) : eur(amt)}</span></button>`;
}
function planFixedOld() {
  const ck = curMk();
  if (!D.fixed.length) return `<div class="empty"><div class="empty-art">${ic('repeat', 30)}</div><h3>Nessuna spesa fissa</h3><p>Aggiungi affitto, bollette, abbonamenti, rate o lo stipendio: ogni mese li trovi pronti da registrare con un tocco.</p><button class="btn primary" data-a="fxNew">Aggiungi spesa fissa</button></div>`;
  const pend = pendingFixed(ck);
  let outSum = 0, inSum = 0;
  for (const p of pend) { const d = pendDelta(p); if (d < 0) outSum -= d; else inSum += d; }
  const active = D.fixed.filter(f => !fixedEnded(f)), ended = D.fixed.filter(fixedEnded);
  active.sort((a, b) => { const x = nextOcc(a), y = nextOcc(b); return (x ? x.due : '9') .localeCompare(y ? y.due : '9'); });
  const mName = MESI[Number(ck.slice(5)) - 1];
  let h = `<div class="kgrid two"><div class="k"><span>Ancora da pagare a ${mName}</span><b class="num out">${eur(outSum)}</b></div><div class="k"><span>Ancora da incassare</span><b class="num pos">${eur(inSum)}</b></div></div>`;
  h += pend.length ? section('Da registrare', `<div class="pcards">${pend.map(pendingCard).join('')}</div>`) : `<p class="ok-line">${ic('check', 18)} Tutte le voci fisse di ${mName} sono registrate.</p>`;
  h += section('Tutte le voci fisse', `<div class="mlist">${active.map(fixedRow).join('')}</div><button class="btn outline w gap-t" data-a="fxNew">${ic('plus', 18)} Nuova voce fissa</button>`);
  if (ended.length) h += section('Concluse', `<div class="mlist dim">${ended.map(fixedRow).join('')}</div>`);
  return h;
}
function planBudget() {
  const k = UI.month, ms = monthStats(k);
  const outs = activeCats('out'), ins = activeCats('in');
  const withB = outs.filter(c => c.budget > 0), noB = outs.filter(c => !(c.budget > 0));
  const tb = sum(withB.map(c => c.budget)), ts = sum(withB.map(c => ms.byCat[c.id] || 0));
  const ib = sum(ins.map(c => c.budget));
  let h = `<div class="msw-row">${monthSwitcher()}</div>`;
  h += `<div class="bud-hero"><p class="muted">Speso nelle categorie con budget</p><p class="bud-n"><b class="num">${eur(ts)}</b> <span class="muted">di ${eur(tb)}</span></p>${bar(tb ? ts / tb : 0, 'var(--ink)')}
    <div class="kgrid three"><div class="k"><span>Entrate previste</span><b class="num">${eur0(ib)}</b></div><div class="k"><span>Uscite previste</span><b class="num">${eur0(tb)}</b></div><div class="k"><span>Margine previsto</span><b class="num ${ib - tb < 0 ? 'neg' : 'pos'}">${eur0(ib - tb)}</b></div></div></div>`;
  if (withB.length) h += section('Uscite', `<div class="brows">${withB.map(c => budgetRow(c, ms.byCat[c.id] || 0)).join('')}</div>`, null, 'Tocca una categoria per cambiare il budget.');
  if (noB.length) h += section('Senza budget', `<div class="brows">${noB.map(c => `<button class="brow" data-a="catEdit" data-id="${c.id}">${avatar(c.emoji, c.color)}<span class="brow-m"><span class="brow-t"><span class="nm">${esc(c.name)}</span><span class="num">${eur(ms.byCat[c.id] || 0)}</span></span><span class="brow-s muted">Tocca per impostare un budget</span></span></button>`).join('')}</div>`);
  h += section('Entrate', `<div class="brows">${ins.map(c => { const s = ms.byCat[c.id] || 0; return `<button class="brow" data-a="catEdit" data-id="${c.id}">${avatar(c.emoji, c.color)}<span class="brow-m"><span class="brow-t"><span class="nm">${esc(c.name)}</span><span class="num pos">${eur(s)}${c.budget > 0 ? ` <small>di ${eur0(c.budget)}</small>` : ''}</span></span>${c.budget > 0 ? progress(s / c.budget, 'var(--pos)') : ''}</span></button>`; }).join('')}</div>`);
  h += `<button class="btn outline w gap-t" data-a="catNew">${ic('plus', 18)} Nuova categoria</button>`;
  return h;
}
function goalNeed(g, v) {
  if (!(g.target > 0)) return '';
  const left = r2(g.target - v);
  if (left <= 0) return 'Obiettivo raggiunto!';
  if (g.deadline) {
    const months = diffM(curMk(), g.deadline) + 1;
    if (months <= 0) return `Mancano ${eur(left)}: la data che avevi scelto è passata`;
    return `Mancano ${eur(left)}: circa ${eur(left / months)} al mese fino a ${monthName(g.deadline).toLowerCase()}`;
  }
  return `Mancano ${eur(left)}`;
}
function planGoals() {
  const gs = goals(), bal = balancesAt(today());
  if (!gs.length) return `<div class="empty"><div class="empty-art">🐷</div><h3>Nessun salvadanaio</h3><p>Metti da parte soldi per un obiettivo, come le vacanze o un fondo per gli imprevisti. Quello che sposti qui non conta come spesa.</p><button class="btn primary" data-a="goalNew">Crea un salvadanaio</button></div>`;
  let h = `<div class="bud-hero"><p class="muted">Totale nei salvadanai</p><p class="bud-n"><b class="num">${eur(sum(gs.map(g => bal[g.id])))}</b></p></div><div class="glist">`;
  for (const g of gs) {
    const v = bal[g.id] || 0, p = g.target > 0 ? v / g.target : null, need = goalNeed(g, v);
    h += `<div class="gbig"><button class="gbig-top" data-a="goalOpen" data-id="${g.id}"><span class="g-e" style="background:${tint(g.color)}">${esc(g.emoji || '🐷')}</span><span class="gbig-t"><b>${esc(g.name)}</b><span class="muted">${g.target > 0 ? `${pct(Math.min(p, 9.99))} di ${eur0(g.target)}${g.deadline ? ', entro ' + monthName(g.deadline).toLowerCase() : ''}` : 'Senza obiettivo'}</span></span><b class="num">${eur(v)}</b></button>${g.target > 0 ? progress(p, g.color) : ''}${need ? `<p class="g-need">${need}</p>` : ''}<div class="gbig-a"><button class="btn outline sm" data-a="goalTake" data-id="${g.id}">Preleva</button><button class="btn dark sm" data-a="goalAdd" data-id="${g.id}">Aggiungi</button></div></div>`;
  }
  return h + `</div><button class="btn outline w gap-t" data-a="goalNew">${ic('plus', 18)} Nuovo salvadanaio</button>`;
}

/* ---------- STATISTICHE ---------- */
VIEWS.stats = () => {
  const mode = UI.statsMode;
  let h = `<header class="ph"><h1>Statistiche</h1></header><div class="seg" role="tablist">${[['month', 'Mese'], ['year', 'Anno']].map(([k, l]) => `<button role="tab" aria-selected="${mode === k}" class="${mode === k ? 'on' : ''}" data-a="statsMode" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (mode === 'month') return h + `<div class="msw-row">${monthSwitcher()}</div>` + statsMonth(UI.month);
  return h + `<div class="msw-row"><div class="msw"><button class="icon-btn sm" data-a="statsYear" data-d="-1" aria-label="Anno precedente">${ic('left', 18)}</button><span class="msw-l">${UI.statsYear}</span><button class="icon-btn sm" data-a="statsYear" data-d="1" aria-label="Anno successivo">${ic('right', 18)}</button></div></div>` + statsYear(UI.statsYear);
};
const kpiGrid = items => `<div class="kgrid">${items.map(([l, v, c]) => `<div class="k"><span>${l}</span><b class="num ${c || ''}">${v}</b></div>`).join('')}</div>`;
function legendRows(parts, tot, month) {
  return `<div class="legend">${parts.map(p => `<button class="lrow" data-a="catMovs" data-id="${p.c.id}" data-k="${month}"><i style="background:${p.c.color}"></i><span class="nm">${esc(p.c.emoji)} ${esc(p.c.name)}</span><span class="num">${eur(p.v)}</span><span class="muted num">${pct(p.v / tot)}</span></button>`).join('')}</div>`;
}
function statsMonth(k) {
  const ms = monthStats(k);
  let h = kpiGrid([['Entrate', eur(ms.inc), 'pos'], ['Uscite', eur(ms.out), 'out'], ['Risultato', eur(ms.net, { sign: true })], ['Tasso di risparmio', ms.rate == null ? '–' : pct(ms.rate)]]);
  h += nwBlock(k);
  const parts = spendParts(ms), tot = sum(parts.map(p => p.v));
  h += section('Spese per categoria', parts.length ? `<div class="donut-wrap">${donut(parts.map(p => ({ v: p.v, color: p.c.color })), tot, eur0(tot), 'di uscite').replace('aria-label="Spese per categoria"', `aria-label="${esc('Spese per categoria, ' + eur0(tot) + ' in tutto: ' + parts.slice(0, 4).map(p => p.c.name + ' ' + eur0(p.v)).join(', '))}"`)}</div>${legendRows(parts, tot, k)}` : '<p class="muted">Nessuna spesa in questo mese.</p>');
  h += section('Andamento del saldo', balanceChart(k), null, k === curMk() ? 'Disponibile giorno per giorno, senza i salvadanai. La linea tratteggiata è la previsione con le voci fisse ancora da registrare.' : 'Disponibile giorno per giorno, senza i salvadanai.');
  const top = monthMovs(k).filter(m => m.type === 'out').sort((a, b) => eff(b) - eff(a)).slice(0, 5);
  if (top.length) h += section('Spese più grandi', `<div class="mlist">${top.map(m => movRow(m)).join('')}</div>`);
  const ip = spendParts(ms, 'in'), it = sum(ip.map(p => p.v));
  if (ip.length) h += section('Entrate per categoria', legendRows(ip, it, k));
  return h;
}
function statsYear(y) {
  const months = Array.from({ length: 12 }, (_, i) => y + '-' + pad(i + 1));
  const st = months.map(monthStats);
  const inc = sum(st.map(s => s.inc)), out = sum(st.map(s => s.out)), saved = sum(st.map(s => s.saved));
  let h = kpiGrid([['Entrate', eur(inc), 'pos'], ['Uscite', eur(out), 'out'], ['Risultato', eur(inc - out, { sign: true })], ['Nei salvadanai', eur(saved)]]);
  h += nwYearBlock(y);
  h += section('Entrate e uscite per mese', yearBars(months, st) + `<div class="lg-inline"><span><i class="k-in"></i>Entrate</span><span><i class="k-out"></i>Uscite</span></div>`, null, 'Tocca un mese per vederne il dettaglio.');
  const ck = curMk(), t = today();
  const rows = months.map((k, i) => {
    const s = st[i], future = k > ck;
    return `<tr class="${k === ck ? 'cur' : ''}" data-a="goMonth" data-k="${k}"><td>${cap(MESI_S[i])}</td><td class="num pos">${future && !s.n ? '' : eur0(s.inc)}</td><td class="num out">${future && !s.n ? '' : eur0(s.out)}</td><td class="num">${future && !s.n ? '' : eur0(s.net)}</td><td class="num">${future ? '' : eur0(availAt(k === ck ? t : endOf(k)))}</td></tr>`;
  }).join('');
  h += section('Riepilogo mese per mese', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mese</th><th>Entrate</th><th>Uscite</th><th>Netto</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Totale</td><td class="num pos">${eur0(inc)}</td><td class="num neg">${eur0(out)}</td><td class="num">${eur0(inc - out)}</td><td></td></tr></tfoot></table></div>`, null, 'Saldo: disponibile a fine mese, senza i salvadanai.');
  const catTot = {};
  st.forEach(s => { for (const id in s.byCat) catTot[id] = (catTot[id] || 0) + s.byCat[id]; });
  const parts = Object.entries(catTot).map(([id, v]) => ({ c: cat(id), v: r2(v) })).filter(p => p.c && p.c.type === 'out' && p.v > 0).sort((a, b) => b.v - a.v);
  if (parts.length) {
    const tt = sum(parts.map(p => p.v));
    h += section("Spese per categoria nell'anno", `<div class="legend">${parts.map(p => `<div class="lrow static"><i style="background:${p.c.color}"></i><span class="nm">${esc(p.c.emoji)} ${esc(p.c.name)}</span><span class="num">${eur(p.v)}</span><span class="muted num">${pct(p.v / tt)}</span></div>`).join('')}</div>`);
  }
  return h;
}

/* ---------- grafici ---------- */
function donut(parts, total, top, bottom) {
  const R = 64, C = 2 * Math.PI * R, SW = 22;
  let off = 0, segs = '';
  const gap = parts.length > 1 ? 1.5 : 0;
  for (const p of parts) {
    const len = total > 0 ? p.v / total * C : 0, L = Math.max(0.5, len - gap);
    segs += `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${p.color}" stroke-width="${SW}" stroke-dasharray="${L.toFixed(2)} ${(C - L).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 90 90)"/>`;
    off += len;
  }
  return `<svg class="donut" viewBox="0 0 180 180" role="img" aria-label="Spese per categoria"><circle r="${R}" cx="90" cy="90" fill="none" class="d-bg" stroke-width="${SW}"/>${segs}<text x="90" y="88" text-anchor="middle" class="d-v">${esc(top)}</text><text x="90" y="108" text-anchor="middle" class="d-l">${esc(bottom)}</text></svg>`;
}
function balanceChart(k) {
  const ck = curMk(), t = today(), n = dim(k);
  if (k > ck) return '<p class="muted">Il mese non è ancora iniziato.</p>';
  const last = k === ck ? Number(t.slice(8)) : n;
  const act = [];
  for (let d = 1; d <= last; d++) act.push(availAt(k + '-' + pad(d)));
  const proj = [];
  if (k === ck) {
    const pend = pendingFixed(ck).map(p => ({ due: p.due < t ? t : p.due, d: pendDelta(p) }));
    for (let d = last; d <= n; d++) {
      const ds = k + '-' + pad(d);
      let v = availAt(ds);
      for (const p of pend) if (p.due <= ds) v += p.d;
      proj.push(r2(v));
    }
  }
  const all = act.concat(proj);
  let min = Math.min(...all), max = Math.max(...all);
  if (max - min < 1) { min -= 50; max += 50; }
  const pv = (max - min) * 0.14; min -= pv; max += pv;
  const W = 340, H = 172, L = 4, R = 4, T = 10, B = 24;
  const X = d => L + (W - L - R) * (d - 1) / Math.max(1, n - 1);
  const Y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  const path = (arr, d0) => arr.map((v, i) => (i ? 'L' : 'M') + X(d0 + i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const pa = path(act, 1);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento del disponibile nel mese"><defs><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>`;
  for (let i = 0; i <= 2; i++) { const yy = T + (H - T - B) * i / 2; s += `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}" class="grid"/>`; }
  if (min < 0 && max > 0) s += `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" class="zero"/>`;
  s += `<path d="${pa} L${X(last).toFixed(1)} ${H - B} L${X(1).toFixed(1)} ${H - B} Z" fill="url(#gArea)"/><path d="${pa}" class="ln"/>`;
  if (proj.length > 1) s += `<path d="${path(proj, last)}" class="ln dash"/>`;
  s += `<circle cx="${X(last).toFixed(1)}" cy="${Y(act[act.length - 1]).toFixed(1)}" r="4.5" class="dot"/>`;
  for (const d of [1, 10, 20, n]) s += `<text x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="${d === 1 ? 'start' : d === n ? 'end' : 'middle'}" class="ax">${d} ${MESI_S[Number(k.slice(5)) - 1]}</text>`;
  s += '</svg>';
  const endV = k === ck ? proj[proj.length - 1] : act[act.length - 1];
  return s + `<div class="chart-foot"><span>Primo del mese<b class="num">${eur(act[0])}</b></span><span>${k === ck ? 'Previsto a fine mese' : 'Fine mese'}<b class="num ${endV < 0 ? 'neg' : ''}">${eur(endV)}</b></span></div>`;
}
function yearBars(months, st) {
  const max = Math.max(1, ...st.map(s => Math.max(s.inc, s.out)));
  const W = 340, H = 170, T = 8, B = 22, gw = W / 12, bw = Math.min(10, gw / 2 - 3), base = H - B;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entrate e uscite per mese">`;
  for (let i = 0; i <= 2; i++) { const yy = T + (base - T) * i / 2; s += `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}" class="grid"/>`; }
  months.forEach((k, i) => {
    const x = i * gw + gw / 2, hi = (base - T) * st[i].inc / max, ho = (base - T) * st[i].out / max;
    s += `<g class="bgrp${k === UI.month ? ' on' : ''}" data-a="goMonth" data-k="${k}"><rect x="${(x - gw / 2).toFixed(1)}" y="0" width="${gw.toFixed(1)}" height="${H}" class="hit"/>`;
    if (st[i].inc > 0) s += `<rect x="${(x - bw - 1).toFixed(1)}" y="${(base - hi).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, hi).toFixed(1)}" rx="2.5" class="b-in"/>`;
    if (st[i].out > 0) s += `<rect x="${(x + 1).toFixed(1)}" y="${(base - ho).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, ho).toFixed(1)}" rx="2.5" class="b-out"/>`;
    s += `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ax">${MESI_S[i].charAt(0).toUpperCase()}</text></g>`;
  });
  return s + '</svg>';
}

/* ---------- BENVENUTO ---------- */
VIEWS.onboarding = () => `<div class="onb">
  <div class="onb-art" aria-hidden="true">
    <div class="oa-row"><span class="av" style="background:${tint('#FF385C')}">🛒</span><i style="width:78%;background:#FF385C"></i></div>
    <div class="oa-row"><span class="av" style="background:${tint('#00A699')}">🏠</span><i style="width:58%;background:#00A699"></i></div>
    <div class="oa-row"><span class="av" style="background:${tint('#E8A200')}">💡</span><i style="width:36%;background:#E8A200"></i></div>
    <div class="oa-row"><span class="av" style="background:${tint('#6C5CE7')}">🏖️</span><i style="width:66%;background:#6C5CE7"></i></div>
  </div>
  <p class="onb-brand"><span>EFU</span> Budget</p>
  <h1>Il tuo budget, sempre in tasca</h1>
  <p class="lead">Registra entrate e uscite in pochi secondi, ritrova ogni mese le spese fisse pronte da confermare e metti da parte per i tuoi obiettivi.</p>
  <p class="onb-note">${ic('lock', 16)} I dati restano solo su questo dispositivo.</p>
  <div class="onb-a">
    <button class="btn primary w" data-a="onbStart">Inizia da zero</button>
    <button class="btn outline w" data-a="onbImport">Importa i tuoi dati</button>
    <div class="onb-links"><button class="link" data-a="onbDemo">Prova con dati di esempio</button><label class="link">Ripristina un backup<input type="file" class="vh" accept="application/json,.json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-ch="restoreFile"></label><label class="link">Apri un budget condiviso<input type="file" class="vh" accept="application/json,.json" data-ch="syncFile"></label></div>
  </div>
</div>`;

/* ---------- importi nascosti ---------- */
const HIDE_KEY = 'budget.iphone.hide';
ACT.hideToggle = () => { HIDE = !HIDE; try { localStorage.setItem(HIDE_KEY, HIDE ? '1' : '0'); } catch (e) { } refresh(); };
ACT.hideOpenToggle = el => { D.settings.hideOnOpen = !D.settings.hideOnOpen; save({ undo: false }); drawSheet(sheetOf(el)); };
function heroSub(nG, inGoals) {
  const parts = [];
  if (nG) parts.push(eur(inGoals) + ' nei salvadanai');
  const iv = D.invest && D.invest.length ? invTotals().v : 0;
  if (iv > 0) parts.push(eur(iv) + ' investiti');
  return parts.length ? `<p class="hero-s">e ${parts.join(', ')}</p>` : '';
}

