/* =========================================================
   Azioni delle schermate, impostazioni, import/export, backup
   ========================================================= */
ACT.month = el => { UI.month = addM(UI.month, Number(el.dataset.d)); render(); };
ACT.pickMonth = () => openSheet('monthPick', {});
ACT.settings = () => openSheet('settings', {});
ACT.planGo = el => { if (el && el.closest && el.closest('.sheet-wrap')) UI.sheets.slice().reverse().forEach(s => closeSheet(s)); UI.planTab = el.dataset.p; if (UI.tab === 'plan') { render(); window.scrollTo(0, 0); } else goTab('plan'); };
ACT.planTab = el => { UI.planTab = el.dataset.k; render(); };
ACT.seeMonth = el => { UI.filters = blankFilters(); UI.filters.period = 'm:' + el.dataset.k; UI.q = ''; UI.limit = 0; goTab('movs'); };
ACT.catMovs = el => { UI.filters = blankFilters(); UI.filters.cats = [el.dataset.id]; UI.filters.period = 'm:' + el.dataset.k; UI.q = ''; UI.limit = 0; goTab('movs'); };
function refreshMovList() {
  const l = $('#mvList'); if (l) { l.innerHTML = movListHTML(); hydrate(l); }
  const c = $('#fchips'); if (c) c.innerHTML = filterChips();
}
INP.search = el => { UI.q = el.value; UI.limit = 0; const l = $('#mvList'); if (l) { l.innerHTML = movListHTML(); hydrate(l); } const c = $('#fchips'); if (c) c.innerHTML = filterChips(); };
ACT.clearQ = () => { UI.q = ''; const i = $('#q'); if (i) i.value = ''; refreshMovList(); const c = $('#fchips'); if (c) c.innerHTML = filterChips(); };
ACT.setPeriod = el => { UI.filters.period = el.dataset.p; UI.limit = 0; refreshMovList(); };
ACT.openFilters = () => openSheet('filters', {});
ACT.resetFilters = () => { const p = UI.filters.period; UI.filters = blankFilters(); UI.filters.period = p; UI.q = ''; UI.limit = 0; render(); };
ACT.moreMovs = () => { UI.limit = (UI.limit || 250) + 250; refreshMovList(); };
ACT.statsMode = el => { UI.statsMode = el.dataset.k; if (UI.statsMode === 'year') UI.statsYear = Number(UI.month.slice(0, 4)); render(); };
ACT.statsYear = el => { UI.statsYear += Number(el.dataset.d); render(); };
ACT.goMonth = el => { UI.month = el.dataset.k; UI.statsMode = 'month'; if (UI.tab !== 'stats') goTab('stats'); else { render(); window.scrollTo(0, 0); } };
ACT.demoExit = () => confirmBox('Iniziare con i tuoi dati?', 'I dati di esempio verranno cancellati da questo dispositivo.', "Cancella l'esempio", () => { wipeStorage(); D = null; UI.tab = 'home'; UI.month = curMk(); UI.filters = blankFilters(); render(); });
ACT.installClose = () => { D.settings.installHintClosed = true; save({ undo: false }); render(); };
ACT.recap = el => openSheet('recap', { k: el.dataset.k });
ACT.onbStart = () => openSheet('start', {});
ACT.onbImport = () => openSheet('importAny', {});
ACT.onbDemo = () => { D = seedDemo(); save(); UI.tab = 'home'; UI.month = curMk(); render(); toast('Dati di esempio caricati'); };
ACT.accRestore = el => { const a = acc(el.dataset.id); if (a) { a.archived = false; save(); refresh(); toast('Conto ripristinato'); } };
function appIconSVG(s = 44) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="aig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF385C"/><stop offset="1" stop-color="#D70466"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#aig)"/><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"><path d="M32 14A18 18 0 0 1 45.79 43.57"/><path d="M36.96 49.3A18 18 0 0 1 15.82 39.89" opacity=".8"/><path d="M14.17 29.49A18 18 0 0 1 21.93 17.08" opacity=".6"/></g></svg>`;
}

/* ---------- filtri ---------- */
SHEETS.filters = {
  cls: 'tall',
  init: () => JSON.parse(JSON.stringify(UI.filters)),
  render(st) {
    const types = [['all', 'Tutti'], ['out', 'Uscite'], ['in', 'Entrate'], ['transfer', 'Trasferimenti e rimborsi']];
    const n = filteredMovs(st).length;
    const arr = (f, items) => `<div class="chips wrap">${items.map(([v, l]) => `<button class="chip ${st[f].includes(v) ? 'on' : ''}" data-a="fArr" data-f="${f}" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
    let h = sheetHead('Filtri') + '<div class="sheet-body">';
    h += fieldLabel('Tipo') + `<div class="chips wrap">${types.map(([k, l]) => `<button class="chip ${st.type === k ? 'on' : ''}" data-a="pick" data-f="type" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += fieldLabel('Categorie') + arr('cats', D.categories.filter(c => !c.archived || st.cats.includes(c.id)).map(c => [c.id, esc(c.emoji) + ' ' + esc(c.name)]));
    h += fieldLabel('Conti e salvadanai') + arr('accs', D.accounts.filter(a => !a.archived || st.accs.includes(a.id)).map(a => [a.id, esc(a.emoji || '🏦') + ' ' + esc(a.name)]));
    const tags = allTags();
    if (tags.length) h += fieldLabel('Tag') + arr('tags', tags.map(t => [t, '#' + esc(t)]));
    h += fieldLabel('Altro') + swRow('Con la foto dello scontrino', 'photo', st.photo) + swRow('Spese divise', 'split', st.split) + swRow('In valuta estera', 'fx', st.fx);
    return h + `</div><footer class="sheet-foot split"><button class="link" data-a="fClear">Cancella tutto</button><button class="btn dark" data-a="fApply">Mostra ${n} ${n === 1 ? 'movimento' : 'movimenti'}</button></footer>`;
  }
};
ACT.fArr = el => { const sh = sheetOf(el), f = el.dataset.f, v = el.dataset.v, a = sh.st[f]; sh.st[f] = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); drawSheet(sh); };
ACT.fClear = el => { const sh = sheetOf(el), p = sh.st.period; sh.st = blankFilters(); sh.st.period = p; drawSheet(sh); };
ACT.fApply = el => { const sh = sheetOf(el); UI.filters = sh.st; UI.limit = 0; closeSheet(sh); render(); };

