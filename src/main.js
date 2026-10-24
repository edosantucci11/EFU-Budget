/* =========================================================
   Avvio
   ========================================================= */
let HIDDEN_AT = 0;
function onVis() {
  if (document.hidden) { HIDDEN_AT = Date.now(); return; }
  if (D && D.settings.pin && !UI.locked && HIDDEN_AT && (Date.now() - HIDDEN_AT) / 1000 >= (D.settings.lockAfter || 0)) showLock();
  HIDDEN_AT = 0;
  if (D) autoPrices(false);
  if (UI.day !== today()) {
    const old = mk(UI.day);
    UI.day = today();
    invalidate();
    if (UI.month === old) UI.month = curMk();
    if (UI.filters.period === 'm:' + old) UI.filters.period = 'm:' + curMk();
    if (UI.statsYear === Number(old.slice(0, 4))) UI.statsYear = Number(curMk().slice(0, 4));
    if (D) { if (syncAuto()) save({ undo: false }); INV_ASKED = false; refresh(); setTimeout(invReminderCheck, 800); }
  }
}
const SPLASH_T0 = Date.now();
function hideSplash(now) {
  const s = document.getElementById('splash');
  if (!s || s.classList.contains('out')) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = now ? 0 : Math.max(0, (reduce ? 500 : 1200) - (Date.now() - SPLASH_T0));
  setTimeout(() => { s.classList.add('out'); setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, 450); }, wait);
}
setTimeout(() => hideSplash(true), 5000);
function boot() {
  D = load();
  bootExtras();
  initCapabilities();
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pageshow', e => { if (e.persisted) onVis(); });
  if (D && D.settings.pin) showLock();
  render();
  hideSplash();
  setTimeout(invReminderCheck, 1800);
  setTimeout(() => autoPrices(false), 2600);
  if (IS_PACKAGE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

