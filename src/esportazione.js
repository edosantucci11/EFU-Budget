/* =========================================================
   Esportazione e ripristino
   Excel completo e reimportabile, ripristino da file, proposta
   di esportare prima di cancellare o sostituire i dati.
   ========================================================= */

/* ---------- esportazione: fogli leggibili in più e dati completi nascosti ---------- */
const KIND_NAMES = { bank: 'Conto corrente', card: 'Carta', cash: 'Contanti', other: 'Altro', goal: 'Salvadanaio', invest: 'Investimenti (PAC)' };
async function addFullData(XLSX, wb) {
  const EUR = '#,##0.00 "' + baseSym() + '"';
  const money = (ws, cols, n) => { for (let r = 1; r < n; r++) for (const c of cols) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (cell && typeof cell.v === 'number') cell.z = EUR; } };
  const bal = balancesAt(today());
  const rc = [['Conto', 'Tipo', 'Saldo oggi', 'Saldo iniziale', 'Dal', 'Dettagli']];
  for (const a of D.accounts.filter(x => !x.archived)) {
    const det = [];
    if (isCredit(a)) det.push(`Carta di credito: chiusura il ${a.closeDay}, addebito il ${a.payDay} su ${(acc(a.payFrom) || {}).name || '?'}`);
    if (hasInterest(a)) det.push(`Interessi ${numStr(a.interest.rate, 3)}% lordi, tasse ${numStr(a.interest.tax || 0, 2)}%, accredito ogni ${a.interest.freq === 1 ? 'mese' : a.interest.freq + ' mesi'} il giorno ${a.interest.day}`);
    if (a.kind === 'goal' && a.target) det.push('Obiettivo ' + numStr(a.target));
    rc.push([a.name, KIND_NAMES[a.kind] || a.kind, r2(bal[a.id] || 0), a.initial || 0, a.initialDate || '', det.join('; ')]);
  }
  let ws = XLSX.utils.aoa_to_sheet(rc); money(ws, [2, 3], rc.length);
  ws['!cols'] = [24, 18, 14, 14, 12, 60].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Conti');
  if (D.invest.length) {
    const ri = [['Investimento', 'Codice', 'Simbolo', 'Tipo', 'Quote', 'Investito', 'Valore', 'Guadagno', 'Aggiornato il']];
    for (const p of D.invest) { const v = invValue(p); ri.push([p.name, p.code || '', p.sym || '', invKind(p.kind)[1], p.qty || '', p.invested || 0, v, r2(v - (p.invested || 0)), invLast(p).d]); }
    ws = XLSX.utils.aoa_to_sheet(ri); money(ws, [5, 6, 7], ri.length);
    ws['!cols'] = [30, 16, 12, 12, 10, 14, 14, 14, 13].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Investimenti');
  }
  const text = await (await buildBackup(true)).text(), size = 30000, rows = [["EFU Budget: dati completi per reimportare questo file nell'app. Non modificare questo foglio."], [FULL_MARK], [Math.ceil(text.length / size)]];
  for (let i = 0; i < text.length; i += size) rows.push([text.slice(i, i + size)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), FULL_SHEET);
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Sheets = wb.SheetNames.map(n => ({ name: n, Hidden: n === FULL_SHEET ? 1 : 0 }));
}
function readFullData(XLSX, wb) {
  const ws = wb.Sheets[FULL_SHEET];
  if (!ws) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (String(rows[1] && rows[1][0]) !== FULL_MARK) return null;
  const n = Number(rows[2] && rows[2][0]) || 0;
  try { return JSON.parse(rows.slice(3, 3 + n).map(r => String(r[0] == null ? '' : r[0])).join('')); } catch (e) { return null; }
}

