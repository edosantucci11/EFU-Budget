/* =========================================================
   Interfaccia: icone, rendering, fogli a comparsa, eventi
   ========================================================= */
const ICONS = {
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
  home: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.1"/><circle cx="4.6" cy="12" r="1.1"/><circle cx="4.6" cy="17.5" r="1.1"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8.8 15.2l2.1 2.1 4.3-4.3"/>',
  chart: '<path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.2" height="6.5" rx="1"/><rect x="10.4" y="5.5" width="3.2" height="12" rx="1"/><rect x="15.8" y="13.5" width="3.2" height="4" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<path d="M4 7h8.5M16.5 7H20M4 17h3.5M11.5 17H20"/><circle cx="14.5" cy="7" r="2"/><circle cx="9.5" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  left: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  right: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  up: '<path d="m6 14.5 6-6 6 6"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2L9.2 5h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16 14.6c2.3 0 4 1.5 4.5 4.4"/>',
  tag: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  swap: '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 17h.01"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
  upload: '<path d="M12 15.5V4.5M7 9l5-5 5 5M5 19.5h14"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11.5" rx="2.5"/><circle cx="16" cy="13.8" r="1.2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  repeat: '<path d="M17 3.5 20 6.5l-3 3"/><path d="M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20"/><path d="M7 20.5 4 17.5l3-3"/><path d="M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.5 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.5-3.5-8.5s1-5.9 3.5-8.5z"/>',
  file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/>',
  backspace: '<path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12z"/><path d="m11.5 9.5 5 5M16.5 9.5l-5 5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 11H5.5v9.5h13V11H17"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  spark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4 18 18M6 18l2.6-2.6M15.4 8.6 18 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.4 17.4 0 0 1-2.2 3.2"/><path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'
};
const ic = (n, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const tint = c => (c || '#7A8B99') + '24';
const avatar = (emoji, color, cls = '') => `<span class="av ${cls}" style="background:${tint(color)}">${esc(emoji || '🏷️')}</span>`;

/* ---------- stato dell'interfaccia ---------- */
const UI = {
  tab: 'home', month: curMk(), planTab: 'fixed', statsMode: 'month', statsYear: new Date().getFullYear(),
  q: '', filters: null, sheets: [], locked: false, pin: '', lockForgot: false, day: today()
};
const blankFilters = () => ({ period: 'm:' + curMk(), type: 'all', cats: [], accs: [], tags: [], photo: false, split: false, fx: false });
UI.filters = blankFilters();

const ACT = {}, INP = {}, CHG = {}, VIEWS = {}, SHEETS = {};

/* ---------- rendering principale ---------- */
function render() {
  const view = $('#view'), bar = $('#tabbar');
  if (!D) { bar.hidden = true; view.innerHTML = VIEWS.onboarding(); view.className = 'view onb-view'; return; }
  bar.hidden = false;
  view.className = 'view';
  view.innerHTML = (VIEWS[UI.tab] || VIEWS.home)();
  renderTabbar();
  hydrate(view);
  // movimento: ingresso animato solo quando cambi sezione, poi numeri e grafici
  if ((MOTION.entering || MOTION.first) && !RM()) {
    view.classList.add('entering');
    if (MOTION.navDir) view.classList.add('in-' + MOTION.navDir);
    clearTimeout(MOTION.et);
    MOTION.et = setTimeout(() => view.classList.remove('entering', 'in-fwd', 'in-back'), 1500);
  }
  MOTION.navDir = '';
  decorate(view);
  countUp(view);
  MOTION.entering = false; MOTION.first = false;
  updateBadge();
}
/* barra in basso: la scheda attiva scivola al suo posto */
function renderTabbar() {
  const bar = $('#tabbar');
  const n = dueBadge();
  const tabs = [['home', 'home', 'Home'], ['movs', 'list', 'Movimenti'], ['plan', 'plan', 'Pianifica'], ['stats', 'chart', 'Statistiche']];
  let pill = bar.querySelector('.fpill');
  if (!pill) {
    bar.innerHTML = `<div class="fbar"><nav class="fpill"><span class="find" aria-hidden="true"></span>${tabs.map(([t, , l]) => `<button class="ftab" data-a="tab" data-t="${t}" aria-label="${l}" title="${l}"></button>`).join('')}</nav><button class="ffab" data-a="add" aria-label="Aggiungi movimento">${ic('plus', 28)}</button></div>`;
    pill = bar.querySelector('.fpill');
  }
  const btns = pill.querySelectorAll('.ftab');
  tabs.forEach(([t, icon], i) => {
    const b = btns[i], on = UI.tab === t;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    const l = tabs[i][2];
    const h = ic(icon, 22) + `<span class="fl" aria-hidden="true">${l}</span>` + (t === 'plan' && n ? `<i class="badge">${n}</i>` : '');
    if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; }
  });
  pill.style.setProperty('--ti', Math.max(0, TAB_ORDER.indexOf(UI.tab)));
}
function hydrate(root) {
  $$('img[data-photo]', root).forEach(img => {
    photoURL(img.dataset.photo).then(u => { if (u) img.src = u; else img.closest('.ph-prev, .ph-thumb')?.classList.add('missing'); }).catch(() => { });
  });
}
function refresh() {
  render();
  UI.sheets.slice(0, -1).forEach(drawSheet);
  const top = topSheet();
  if (top && SHEETS[top.type].live) drawSheet(top);
}
function goTab(t) {
  if (UI.tab === t) { window.scrollTo({ top: 0, behavior: RM() ? 'auto' : 'smooth' }); return; }
  hap();
  closeSwipe();
  const dir = TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(UI.tab) ? 'fwd' : 'back';
  const swap = () => { UI.tab = t; MOTION.entering = true; render(); window.scrollTo(0, 0); };
  if (VT_OK()) {
    const de = document.documentElement;
    de.dataset.nav = dir;
    try {
      const vt = document.startViewTransition(swap);
      const clean = () => { if (de.dataset.nav === dir) delete de.dataset.nav; };
      vt.finished.then(clean, clean);
      return;
    } catch (e) { delete de.dataset.nav; }
  }
  MOTION.navDir = RM() ? '' : dir;
  swap();
}