/* ---------- scelta del mese ---------- */
SHEETS.monthPick = {
  init: () => ({ y: Number(UI.month.slice(0, 4)) }),
  render(st) {
    const has = new Set(D.movements.map(m => mk(m.date)));
    return sheetHead('Scegli il mese') + `<div class="sheet-body"><div class="msw center"><button class="icon-btn sm" data-a="mpYear" data-d="-1" aria-label="Anno precedente">${ic('left', 18)}</button><span class="msw-l">${st.y}</span><button class="icon-btn sm" data-a="mpYear" data-d="1" aria-label="Anno successivo">${ic('right', 18)}</button></div>
    <div class="mgrid">${MESI.map((m, i) => { const k = st.y + '-' + pad(i + 1); return `<button class="mcell ${k === UI.month ? 'on' : ''} ${k === curMk() ? 'cur' : ''}" data-a="mpPick" data-k="${k}">${cap(m)}${has.has(k) ? '<i aria-hidden="true"></i>' : ''}</button>`; }).join('')}</div>
    ${UI.month !== curMk() ? `<button class="btn outline w gap-t" data-a="mpPick" data-k="${curMk()}">Torna al mese corrente</button>` : ''}</div>`;
  }
};
ACT.mpYear = el => { const sh = sheetOf(el); sh.st.y += Number(el.dataset.d); drawSheet(sh); };
ACT.mpPick = el => { const sh = sheetOf(el); UI.month = el.dataset.k; closeSheet(sh); render(); };

/* ---------- riepilogo mensile ---------- */
SHEETS.recap = {
  cls: 'tall',
  render(st, sh) {
    const k = sh.props.k, ms = monthStats(k), pk = addM(k, -1), pm = monthStats(pk), ck = curMk();
    const mName = MESI[Number(k.slice(5)) - 1];
    const outs = spendParts(ms), tot = sum(outs.map(p => p.v)), movs = monthMovs(k);
    const big = movs.filter(m => m.type === 'out').sort((a, b) => eff(b) - eff(a))[0];
    const lastDay = k === ck ? Number(today().slice(8)) : k < ck ? dim(k) : 0;
    const spentDays = new Set(movs.filter(m => m.type === 'out').map(m => Number(m.date.slice(8))).filter(d => d <= lastDay));
    const bc = activeCats('out').filter(c => c.budget > 0), okB = bc.filter(c => (ms.byCat[c.id] || 0) <= c.budget).length;
    const diff = pm.out > 0 ? (ms.out - pm.out) / pm.out : null;
    let h = sheetHead(cap(mName) + ' in breve') + '<div class="sheet-body recap-b">';
    h += `<div class="rc hero-rc"><span>Risultato del mese</span><b class="num">${eur(ms.net, { sign: true })}</b><p>${ms.rate == null ? 'Nessuna entrata registrata nel mese.' : ms.rate >= 0 ? `Hai tenuto il ${pct(ms.rate)} di quello che è entrato.` : 'Hai speso più di quanto è entrato.'}</p></div>`;
    h += `<div class="rc-row"><div class="rc"><span>Entrate</span><b class="num pos">${eur(ms.inc)}</b></div><div class="rc"><span>Uscite</span><b class="num out">${eur(ms.out)}</b></div></div>`;
    if (outs.length) h += `<div class="rc"><span>Dove sono andati i soldi</span><div class="rc-top">${avatar(outs[0].c.emoji, outs[0].c.color, 'lg')}<div><b>${esc(outs[0].c.name)}</b><p class="muted">${eur(outs[0].v)}, il ${pct(outs[0].v / tot)} delle uscite</p></div></div>${outs.slice(1, 3).map(p => `<p class="rc-l"><i style="background:${p.c.color}"></i>${esc(p.c.name)}<span class="num">${eur(p.v)}</span></p>`).join('')}</div>`;
    if (big) h += `<div class="rc"><span>La spesa più grande</span><b>${esc(big.description || (cat(big.categoryId) || {}).name || 'Spesa')}</b><p class="muted"><span class="num">${eur(eff(big))}</span>, ${esc(dayTitle(big.date).toLowerCase())}</p></div>`;
    const cards = [];
    if (lastDay) cards.push(['Giorni senza spese', `${lastDay - spentDays.size} su ${lastDay}`]);
    if (bc.length) cards.push(['Budget rispettati', `${okB} su ${bc.length}`]);
    if (diff != null) cards.push([`Uscite rispetto a ${MESI[Number(pk.slice(5)) - 1]}`, `${diff > 0.0005 ? '+' : diff < -0.0005 ? '−' : ''}${pct(Math.abs(diff))}`]);
    if (ms.saved) cards.push(['Nei salvadanai', eur(ms.saved)]);
    cards.push(['Movimenti registrati', String(ms.n)]);
    h += `<div class="rc-grid">${cards.map(([l, v]) => `<div class="rc"><span>${l}</span><b class="num">${v}</b></div>`).join('')}</div>`;
    return h + '</div>';
  }
};

