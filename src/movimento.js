/* =========================================================
   Movimento (dalla 2.0)
   Stato e strumenti condivisi: rispetto di «Riduci movimento»,
   vibrazione, numeri che scorrono, grafici che si disegnano,
   scorri per eliminare.
   Le transizioni vivono nelle funzioni che le usano:
   render e goTab (ui.js), pressKey, movSave e movOpen (sheets.js).
   ========================================================= */
const MOTION = { prev: {}, first: true, entering: false, navDir: '', freshId: null };
const TAB_ORDER = ['home', 'movs', 'plan', 'stats', 'invest'];
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const VT_OK = () => typeof document.startViewTransition === 'function' && !RM();

/* ---------- vibrazione ---------- */
function hap(kind = 'tick') {
  try { if (navigator.vibrate) navigator.vibrate(kind === 'warn' ? [14, 50, 14] : kind === 'ok' ? [10, 40, 18] : 8); } catch (e) { }
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; // non togliere il fuoco a un campo
  let l = document.getElementById('efu-hap');
  if (!l) {
    l = document.createElement('label'); l.id = 'efu-hap'; l.className = 'hap'; l.setAttribute('aria-hidden', 'true');
    l.innerHTML = '<input type="checkbox" switch tabindex="-1">';
    document.body.appendChild(l);
  }
  // il clic sull'interruttore nascosto non deve rubare il fuoco a ciò che stavi usando
  const back = () => { const f = document.activeElement; if (f && f.closest && f.closest('#efu-hap')) { if (a && a !== f && a !== document.body && a.focus) a.focus({ preventScroll: true }); if (document.activeElement === f) f.blur(); } };
  l.click(); back();
  if (kind !== 'tick') setTimeout(() => { l.click(); back(); }, 90);
}

/* ---------- numeri che scorrono quando cambiano ---------- */
// Si applica ai numeri principali già presenti nelle schermate, senza cambiarne l'aspetto.
const COUNT_SEL = '.hero-n .big, .kpi b.num, .bud-n b.num, .bud-tot b.num, .k b.num, .fc b.num, .inv-big, .inv-v, .nw-v';
const parseShown = t => strToNum(String(t).replace(/−/g, '-').replace(/[^\d,.+\-]/g, ''));
function bigInner(n) {
  const v = r2(n), [i, d] = NF2.format(Math.abs(v)).split(',');
  return `${v < 0 ? '−' : ''}${i}<span class="big-d">,${d} ${esc(baseSym())}</span>`;
}
function countUp(root) {
  if (!root || HIDE) return;
  const seen = {};
  $$(COUNT_SEL, root).forEach(el => {
    const txt = el.textContent || '';
    if (!txt.includes(baseSym()) || el.closest('.sheet')) return;
    const kind = el.matches('.big') ? 'big' : txt.includes(',') ? 'eur' : 'eur0';
    const sign = /^\s*\+/.test(txt);
    const to = parseShown(txt);
    if (!isFinite(to)) return;
    const box = el.closest('.kpi, .k, .inv-card, .fc'), lab = box && box.querySelector('.fc-l, span');
    const base = UI.tab + ':' + (el.className || el.tagName) + ':' + (lab && lab !== el ? (lab.textContent || '').replace(/[\d.,€+\-−\s]/g, '').slice(0, 24) : '');
    seen[base] = (seen[base] || 0) + 1;
    const key = base + ':' + seen[base];
    const from = MOTION.prev[key] == null ? 0 : MOTION.prev[key];
    MOTION.prev[key] = to;
    if (RM() || Math.abs(from - to) < 0.005) return;
    const fmt = kind === 'big' ? bigInner : kind === 'eur' ? v => eur(v, { sign }) : v => eur0(v);
    const t0 = performance.now(), dur = 760;
    const step = now => {
      if (!el.isConnected) return;
      const q = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - q, 4);
      el.innerHTML = fmt(q >= 1 ? to : from + (to - from) * e);
      if (q < 1) requestAnimationFrame(step);
    };
    el.innerHTML = fmt(from);
    requestAnimationFrame(step);
  });
}

/* ---------- intestazione fissa: il filo sotto compare solo quando la pagina ci scorre sotto ---------- */
(function () {
  const on = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', on, { passive: true });
  on();
})();

/* ---------- grafici e barre che si disegnano, riga nuova evidenziata ---------- */
function decorate(root) {
  $$('.chart .ln:not(.dash)', root).forEach(p => { p.setAttribute('pathLength', '1'); p.classList.add('draw'); });
  $$('.chart .bgrp', root).forEach((g, i) => $$('rect.b-in, rect.b-out', g).forEach(r => { r.style.animationDelay = (i * 35) + 'ms'; }));
  $$('.brows .brow, .bud-tot, .bud-hero, .gcard, .gbig', root).forEach((r, i) => { const b = r.querySelector('.bar i'); if (b) b.style.animationDelay = (80 + i * 45) + 'ms'; });
  if (MOTION.freshId) {
    const r = root.querySelector(`.mrow[data-id="${MOTION.freshId}"]`);
    if (r) r.classList.add('fresh');
    MOTION.freshId = null;
  }
}