/* ---------- ripristino da esportazione o backup ---------- */
async function restoreBackupObj(obj) {
  const data = obj && obj.data;
  if (!data || !Array.isArray(data.movements) || !Array.isArray(data.accounts)) { toast('Il file non contiene dati di EFU Budget.', null); return false; }
  const when = obj.at ? shortDate(isoOf(new Date(obj.at))) : '';
  const go = async () => {
    const pin = D ? D.settings.pin : null;
    D = migrate(JSON.parse(JSON.stringify(data)));
    D.settings.pin = pin;
    save({ noStamp: true, undo: false });
    UNDO.length = 0;
    try {
      await PhotoDB.clear();
      for (const [k, p] of Object.entries(obj.photos || {})) await PhotoDB.put(k, { type: p.type, buf: b64ToBuf(p.b64) });
    } catch (e) { toast('Dati importati, ma le foto no: memoria non disponibile.', null); }
    PHOTO_URLS.clear();
    UI.sheets.slice().forEach(s => closeSheet(s));
    UI.tab = 'home'; UI.month = curMk(); UI.filters = blankFilters();
    render();
    toast(`Importati ${data.movements.length} movimenti e tutti gli altri dati`, null);
  };
  if (!D) { await go(); return true; }
  if (!D.settings.demo && (D.movements.length || D.invest.length)) { AFTER_SAVE = null; openSheet('safeFirst', { mode: 'replace', then: go }); return true; }
  confirmBox('Sostituire i dati?', `Il file${when ? ' del ' + esc(when) : ''} contiene ${data.movements.length} movimenti, con conti, categorie, spese fisse, investimenti e impostazioni. I dati attuali su questo telefono verranno sostituiti.`, 'Importa tutto', go);
  return true;
}
CHG.restoreFile = async el => {
  const f = el.files && el.files[0];
  if (!f) return;
  let obj = null;
  try {
    if (/\.(xlsx|xls|xlsm)$/i.test(f.name)) { const XLSX = await loadXLSX(); obj = readFullData(XLSX, XLSX.read(await f.arrayBuffer(), { type: 'array' })); }
    else obj = JSON.parse(await f.text());
  } catch (e) { obj = null; }
  el.value = '';
  if (obj && obj.type === 'budget-sync') return toast('Questo è un file del budget di coppia: aprilo da Budget di coppia → Ricevi.', null);
  if (!obj) return toast('Il file scelto non è un backup o un\'esportazione di EFU Budget.', null);
  await restoreBackupObj(obj);
};

/* ---------- prima di cancellare, proponi di esportare ---------- */let AFTER_SAVE = null;
function wipeAll() {
  wipeStorage(); D = null;
  UI.sheets.slice().forEach(s => closeSheet(s));
  UI.tab = 'home'; UI.month = curMk(); UI.filters = blankFilters();
  render(); toast('Dati cancellati', null);
}
SHEETS.safeFirst = {
  init: () => ({ busy: false }),
  render(st, sh) {
    const wipe = sh.props.mode === 'wipe', n = D ? D.movements.length : 0, last = D && D.settings.lastBackup;
    let h = sheetHead(wipe ? 'Cancellare tutti i dati?' : 'Sostituire i dati?') + '<div class="sheet-body">';
    h += `<p class="lead sm">${wipe ? 'Stai per cancellare da questo telefono' : 'Il file che hai scelto prenderà il posto, su questo telefono, di'} ${n} ${n === 1 ? 'movimento' : 'movimenti'}, con conti, spese fisse, investimenti e impostazioni.</p>`;
    h += "<p class=\"lead sm\">Prima ti conviene esportarli: con il file potrai rimettere tutto com'era, anche su un altro telefono.</p>";
    h += last ? `<p class="muted sm">Ultima esportazione o backup: ${esc(shortDate(last))}.</p>` : '<p class="warn-t">Non hai ancora mai esportato i tuoi dati.</p>';
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="safeExport" ${st.busy ? 'disabled' : ''}>${st.busy ? 'Preparo il file…' : wipe ? 'Esporta e poi cancella' : 'Esporta e poi importa'}</button><button class="link w later${wipe ? ' danger' : ''}" data-a="safeSkip">${wipe ? 'Cancella senza esportare' : 'Importa senza esportare'}</button></footer>`;
  }
};
ACT.safeExport = async el => {
  const sh = sheetOf(el), st = sh.st, { mode, then } = sh.props;
  st.busy = true; drawSheet(sh);
  try {
    const out = await buildXlsx('all');
    closeSheet(sh);
    AFTER_SAVE = () => confirmBox(mode === 'wipe' ? 'File salvato: cancello i dati?' : 'File salvato: importo il nuovo file?', 'Prima controlla di averlo salvato in File o su iCloud Drive.', mode === 'wipe' ? 'Cancella tutto' : 'Importa tutto', then, mode === 'wipe');
    openSheet('fileReady', Object.assign(out, { kind: 'safe' }));
  } catch (e) { st.busy = false; drawSheet(sh); toast('Esportazione non riuscita: ' + (e.message || e), null); }
};
ACT.safeSkip = el => {
  const sh = sheetOf(el), { mode, then } = sh.props;
  if (mode !== 'wipe') { closeSheet(sh); return then(); }
  confirmBox('Cancellare senza una copia?', 'I dati verranno eliminati da questo telefono e non si potranno più recuperare.', 'Cancella tutto', () => { closeSheet(sh); then(); });
};
ACT.wipe = () => {
  if (!D) return;
  AFTER_SAVE = null;
  if (D.settings.demo) return confirmBox('Cancellare i dati di esempio?', 'Sono solo dati di prova: non serve esportarli.', 'Cancella', wipeAll);
  openSheet('safeFirst', { mode: 'wipe', then: wipeAll });
};