/* ---------- impostazioni ---------- */
SHEETS.settings = {
  full: true, live: true,
  init: () => ({ page: 'main', catType: 'out' }),
  back(sh) { if (sh.st.page !== 'main') { sh.st.page = 'main'; drawSheet(sh); } else closeSheet(sh); },
  render: st => (SETTINGS[st.page] || SETTINGS.main)(st)
};
ACT.setPage = el => { const sh = sheetOf(el); sh.st.page = el.dataset.p; drawSheet(sh); const b = $('.sheet-body', sheetEl(sh)); if (b) b.scrollTop = 0; };
const setRow = (icon, title, value, attrs) => `<button class="row" ${attrs}><span class="row-ic">${ic(icon, 21)}</span><span class="rt">${title}</span><span class="rv">${value}</span>${ic('right', 18)}</button>`;
const SETTINGS = {
  home() {
    let h = sheetHead('Sezioni della Home', { back: true, grab: false }) + '<div class="sheet-body">';
    h += swRow('Prima ciò che è urgente', 'homeUrgent', D.settings.homeUrgent !== false, 'Voci fisse scadute, budget superati e pagamenti da controllare vanno in cima, solo quando ci sono', 'homeUrgentTog');
    h += `<h3 class="set-h">Nel riquadro in alto</h3><div class="list">${HOME_HERO.map(([id, l]) => `<div class="row static hm-row"><span class="rt">${l}</span>${homeSw(id, homeOn(id), l)}</div>`).join('')}</div>`;
    const o = homeSaved();
    h += `<h3 class="set-h">Sotto, in questo ordine</h3><div class="list">${o.map((id, i) => { const b = HOME_BLOCKS.find(x => x[0] === id), on = homeOn(id); return `<div class="row static hm-row ${on ? '' : 'dim'}"><span class="rt">${b[1]}</span><button class="icon-btn sm" data-a="homeMove" data-k="${id}" data-d="-1" aria-label="Sposta su ${esc(b[1])}" ${i ? '' : 'disabled'}>${ic('up', 18)}</button><button class="icon-btn sm" data-a="homeMove" data-k="${id}" data-d="1" aria-label="Sposta giù ${esc(b[1])}" ${i < o.length - 1 ? '' : 'disabled'}>${ic('down', 18)}</button>${homeSw(id, on, b[1])}</div>`; }).join('')}</div>`;
    h += '<p class="foot-note">Le sezioni vuote non compaiono comunque: per esempio «Carta di credito» si vede solo se hai una carta.</p>';
    return h + `<div class="danger-z"><button class="link" data-a="homeReset">Ripristina la Home iniziale</button></div></div>`;
  },
  accounts() {
    const bal = balancesAt(today());
    let h = sheetHead('Conti', { back: true, grab: false }) + '<div class="sheet-body">';
    h += `<div class="list">${liquidAccounts().map(a => `<button class="row" data-a="accEdit" data-id="${a.id}"><span class="row-e">${esc(a.emoji || '🏦')}</span><span class="rt">${esc(a.name)}${a.id === D.settings.defaultAccount ? '<small>Predefinito</small>' : ''}</span><span class="rv num ${bal[a.id] < 0 ? 'neg' : ''}">${eur(bal[a.id])}</span>${ic('right', 18)}</button>`).join('')}</div>`;
    h += `<button class="btn outline w gap-t" data-a="accNew">${ic('plus', 18)} Aggiungi conto</button><p class="foot-note">I salvadanai si gestiscono da Pianifica. Per spostare soldi tra conti tocca + e scegli Trasferimento.</p>`;
    const arch = D.accounts.filter(a => a.archived && !isGoal(a));
    if (arch.length) h += `<h3 class="set-h">Archiviati</h3><div class="list">${arch.map(a => `<button class="row" data-a="accRestore" data-id="${a.id}"><span class="row-e">${esc(a.emoji || '🏦')}</span><span class="rt">${esc(a.name)}</span><span class="rv">Ripristina</span></button>`).join('')}</div>`;
    return h + '</div>';
  },
  categories(st) {
    const t = st.catType || 'out';
    const row = c => `<button class="row" data-a="catEdit" data-id="${c.id}">${avatar(c.emoji, c.color, 'sm')}<span class="rt">${esc(c.name)}</span><span class="rv num">${c.archived ? 'Archiviata' : c.budget > 0 ? eur0(c.budget) + ' al mese' : ''}</span>${ic('right', 18)}</button>`;
    let h = sheetHead('Categorie', { back: true, grab: false }) + '<div class="sheet-body">';
    h += `<div class="seg">${[['out', 'Uscite'], ['in', 'Entrate']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-a="pick" data-f="catType" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += `<div class="list gap-t">${D.categories.filter(c => !c.archived && c.type === t).map(row).join('')}</div><button class="btn outline w gap-t" data-a="catNew" data-type="${t}">${ic('plus', 18)} Nuova categoria</button>`;
    const arch = D.categories.filter(c => c.archived && c.type === t);
    if (arch.length) h += `<h3 class="set-h">Archiviate</h3><div class="list">${arch.map(row).join('')}</div>`;
    return h + '</div>';
  },
  people() {
    let h = sheetHead('Persone e spese divise', { back: true, grab: false }) + '<div class="sheet-body"><p class="lead sm">Quando dividi una spesa, qui trovi chi ti deve dei soldi e a chi li devi tu.</p>';
    if (D.people.length) h += `<div class="list">${D.people.map(p => { const b = personBalance(p.id), z = Math.abs(b) < 0.005; return `<button class="row" data-a="personOpen" data-id="${p.id}"><span class="row-e">${esc(p.emoji || '🙂')}</span><span class="rt">${esc(p.name)}<small>${z ? 'In pari' : b > 0 ? 'Ti deve' : 'Gli devi'}</small></span><span class="rv num ${z ? '' : b > 0 ? 'pos' : 'neg'}">${z ? '' : eur(Math.abs(b))}</span>${ic('right', 18)}</button>`; }).join('')}</div>`;
    return h + `<button class="btn outline w gap-t" data-a="personNew">${ic('plus', 18)} Aggiungi persona</button></div>`;
  },
  security() {
    let h = sheetHead('Codice di blocco', { back: true, grab: false }) + '<div class="sheet-body"><p class="lead sm">Con il codice attivo, l\'app chiede 4 cifre quando la apri. Il codice protegge l\'accesso all\'app, ma non cifra i dati salvati sul dispositivo.</p>';
    if (!D.settings.pin) return h + `<button class="btn dark w" data-a="pinOpen" data-m="set">Imposta un codice</button></div>`;
    h += `<div class="list">${setRow('lock', 'Cambia codice', '', 'data-a="pinOpen" data-m="change"')}${setRow('close', 'Disattiva codice', '', 'data-a="pinOpen" data-m="off"')}</div>`;
    h += fieldLabel('Chiedi il codice di nuovo dopo') + `<div class="chips wrap">${[[0, 'Subito'], [60, '1 minuto'], [300, '5 minuti'], [900, '15 minuti']].map(([v, l]) => `<button class="chip ${D.settings.lockAfter === v ? 'on' : ''}" data-a="lockAfter" data-v="${v}">${l}</button>`).join('')}</div><p class="muted sm">Il tempo passato fuori dall'app prima che il codice venga richiesto.</p>`;
    return h + '</div>';
  }
};
ACT.lockAfter = el => { D.settings.lockAfter = Number(el.dataset.v); save({ undo: false }); refresh(); };
ACT.openExport = () => openSheet('export', {});
ACT.openImport = () => openSheet('import', {});
ACT.backup = () => openSheet('backup', {});

/* ---------- codice di blocco ---------- */
SHEETS.pin = {
  init: p => ({ mode: p.mode, step: p.mode === 'set' ? 'new' : 'old', a: '', b: '', err: '' }),
  render(st) {
    const title = { set: 'Imposta il codice', change: 'Cambia codice', off: 'Disattiva codice' }[st.mode];
    const prompt = st.step === 'old' ? 'Inserisci il codice attuale' : st.step === 'new' ? 'Scegli un codice di 4 cifre' : 'Ripeti il codice per conferma';
    const cur = st.step === 'confirm' ? st.b : st.a;
    return sheetHead(title) + `<div class="sheet-body center pin-b"><p class="lead">${prompt}</p>${pinDots(cur.length, st.err ? 'shake' : '')}<p class="lock-err">${esc(st.err)}</p>${pinPad('pinKey')}</div>`;
  }
};
ACT.pinOpen = el => openSheet('pin', { mode: el.dataset.m });
ACT.pinKey = async el => {
  const sh = sheetOf(el), st = sh.st, k = el.dataset.k, f = st.step === 'confirm' ? 'b' : 'a';
  if (k === 'del') st[f] = st[f].slice(0, -1); else if (st[f].length < 4) st[f] += k;
  st.err = '';
  drawSheet(sh);
  if (st[f].length < 4) return;
  if (st.step === 'old') {
    const ok = (await hashPin(st.a, D.settings.pin.salt)) === D.settings.pin.hash;
    if (!ok) { st.a = ''; st.err = 'Codice errato'; return drawSheet(sh); }
    if (st.mode === 'off') { D.settings.pin = null; save(); closeSheet(sh); refresh(); return toast('Codice disattivato'); }
    st.step = 'new'; st.a = '';
    return drawSheet(sh);
  }
  if (st.step === 'new') { st.step = 'confirm'; return drawSheet(sh); }
  if (st.a !== st.b) { st.step = 'new'; st.a = ''; st.b = ''; st.err = 'I due codici non coincidono, riprova'; return drawSheet(sh); }
  const salt = uid();
  D.settings.pin = { salt, hash: await hashPin(st.a, salt) };
  save(); closeSheet(sh); refresh();
  toast(st.mode === 'change' ? 'Codice cambiato' : 'Codice attivato');
};

