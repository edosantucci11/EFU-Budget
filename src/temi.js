/* =========================================================
   Temi (dalla 2.5)
   Nativo è il tema di partenza; gli altri si scelgono in
   Impostazioni → Tema. Un tema cambia solo colori, caratteri e
   forme: lo stile vive in style.css sotto :root[data-style="…"].
   Chiaro e scuro continuano a seguire l'iPhone.
   ========================================================= */
const STYLES = [
  ['nativo', 'Nativo', 'Come le app di Apple', ['#F2F2F7', '#FFFFFF', '#007AFF']],
  ['inchiostro', 'Inchiostro', 'Bianco e nero, cifre classiche', ['#FFFFFF', '#111111', '#1D7A3C']],
  ['petrolio', 'Petrolio', 'Blu petrolio e forme morbide', ['#EFF4F6', '#0E6D8C', '#10242C']],
  ['bento', 'Bento', 'Blocchi color pastello', ['#FFF0C2', '#DCEAFF', '#4338CA']],
  ['sera', 'Sera', 'Prugna e pesca, pensato per lo scuro', ['#140D19', '#B4366A', '#FFB08A']],
  ['vetro', 'Vetro', 'Riquadri traslucidi su sfumature', ['#FFD3E4', '#CFE3FF', '#22222E']]
];
const styleId = () => { const s = D && D.settings && D.settings.style; return STYLES.some(x => x[0] === s) ? s : 'nativo'; };
const styleName = () => STYLES.find(x => x[0] === styleId())[1];
function applyStyle() {
  const s = styleId(), de = document.documentElement;
  if (de.dataset.style !== s) de.dataset.style = s;
}
SETTINGS.style = function () {
  const cur = styleId();
  let h = sheetHead('Tema', { back: true, grab: false }) + '<div class="sheet-body">';
  h += `<p class="muted sm">Cambia colori, caratteri e forme dell'app. Chiaro e scuro seguono le impostazioni dell'iPhone; i tuoi dati non cambiano.</p>`;
  h += `<div class="stg">${STYLES.map(([id, n, dsc, sw]) => `<button class="stc ${id === cur ? 'on' : ''}" data-a="styleSet" data-v="${id}" aria-pressed="${id === cur}"><span class="stc-p" aria-hidden="true">${sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${n}</b><small>${dsc}</small>${id === cur ? `<span class="stc-ok">${ic('check', 16)}</span>` : ''}</button>`).join('')}</div>`;
  return h + '</div>';
};
ACT.styleSet = el => {
  if (D.settings.style === el.dataset.v) return;
  D.settings.style = el.dataset.v;
  save({ undo: false }); applyStyle(); hap();
  drawSheet(sheetOf(el)); render();
};