/* ---------- scorri per eliminare ---------- */
const SW = { p: null, open: null, block: 0, side: -1 };
function wrapSwipe(row) {
  if (row.parentNode.classList.contains('mswipe')) return row.parentNode;
  const w = document.createElement('div');
  w.className = 'mswipe';
  row.parentNode.insertBefore(w, row);
  w.innerHTML = `<button class="mdup" data-a="swDup" tabindex="-1" aria-label="Duplica con la data di oggi">${ic('copy', 22)}<span>Duplica</span></button><button class="mdel" data-a="swDel" tabindex="-1" aria-label="Elimina">${ic('trash', 22)}<span>Elimina</span></button>`;
  w.appendChild(row);
  return w;
}
function closeSwipe(row = SW.open) {
  if (!row) return;
  row.style.transform = '';
  if (SW.open === row) SW.open = null;
}
function deleteMovement(m) {
  D.movements = D.movements.filter(x => x !== m);
  if (m.cardDebit) { const ca = acc(m.cardDebit); if (ca) ca.skipDebits = (ca.skipDebits || []).concat(m.cycle); }
  if (m.pacOf) pacUndo(m);
  if (m.interestOf) { const ia = acc(m.interestOf); if (ia && ia.interest) ia.interest.skip = (ia.interest.skip || []).concat(m.period); }
  save(); refresh();
  toast('Movimento eliminato', (m.pacOf || m.cardDebit || m.interestOf) ? undefined : { label: 'Annulla', fn: () => { D.movements.push(m); MOTION.freshId = m.id; save(); refresh(); hap(); } });
  if (m.photoId) setTimeout(() => { if (!D || !D.movements.some(x => x.photoId === m.photoId)) PhotoDB.del(m.photoId).catch(() => { }); }, 8000);
}
function swipeDelete(row) {
  const m = D.movements.find(x => x.id === row.dataset.id);
  if (!m) return closeSwipe(row);
  hap('warn');
  SW.open = null;
  const w = row.parentNode;
  w.style.height = w.offsetHeight + 'px';
  row.style.transform = 'translateX(-110%)';
  requestAnimationFrame(() => w.classList.add('gone'));
  setTimeout(() => deleteMovement(m), RM() ? 0 : 300);
}
ACT.swDel = el => { const r = el.parentNode.querySelector('.mrow'); if (r) swipeDelete(r); };
const canDup = m => m && (m.type === 'in' || m.type === 'out' || m.type === 'transfer') && !m.cardDebit && !m.pacOf && !m.interestOf && !m.sinkOf;
function swipeDup(row) {
  const m = D.movements.find(x => x.id === row.dataset.id);
  closeSwipe(row);
  if (!canDup(m)) return;
  const n = cloneMov(m);
  D.movements.push(n);
  MOTION.freshId = n.id;
  hap('ok');
  save(); refresh();
  toast('Duplicato con la data di oggi');
}
ACT.swDup = el => { const r = el.parentNode.querySelector('.mrow'); if (r) swipeDup(r); };
document.addEventListener('pointerdown', e => {
  const row = e.target.closest && e.target.closest('#view .mrow[data-a="movOpen"]');
  if (SW.open && SW.open !== row && !(e.target.closest && e.target.closest('.mdel, .mdup'))) closeSwipe();
  if (!row || e.button > 0) return;
  const m = D && D.movements.find(x => x.id === row.dataset.id);
  SW.p = { row, x: e.clientX, y: e.clientY, dx: 0, moved: false, base: row === SW.open ? SW.side * 88 : 0, id: e.pointerId, hap: false, dup: canDup(m) };
}, { passive: true });
document.addEventListener('pointermove', e => {
  const p = SW.p;
  if (!p || e.pointerId !== p.id) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (!p.moved) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) { p.moved = true; wrapSwipe(p.row).classList.add('drag'); }
    else { if (Math.abs(dy) > 10) SW.p = null; return; }
  }
  let x = p.base + dx;
  if (x > 0 && !p.dup) x *= 0.2;
  if (x > 170) x = 170 + (x - 170) * 0.3;
  if (x < -170) x = -170 + (x + 170) * 0.3;
  if (!p.hap && Math.abs(x) > 120) { p.hap = true; hap(); } else if (p.hap && Math.abs(x) < 120) p.hap = false;
  p.dx = x;
  const w = p.row.parentNode; if (w && w.classList.contains('mswipe')) w.dataset.dir = x > 0 ? 'r' : 'l';
  p.row.style.transform = `translateX(${x}px)`;
}, { passive: true });
function swipeEnd(e) {
  const p = SW.p;
  if (!p || (e && e.pointerId !== p.id)) return;
  SW.p = null;
  if (!p.moved) return;
  SW.block = Date.now();
  const w = p.row.parentNode;
  if (w) w.classList.remove('drag');
  if (e && e.type === 'pointercancel') { closeSwipe(p.row); return; }
  if (p.dx < -120) swipeDelete(p.row);
  else if (p.dx < -44) { p.row.style.transform = 'translateX(-88px)'; SW.open = p.row; SW.side = -1; }
  else if (p.dup && p.dx > 120) swipeDup(p.row);
  else if (p.dup && p.dx > 44) { p.row.style.transform = 'translateX(88px)'; SW.open = p.row; SW.side = 1; }
  else closeSwipe(p.row);
}
document.addEventListener('pointerup', swipeEnd);
document.addEventListener('pointercancel', swipeEnd);
document.addEventListener('click', e => {
  if (Date.now() - SW.block < 400) { e.stopPropagation(); e.preventDefault(); return; }
  if (SW.open && !(e.target.closest && e.target.closest('.mdel, .mdup'))) {
    const r = SW.open, row = e.target.closest && e.target.closest('.mrow');
    closeSwipe(r);
    if (row === r) { e.stopPropagation(); e.preventDefault(); }
  }
}, true);


/* ---------- impostazioni da applicare all'avvio ---------- */
function bootExtras() {
  try { HIDE = !!(D && D.settings.hideOnOpen) || localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { }
  if (D && syncAuto()) save({ undo: false });
}