/* ---------- primo avvio ---------- */
SHEETS.start = {
  init: () => ({ name: 'Conto principale', amt: '' }),
  render: st => sheetHead('Iniziamo') + `<div class="sheet-body"><p class="lead sm">Quanto c'è oggi sul tuo conto? Da qui parte il saldo. Carta, contanti e altri conti li puoi aggiungere dopo, dalle impostazioni.</p>
    <label class="fld"><span>Nome del conto</span><input data-in="set" data-f="name" value="${esc(st.name)}" autocomplete="off"></label>
    <label class="fld"><span>Saldo di oggi</span><input inputmode="decimal" data-in="set" data-f="amt" value="${esc(st.amt)}" placeholder="0,00"></label>
    <p class="muted sm gap-t">Troverai le categorie del tuo file Excel con lo stesso budget previsto. Il risparmio diventa un salvadanaio, da creare in Pianifica.</p></div>
    <footer class="sheet-foot"><button class="btn primary w" data-a="startGo">Inizia</button></footer>`
};
ACT.startGo = el => {
  const sh = sheetOf(el), st = sh.st;
  D = blankData();
  D.categories = defaultCategories();
  const a = { id: uid(), name: st.name.trim() || 'Conto principale', emoji: '🏦', kind: 'bank', initial: r2(strToNum(st.amt)), initialDate: today(), archived: false };
  D.accounts.push(a);
  D.settings.defaultAccount = a.id;
  save(); closeSheet(sh);
  UI.tab = 'home'; UI.month = curMk(); render();
  toast('Tutto pronto: tocca + per il primo movimento');
};