/* ---------- fogli a comparsa ---------- */
function openSheet(type, props = {}) {
  const def = SHEETS[type];
  const sh = { id: uid(), type, props, st: def.init ? def.init(props) : {} };
  UI.sheets.push(sh);
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (def.full ? ' is-full' : '');
  wrap.id = 'sh-' + sh.id;
  wrap.innerHTML = `<div class="scrim" data-a="scrim"></div><section class="sheet${def.full ? ' full' : ''}${def.cls ? ' ' + def.cls : ''}" role="dialog" aria-modal="true"></section>`;
  $('#sheets').appendChild(wrap);
  lockBody(true);
  drawSheet(sh);
  wrap.getBoundingClientRect();
  requestAnimationFrame(() => wrap.classList.add('in'));
  return sh;
}
function drawSheet(sh) {
  const el = $('#sh-' + sh.id + ' .sheet');
  if (!el) return;
  const body = el.querySelector('.sheet-body');
  const sc = body ? body.scrollTop : 0;
  el.innerHTML = SHEETS[sh.type].render(sh.st, sh);
  const nb = el.querySelector('.sheet-body');
  if (nb && sc) nb.scrollTop = sc;
  if (!SHEETS[sh.type].full) attachDrag(el, sh);
  hydrate(el);
  if (SHEETS[sh.type].after) SHEETS[sh.type].after(sh, el);
  // attese reali: il pulsante che sta lavorando («Preparo il backup…») si anima
  $$('.sheet-foot .btn', el).forEach(b => { if (/…\s*$/.test(b.textContent || '')) b.classList.add('is-busy'); });
}
function closeSheet(sh = topSheet()) {
  if (!sh) return;
  UI.sheets = UI.sheets.filter(s => s !== sh);
  const w = $('#sh-' + sh.id);
  if (w) { w.classList.remove('in'); setTimeout(() => w.remove(), 340); }
  if (SHEETS[sh.type].onClose) SHEETS[sh.type].onClose(sh);
  if (!UI.sheets.length) lockBody(false);
}
const topSheet = () => UI.sheets[UI.sheets.length - 1];
function sheetOf(el) {
  const w = el && el.closest ? el.closest('.sheet-wrap') : null;
  if (!w) return null;
  return UI.sheets.find(s => 'sh-' + s.id === w.id) || null;
}
const sheetEl = sh => $('#sh-' + sh.id + ' .sheet');
function lockBody(on) {
  const b = document.body;
  if (on && !b.classList.contains('modal-open')) {
    UI.scrollY = window.scrollY;
    b.style.top = -UI.scrollY + 'px';
    b.classList.add('modal-open');
  } else if (!on && b.classList.contains('modal-open')) {
    b.classList.remove('modal-open');
    b.style.top = '';
    window.scrollTo(0, UI.scrollY || 0);
  }
}
// trascina verso il basso per chiudere i fogli non a schermo intero
function attachDrag(el, sh) {
  const handle = el.querySelector('.sh-h');
  if (!handle || handle.dataset.drag) return;
  handle.dataset.drag = '1';
  let y0 = null, dy = 0;
  handle.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
  handle.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, { passive: true });
  handle.addEventListener('touchend', () => {
    el.style.transition = '';
    el.style.transform = '';
    if (dy > 90) closeSheet(sh);
    y0 = null;
  });
}
function sheetHead(title, o = {}) {
  const left = o.back ? `<button class="icon-btn ghost" data-a="sheetBack" aria-label="Indietro">${ic('left', 22)}</button>` : `<button class="icon-btn ghost" data-a="closeSheet" aria-label="Chiudi">${ic('close', 22)}</button>`;
  return `<header class="sh-h">${o.grab === false ? '' : '<span class="grab" aria-hidden="true"></span>'}${left}<h2>${esc(title)}</h2><div class="sh-r">${o.right || ''}</div></header>`;
}