/* ---------- file pronto da salvare o condividere ---------- */
const fmtSize = n => (n < 1024 ? n + ' byte' : n < 1048576 ? NF0.format(n / 1024) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB');
SHEETS.fileReady = {
  render: (st, sh) => {
    const p = sh.props;
    return sheetHead('File pronto') + `<div class="sheet-body center"><div class="file-ic">${ic('file', 34)}</div><p class="file-n">${esc(p.name)}</p><p class="muted">${fmtSize(p.blob.size)}</p><p class="lead sm">${inClaudeViewer() ? 'Tocca il pulsante e conferma il salvataggio.' : 'Tocca il pulsante e scegli «Salva su File», oppure l\'app con cui inviarlo.'}</p>${p.hint ? `<p class="muted sm">${p.hint}</p>` : ''}</div><footer class="sheet-foot"><button class="btn primary w" data-a="fileSave">${ic('share', 20)} Salva o condividi</button></footer>`;
  }
};
ACT.fileSave = async el => {
  const sh = sheetOf(el), p = sh.props;
  const ok = await deliverFile(p.name, p.blob);
  if (!ok) return;
  if (p.kind === 'backup' || p.kind === 'export' || p.kind === 'safe') { D.settings.lastBackup = today(); save({ undo: false }); }
  closeSheet(sh); refresh();
  toast(p.kind === 'backup' ? 'Backup salvato' : p.kind === 'sync' ? "Fatto: ora va aperto sull'altro telefono" : 'File salvato', null);
  if (p.kind === 'safe' && AFTER_SAVE) { const next = AFTER_SAVE; AFTER_SAVE = null; setTimeout(next, 350); }
};

/* ---------- export Excel e CSV ---------- */
const fileSuffix = p => (p === 'all' ? 'completo' : p.split(':')[1]);
const TIPI = { in: 'Entrata', out: 'Uscita', transfer: 'Trasferimento', settle: 'Rimborso' };
function periodMovs(p) {
  const [from, to] = periodRange(p);
  return D.movements.filter(m => (!from || m.date >= from) && (!to || m.date <= to)).sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
}
function movExportRow(m) {
  const c = cat(m.categoryId), f = m.fixedId ? D.fixed.find(x => x.id === m.fixedId) : null;
  const amount = m.type === 'out' ? eff(m) : m.type === 'settle' ? (m.dir === 'in' ? m.amount : -m.amount) : m.amount;
  const who = m.type === 'settle' ? (person(m.personId) || {}).name || '' : m.paidBy ? (person(m.paidBy) || {}).name || '' : m.split ? 'Io' : '';
  return {
    date: m.date, desc: m.description || (m.type === 'settle' ? (m.dir === 'in' ? 'Rimborso da ' : 'Rimborso a ') + who : ''), cat: c ? c.name : '', amount: r2(amount), tipo: TIPI[m.type],
    acc: m.accountId ? accName(m.accountId) : '', to: m.toAccountId ? accName(m.toAccountId) : '', paid: m.split ? m.amount : '', who,
    cur: m.cur || '', orig: m.cur ? m.orig : '', rate: m.cur ? m.rate : '', tags: (m.tags || []).map(t => '#' + t).join(' '), note: m.note || '', fixed: f ? f.name : ''
  };
}
async function buildXlsx(period) {
  const XLSX = await loadXLSX();
  const movs = periodMovs(period);
  const wb = XLSX.utils.book_new();
  const fmt = (ws, col, n, z, dates) => { for (let r = 1; r < n; r++) { const a = XLSX.utils.encode_cell({ r, c: col }), cell = ws[a]; if (!cell) continue; if (dates && typeof cell.v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell.v)) ws[a] = { t: 'n', v: isoToSerial(cell.v), z }; else if (cell.t === 'n') cell.z = z; } };
  const EUR = '#,##0.00 "' + baseSym() + '"';
  const rows = [['Data', 'Descrizione', 'Categoria', 'Ammontare', 'Tipo', 'Conto', 'Verso conto', 'Importo pagato', 'Diviso con / pagato da', 'Valuta', 'Importo in valuta', 'Cambio', 'Tag', 'Note', 'Voce fissa']];
  for (const m of movs) { const x = movExportRow(m); rows.push([x.date, x.desc, x.cat, x.amount, x.tipo, x.acc, x.to, x.paid, x.who, x.cur, x.orig, x.rate, x.tags, x.note, x.fixed]); }
  let ws = XLSX.utils.aoa_to_sheet(rows);
  fmt(ws, 0, rows.length, 'dd/mm/yyyy', true); fmt(ws, 3, rows.length, EUR); fmt(ws, 7, rows.length, EUR); fmt(ws, 10, rows.length, '#,##0.00'); fmt(ws, 11, rows.length, '0.0000');
  ws['!cols'] = [11, 30, 22, 12, 13, 18, 16, 13, 18, 7, 14, 9, 18, 30, 20].map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: 'A1:O' + rows.length };
  XLSX.utils.book_append_sheet(wb, ws, 'Movimenti');
  // riepilogo mese per mese
  let [from, to] = periodRange(period);
  const ck = curMk();
  let k0 = from ? mk(from) : (movs[0] ? mk(movs[0].date) : ck), k1 = to ? mk(to) : (movs.length ? mk(movs[movs.length - 1].date) : ck);
  const months = [];
  for (let k = k0; k <= k1 && months.length < 600; k = addM(k, 1)) months.push(k);
  const r2s = [['Mese', 'Entrate', 'Uscite', 'Risultato', 'Messo nei salvadanai', 'Disponibile a fine mese']];
  for (const k of months) { const s = monthStats(k); r2s.push([monthName(k), s.inc, s.out, s.net, s.saved, k > ck ? '' : availAt(k === ck ? today() : endOf(k))]); }
  ws = XLSX.utils.aoa_to_sheet(r2s);
  for (let c = 1; c <= 5; c++) fmt(ws, c, r2s.length, EUR);
  ws['!cols'] = [16, 13, 13, 13, 20, 22].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Riepilogo');
  // categorie
  const nM = Math.max(1, months.filter(k => k <= ck).length);
  const r3 = [['Categoria', 'Tipo', 'Budget mensile', 'Totale nel periodo', 'Media mensile']];
  for (const c of D.categories.filter(c => !c.archived)) { const t = sum(months.map(k => monthStats(k).byCat[c.id] || 0)); r3.push([c.name, c.type === 'in' ? 'Entrata' : 'Uscita', c.budget || 0, t, r2(t / nM)]); }
  ws = XLSX.utils.aoa_to_sheet(r3);
  for (let c = 2; c <= 4; c++) fmt(ws, c, r3.length, EUR);
  ws['!cols'] = [24, 10, 15, 18, 15].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Categorie');
  // spese fisse
  const r4 = [['Nome', 'Tipo', 'Importo', 'Importo variabile', 'Frequenza', 'Giorno', 'Prima scadenza', 'Termina', 'Categoria o salvadanaio', 'Conto', 'Stato']];
  for (const f of D.fixed) {
    const t = fixedTarget(f);
    r4.push([f.name, f.type === 'transfer' ? 'Risparmio' : TIPI[f.type], f.amount, f.variable ? 'Sì' : 'No', (FREQS.find(x => x[0] === f.freq) || [0, f.freq + ' mesi'])[1], f.day, dueDate(f, f.start), f.count ? f.count + ' rate' : f.end ? monthName(f.end) : 'Mai', t ? t.name : '', accName(f.accountId), f.paused ? 'In pausa' : fixedEnded(f) ? 'Conclusa' : 'Attiva']);
  }
  ws = XLSX.utils.aoa_to_sheet(r4);
  fmt(ws, 2, r4.length, EUR); fmt(ws, 6, r4.length, 'dd/mm/yyyy', true);
  ws['!cols'] = [26, 11, 12, 16, 12, 7, 14, 14, 22, 18, 11].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Spese fisse');
  await addFullData(XLSX, wb);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: `EFU_Budget_${fileSuffix(period)}.xlsx` };
}
function buildCsv(period) {
  const q = v => { const s = String(v == null ? '' : v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const n = v => (v === '' || v == null ? '' : String(r2(v)).replace('.', ','));
  const d = s => s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  const lines = [['Data', 'Descrizione', 'Categoria', 'Ammontare', 'Tipo', 'Conto', 'Verso conto', 'Importo pagato', 'Valuta', 'Importo in valuta', 'Cambio', 'Tag', 'Note'].join(';')];
  for (const m of periodMovs(period)) { const x = movExportRow(m); lines.push([d(x.date), x.desc, x.cat, n(x.amount), x.tipo, x.acc, x.to, n(x.paid), x.cur, n(x.orig), x.rate === '' ? '' : String(x.rate).replace('.', ','), x.tags, x.note].map(q).join(';')); }
  return { blob: new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), name: `Movimenti_${fileSuffix(period)}.csv` };
}
SHEETS.export = {
  init: () => ({ period: 'y:' + curMk().slice(0, 4), fmt: 'xlsx', busy: false }),
  render(st) {
    const y = Number(curMk().slice(0, 4));
    const opts = [['m:' + UI.month, monthName(UI.month)], ['y:' + y, 'Anno ' + y], ['y:' + (y - 1), 'Anno ' + (y - 1)], ['all', 'Tutto lo storico']];
    const n = periodMovs(st.period).length;
    let h = sheetHead('Esporta') + '<div class="sheet-body">';
    h += fieldLabel('Periodo') + `<div class="chips wrap">${opts.map(([v, l]) => `<button class="chip ${st.period === v ? 'on' : ''}" data-a="pick" data-f="period" data-v="${v}">${esc(l)}</button>`).join('')}</div><p class="muted sm">${n} ${n === 1 ? 'movimento' : 'movimenti'} nel periodo.</p>`;
    h += fieldLabel('Formato') + `<div class="opts">${[['xlsx', 'Excel', 'Tutti i dati, anche conti, investimenti, impostazioni e foto: si legge con Excel e si reimporta in EFU Budget su qualsiasi telefono. Il periodo vale solo per i fogli da leggere.'], ['csv', 'CSV', 'Solo i movimenti del periodo, per usarli in altre app. Non basta per reimportare tutto.']].map(([k, l, d]) => `<button class="opt ${st.fmt === k ? 'on' : ''}" data-a="pick" data-f="fmt" data-v="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="expGo" ${st.busy || !n ? 'disabled' : ''}>${st.busy ? 'Preparo il file…' : 'Prepara il file'}</button></footer>`;
  }
};
ACT.expGo = async el => {
  const sh = sheetOf(el), st = sh.st;
  st.busy = true; drawSheet(sh);
  try {
    const out = st.fmt === 'xlsx' ? await buildXlsx(st.period) : buildCsv(st.period);
    closeSheet(sh);
    openSheet('fileReady', Object.assign(out, { kind: 'export' }));
  } catch (e) { st.busy = false; drawSheet(sh); toast(e.message || 'Esportazione non riuscita'); }
};

/* ---------- backup e ripristino ---------- */
function bufToB64(buf) { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
function b64ToBuf(b64) { const s = atob(b64), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }
async function buildBackup(withPhotos) {
  const data = JSON.parse(JSON.stringify(D));
  data.settings.pin = null;
  data.settings.lastBackup = today();
  const out = { app: 'budget-iphone', v: 1, at: new Date().toISOString(), data, photos: {} };
  if (withPhotos) for (const k of await PhotoDB.keys()) { const r = await PhotoDB.get(k); if (r) out.photos[k] = { type: r.type, b64: bufToB64(r.buf) }; }
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}
SHEETS.backup = {
  init: () => ({ photos: true, busy: false, n: null }),
  after(sh) { if (sh.st.n == null) { sh.st.n = -1; PhotoDB.keys().then(k => { sh.st.n = k.length; drawSheet(sh); }).catch(() => { sh.st.n = 0; drawSheet(sh); }); } },
  render(st) {
    let h = sheetHead('Backup completo') + '<div class="sheet-body"><p class="lead sm">Il backup è un file con tutti i tuoi dati: movimenti, conti, categorie, spese fisse, salvadanai e persone. Conservalo su File o iCloud Drive: serve per ripristinare tutto su un altro telefono o dopo aver cancellato i dati.</p>';
    if (st.n > 0) h += swRow(`Includi le foto degli scontrini (${st.n})`, 'photos', st.photos, 'Il file sarà più pesante');
    h += '<p class="muted sm gap-t">Il codice di blocco non viene salvato nel backup.</p>';
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="bkGo" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Preparo il backup…' : 'Prepara il backup'}</button></footer>`;
  }
};
ACT.bkGo = async el => {
  const sh = sheetOf(el), st = sh.st;
  st.busy = true; drawSheet(sh);
  try {
    const blob = await buildBackup(st.photos && st.n > 0);
    closeSheet(sh);
    openSheet('fileReady', { blob, name: `EFU_Budget_backup_${today()}.json`, kind: 'backup' });
  } catch (e) { st.busy = false; drawSheet(sh); toast('Backup non riuscito: ' + e.message); }
};

/* ---------- import dal file Excel del budget ---------- */
function cellDate(c) {
  if (!c || c.v == null || c.v === '') return null;
  if (typeof c.v === 'number') return c.v > 20000 && c.v < 80000 ? serialToISO(c.v) : null;
  if (c.v instanceof Date) return isoOf(c.v);
  const s = String(c.v).trim();
  let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2]) + '-' + pad(m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
}
function parseBudgetWorkbook(XLSX, wb) {
  const find = re => wb.SheetNames.find(n => re.test(n));
  const wsName = wb.Sheets.Movimenti ? 'Movimenti' : find(/moviment/i);
  if (!wsName) throw new Error('Nel file non trovo il foglio «Movimenti». Scegli il file del budget.');
  const ws = wb.Sheets[wsName];
  const v = (sh, a) => (sh && sh[a] ? sh[a].v : undefined);
  const last = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).e.r + 1 : 0;
  const year = Number(v(ws, 'B5')) || null;
  const iv = v(ws, 'C5'), initial = typeof iv === 'number' ? iv : strToNum(iv);
  const movs = [];
  for (let r = 8; r <= last; r++) {
    const date = cellDate(ws['B' + r]), ar = v(ws, 'E' + r);
    const amount = typeof ar === 'number' ? ar : strToNum(ar);
    if (!date || !(amount > 0)) continue;
    movs.push({ date, description: String(v(ws, 'C' + r) == null ? '' : v(ws, 'C' + r)).trim(), category: String(v(ws, 'D' + r) == null ? '' : v(ws, 'D' + r)).trim(), amount: r2(amount) });
  }
  const csName = wb.Sheets.Categorie ? 'Categorie' : find(/categor/i), cats = [];
  if (csName) {
    const cs = wb.Sheets[csName], cl = cs['!ref'] ? XLSX.utils.decode_range(cs['!ref']).e.r + 1 : 0;
    for (let r = 6; r <= Math.min(cl, 300); r++) {
      const name = String(v(cs, 'A' + r) == null ? '' : v(cs, 'A' + r)).trim(), type = String(v(cs, 'B' + r) || '');
      if (!name || /^totale/i.test(name) || !/entrata|uscita/i.test(type)) continue;
      const b = v(cs, 'C' + r);
      cats.push({ name, type: /entrata/i.test(type) ? 'in' : 'out', budget: r2(typeof b === 'number' ? b : strToNum(b)) });
    }
  }
  if (!movs.length && !cats.length) throw new Error('Nel file non trovo movimenti né categorie da importare.');
  return { year, initial: r2(initial || 0), movs, cats };
}
function ensureGoal(name) {
  let g = D.accounts.find(a => a.kind === 'goal' && !a.archived && a.name.toLowerCase() === name.toLowerCase());
  if (!g) { g = { id: uid(), name, emoji: '🐷', kind: 'goal', initial: 0, initialDate: null, target: 0, deadline: '', color: nextColor(goals()), archived: false }; D.accounts.push(g); }
  return g;
}
function applyImport(res, opts = {}) {
  const fresh = !D;
  if (fresh) D = blankData();
  const byName = new Map(D.categories.map(c => [c.name.trim().toLowerCase(), c]));
  const isSav = name => !!opts.convert && /risparm/i.test(name);
  let goal = null;
  const cats = res.cats.length ? res.cats : (fresh ? DEFAULT_CATS.map(([name, type, budget]) => ({ name, type, budget })) : []);
  for (const c of cats) {
    if (isSav(c.name) && c.type === 'out') { goal = goal || ensureGoal(c.name); continue; }
    const ex = byName.get(c.name.toLowerCase());
    if (ex) { ex.type = c.type; ex.budget = r2(c.budget); ex.archived = false; }
    else { const nc = newCategory(c.name, c.type, c.budget); D.categories.push(nc); byName.set(c.name.toLowerCase(), nc); }
  }
  let accId = defaultAccountId();
  if (!accId) {
    const first = res.movs.map(m => m.date).sort()[0];
    const a = { id: uid(), name: 'Conto principale', emoji: '🏦', kind: 'bank', initial: r2(res.initial || 0), initialDate: res.year ? res.year + '-01-01' : (first ? mk(first) + '-01' : today()), archived: false };
    D.accounts.push(a); D.settings.defaultAccount = a.id; accId = a.id;
  }
  const sig = m => [m.date, (m.description || '').trim().toLowerCase(), r2(m.amount).toFixed(2)].join('|');
  const isDup = sigCounter(D.movements, sig);
  let added = 0, dup = 0, unknown = 0, toGoal = 0;
  const now = Date.now();
  for (const x of res.movs) {
    if (isDup(sig(x))) { dup++; continue; }
    const m = { id: uid(), ts: now + added, date: x.date, amount: r2(x.amount), description: x.description, note: '', tags: [], accountId: accId };
    if (isSav(x.category) && (!byName.get(x.category.toLowerCase()) || byName.get(x.category.toLowerCase()).type === 'out')) {
      goal = goal || ensureGoal(x.category);
      Object.assign(m, { type: 'transfer', toAccountId: goal.id }); toGoal++;
    } else {
      let c = byName.get(x.category.toLowerCase());
      if (!c) {
        unknown++;
        const name = x.category || 'Da classificare';
        c = byName.get(name.toLowerCase());
        if (!c) { c = newCategory(name, 'out', 0); D.categories.push(c); byName.set(name.toLowerCase(), c); }
      }
      Object.assign(m, { type: c.type, categoryId: c.id });
    }
    D.movements.push(m); added++;
  }
  save();
  return { added, dup, unknown, toGoal };
}
SHEETS.import = {
  cls: 'tall',
  init: p => ({ stage: p.res ? 'preview' : 'pick', res: p.res || null, err: '', convert: true, busy: false }),
  render(st) {
    if (st.stage === 'pick') return sheetHead('Importa dal file Excel') + `<div class="sheet-body"><p class="lead sm">Scegli il file del budget, quello con i fogli «Movimenti» e «Categorie». Porto nell'app i movimenti, le categorie con il budget previsto e il saldo iniziale.</p><p class="muted sm">Il file viene letto solo su questo dispositivo. La prima volta serve la connessione a internet per caricare il lettore dei file Excel.</p>${st.err ? `<p class="err">${esc(st.err)}</p>` : ''}</div>
      <footer class="sheet-foot"><label class="btn primary w ${st.busy ? 'is-busy' : ''}">${st.busy ? 'Leggo il file…' : 'Scegli il file'}<input type="file" class="vh" accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-ch="importFile" ${st.busy ? 'disabled' : ''}></label></footer>`;
    const r = st.res, dates = r.movs.map(m => m.date).sort();
    const nOut = r.cats.filter(c => c.type === 'out').length;
    const hasSav = r.cats.some(c => /risparm/i.test(c.name)) || r.movs.some(m => /risparm/i.test(m.category));
    const known = new Set(r.cats.map(c => c.name.toLowerCase()).concat(D ? D.categories.map(c => c.name.toLowerCase()) : []));
    const unknown = r.movs.filter(m => !known.has(m.category.toLowerCase()) && !(st.convert && /risparm/i.test(m.category))).length;
    const fresh = !D || !liquidAccounts().length;
    let h = sheetHead('Controlla e importa') + '<div class="sheet-body"><div class="list">';
    h += `<div class="row static"><span class="row-ic">${ic('list', 21)}</span><span class="rt">Movimenti<small>${dates.length ? 'dal ' + shortDate(dates[0]) + ' al ' + shortDate(dates[dates.length - 1]) : 'Nessun movimento'}</small></span><span class="rv num">${r.movs.length}</span></div>`;
    h += `<div class="row static"><span class="row-ic">${ic('tag', 21)}</span><span class="rt">Categorie<small>${nOut} di uscita, ${r.cats.length - nOut} di entrata</small></span><span class="rv num">${r.cats.length}</span></div>`;
    if (fresh) h += `<div class="row static"><span class="row-ic">${ic('wallet', 21)}</span><span class="rt">Saldo iniziale<small>${r.year ? 'Al 1 gennaio ' + r.year : "All'inizio"}, sul Conto principale</small></span><span class="rv num">${eur(r.initial)}</span></div>`;
    h += '</div>';
    if (hasSav) h += swRow('Trasforma «Risparmio» in salvadanaio', 'convert', st.convert, 'I movimenti di quella categoria diventano versamenti nel salvadanaio e non contano più come spese.');
    if (unknown) h += `<p class="warn-t">${unknown} ${unknown === 1 ? 'movimento ha' : 'movimenti hanno'} una categoria che non c'è nel foglio Categorie: ${unknown === 1 ? 'lo importo' : 'li importo'} come uscite, poi controlla.</p>`;
    if (!fresh) h += '<p class="muted sm gap-t">I movimenti vengono aggiunti a quelli già presenti. Quelli uguali (stessa data, descrizione e importo) non vengono duplicati.</p>';
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="impGo">Importa ${r.movs.length} ${r.movs.length === 1 ? 'movimento' : 'movimenti'}</button></footer>`;
  }
};
CHG.importFile = async el => {
  const sh = sheetOf(el), f = el.files && el.files[0];
  if (!f || !sh) return;
  sh.st.busy = true; sh.st.err = ''; drawSheet(sh);
  try {
    const XLSX = await loadXLSX();
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    sh.st.res = parseBudgetWorkbook(XLSX, wb);
    sh.st.stage = 'preview';
  } catch (e) { sh.st.err = e.message || 'Non riesco a leggere il file.'; }
  sh.st.busy = false;
  drawSheet(sh);
};
ACT.impGo = el => {
  const sh = sheetOf(el), st = sh.st;
  const r = applyImport(st.res, { convert: st.convert });
  closeSheet(sh);
  UI.tab = 'home'; UI.month = curMk();
  const last = st.res.movs.map(m => m.date).sort().pop();
  if (last && !monthMovs(curMk()).length) UI.month = mk(last);
  refresh();
  toast(`Importati ${r.added} movimenti${r.dup ? ', ' + r.dup + ' erano già presenti' : ''}`);
};

/* ---------- dati di esempio ---------- */
function seedDemo() {
  const d = blankData();
  d.settings.demo = true;
  d.categories = defaultCategories();
  const C = n => d.categories.find(c => c.name.startsWith(n)).id;
  const ck = curMk(), t = today(), s0 = addM(ck, -3), start = s0 + '-01';
  const bank = { id: uid(), name: 'Conto principale', emoji: '🏦', kind: 'bank', initial: 1850, initialDate: start, archived: false };
  const cash = { id: uid(), name: 'Contanti', emoji: '💶', kind: 'cash', initial: 120, initialDate: start, archived: false };
  const card = { id: uid(), name: 'Carta di credito', emoji: '💳', kind: 'card', initial: 0, initialDate: start, archived: false, credit: true, closeDay: 15, payDay: 10, payFrom: bank.id, autoFrom: start };
  const vac = { id: uid(), name: 'Vacanze', emoji: '🏖️', kind: 'goal', initial: 450, initialDate: start, target: 1500, deadline: (Number(ck.slice(0, 4)) + 1) + '-06', color: '#00A699', archived: false };
  const emg = { id: uid(), name: 'Fondo emergenze', emoji: '🛟', kind: 'goal', initial: 1200, initialDate: start, target: 3000, deadline: '', color: '#2F6FED', archived: false };
  const sinkAcc = { id: uid(), name: 'Accantonamenti', emoji: '🗓️', kind: 'goal', sys: 'sink', initial: 0, initialDate: start, target: 0, deadline: '', color: '#7A8B99', archived: false };
  d.accounts = [bank, cash, card, vac, emg, sinkAcc];
  d.settings.defaultAccount = bank.id;
  d.settings.rates = { GBP: 1.17 };
  const marco = { id: uid(), name: 'Marco', emoji: '🧔' }, giulia = { id: uid(), name: 'Giulia', emoji: '👩' };
  d.people = [marco, giulia];
  const F = o => Object.assign({ id: uid(), skipped: [], variable: false, count: null, end: null, note: '', paused: false, trackFrom: s0, accountId: bank.id, freq: 1, created: start }, o);
  d.fixed = [
    F({ name: 'Stipendio', type: 'in', amount: 2000, categoryId: C('Stipendio'), day: 1, start: s0 }),
    F({ name: 'Affitto', type: 'out', amount: 700, categoryId: C('Affitto'), day: 2, start: s0 }),
    F({ name: 'Bolletta luce e gas', type: 'out', amount: 95, variable: true, categoryId: C('Bollette'), day: 16, freq: 2, start: addM(s0, 1) }),
    F({ name: 'Internet casa', type: 'out', amount: 27.9, categoryId: C('Bollette'), day: 10, start: s0 }),
    F({ name: 'Palestra', type: 'out', amount: 39, categoryId: C('Abbonamenti'), day: 20, start: s0 }),
    F({ name: 'Streaming', type: 'out', amount: 12.99, categoryId: C('Abbonamenti'), day: 5, start: s0 }),
    F({ name: 'Rata finanziamento auto', type: 'out', amount: 150, categoryId: C('Trasporti'), day: 15, start: addM(ck, -8), count: 24 }),
    F({ name: 'Assicurazione auto', type: 'out', amount: 480, categoryId: C('Trasporti'), day: 12, freq: 12, start: addM(ck, 1), sink: true, sinkFrom: s0 }),
    F({ name: 'Versamento vacanze', type: 'transfer', amount: 150, toAccountId: vac.id, day: 28, start: s0 })
  ];
  let seed = 20260918, n = 0;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const R = (a, b) => r2(a + rnd() * (b - a));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const M = (date, type, amount, desc, catName, o = {}) => {
    if (date > t) return;
    const m = Object.assign({ id: uid(), ts: dateOf(date).getTime() + (n++), type, date, amount: r2(amount), description: desc, accountId: bank.id, tags: [], note: '' }, o);
    if (catName) m.categoryId = C(catName);
    d.movements.push(m);
  };
  for (let dd = start; dd <= t; dd = addDays(dd, 1)) {
    const wd = dateOf(dd).getDay(), dn = Number(dd.slice(8));
    if (wd === 6 || (wd === 3 && rnd() < 0.6)) M(dd, 'out', R(38, 112), pick(['Esselunga', 'Coop', 'Lidl', 'Mercato rionale', 'Conad']), 'Spesa alimentare', rnd() < 0.25 ? { accountId: card.id } : {});
    if (wd === 2 && rnd() < 0.5) M(dd, 'out', R(3, 9), pick(['Panificio', 'Frutta e verdura']), 'Spesa alimentare', { accountId: cash.id });
    if (dn === 8 || dn === 22) M(dd, 'out', R(52, 68), 'Pieno auto', 'Trasporti');
    if (wd === 5 && rnd() < 0.55) M(dd, 'out', R(18, 46), pick(['Pizzeria', 'Cinema', 'Aperitivo', 'Sushi']), 'Svago', rnd() < 0.4 ? { tags: ['amici'] } : {});
    if (dn === 13 && rnd() < 0.7) M(dd, 'out', R(9, 32), 'Farmacia', 'Salute');
    if (dn === 19 && rnd() < 0.4) M(dd, 'out', R(35, 89), pick(['Scarpe', 'Maglione', 'Jeans']), 'Abbigliamento');
    if (dn === 24 && rnd() < 0.5) M(dd, 'out', R(8, 40), pick(['Ferramenta', 'Regalo compleanno', 'Cartoleria']), 'Varie');
    if (wd === 0 && rnd() < 0.35) M(dd, 'out', R(2.5, 6), 'Caffè e cornetto', 'Svago', { accountId: cash.id });
    if (dn === 3) M(dd, 'transfer', 100, 'Prelievo bancomat', null, { toAccountId: cash.id });
  }
  const pm = addM(ck, -1);
  M(pm + '-12', 'out', 96, 'Cena da Gino', 'Svago', { tags: ['amici'], split: { mine: 32, shares: { [marco.id]: 32, [giulia.id]: 32 } } });
  M(pm + '-15', 'settle', 32, '', null, { personId: giulia.id, dir: 'in', accountId: cash.id });
  M(pm + '-20', 'out', 21.06, 'Libreria a Londra', 'Varie', { cur: 'GBP', orig: 18, rate: 1.17, tags: ['viaggio'] });
  M(ck + '-06', 'out', 70, 'Biglietti concerto', 'Svago', { split: { mine: 35, shares: { [marco.id]: 35 } }, paidBy: marco.id, accountId: null });
  M(addM(ck, -2) + '-09', 'in', 120, 'Vendita bici usata', 'Altre entrate');
  const lim = addDays(t, -3);
  for (const f of d.fixed) for (const o of occurrences(f, trackStart(f), ck)) {
    if (o.due > lim) continue;
    const m = { id: uid(), ts: dateOf(o.due).getTime() + (n++), type: f.type, date: o.due, amount: r2(f.variable ? R(f.amount * 0.8, f.amount * 1.2) : f.amount), description: f.name, accountId: f.accountId, tags: [], note: '', fixedId: f.id, fixedKey: o.k };
    if (f.type === 'transfer') m.toAccountId = f.toAccountId; else m.categoryId = f.categoryId;
    d.movements.push(m);
  }
  for (const f of d.fixed) for (const s of sinkOccurrences(f, ck)) if (s.due <= lim) d.movements.push({ id: uid(), ts: dateOf(s.due).getTime() + (n++), type: 'transfer', date: s.due, amount: s.amt, description: 'Quota per ' + f.name, accountId: f.accountId, toAccountId: sinkAcc.id, tags: [], note: '', sinkOf: f.id, sinkKey: s.k });
  d.invest = demoInvest();
  demoPac(d, bank.id);
  return d;
}