/* ---------- dialoghi di conferma ---------- */
SHEETS.confirm = {
  init: p => ({}),
  render: (st, sh) => {
    const p = sh.props;
    return `${sheetHead(p.title)}<div class="sheet-body"><p class="lead">${p.text || ''}</p></div>
    <footer class="sheet-foot two"><button class="btn outline" data-a="closeSheet">${esc(p.cancel || 'Annulla')}</button><button class="btn ${p.danger ? 'danger' : 'dark'}" data-a="confirmOk">${esc(p.ok || 'Conferma')}</button></footer>`;
  }
};
ACT.confirmOk = el => { const sh = sheetOf(el); if (sh.props.danger) hap('warn'); closeSheet(sh); sh.props.onOk && sh.props.onOk(); };
const confirmBox = (title, text, ok, onOk, danger = true) => openSheet('confirm', { title, text, ok, onOk, danger });

/* ---------- toast ---------- */
let TOAST_ACT = null;
function toast(msg, action) {
  if (action === undefined && UNDO_ARMED && UNDO.length) action = { label: 'Annulla', fn: undoLast };
  UNDO_ARMED = false;
  const t = $('#toast');
  if (!t) return;
  TOAST_ACT = action || null;
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-a="toastAct">${esc(action.label)}</button>` : ''}`;
  t.classList.add('on');
  t.classList.toggle('above-sheet', UI.sheets.length > 0);
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.remove('on'), action ? 5500 : 2800);
}
ACT.toastAct = () => { const a = TOAST_ACT; $('#toast').classList.remove('on'); TOAST_ACT = null; a && a.fn(); };

/* ---------- eventi ---------- */
function onClick(e) {
  const t = e.target.closest('[data-a]');
  if (!t || t.disabled) return;
  const fn = ACT[t.dataset.a];
  if (!fn) return;
  e.preventDefault();
  UNDO_ARMED = false;
  try { fn(t, e); } catch (err) { console.error(err); toast('Qualcosa è andato storto: ' + err.message, null); }
}
function onInput(e) {
  const t = e.target.closest('[data-in]');
  if (t && INP[t.dataset.in]) INP[t.dataset.in](t, e);
}
function onChange(e) {
  const t = e.target.closest('[data-ch]');
  if (t && CHG[t.dataset.ch]) { UNDO_ARMED = false; CHG[t.dataset.ch](t, e); }
}
function onKey(e) {
  if (UI.locked) {
    if (/^[0-9]$/.test(e.key)) lockPress(e.key);
    else if (e.key === 'Backspace') lockPress('del');
    return;
  }
  const t = e.target;
  if (t && t.dataset && t.dataset.kd && KEYS[t.dataset.kd]) return KEYS[t.dataset.kd](t, e);
  const top = topSheet();
  if (e.key === 'Escape' && top) { closeSheet(top); return; }
  if (top && top.type === 'mov' && top.st.step === 'amount' && !(t && /INPUT|TEXTAREA/.test(t.tagName))) {
    if (/^[0-9]$/.test(e.key)) pressKey(top, e.key);
    else if (e.key === ',' || e.key === '.') pressKey(top, ',');
    else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/' || e.key === 'x') pressKey(top, e.key === 'x' ? '*' : e.key);
    else if (e.key === 'Backspace') pressKey(top, 'del');
    else if (e.key === 'Enter') ACT.movNext(sheetEl(top));
  }
}
const KEYS = {};

/* azioni generiche */
ACT.tab = el => goTab(el.dataset.t);
ACT.closeSheet = el => closeSheet(sheetOf(el));
ACT.scrim = el => { const sh = sheetOf(el); if (sh && !SHEETS[sh.type].modal) closeSheet(sh); };
ACT.sheetBack = el => { const sh = sheetOf(el); const def = SHEETS[sh.type]; if (def.back) def.back(sh); else closeSheet(sh); };
// imposta un campo dello stato del foglio: data-f, data-v (data-num per numeri)
ACT.pick = el => {
  const sh = sheetOf(el), f = el.dataset.f;
  let v = el.dataset.v;
  if (el.dataset.num != null) v = Number(v);
  sh.st[f] = v;
  drawSheet(sh);
};
ACT.toggle = el => { const sh = sheetOf(el), f = el.dataset.f; sh.st[f] = !sh.st[f]; drawSheet(sh); };
INP.set = el => { const sh = sheetOf(el); if (sh) sh.st[el.dataset.f] = el.value; };
CHG.set = el => { const sh = sheetOf(el); if (sh) { sh.st[el.dataset.f] = el.value; drawSheet(sh); } };

/* ---------- blocco con codice ---------- */
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (const b of data) { h ^= b; h = Math.imul(h, 16777619); }
  return 'f' + (h >>> 0).toString(16);
}
function showLock() {
  UI.locked = true; UI.pin = ''; UI.lockForgot = false;
  drawLock();
  $('#lock').classList.add('on');
  $('#lock').setAttribute('aria-hidden', 'false');
}
function hideLock() {
  UI.locked = false; UI.pin = '';
  $('#lock').classList.remove('on');
  $('#lock').setAttribute('aria-hidden', 'true');
  $('#lock').innerHTML = '';
}
function pinPad(action) {
  return `<div class="keypad pin">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(k => k ? `<button class="key" data-a="${action}" data-k="${k}" aria-label="${k === 'del' ? 'Cancella' : k}">${k === 'del' ? ic('backspace', 26) : k}</button>` : '<span></span>').join('')}</div>`;
}
const pinDots = (n, cls = '') => `<div class="dots ${cls}">${[0, 1, 2, 3].map(i => `<i class="${n > i ? 'f' : ''}"></i>`).join('')}</div>`;
function drawLock(err) {
  const el = $('#lock');
  if (UI.lockForgot) {
    const sure = UI.lockForgot === 'sure';
    el.innerHTML = `<div class="lock-in"><div class="lock-ic">${ic('lock', 28)}</div><h2>${sure ? 'Sei sicuro?' : 'Codice dimenticato'}</h2>
    <p class="lead center">${sure ? 'Tutti i movimenti, le spese fisse e le foto verranno cancellati da questo dispositivo. Potrai ripristinare un backup subito dopo.' : "Il codice non si può recuperare. Puoi cancellare i dati dell'app da questo dispositivo e poi ripristinare un backup, se ne hai uno."}</p>
    <button class="btn danger w" data-a="lockWipe">${sure ? 'Sì, cancella tutto' : 'Cancella tutti i dati'}</button><button class="link" data-a="lockBack">Torna al codice</button></div>`;
    return;
  }
  el.innerHTML = `<div class="lock-in"><div class="lock-ic">${ic('lock', 28)}</div><h2>Inserisci il codice</h2>${pinDots(UI.pin.length, err ? 'shake' : '')}<p class="lock-err">${err ? 'Codice errato' : ''}</p>${pinPad('lockKey')}<button class="link" data-a="lockForgot">Codice dimenticato?</button></div>`;
}
async function lockPress(k) {
  if (k === 'del') UI.pin = UI.pin.slice(0, -1);
  else if (UI.pin.length < 4) UI.pin += k;
  drawLock();
  if (UI.pin.length === 4) {
    const p = D.settings.pin;
    const h = await hashPin(UI.pin, p.salt);
    if (h === p.hash) hideLock();
    else { UI.pin = ''; drawLock(true); }
  }
}
ACT.lockKey = el => lockPress(el.dataset.k);
ACT.lockForgot = () => { UI.lockForgot = true; drawLock(); };
ACT.lockBack = () => { UI.lockForgot = false; drawLock(); };
ACT.lockWipe = () => {
  if (UI.lockForgot !== 'sure') { UI.lockForgot = 'sure'; drawLock(); return; }
  wipeStorage(); D = null; hideLock(); UI.sheets.slice().forEach(s => closeSheet(s)); render();
};

