/* =========================================================
   Fogli a comparsa (inserimento e modifica)
   ========================================================= */
function fieldLabel(t, extra = '') { return `<h3 class="f-h">${t}${extra}</h3>`; }
function swRow(label, field, on, sub = '', act = 'toggle') {
  return `<div class="swrow"><span class="sw-t"><b>${label}</b>${sub ? `<span class="muted">${sub}</span>` : ''}</span><button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-a="${act}" data-f="${field}"></button></div>`;
}
function accChips(field, sel, withGoals, exclude) {
  const list = D.accounts.filter(a => !a.archived && (withGoals || !isGoal(a)) && a.id !== exclude);
  return `<div class="chips wrap">${list.map(a => `<button class="chip ${sel === a.id ? 'on' : ''}" data-a="pick" data-f="${field}" data-v="${a.id}">${esc(a.emoji || (isGoal(a) ? '🐷' : '🏦'))} ${esc(a.name)}</button>`).join('')}</div>`;
}
function dateChips(date, field) {
  const t = today(), y = addDays(t, -1), custom = date !== t && date !== y;
  return `<div class="chips wrap"><button class="chip ${date === t ? 'on' : ''}" data-a="pick" data-f="${field}" data-v="${t}">Oggi</button><button class="chip ${date === y ? 'on' : ''}" data-a="pick" data-f="${field}" data-v="${y}">Ieri</button><label class="chip date ${custom ? 'on' : ''}">${ic('calendar', 16)} ${custom ? esc(dayTitle(date)) : 'Altra data'}<input type="date" value="${date}" data-ch="date" data-f="${field}" aria-label="Scegli la data"></label></div>`;
}
CHG.date = el => { const sh = sheetOf(el); if (sh && el.value) { sh.st[el.dataset.f] = el.value; drawSheet(sh); } };
function emojiPicker(st, list = EMOJIS) {
  if (!st.showEmoji) return '';
  return `<div class="emo-grid">${list.map(e => `<button class="${st.emoji === e ? 'on' : ''}" data-a="pick" data-f="emoji" data-v="${e}">${e}</button>`).join('')}</div><label class="fld"><span>Oppure scrivi un'emoji</span><input data-in="emojiType" maxlength="8" placeholder="🙂" autocomplete="off"></label>`;
}
INP.emojiType = el => { const sh = sheetOf(el); const v = el.value.trim(); if (v) { sh.st.emoji = Array.from(v).slice(0, 2).join(''); const p = $('.big-av', sheetEl(sh)); if (p) p.textContent = sh.st.emoji; } };
const colorSwatches = st => `<div class="swatches">${PALETTE.map(c => `<button class="swatch ${st.color === c ? 'on' : ''}" style="background:${c}" data-a="pick" data-f="color" data-v="${c}" aria-label="Colore ${c}"></button>`).join('')}</div>`;

/* ---------- MOVIMENTO: importo → categoria → dettagli ---------- */
function movInit(p) {
  if (p.id) {
    const m = D.movements.find(x => x.id === p.id);
    if (!m) return { missing: true };
    const fx = !!(m.cur && m.cur !== baseCur());
    return {
      mode: 'edit', step: 'details', id: m.id, type: m.type, amt: numStr(fx ? m.orig : m.amount), cur: fx ? m.cur : baseCur(), rate: fx ? m.rate : 1,
      date: m.date, categoryId: m.categoryId || null, catManual: true, accountId: m.accountId, toAccountId: m.toAccountId || null,
      description: m.description || '', note: m.note || '', tags: (m.tags || []).slice(), photoId: m.photoId || null, newPhoto: null, newPhotoURL: null, photoRemoved: false,
      split: m.split ? { on: true, people: Object.keys(m.split.shares || {}), paidBy: m.paidBy || 'me' } : { on: false, people: [], paidBy: 'me' },
      more: !!(m.note || (m.tags && m.tags.length) || m.photoId || m.split), fixedId: m.fixedId || null, fixedKey: m.fixedKey || null
    };
  }
  const type = p.type || 'out', from = p.accountId || defaultAccountId();
  let to = p.toAccountId || null;
  if (type === 'transfer' && !to) { const o = D.accounts.find(a => !a.archived && a.id !== from); to = o ? o.id : null; }
  return {
    mode: 'new', step: p.step || 'amount', type, amt: p.amt != null ? numStr(p.amt) : '', cur: baseCur(), rate: 1, date: p.date || today(),
    categoryId: p.categoryId || null, catManual: !!p.categoryId, accountId: from, toAccountId: to,
    description: p.description || '', note: '', tags: [], photoId: null, newPhoto: null, newPhotoURL: null, photoRemoved: false,
    split: { on: false, people: [], paidBy: 'me' }, more: false, fixedId: p.fixedId || null, fixedKey: p.fixedKey || null, lockType: !!p.lockType, title: p.title || ''
  };
}
const movEUR = st => r2(st.type !== 'transfer' && st.cur !== baseCur() ? strToNum(st.amt) * st.rate : strToNum(st.amt));
/* ---------- importo con le operazioni: 12+8,50 oppure 45/2 ---------- */
const AMT_OPS = '+-*/', AMT_SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const hasOp = s => /[+\-*/]/.test(s || '');
function evalAmt(s) {
  const t = String(s || '').replace(/[+\-*/,]+$/, '').split(/([+\-*/])/).filter(x => x !== '');
  if (!t.length) return NaN;
  const nums = [], ops = [];
  for (let i = 0; i < t.length; i++) { if (i % 2) ops.push(t[i]); else nums.push(strToNum(t[i])); }
  if (nums.some(x => !isFinite(x))) return NaN;
  // prima moltiplicazioni e divisioni, poi somme e sottrazioni
  const n2 = [nums[0]], o2 = [];
  ops.forEach((o, i) => {
    const b = nums[i + 1];
    if (o === '*') n2[n2.length - 1] *= b;
    else if (o === '/') n2[n2.length - 1] = b ? n2[n2.length - 1] / b : NaN;
    else { o2.push(o); n2.push(b); }
  });
  let r = n2[0];
  o2.forEach((o, i) => { r = o === '+' ? r + n2[i + 1] : r - n2[i + 1]; });
  return r;
}
// l'espressione scritta, se coerente con l'importo; altrimenti l'importo stesso
function amtExpr(st) {
  if (st.expr != null && (hasOp(st.expr) ? numStr(r2(evalAmt(st.expr))) === (st.amt || '') || (!st.amt && !(evalAmt(st.expr) > 0)) : st.expr === (st.amt || ''))) return st.expr;
  return st.amt || '';
}
const amtGroup = s => { const [i, d] = s.split(','); return NF0.format(Number(i || 0)) + (s.includes(',') ? ',' + (d || '') : ''); };
function amtDisplay(st) {
  const ex = amtExpr(st), sym = esc(curSym(st.type === 'transfer' ? baseCur() : st.cur));
  if (hasOp(ex)) {
    const r = evalAmt(ex), line = ex.split(/([+\-*/])/).filter(x => x !== '').map(x => AMT_SYM[x] ? ' ' + AMT_SYM[x] + ' ' : amtGroup(x)).join('');
    const ok = r > 0 && isFinite(r), txt = ok ? amtGroup(numStr(r2(r))) : isFinite(r) && r !== 0 ? '−' + amtGroup(numStr(r2(-r))) : '0';
    const size = txt.length > 10 ? 'xs' : txt.length > 7 ? 's' : '';
    return `<span class="amt-x">${esc(line)} =</span><span class="amt-v ${ok ? '' : 'zero'} ${size}">${txt}</span><span class="amt-c">${sym}</span>`;
  }
  const s = ex, txt = amtGroup(s);
  const size = txt.length > 10 ? 'xs' : txt.length > 7 ? 's' : '';
  return `<span class="amt-v ${s ? '' : 'zero'} ${size}">${txt}</span><span class="amt-c">${sym}</span>`;
}
const fxEq = st => (st.type !== 'transfer' && st.cur !== baseCur() ? 'Corrispondono a ' + eur(movEUR(st)) : '');
function amtKey(sh, k) {
  const st = sh.st;
  let s = amtExpr(st);
  const cur = s.split(/[+\-*/]/).pop();
  if (k === 'del') s = s.slice(0, -1);
  else if (AMT_OPS.includes(k)) {
    if (!s) return;
    if (/[,]$/.test(s)) s = s.slice(0, -1);
    if (AMT_OPS.includes(s.slice(-1))) s = s.slice(0, -1);
    if ((s.match(/[+\-*/]/g) || []).length >= 8) return;
    s += k;
  }
  else if (k === ',') { if (cur.includes(',')) return; s += cur ? ',' : '0,'; }
  else {
    if (cur.includes(',')) { if (cur.split(',')[1].length >= 2) return; }
    else if (cur.replace(/^0+/, '').length >= 7) return;
    if (cur === '0') s = s.slice(0, -1);
    s += k;
  }
  st.expr = s;
  if (hasOp(s)) { const r = evalAmt(s); st.amt = r > 0 && isFinite(r) ? numStr(r2(r)) : ''; }
  else st.amt = s;
  const el = sheetEl(sh);
  $$('.qp-c', el).forEach(b => { b.disabled = !(strToNum(st.amt) > 0); });
  $('.amt', el).innerHTML = amtDisplay(st);
  const b = $('.amt-next', el); if (b) b.disabled = !(strToNum(st.amt) > 0);
  const eq = $('.fx-eq', el); if (eq) eq.textContent = fxEq(st);
}
// tastierino: la cifra salta, l'importo trema se il tasto non si può usare
function pressKey(sh, k) {
  const before = amtExpr(sh.st);
  amtKey(sh, k);
  const after = amtExpr(sh.st), el = sheetEl(sh), a = el && $('.amt', el);
  if (before === after) {
    hap('warn');
    if (a && !RM()) { a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
    return;
  }
  hap();
  const v = a && $('.amt-v', a);
  if (v && !RM()) v.classList.add(after.length > before.length ? 'pop' : 'drop');
}
ACT.key = el => pressKey(sheetOf(el), el.dataset.k);

function movAmountHTML(st) {
  const types = [['out', 'Uscita'], ['in', 'Entrata'], ['transfer', 'Trasferimento']];
  const back = st.mode === 'edit' || st.cameFromDetails;
  const title = st.mode === 'edit' ? 'Modifica importo' : st.title || 'Nuovo movimento';
  return `${sheetHead(title, { back, grab: false })}
  <div class="amt-wrap">
    ${st.mode === 'new' && !st.lockType && !st.cameFromDetails ? `<div class="seg">${types.map(([k, l]) => `<button class="${st.type === k ? 'on' : ''}" data-a="movType" data-k="${k}">${l}</button>`).join('')}</div>` : '<div></div>'}
    <div class="amt-box">
      <div class="amt" aria-live="polite">${amtDisplay(st)}</div>
      ${st.type !== 'transfer' ? `<button class="chip cur" data-a="movCur">${ic('globe', 16)} ${esc(st.cur === baseCur() ? curName(st.cur) : st.cur)} ${ic('down', 14)}</button>` : ''}
      ${st.type !== 'transfer' && st.cur !== baseCur() ? `<div class="fxrow"><span>1 ${esc(st.cur)} =</span><input class="fx-in" inputmode="decimal" data-in="movRate" value="${esc(numStr(st.rate, 5))}" aria-label="Cambio in euro"><span>${esc(baseSym())}</span></div><p class="fx-eq">${fxEq(st)}</p>${fxNoteHTML(st, st.rate)}` : ''}
    </div>
    ${st.mode === 'new' && !st.cameFromDetails ? `<div class="amt-date">${dateChips(st.date, 'date')}</div>` : ''}
    ${quickPicksHTML(st)}
    <div class="keypad calc">${['1', '2', '3', '+', '4', '5', '6', '-', '7', '8', '9', '*', ',', '0', 'del', '/'].map(k => `<button class="key ${AMT_OPS.includes(k) ? 'op' : ''}" data-a="key" data-k="${k}" aria-label="${k === 'del' ? 'Cancella' : k === ',' ? 'Virgola' : { '+': 'Più', '-': 'Meno', '*': 'Per', '/': 'Diviso' }[k] || k}">${k === 'del' ? ic('backspace', 26) : AMT_SYM[k] || k}</button>`).join('')}</div>
  </div>
  <footer class="sheet-foot"><button class="btn primary w amt-next" data-a="movNext" ${strToNum(st.amt) > 0 ? '' : 'disabled'}>Avanti</button></footer>`;
}
/* ---------- salva subito come: le spese abituali, già sul tastierino ---------- */
function quickPicks(st) {
  const amt = strToNum(st.amt);
  const typical = memo('qpAmt', () => {
    const m = new Map();
    for (const x of D.movements) {
      if (!x.description || (x.type !== 'in' && x.type !== 'out')) continue;
      const k = x.type + '|' + x.description.trim().toLowerCase(), a = m.get(k) || [];
      a.push(x.amount); m.set(k, a);
    }
    m.forEach((a, k) => { a.sort((p, q) => p - q); m.set(k, a[Math.floor(a.length / 2)]); });
    return m;
  });
  const list = descIndex().filter(e => e.type === st.type && e.n >= 2 && cat(e.cat) && !cat(e.cat).archived);
  const score = e => { const t = typical.get(e.type + '|' + e.text.toLowerCase()), near = amt > 0 && t > 0 && Math.abs(t - amt) / t <= 0.25; return (near ? 1000 : 0) + e.n; };
  return list.sort((a, b) => score(b) - score(a) || b.last.localeCompare(a.last)).slice(0, 4);
}
function quickPicksHTML(st) {
  if (st.mode !== 'new' || st.type === 'transfer' || st.fixedId || st.lockType || st.cameFromDetails || st.description) return '';
  const list = quickPicks(st);
  if (!list.length) return '';
  const off = !(strToNum(st.amt) > 0);
  return `<div class="qp"><span class="qp-h">Salva subito come</span><div class="chips">${list.map(e => { const c = cat(e.cat); return `<button class="chip qp-c" data-a="quickSave" data-t="${esc(e.text)}" data-c="${e.cat}" data-acc="${e.acc || ''}" ${off ? 'disabled' : ''}>${esc(c.emoji || '')} ${esc(e.text)}</button>`; }).join('')}</div></div>`;
}
ACT.quickSave = el => {
  const sh = sheetOf(el), st = sh.st, c = cat(el.dataset.c), a = acc(el.dataset.acc);
  if (!(strToNum(st.amt) > 0)) return toast("Scrivi prima l'importo");
  st.description = el.dataset.t;
  if (c && !c.archived && c.type === st.type) { st.categoryId = c.id; st.catManual = true; }
  st.accountId = a && !a.archived && !isGoal(a) ? a.id : (acc(st.accountId) && !isGoal(acc(st.accountId)) ? st.accountId : defaultAccountId());
  return ACT.movSave(el);
};
function catGridHTML(st) {
  return activeCats(st.type).map(c => `<button class="${st.categoryId === c.id ? 'on' : ''}" data-a="movCat" data-id="${c.id}" aria-pressed="${st.categoryId === c.id}">${avatar(c.emoji, c.color)}<span>${esc(c.name)}</span></button>`).join('') + `<button data-a="movCatNew"><span class="av add">${ic('plus', 22)}</span><span>Nuova</span></button>`;
}
function suggHTML(st) {
  const list = suggest(st.description, st.type);
  if (!list.length) return '';
  return `${st.description.trim().length < 2 ? '<span class="sugg-h">Usate spesso</span>' : ''}<div class="chips">${list.map(e => { const c = cat(e.cat); return `<button class="chip" data-a="suggPick" data-t="${esc(e.text)}" data-c="${e.cat || ''}" data-acc="${e.acc || ''}">${c ? esc(c.emoji) + ' ' : ''}${esc(e.text)}</button>`; }).join('')}</div>`;
}
function tagsBlock(st) {
  const sug = allTags().filter(t => !st.tags.includes(t)).slice(0, 8);
  return `<div class="fld tagfld"><span>Tag</span><div class="tagbox">${st.tags.map(t => `<button class="tag on" data-a="movTagDel" data-t="${esc(t)}" aria-label="Rimuovi il tag ${esc(t)}">#${esc(t)} ${ic('close', 12)}</button>`).join('')}<input data-in="movTagInp" data-kd="movTag" placeholder="${st.tags.length ? 'Aggiungi' : 'Es. vacanze, casa'}" autocomplete="off" autocapitalize="off" enterkeyhint="done" aria-label="Nuovo tag"></div></div>${sug.length ? `<div class="chips wrap tsug">${sug.map(t => `<button class="tag" data-a="movTagAdd" data-t="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}`;
}
function photoBlock(st) {
  const has = st.newPhotoURL || (st.photoId && !st.photoRemoved);
  if (has) return `${fieldLabel('Foto dello scontrino')}<div class="ph-prev"><img ${st.newPhotoURL ? `src="${st.newPhotoURL}"` : `data-photo="${st.photoId}"`} alt="Foto dello scontrino" data-a="photoView"><button class="link danger" data-a="movPhotoDel">Rimuovi foto</button></div>`;
  return `${fieldLabel('Foto dello scontrino')}<label class="btn outline w file-btn">${ic('camera', 20)} Aggiungi foto<input type="file" class="vh" accept="image/*" data-ch="movPhoto"></label>`;
}
function splitBlock(st) {
  const sp = st.split;
  let h = swRow('Dividi la spesa', 'split', sp.on, 'In parti uguali con altre persone', 'movSplit');
  if (!sp.on) return h;
  h += fieldLabel('Con chi') + `<div class="chips wrap">${D.people.map(p => `<button class="chip ${sp.people.includes(p.id) ? 'on' : ''}" data-a="movSplitP" data-id="${p.id}">${esc(p.emoji || '🙂')} ${esc(p.name)}</button>`).join('')}<button class="chip dashed" data-a="personNew">${ic('plus', 16)} Persona</button></div>`;
  if (!sp.people.length) return h;
  h += fieldLabel('Chi ha pagato') + `<div class="chips wrap"><button class="chip ${sp.paidBy === 'me' ? 'on' : ''}" data-a="movPaid" data-id="me">Io</button>${sp.people.map(pid => `<button class="chip ${sp.paidBy === pid ? 'on' : ''}" data-a="movPaid" data-id="${pid}">${esc(person(pid) ? person(pid).name : '?')}</button>`).join('')}</div>`;
  const { each, mine } = splitShares(movEUR(st), sp.people.length);
  const lines = sp.paidBy === 'me' ? sp.people.map(pid => `${esc(person(pid) ? person(pid).name : '?')} ti deve ${eur(each)}`) : [`Devi ${eur(mine)} a ${esc(person(sp.paidBy) ? person(sp.paidBy).name : '?')}`];
  return h + `<div class="split-sum"><p>La tua parte è <b class="num">${eur(mine)}</b>: è questa che conta nel budget.</p><p class="muted">${lines.join('<br>')}</p></div>`;
}
function movDetailsHTML(st) {
  if (st.missing) return sheetHead('Movimento') + '<div class="sheet-body"><p class="lead">Questo movimento non esiste più.</p></div>';
  const title = st.mode === 'edit' ? 'Modifica movimento' : st.title || { out: 'Nuova uscita', in: 'Nuova entrata', transfer: 'Nuovo trasferimento' }[st.type];
  const fx = st.type !== 'transfer' && st.cur !== baseCur();
  let h = sheetHead(title, { back: st.mode === 'new', grab: false }) + '<div class="sheet-body">';
  h += `<button class="amt-sum" data-a="movEditAmt"><span class="num ${st.type === 'in' ? 'pos' : ''}">${eur(movEUR(st))}</span><small>${fx ? esc(fmtCur(strToNum(st.amt), st.cur)) + ' al cambio ' + esc(numStr(st.rate, 5)) + ', tocca per modificare' : 'Tocca per modificare l\'importo'}</small></button>`;
  if (st.mode === 'edit' && st.type !== 'transfer' && !st.fixedId) h += `<div class="seg gap-t">${[['out', 'Uscita'], ['in', 'Entrata']].map(([k, l]) => `<button class="${st.type === k ? 'on' : ''}" data-a="movType" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (st.type === 'transfer') {
    h += fieldLabel('Da') + accChips('accountId', st.accountId, true);
    h += fieldLabel('A') + accChips('toAccountId', st.toAccountId, true, st.accountId);
    h += `<label class="fld"><span>Descrizione (facoltativa)</span><input data-in="set" data-f="description" value="${esc(st.description)}" placeholder="Es. Versamento per le vacanze" autocomplete="off" enterkeyhint="done"></label>`;
  } else {
    h += `<label class="fld"><span>Descrizione</span><input data-in="movDesc" value="${esc(st.description)}" placeholder="${st.type === 'out' ? 'Es. Supermercato' : 'Es. Stipendio'}" autocomplete="off" enterkeyhint="done"></label><div class="sugg">${suggHTML(st)}</div>`;
    h += fieldLabel('Categoria') + `<div class="cg">${catGridHTML(st)}</div><p class="cg-why muted sm" aria-live="polite">${st.catWhy ? 'Categoria suggerita ' + esc(st.catWhy) + '.' : ''}</p>`;
  }
  h += fieldLabel('Data') + dateChips(st.date, 'date');
  const paidByOther = st.type === 'out' && st.split.on && st.split.people.length && st.split.paidBy !== 'me';
  if (st.type !== 'transfer' && !paidByOther && (liquidAccounts().length > 1 || !acc(st.accountId) || isGoal(acc(st.accountId)))) h += fieldLabel(st.type === 'out' ? 'Pagato con' : 'Accreditato su') + accChips('accountId', st.accountId, isGoal(acc(st.accountId)));
  const extras = [st.note && 'nota', st.tags.length && 'tag', (st.newPhotoURL || (st.photoId && !st.photoRemoved)) && 'foto', st.split.on && 'spesa divisa'].filter(Boolean);
  h += `<button class="more-t" data-a="toggle" data-f="more" aria-expanded="${st.more}"><span>Altri dettagli${!st.more && extras.length ? `<small>${extras.join(', ')}</small>` : `<small>Nota, tag, foto${st.type === 'out' ? ', spesa divisa' : ''}</small>`}</span>${ic(st.more ? 'up' : 'down', 20)}</button>`;
  if (st.more) {
    h += `<label class="fld"><span>Nota</span><textarea rows="2" data-in="set" data-f="note" placeholder="Aggiungi una nota">${esc(st.note)}</textarea></label>`;
    h += tagsBlock(st) + photoBlock(st);
    if (st.type === 'out') h += splitBlock(st);
  }
  if (st.fixedId) { const f = D.fixed.find(x => x.id === st.fixedId); if (f) h += `<p class="muted sm gap-t">${ic('repeat', 14)} Voce fissa «${esc(f.name)}», ${monthName(st.fixedKey).toLowerCase()}</p>`; }
  if (st.mode === 'edit') h += `<div class="danger-z"><button class="link danger" data-a="movDelete">Elimina movimento</button></div>`;
  const lbl = st.mode === 'edit' ? 'Salva modifiche' : { out: 'Salva uscita', in: 'Salva entrata', transfer: 'Salva trasferimento' }[st.type];
  return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="movSave">${lbl}</button></footer>`;
}
SHEETS.mov = {
  full: true,
  init: movInit,
  render: st => (st.step === 'amount' ? movAmountHTML(st) : movDetailsHTML(st)),
  after(sh, el) { if (sh.st.focusTag) { sh.st.focusTag = false; const i = $('[data-in="movTagInp"]', el); if (i) i.focus(); } },
  back(sh) {
    const st = sh.st;
    if (st.step === 'details' && st.mode === 'new') { st.step = 'amount'; st.cameFromDetails = false; drawSheet(sh); }
    else if (st.step === 'amount' && (st.mode === 'edit' || st.cameFromDetails)) { st.step = 'details'; drawSheet(sh); }
    else closeSheet(sh);
  },
  onClose(sh) { if (sh.st.newPhotoURL) URL.revokeObjectURL(sh.st.newPhotoURL); }
};
ACT.add = () => { if (!D) return; hap(); openSheet('mov', {}); };
/* ---------- ripeti una spesa: tenendo premuto il + ---------- */
function lastOfKey(type, text) {
  const key = text.trim().toLowerCase();
  let best = null;
  for (const m of D.movements) if (m.type === type && m.description && m.description.trim().toLowerCase() === key && (!best || m.date > best.date || (m.date === best.date && (m.ts || 0) > (best.ts || 0)))) best = m;
  return best;
}
function repeatList() {
  return descIndex().filter(e => e.n >= 2 && cat(e.cat) && !cat(e.cat).archived).sort((a, b) => b.last.localeCompare(a.last) || b.n - a.n).slice(0, 30)
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 8).map(e => ({ e, m: lastOfKey(e.type, e.text) })).filter(x => x.m);
}
// copia di un movimento con la data di oggi: niente legami con voci fisse, carte, PAC, foto
function cloneMov(m) {
  const n = { id: uid(), ts: Date.now(), type: m.type, date: today(), amount: m.amount, description: m.description || '', note: '', tags: (m.tags || []).slice(), accountId: m.accountId };
  if (m.type === 'transfer') n.toAccountId = m.toAccountId; else n.categoryId = m.categoryId;
  if (m.cur && m.orig) { n.cur = m.cur; n.orig = m.orig; n.rate = m.rate; }
  const a = acc(n.accountId);
  if (m.type !== 'transfer' && (!a || a.archived || isGoal(a))) n.accountId = defaultAccountId();
  return n;
}
SHEETS.repeat = {
  render() {
    const list = repeatList();
    let h = sheetHead('Ripeti un movimento') + '<div class="sheet-body">';
    if (!list.length) return h + '<p class="lead sm">Qui compariranno le spese che registri più spesso, per ripeterle con un tocco.</p></div>';
    h += '<p class="muted sm">Tocca per registrarlo di nuovo con la data di oggi e lo stesso importo. Con la matita cambi prima l\'importo.</p>';
    h += `<div class="list">${list.map(({ e, m }) => { const c = cat(m.categoryId); return `<div class="rp-row"><button class="row rp-go" data-a="repeatGo" data-id="${m.id}">${avatar(c ? c.emoji : '🏷️', c ? c.color : '#999', 'sm')}<span class="rt">${esc(e.text)}<small>${esc(c ? c.name : '')} · ${e.n} volte</small></span><b class="num ${m.type === 'in' ? 'pos' : ''}">${eur(m.type === 'in' ? m.amount : -m.amount)}</b></button><button class="icon-btn sm rp-ed" data-a="repeatEdit" data-id="${m.id}" aria-label="Cambia l'importo di ${esc(e.text)}">${ic('edit', 18)}</button></div>`; }).join('')}</div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn outline w" data-a="repeatNew">${ic('plus', 18)} Nuovo movimento</button></footer>`;
  }
};
ACT.repeatGo = el => {
  const m = D.movements.find(x => x.id === el.dataset.id);
  if (!m) return;
  const n = cloneMov(m);
  D.movements.push(n);
  MOTION.freshId = n.id;
  hap('ok');
  save(); closeSheet(sheetOf(el)); refresh();
  toast(`«${n.description}» registrato, ${eur(n.amount)}`);
};
ACT.repeatEdit = el => {
  const m = D.movements.find(x => x.id === el.dataset.id), sh = sheetOf(el);
  if (!m) return;
  closeSheet(sh);
  const st0 = { type: m.type, amt: m.amount, description: m.description, categoryId: m.categoryId };
  setTimeout(() => { const s = openSheet('mov', st0); const t = topSheet(); if (t && t.type === 'mov') { const a = acc(m.accountId); if (a && !a.archived && !isGoal(a)) t.st.accountId = a.id; t.st.expr = t.st.amt; drawSheet(t); } }, 260);
};
ACT.repeatNew = el => { closeSheet(sheetOf(el)); setTimeout(() => openSheet('mov', {}), 260); };
(function () {
  const LP = { t: 0, fired: 0, x: 0, y: 0 };
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.ffab');
    if (!b || !D) return;
    LP.x = e.clientX; LP.y = e.clientY;
    clearTimeout(LP.t);
    LP.t = setTimeout(() => { LP.fired = Date.now(); hap('ok'); b.classList.add('lp'); setTimeout(() => b.classList.remove('lp'), 300); openSheet('repeat', {}); }, 480);
  }, { passive: true });
  const stop = () => clearTimeout(LP.t);
  document.addEventListener('pointerup', stop);
  document.addEventListener('pointercancel', stop);
  document.addEventListener('pointermove', e => { if (Math.abs(e.clientX - LP.x) > 12 || Math.abs(e.clientY - LP.y) > 12) stop(); }, { passive: true });
  document.addEventListener('click', e => { if (Date.now() - LP.fired < 700 && e.target.closest && e.target.closest('.ffab')) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.ffab')) e.preventDefault(); });
})();
ACT.movType = el => {
  const sh = sheetOf(el), st = sh.st, k = el.dataset.k;
  if (st.type === k) return;
  st.type = k;
  if (k === 'transfer') {
    st.cur = baseCur();
    if (!st.toAccountId || st.toAccountId === st.accountId) { const o = D.accounts.find(a => !a.archived && a.id !== st.accountId); st.toAccountId = o ? o.id : null; }
  } else if (isGoal(acc(st.accountId))) st.accountId = defaultAccountId();
  if (st.categoryId && (!cat(st.categoryId) || cat(st.categoryId).type !== k)) { st.categoryId = null; st.catManual = false; }
  if (k !== 'out') st.split.on = false;
  drawSheet(sh);
};
ACT.movNext = el => {
  const sh = sheetOf(el) || topSheet(), st = sh.st;
  if (!(strToNum(st.amt) > 0)) return;
  if (st.type !== 'transfer' && st.cur !== baseCur() && !(st.rate > 0)) return toast('Inserisci il cambio');
  st.step = 'details'; st.cameFromDetails = false;
  drawSheet(sh);
};
ACT.movEditAmt = el => { const sh = sheetOf(el); sh.st.step = 'amount'; sh.st.cameFromDetails = sh.st.mode === 'new'; drawSheet(sh); };
ACT.movCur = el => {
  const sh = sheetOf(el);
  openSheet('currency', { cur: sh.st.cur, onPick: c => { sh.st.cur = c; sh.st.rateManual = false; sh.st.fx = null; if (c !== baseCur()) sh.st.rate = D.settings.rates[c] || 1; drawSheet(sh); fxAuto(sh, true); } });
};
INP.movRate = el => { const sh = sheetOf(el); sh.st.rate = strToNum(el.value); sh.st.rateManual = true; const eq = $('.fx-eq', sheetEl(sh)); if (eq) eq.textContent = fxEq(sh.st); };
INP.movDesc = el => {
  const sh = sheetOf(el), st = sh.st, root = sheetEl(sh);
  st.description = el.value;
  if (!st.catManual) {
    const g = guessCategoryInfo(el.value, st.type);
    if (g && g.id !== st.categoryId) { st.categoryId = g.id; $('.cg', root).innerHTML = catGridHTML(st); }
    st.catWhy = g && g.id === st.categoryId ? g.why : '';
    const w = $('.cg-why', root); if (w) w.textContent = st.catWhy ? 'Categoria suggerita ' + st.catWhy + '.' : '';
  }
  $('.sugg', root).innerHTML = suggHTML(st);
};
ACT.suggPick = el => {
  const sh = sheetOf(el), st = sh.st, c = cat(el.dataset.c), a = acc(el.dataset.acc);
  st.description = el.dataset.t;
  if (c && !c.archived && c.type === st.type) { st.categoryId = c.id; st.catManual = true; }
  if (a && !a.archived && !isGoal(a)) st.accountId = a.id;
  drawSheet(sh);
};
ACT.movCat = el => {
  const sh = sheetOf(el), st = sh.st;
  st.categoryId = el.dataset.id; st.catManual = true; st.catWhy = '';
  const w = $('.cg-why', sheetEl(sh)); if (w) w.textContent = '';
  $('.cg', sheetEl(sh)).innerHTML = catGridHTML(st);
};
ACT.movCatNew = el => { const sh = sheetOf(el); openSheet('category', { type: sh.st.type, onSave: c => { sh.st.categoryId = c.id; sh.st.catManual = true; drawSheet(sh); } }); };
function addTag(sh, raw) {
  const t = normTag(raw), st = sh.st;
  if (t && !st.tags.includes(t)) st.tags.push(t);
  st.focusTag = true;
  drawSheet(sh);
}
INP.movTagInp = el => { if (/[\s,]$/.test(el.value)) addTag(sheetOf(el), el.value); };
KEYS.movTag = (el, e) => {
  const sh = sheetOf(el);
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (el.value.trim()) addTag(sh, el.value); else el.blur(); }
  else if (e.key === 'Backspace' && !el.value && sh.st.tags.length) { sh.st.tags.pop(); sh.st.focusTag = true; drawSheet(sh); }
};
ACT.movTagAdd = el => addTag(sheetOf(el), el.dataset.t);
ACT.movTagDel = el => { const sh = sheetOf(el); sh.st.tags = sh.st.tags.filter(t => t !== el.dataset.t); drawSheet(sh); };
CHG.movPhoto = async el => {
  const f = el.files && el.files[0], sh = sheetOf(el);
  if (!f || !sh) return;
  try {
    const blob = await compressImage(f);
    if (sh.st.newPhotoURL) URL.revokeObjectURL(sh.st.newPhotoURL);
    sh.st.newPhoto = blob; sh.st.newPhotoURL = URL.createObjectURL(blob); sh.st.photoRemoved = false;
    drawSheet(sh);
  } catch (e) { toast('Non riesco a leggere questa immagine.'); }
};
ACT.movPhotoDel = el => {
  const sh = sheetOf(el), st = sh.st;
  if (st.newPhotoURL) URL.revokeObjectURL(st.newPhotoURL);
  st.newPhoto = null; st.newPhotoURL = null; st.photoRemoved = true;
  drawSheet(sh);
};
ACT.photoView = el => openSheet('photo', { src: el.currentSrc || el.src });
SHEETS.photo = { full: true, cls: 'photo-sheet', render: (st, sh) => `${sheetHead('Scontrino', { grab: false })}<div class="photo-full"><img src="${sh.props.src}" alt="Foto dello scontrino"></div>` };
ACT.movSplit = el => {
  const sh = sheetOf(el), sp = sh.st.split;
  sp.on = !sp.on;
  drawSheet(sh);
};
ACT.movSplitP = el => {
  const sh = sheetOf(el), sp = sh.st.split, id = el.dataset.id;
  if (sp.people.includes(id)) { sp.people = sp.people.filter(x => x !== id); if (sp.paidBy === id) sp.paidBy = 'me'; }
  else sp.people.push(id);
  drawSheet(sh);
};
ACT.movPaid = el => { const sh = sheetOf(el); sh.st.split.paidBy = el.dataset.id; drawSheet(sh); };
ACT.personNew = el => {
  const sh = sheetOf(el);
  openSheet('person', { onSave: p => { if (sh && sh.type === 'mov' && UI.sheets.includes(sh)) { sh.st.split.people.push(p.id); drawSheet(sh); } } });
};
async function movSaveCore(el) {
  const sh = sheetOf(el), st = sh.st;
  const orig = strToNum(st.amt);
  if (!(orig > 0)) return toast("Inserisci l'importo");
  const isFx = st.type !== 'transfer' && st.cur !== baseCur();
  if (isFx && !(st.rate > 0)) return toast('Inserisci il cambio');
  const amount = movEUR(st);
  if (st.type === 'transfer') {
    if (!acc(st.accountId) || !acc(st.toAccountId) || st.accountId === st.toAccountId) return toast('Scegli due conti diversi');
  } else {
    if (!cat(st.categoryId)) return toast('Scegli una categoria');
    const paidByOther = st.type === 'out' && st.split.on && st.split.people.length && st.split.paidBy !== 'me';
    if (!paidByOther && !acc(st.accountId)) return toast('Scegli un conto');
  }
  const draft = $('[data-in="movTagInp"]', sheetEl(sh));
  if (draft && draft.value.trim()) { const t = normTag(draft.value); if (t && !st.tags.includes(t)) st.tags.push(t); }
  const isNew = st.mode !== 'edit';
  const m = isNew ? { id: uid(), ts: Date.now() } : D.movements.find(x => x.id === st.id);
  if (!m) return closeSheet(sh);
  try {
    if (st.newPhoto) {
      const pid = uid();
      await PhotoDB.put(pid, await blobToRec(st.newPhoto));
      if (m.photoId) PhotoDB.del(m.photoId).catch(() => { });
      m.photoId = pid;
    } else if (st.photoRemoved && m.photoId) { PhotoDB.del(m.photoId).catch(() => { }); delete m.photoId; }
  } catch (e) { toast('La foto non è stata salvata: memoria non disponibile.'); }
  Object.assign(m, { type: st.type, date: st.date, amount, description: st.description.trim(), note: st.note.trim(), tags: st.tags.slice(), accountId: st.accountId });
  if (st.type === 'transfer') { m.toAccountId = st.toAccountId; delete m.categoryId; } else { m.categoryId = st.categoryId; delete m.toAccountId; }
  if (!isNew && (m.cardDebit || m.interestOf)) m.manual = true;
  if (isFx) { m.cur = st.cur; m.orig = r2(orig); m.rate = st.rate; D.settings.rates[st.cur] = st.rate; }
  else { delete m.cur; delete m.orig; delete m.rate; }
  if (st.type === 'out' && st.split.on && st.split.people.length) {
    const ppl = st.split.people.filter(p => person(p));
    const { each, mine } = splitShares(amount, ppl.length);
    const shares = {};
    ppl.forEach(p => { shares[p] = each; });
    m.split = { mine, shares };
    m.paidBy = st.split.paidBy === 'me' ? null : st.split.paidBy;
    if (m.paidBy && !liquidAccounts().length) m.accountId = null;
  } else { delete m.split; delete m.paidBy; }
  if (st.fixedId) { m.fixedId = st.fixedId; m.fixedKey = st.fixedKey; }
  if (isNew) D.movements.push(m);
  if (sh.props && sh.props.inboxId) D.inbox = (D.inbox || []).filter(x => x.id !== sh.props.inboxId);
  save();
  closeSheet(sh);
  refresh();
  toast(isNew ? { out: 'Uscita salvata', in: 'Entrata salvata', transfer: 'Trasferimento salvato' }[st.type] : 'Modifiche salvate');
}
// salvataggio: conferma tattile e la riga nuova si illumina un istante
ACT.movSave = async el => {
  const ids = new Set(D.movements.map(m => m.id)), n = UI.sheets.length;
  const r = await movSaveCore(el);
  if (UI.sheets.length < n) {
    hap('ok');
    const nu = D.movements.find(m => !ids.has(m.id));
    if (nu) { const row = $(`#view .mrow[data-id="${nu.id}"]`); if (row) row.classList.add('fresh'); }
  }
  return r;
};
ACT.movDelete = el => {
  const sh = sheetOf(el), id = sh.st.id;
  confirmBox('Eliminare il movimento?', 'Potrai annullare subito dopo.', 'Elimina', () => {
    const m = D.movements.find(x => x.id === id);
    if (!m) return;
    D.movements = D.movements.filter(x => x !== m);
    if (m.cardDebit) { const ca = acc(m.cardDebit); if (ca) ca.skipDebits = (ca.skipDebits || []).concat(m.cycle); }
    if (m.pacOf) pacUndo(m);
    if (m.interestOf) { const ia = acc(m.interestOf); if (ia && ia.interest) ia.interest.skip = (ia.interest.skip || []).concat(m.period); }
    save(); closeSheet(sh); refresh();
    toast('Movimento eliminato', (m.pacOf || m.cardDebit || m.interestOf) ? undefined : { label: 'Annulla', fn: () => { D.movements.push(m); save(); refresh(); } });
    if (m.photoId) setTimeout(() => { if (!D || !D.movements.some(x => x.photoId === m.photoId)) PhotoDB.del(m.photoId).catch(() => { }); }, 8000);
  });
};
function movOpenCore(el) {
  const m = D.movements.find(x => x.id === el.dataset.id);
  if (!m) return;
  if (m.type === 'settle') openSheet('settle', { id: m.id }); else openSheet('mov', { id: m.id });
}
ACT.movOpen = el => {
  if (!VT_OK() || !el.classList.contains('mrow') || !el.closest('#view')) return movOpenCore(el);
  hap();
  const de = document.documentElement;
  el.style.viewTransitionName = 'mvcard';
  de.dataset.nav = 'card';
  let vt;
  try {
    vt = document.startViewTransition(() => {
      el.style.viewTransitionName = '';
      movOpenCore(el);
      const w = $('#sheets').lastElementChild;
      if (w) { w.classList.add('in', 'vt-now'); const s = w.querySelector('.sheet'); if (s) s.style.viewTransitionName = 'mvcard'; }
    });
  } catch (err) { el.style.viewTransitionName = ''; delete de.dataset.nav; return movOpenCore(el); }
  const clean = () => {
    if (de.dataset.nav === 'card') delete de.dataset.nav;
    $$('#sheets .vt-now').forEach(w => { w.classList.remove('vt-now'); const s = w.querySelector('.sheet'); if (s) s.style.viewTransitionName = ''; });
  };
  vt.finished.then(clean, clean);
};

/* ---------- valuta ---------- */
ACT.curPick = el => { const sh = sheetOf(el); closeSheet(sh); sh.props.onPick(el.dataset.c); };

/* ---------- SPESE FISSE ---------- */
SHEETS.fixed = {
  cls: 'tall',
  init(p) {
    if (p.id) {
      const f = D.fixed.find(x => x.id === p.id);
      return { id: f.id, name: f.name, type: f.type, amt: numStr(f.amount), variable: !!f.variable, categoryId: f.categoryId || null, accountId: f.accountId, toAccountId: f.toAccountId || null, freq: f.freq, first: dueDate(f, f.start), endMode: f.count ? 'count' : f.end ? 'date' : 'never', count: String(f.count || 12), end: f.end || addM(f.start, 11), note: f.note || '', paused: !!f.paused, sink: !!f.sink };
    }
    const g = goals()[0];
    return { id: null, name: p.name || '', type: p.type || 'out', amt: '', variable: false, categoryId: null, accountId: defaultAccountId(), toAccountId: p.toAccountId || (g ? g.id : null), freq: 1, first: today(), endMode: 'never', count: '12', end: addM(curMk(), 11), note: '', paused: false, sink: null };
  },
  render(st) {
    const types = [['out', 'Uscita'], ['in', 'Entrata'], ['transfer', 'Risparmio']];
    let h = sheetHead(st.id ? 'Modifica voce fissa' : 'Nuova voce fissa') + '<div class="sheet-body">';
    h += `<div class="seg">${types.map(([k, l]) => `<button class="${st.type === k ? 'on' : ''}" data-a="fxType" data-k="${k}">${l}</button>`).join('')}</div>`;
    h += `<label class="fld"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="${st.type === 'in' ? 'Es. Stipendio' : st.type === 'transfer' ? 'Es. Versamento vacanze' : 'Es. Affitto, bolletta luce, rata auto'}" autocomplete="off"></label>`;
    h += `<label class="fld"><span>${st.variable ? 'Importo stimato' : 'Importo'}</span><input inputmode="decimal" data-in="set" data-f="amt" value="${esc(st.amt)}" placeholder="0,00"></label>`;
    h += swRow('Importo variabile', 'variable', st.variable, 'Come le bollette: quando la registri inserisci la cifra giusta. Ti proporrò la media delle ultime volte.');
    if (st.type === 'transfer') {
      h += fieldLabel('Verso il salvadanaio') + (goals().length ? `<div class="chips wrap">${goals().map(g => `<button class="chip ${st.toAccountId === g.id ? 'on' : ''}" data-a="pick" data-f="toAccountId" data-v="${g.id}">${esc(g.emoji || '🐷')} ${esc(g.name)}</button>`).join('')}</div>` : `<button class="btn outline sm" data-a="goalNew">${ic('plus', 16)} Crea un salvadanaio</button>`);
    } else {
      h += fieldLabel('Categoria') + `<div class="chips wrap">${activeCats(st.type).map(c => `<button class="chip ${st.categoryId === c.id ? 'on' : ''}" data-a="pick" data-f="categoryId" data-v="${c.id}">${esc(c.emoji)} ${esc(c.name)}</button>`).join('')}</div>`;
    }
    if (liquidAccounts().length > 1) h += fieldLabel(st.type === 'in' ? 'Accredito su' : st.type === 'transfer' ? 'Dal conto' : 'Pagata con') + accChips('accountId', st.accountId, false);
    h += fieldLabel('Ogni quanto') + `<div class="chips wrap">${FREQS.map(([v, l]) => `<button class="chip ${st.freq === v ? 'on' : ''}" data-a="pick" data-f="freq" data-v="${v}" data-num>${l}</button>`).join('')}</div>`;
    if (st.type === 'out' && Number(st.freq) > 1) { const on = st.sink == null ? Number(st.freq) >= 3 : st.sink, per = strToNum(st.amt) / Number(st.freq); h += swRow('Accantona ogni mese', 'sink', on, `${per > 0 ? 'Circa ' + eur(per) + ' al mese' : 'Una quota ogni mese'} nel salvadanaio «Accantonamenti»: alla scadenza i soldi sono già pronti e il saldo non ha scossoni.`, 'fxSink'); }
    h += `<label class="fld"><span>${st.id ? 'Prima scadenza' : 'Prossima scadenza (o prima rata)'}</span><input type="date" value="${st.first}" data-ch="date" data-f="first"></label>`;
    h += fieldLabel('Termina') + `<div class="chips wrap">${[['never', 'Mai'], ['count', 'Dopo un numero di rate'], ['date', 'In un mese preciso']].map(([k, l]) => `<button class="chip ${st.endMode === k ? 'on' : ''}" data-a="pick" data-f="endMode" data-v="${k}">${l}</button>`).join('')}</div>`;
    if (st.endMode === 'count') h += `<label class="fld"><span>Numero totale di rate</span><input inputmode="numeric" data-in="set" data-f="count" value="${esc(st.count)}"></label>`;
    if (st.endMode === 'date') h += `<label class="fld"><span>Ultima scadenza</span><input type="month" value="${st.end}" data-ch="set" data-f="end"></label>`;
    h += `<label class="fld"><span>Nota (facoltativa)</span><input data-in="set" data-f="note" value="${esc(st.note)}" autocomplete="off"></label>`;
    if (st.id) {
      h += swRow('In pausa', 'paused', st.paused, 'Non comparirà tra le voci da registrare finché non la riattivi.');
      h += `<div class="danger-z"><button class="link danger" data-a="fxDelete">Elimina voce fissa</button></div>`;
    }
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="fxSave">${st.id ? 'Salva modifiche' : 'Aggiungi voce fissa'}</button></footer>`;
  }
};
ACT.fxType = el => {
  const sh = sheetOf(el), st = sh.st;
  st.type = el.dataset.k;
  if (st.categoryId && (!cat(st.categoryId) || cat(st.categoryId).type !== st.type)) st.categoryId = null;
  if (st.type === 'transfer' && !isGoal(acc(st.toAccountId))) { const g = goals()[0]; st.toAccountId = g ? g.id : null; }
  drawSheet(sh);
};
ACT.fxNew = () => openSheet('fixed', {});
ACT.fxEdit = el => openSheet('fixed', { id: el.dataset.id });
ACT.fxSave = el => {
  const sh = sheetOf(el), st = sh.st;
  const name = st.name.trim();
  if (!name) return toast('Dai un nome alla voce fissa');
  const amount = r2(strToNum(st.amt));
  if (!(amount > 0)) return toast(st.variable ? "Inserisci un importo stimato" : "Inserisci l'importo");
  if (st.type === 'transfer') { if (!isGoal(acc(st.toAccountId))) return toast('Scegli il salvadanaio'); }
  else if (!cat(st.categoryId)) return toast('Scegli una categoria');
  if (!acc(st.accountId)) return toast('Scegli un conto');
  if (!st.first) return toast('Scegli la data della prossima scadenza');
  const start = mk(st.first), day = Number(st.first.slice(8));
  const count = st.endMode === 'count' ? parseInt(st.count, 10) : null;
  if (st.endMode === 'count' && !(count > 0)) return toast('Indica il numero di rate');
  if (st.endMode === 'date' && (!st.end || st.end < start)) return toast("L'ultima scadenza deve venire dopo la prima");
  const f = st.id ? D.fixed.find(x => x.id === st.id) : { id: uid(), skipped: [], created: today(), trackFrom: start > curMk() ? start : curMk() };
  Object.assign(f, { name, type: st.type, amount, variable: !!st.variable, accountId: st.accountId, freq: Number(st.freq), start, day, note: st.note.trim(), paused: !!st.paused, count, end: st.endMode === 'date' ? st.end : null });
  if (st.type === 'transfer') { f.toAccountId = st.toAccountId; delete f.categoryId; } else { f.categoryId = st.categoryId; delete f.toAccountId; }
  const sk = st.type === 'out' && Number(st.freq) > 1 && (st.sink == null ? Number(st.freq) >= 3 : !!st.sink);
  if (sk && !f.sink) f.sinkFrom = curMk();
  f.sink = sk;
  if (sk) sinkGoal();
  if (!st.id) D.fixed.push(f);
  save(); closeSheet(sh); refresh();
  toast(st.id ? 'Voce fissa aggiornata' : 'Voce fissa aggiunta');
};
ACT.fxDelete = el => {
  const sh = sheetOf(el), id = sh.st.id, f = D.fixed.find(x => x.id === id);
  confirmBox(`Eliminare «${f.name}»?`, 'I movimenti già registrati restano nello storico.', 'Elimina', () => {
    D.fixed = D.fixed.filter(x => x.id !== id);
    save(); closeSheet(sh); refresh(); toast('Voce fissa eliminata');
  });
};
ACT.fxConfirm = el => {
  hap();
  const f = D.fixed.find(x => x.id === el.dataset.id), k = el.dataset.k;
  if (!f) return;
  const due = dueDate(f, k), t = today(), date = due <= t ? due : t, amt = estimateAmount(f);
  if (!f.variable) {
    const m = { id: uid(), ts: Date.now(), type: f.type, date, amount: r2(amt), description: f.name, accountId: f.sink ? sinkGoal().id : f.accountId, tags: [], note: '', fixedId: f.id, fixedKey: k };
    if (f.type === 'transfer') m.toAccountId = f.toAccountId; else m.categoryId = f.categoryId;
    D.movements.push(m);
    save(); refresh();
    toast(`«${f.name}» registrata`);
  } else {
    openSheet('mov', { type: f.type, step: 'amount', amt: amt, date, categoryId: f.categoryId, accountId: f.sink ? sinkGoal().id : f.accountId, toAccountId: f.toAccountId, description: f.name, fixedId: f.id, fixedKey: k, lockType: true, title: f.name });
  }
};
ACT.fxSkip = el => {
  const f = D.fixed.find(x => x.id === el.dataset.id), k = el.dataset.k;
  if (!f) return;
  f.skipped = (f.skipped || []).concat(k);
  save(); refresh();
  toast(`«${f.name}» saltata per ${monthName(k).toLowerCase()}`, { label: 'Annulla', fn: () => { f.skipped = f.skipped.filter(x => x !== k); save(); refresh(); } });
};

/* ---------- CATEGORIE ---------- */
SHEETS.category = {
  init(p) {
    if (p.id) { const c = cat(p.id); return { id: c.id, name: c.name, type: c.type, budget: c.budget ? numStr(c.budget) : '', emoji: c.emoji, color: c.color, showEmoji: false, archived: !!c.archived }; }
    return { id: null, name: '', type: p.type || 'out', budget: '', emoji: '🏷️', color: nextColor(D.categories), showEmoji: false };
  },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica categoria' : 'Nuova categoria') + '<div class="sheet-body">';
    h += `<div class="ed-top"><button class="big-av" style="background:${tint(st.color)}" data-a="toggle" data-f="showEmoji" aria-label="Scegli l'icona">${esc(st.emoji)}</button><label class="fld grow"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. Ristoranti" autocomplete="off"></label></div>`;
    h += emojiPicker(st) + fieldLabel('Colore') + colorSwatches(st);
    h += fieldLabel('Tipo') + `<div class="seg">${[['out', 'Uscita'], ['in', 'Entrata']].map(([k, l]) => `<button class="${st.type === k ? 'on' : ''}" data-a="pick" data-f="type" data-v="${k}">${l}</button>`).join('')}</div>`;
    if (st.id && st.type !== cat(st.id).type) h += `<p class="muted sm gap-t">Tutti i movimenti di questa categoria diventeranno ${st.type === 'in' ? 'entrate' : 'uscite'}.</p>`;
    h += `<label class="fld"><span>${st.type === 'out' ? 'Budget mensile' : 'Entrata prevista al mese'}</span><input inputmode="decimal" data-in="set" data-f="budget" value="${esc(st.budget)}" placeholder="Nessun limite"></label>`;
    if (st.type === 'out') h += '<p class="muted sm">Riceverai un avviso nella Home quando arrivi all\'80% e quando superi il budget.</p>';
    if (st.id) h += `<div class="danger-z">${st.archived ? '<button class="link" data-a="catRestore">Ripristina categoria</button>' : '<button class="link danger" data-a="catDelete">Elimina categoria</button>'}</div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="catSave">${st.id ? 'Salva modifiche' : 'Crea categoria'}</button></footer>`;
  }
};
ACT.catEdit = el => openSheet('category', { id: el.dataset.id });
ACT.catNew = el => openSheet('category', { type: el.dataset.type || 'out' });
ACT.catSave = el => {
  const sh = sheetOf(el), st = sh.st, name = st.name.trim();
  if (!name) return toast('Dai un nome alla categoria');
  if (D.categories.some(c => c.id !== st.id && !c.archived && c.name.toLowerCase() === name.toLowerCase())) return toast('Esiste già una categoria con questo nome');
  let c;
  if (st.id) { c = cat(st.id); Object.assign(c, { name, type: st.type, budget: r2(strToNum(st.budget)), emoji: st.emoji, color: st.color }); for (const m of D.movements) if (m.categoryId === c.id && (m.type === 'in' || m.type === 'out')) m.type = c.type; }
  else { c = { id: uid(), name, type: st.type, budget: r2(strToNum(st.budget)), emoji: st.emoji, color: st.color, archived: false }; D.categories.push(c); }
  save(); closeSheet(sh); refresh();
  if (sh.props.onSave) sh.props.onSave(c);
  toast(st.id ? 'Categoria aggiornata' : 'Categoria creata');
};
ACT.catDelete = el => {
  const sh = sheetOf(el), c = cat(sh.st.id);
  const n = D.movements.filter(m => m.categoryId === c.id).length + D.fixed.filter(f => f.categoryId === c.id).length;
  confirmBox(`Eliminare «${c.name}»?`, n ? `È usata da ${n} tra movimenti e voci fisse: la archivio, così lo storico resta com'è. Non la vedrai più nelle scelte.` : 'La categoria non è usata da nessun movimento.', n ? 'Archivia' : 'Elimina', () => {
    if (n) c.archived = true; else D.categories = D.categories.filter(x => x !== c);
    save(); closeSheet(sh); refresh(); toast(n ? 'Categoria archiviata' : 'Categoria eliminata');
  });
};
ACT.catRestore = el => { const sh = sheetOf(el); cat(sh.st.id).archived = false; save(); closeSheet(sh); refresh(); toast('Categoria ripristinata'); };

/* ---------- CONTI ---------- */
const ACC_KINDS = [['bank', 'Conto corrente', '🏦'], ['card', 'Carta', '💳'], ['cash', 'Contanti', '💶'], ['other', 'Altro', '👛']];
SHEETS.account = {
  init(p) {
    if (p.id) { const a = acc(p.id); return { id: a.id, name: a.name, emoji: a.emoji || '🏦', kind: a.kind || 'bank', initial: numStr(a.initial || 0), initialDate: a.initialDate || today(), isDefault: D.settings.defaultAccount === a.id, showEmoji: false }; }
    return { id: null, name: '', emoji: '💳', kind: 'card', initial: '', initialDate: today(), isDefault: false, showEmoji: false };
  },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica conto' : 'Nuovo conto') + '<div class="sheet-body">';
    h += `<div class="ed-top"><button class="big-av" style="background:var(--surface-2)" data-a="toggle" data-f="showEmoji" aria-label="Scegli l'icona">${esc(st.emoji)}</button><label class="fld grow"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. Carta di credito" autocomplete="off"></label></div>`;
    h += emojiPicker(st, ['🏦', '💳', '💶', '👛', '💰', '🪙', '📱', '🏧', '💼', '🧾']);
    h += fieldLabel('Tipo') + `<div class="chips wrap">${ACC_KINDS.map(([k, l, e]) => `<button class="chip ${st.kind === k ? 'on' : ''}" data-a="accKind" data-k="${k}" data-e="${e}">${e} ${l}</button>`).join('')}</div>`;
    h += `<label class="fld"><span>Saldo iniziale</span><input inputmode="decimal" data-in="set" data-f="initial" value="${esc(st.initial)}" placeholder="0,00"></label>`;
    h += `<label class="fld"><span>Alla data del</span><input type="date" value="${st.initialDate}" data-ch="date" data-f="initialDate"></label>`;
    h += '<p class="muted sm">Il saldo iniziale è quello del conto all\'inizio del giorno indicato. Per una carta di credito puoi scrivere un numero negativo.</p>';
    h += swRow('Conto predefinito', 'isDefault', st.isDefault, 'Usato in automatico per le nuove spese');
    if (st.id) h += `<div class="danger-z"><button class="link danger" data-a="accDelete">Elimina conto</button></div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="accSave">${st.id ? 'Salva modifiche' : 'Aggiungi conto'}</button></footer>`;
  }
};
ACT.accKind = el => { const sh = sheetOf(el); const was = ACC_KINDS.find(k => k[0] === sh.st.kind); if (!sh.st.emoji || (was && was[2] === sh.st.emoji)) sh.st.emoji = el.dataset.e; sh.st.kind = el.dataset.k; drawSheet(sh); };
ACT.accEdit = el => openSheet('account', { id: el.dataset.id });
ACT.accNew = () => openSheet('account', {});
ACT.accSave = el => {
  const sh = sheetOf(el), st = sh.st, name = st.name.trim();
  if (!name) return toast('Dai un nome al conto');
  const a = st.id ? acc(st.id) : { id: uid(), archived: false };
  Object.assign(a, { name, emoji: st.emoji, kind: st.kind, initial: r2(strToNum(st.initial)), initialDate: st.initialDate || today() });
  applyCardSettings(a, st);
  applyInterestSettings(a, st);
  if (!st.id) D.accounts.push(a);
  if (st.isDefault || !acc(D.settings.defaultAccount)) D.settings.defaultAccount = a.id;
  save(); closeSheet(sh); refresh(); toast(st.id ? 'Conto aggiornato' : 'Conto aggiunto');
};
ACT.accDelete = el => {
  const sh = sheetOf(el), a = acc(sh.st.id);
  if (liquidAccounts().length <= 1) return toast('Serve almeno un conto');
  const n = D.movements.filter(m => m.accountId === a.id || m.toAccountId === a.id).length;
  const fx = D.fixed.filter(f => f.accountId === a.id).length;
  confirmBox(`Eliminare «${a.name}»?`, n ? `Il conto ha ${n} movimenti: lo archivio e il suo saldo non verrà più contato nel disponibile. I movimenti restano nello storico.` : 'Il conto non ha movimenti.', n ? 'Archivia' : 'Elimina', () => {
    if (n) a.archived = true; else D.accounts = D.accounts.filter(x => x !== a);
    if (D.settings.defaultAccount === a.id) D.settings.defaultAccount = defaultAccountId();
    if (fx) { const d = defaultAccountId(); D.fixed.forEach(f => { if (f.accountId === a.id) f.accountId = d; }); }
    save(); closeSheet(sh); refresh(); toast(n ? 'Conto archiviato' : 'Conto eliminato');
  });
};
ACT.accFilter = el => { UI.filters = blankFilters(); UI.filters.accs = [el.dataset.id]; UI.filters.period = 'm:' + UI.month; UI.q = ''; goTab('movs'); };

/* ---------- RIEPILOGO DI UN CONTO ----------
   Saldo a inizio mese, entrate, uscite, trasferimenti, saldo a fine mese (o oggi)
   e, nel mese in corso, voci fisse ancora da registrare su quel conto. */
// effetto di una voce fissa in sospeso su un conto
function accPendDelta(p, id) {
  const f = p.f;
  if (p.sink) return f.accountId === id ? -p.amt : 0;
  const amt = estimateAmount(f);
  if (f.type === 'out') return f.accountId === id ? -amt : 0;
  if (f.type === 'in') return f.accountId === id ? amt : 0;
  if (f.type === 'transfer') return (f.accountId === id ? -amt : 0) + (f.toAccountId === id ? amt : 0);
  return 0;
}
function accMonth(id, k) {
  const a = acc(id), ck = curMk(), isCur = k === ck, end = isCur ? today() : endOf(k);
  const startD = endOf(addM(k, -1));
  let opening = balancesAt(startD)[id] || 0, opened = null;
  if (a.initialDate && mk(a.initialDate) === k) { opened = a.initialDate; opening = 0; }
  const r = { inc: 0, out: 0, tin: 0, tout: 0, other: 0, list: [] };
  for (const m of D.movements) {
    if (mk(m.date) !== k || m.date > end) continue;
    for (const [aid, d] of effects(m)) {
      if (aid !== id || (a.initialDate && m.date < a.initialDate)) continue;
      if (m.type === 'in') r.inc += d;
      else if (m.type === 'out') r.out -= d;
      else if (m.type === 'transfer') { if (d > 0) r.tin += d; else r.tout -= d; }
      else r.other += d;
      r.list.push(m);
    }
  }
  r.list = Array.from(new Set(r.list)).sort((x, y) => y.date.localeCompare(x.date));
  r.opening = r2(opening); r.opened = opened; r.initial = opened ? (a.initial || 0) : 0;
  r.closing = r2(balancesAt(end)[id] || 0);
  r.end = end; r.isCur = isCur;
  if (isCur) {
    const pend = pendingFixed(ck).map(p => ({ p, d: accPendDelta(p, id) })).filter(x => Math.abs(x.d) > 0.004);
    r.pend = pend; r.pendTot = r2(sum(pend.map(x => x.d)));
  }
  return r;
}
ACT.accSum = el => openSheet('accSum', { id: el.dataset.id, k: UI.month });
ACT.accSumMonth = el => { const sh = sheetOf(el); sh.st.k = addM(sh.st.k, Number(el.dataset.d)); drawSheet(sh); };
ACT.accSumAll = el => {
  const sh = sheetOf(el), id = sh.props.id, k = sh.st.k;
  closeSheet(sh);
  UI.filters = blankFilters(); UI.filters.accs = [id]; UI.filters.period = 'm:' + k; UI.q = ''; goTab('movs');
};
SHEETS.accSum = {
  cls: 'tall',
  init(p) { return { k: p.k || UI.month }; },
  render(st, sh) {
    const a = acc(sh.props.id);
    if (!a) return sheetHead('Conto') + '<div class="sheet-body"><p class="muted">Conto non trovato.</p></div>';
    const k = st.k, r = accMonth(a.id, k), mName = monthName(k), mLow = MESI[Number(k.slice(5)) - 1].toLowerCase();
    let h = sheetHead(a.name);
    h += '<div class="sheet-body">';
    h += `<div class="as-top"><span class="as-ic" aria-hidden="true">${esc(a.emoji || '🏦')}</span><div><p class="muted sm">${r.isCur ? 'Saldo oggi' : k < curMk() ? 'Saldo a fine ' + mLow : 'Saldo con i movimenti già inseriti'}</p><p class="hero-n">${bigAmount(r.closing)}</p><p class="muted sm">${esc(KIND_NAMES[a.kind] || 'Conto')}</p></div></div>`;
    h += `<div class="msw as-msw"><button class="icon-btn sm" data-a="accSumMonth" data-d="-1" aria-label="Mese precedente">${ic('left', 18)}</button><span class="msw-l">${mName}</span><button class="icon-btn sm" data-a="accSumMonth" data-d="1" aria-label="Mese successivo" ${k >= curMk() ? 'disabled' : ''}>${ic('right', 18)}</button></div>`;
    // entrate e uscite a confronto
    const mx = Math.max(r.inc + r.tin, r.out + r.tout, 1);
    h += `<div class="as-bars" aria-hidden="true"><div><span>Entrate</span><i class="in" style="width:${((r.inc + r.tin) / mx * 100).toFixed(1)}%"></i></div><div><span>Uscite</span><i class="out" style="width:${((r.out + r.tout) / mx * 100).toFixed(1)}%"></i></div></div>`;
    const row = (label, v, cls = '', sign = true) => `<div class="as-row ${cls}"><span>${label}</span><b class="num ${sign && v < 0 ? 'out' : sign && v > 0 ? 'pos' : ''}">${eur(v, { sign })}</b></div>`;
    let led = r.opened ? row('Saldo iniziale inserito il ' + shortDate(r.opened), r.initial, 'as-sub', false) : row('Saldo a inizio ' + mLow, r.opening, 'as-sub', false);
    led += row('Entrate', r.inc);
    led += row('Uscite', -r.out);
    if (r.tin) led += row('Trasferimenti ricevuti', r.tin);
    if (r.tout) led += row('Trasferimenti verso altri conti', -r.tout);
    if (Math.abs(r.other) > 0.004) led += row('Rimborsi e saldi con le persone', r2(r.other));
    led += row(r.isCur ? 'Rimane oggi' : 'Rimasto a fine ' + mLow, r.closing, 'as-tot', false);
    if (r.isCur && r.pend && r.pend.length) {
      led += row(`Voci fisse ancora da registrare (${r.pend.length})`, r.pendTot, 'as-sub');
      led += row('Previsto a fine ' + mLow, r2(r.closing + r.pendTot), 'as-tot', false);
    }
    h += section('Il mese di questo conto', `<div class="as-led">${led}</div>`);
    const net = r2(r.closing - (r.opened ? r.initial : r.opening));
    h += `<p class="muted sm">${r.list.length ? `${r.list.length} ${r.list.length === 1 ? 'movimento' : 'movimenti'} a ${mLow}: il conto è ${net >= 0 ? 'cresciuto di ' : 'sceso di '}<b class="num">${eur(Math.abs(net))}</b>.` : 'Nessun movimento su questo conto a ' + mLow + '.'}</p>`;
    if (r.list.length) h += section('Ultimi movimenti', `<div class="mlist">${r.list.slice(0, 6).map(movRow).join('')}</div>`);
    h += `<button class="btn w gap-t" data-a="accSumAll">${ic('list', 18)} Tutti i movimenti di ${mLow}</button>`;
    return h + '</div>';
  }
};

/* ---------- SALVADANAI ---------- */
SHEETS.goal = {
  init(p) {
    if (p.id) { const g = acc(p.id); return { id: g.id, name: g.name, emoji: g.emoji || '🐷', color: g.color || PALETTE[3], target: g.target ? numStr(g.target) : '', deadline: g.deadline || '', initial: numStr(g.initial || 0), showEmoji: false }; }
    return { id: null, name: '', emoji: '🐷', color: nextColor(goals()), target: '', deadline: '', initial: '', showEmoji: false };
  },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica salvadanaio' : 'Nuovo salvadanaio') + '<div class="sheet-body">';
    h += `<div class="ed-top"><button class="big-av" style="background:${tint(st.color)}" data-a="toggle" data-f="showEmoji" aria-label="Scegli l'icona">${esc(st.emoji)}</button><label class="fld grow"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. Vacanze in Grecia" autocomplete="off"></label></div>`;
    h += emojiPicker(st, ['🐷', '🏖️', '✈️', '🚗', '🏠', '🎓', '💍', '👶', '🛟', '🎁', '💻', '📱', '🏔️', '🚲', '🎸', '🐾', '🩺', '🎯']) + fieldLabel('Colore') + colorSwatches(st);
    h += `<label class="fld"><span>Obiettivo (facoltativo)</span><input inputmode="decimal" data-in="set" data-f="target" value="${esc(st.target)}" placeholder="Es. 1.500"></label>`;
    h += `<label class="fld"><span>Entro il mese (facoltativo)</span><input type="month" value="${st.deadline}" data-ch="set" data-f="deadline"></label>`;
    h += `<label class="fld"><span>${st.id ? 'Saldo iniziale' : 'Hai già messo da parte'}</span><input inputmode="decimal" data-in="set" data-f="initial" value="${esc(st.initial)}" placeholder="0,00"></label>`;
    h += '<p class="muted sm">Per mettere da parte ogni mese in automatico, crea una voce fissa di tipo Risparmio.</p>';
    if (st.id) h += `<div class="danger-z"><button class="link danger" data-a="goalDelete">Elimina salvadanaio</button></div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="goalSave">${st.id ? 'Salva modifiche' : 'Crea salvadanaio'}</button></footer>`;
  }
};
ACT.goalNew = () => openSheet('goal', {});
ACT.goalEdit = el => openSheet('goal', { id: el.dataset.id });
ACT.goalSave = el => {
  const sh = sheetOf(el), st = sh.st, name = st.name.trim();
  if (!name) return toast('Dai un nome al salvadanaio');
  const g = st.id ? acc(st.id) : { id: uid(), kind: 'goal', archived: false, initialDate: today() };
  Object.assign(g, { name, emoji: st.emoji, color: st.color, target: r2(strToNum(st.target)), deadline: st.deadline || '', initial: r2(strToNum(st.initial)) });
  if (!st.id) D.accounts.push(g);
  save(); closeSheet(sh); refresh();
  UI.sheets.forEach(s => { if (s.type === 'fixed' && s.st.type === 'transfer' && !s.st.toAccountId) { s.st.toAccountId = g.id; drawSheet(s); } });
  toast(st.id ? 'Salvadanaio aggiornato' : 'Salvadanaio creato');
};
ACT.goalDelete = el => {
  const sh = sheetOf(el), g = acc(sh.st.id), v = balancesAt(today())[g.id] || 0;
  const n = D.movements.filter(m => m.accountId === g.id || m.toAccountId === g.id).length;
  if (Math.abs(v) >= 0.01 && n) return toast(`Prima riporta i ${eur(v)} su un conto con «Preleva»`);
  confirmBox(`Eliminare «${g.name}»?`, n ? 'I movimenti restano nello storico.' : Math.abs(v) >= 0.01 ? `Dentro ci sono ${eur(v)} del saldo iniziale: non verranno più contati.` : 'Il salvadanaio è vuoto.', 'Elimina', () => {
    if (n) g.archived = true; else D.accounts = D.accounts.filter(x => x !== g);
    D.fixed = D.fixed.filter(f => f.toAccountId !== g.id || f.type !== 'transfer');
    save(); UI.sheets.filter(s => s.type === 'goalView' || s.type === 'goal').forEach(s => closeSheet(s)); refresh(); toast('Salvadanaio eliminato');
  });
};
ACT.goalAdd = el => openSheet('mov', { type: 'transfer', accountId: defaultAccountId(), toAccountId: el.dataset.id, lockType: true, title: 'Metti da parte' });
ACT.goalTake = el => openSheet('mov', { type: 'transfer', accountId: el.dataset.id, toAccountId: defaultAccountId(), lockType: true, title: 'Preleva dal salvadanaio' });
ACT.goalOpen = el => openSheet('goalView', { id: el.dataset.id });
SHEETS.goalView = {
  cls: 'tall', live: true,
  render(st, sh) {
    const g = acc(sh.props.id);
    if (!g) return sheetHead('Salvadanaio') + '<div class="sheet-body"><p class="lead">Salvadanaio eliminato.</p></div>';
    const v = balancesAt(today())[g.id] || 0, p = g.target > 0 ? v / g.target : null;
    const hist = sortMovs(D.movements.filter(m => m.accountId === g.id || m.toAccountId === g.id));
    const fx = D.fixed.filter(f => f.type === 'transfer' && f.toAccountId === g.id && !fixedEnded(f));
    let h = sheetHead(g.name, { right: `<button class="lnk" data-a="goalEdit" data-id="${g.id}">Modifica</button>` }) + '<div class="sheet-body">';
    h += `<div class="gv-top"><span class="g-e xl" style="background:${tint(g.color)}">${esc(g.emoji || '🐷')}</span><p class="gv-n">${bigAmount(v)}</p><p class="muted">${g.target > 0 ? `${pct(Math.min(p, 9.99))} dell'obiettivo di ${eur(g.target)}` : 'Nessun obiettivo impostato'}</p></div>`;
    if (g.target > 0) h += progress(p, g.color) + `<p class="g-need">${goalNeed(g, v)}</p>`;
    h += `<div class="two-btn"><button class="btn outline" data-a="goalTake" data-id="${g.id}">Preleva</button><button class="btn dark" data-a="goalAdd" data-id="${g.id}">Aggiungi</button></div>`;
    h += fx.length ? `<p class="muted sm gap-t">${ic('repeat', 14)} Versamento automatico: ${fx.map(f => `${eur(f.amount)} ${fixedLabel(f).toLowerCase()}`).join('; ')}</p>` : `<button class="empty-row gap-t" data-a="goalAuto" data-id="${g.id}">${ic('repeat', 18)} Aggiungi un versamento automatico ogni mese</button>`;
    h += section('Movimenti', hist.length ? `<div class="mlist">${hist.slice(0, 50).map(m => movRow(m)).join('')}</div>` : '<p class="muted">Ancora nessun versamento.</p>');
    return h + '</div>';
  }
};
ACT.goalAuto = el => openSheet('fixed', { type: 'transfer', toAccountId: el.dataset.id, name: 'Versamento ' + (acc(el.dataset.id) ? acc(el.dataset.id).name.toLowerCase() : '') });

/* ---------- PERSONE E RIMBORSI ---------- */
SHEETS.person = {
  init(p) { if (p.id) { const x = person(p.id); return { id: x.id, name: x.name, emoji: x.emoji || '🙂', showEmoji: false }; } return { id: null, name: '', emoji: PEOPLE_EMOJI[D.people.length % PEOPLE_EMOJI.length], showEmoji: false }; },
  render(st) {
    let h = sheetHead(st.id ? 'Modifica persona' : 'Nuova persona') + '<div class="sheet-body">';
    h += `<div class="ed-top"><button class="big-av" style="background:var(--surface-2)" data-a="toggle" data-f="showEmoji" aria-label="Scegli l'icona">${esc(st.emoji)}</button><label class="fld grow"><span>Nome</span><input data-in="set" data-f="name" value="${esc(st.name)}" placeholder="Es. Marco" autocomplete="off"></label></div>`;
    h += emojiPicker(st, PEOPLE_EMOJI);
    if (st.id) h += `<div class="danger-z"><button class="link danger" data-a="personDelete">Elimina persona</button></div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="personSave">${st.id ? 'Salva' : 'Aggiungi'}</button></footer>`;
  }
};
ACT.personSave = el => {
  const sh = sheetOf(el), st = sh.st, name = st.name.trim();
  if (!name) return toast('Scrivi il nome');
  let p;
  if (st.id) { p = person(st.id); Object.assign(p, { name, emoji: st.emoji }); }
  else { p = { id: uid(), name, emoji: st.emoji }; D.people.push(p); }
  save(); closeSheet(sh);
  if (sh.props.onSave) sh.props.onSave(p);
  refresh();
};
ACT.personDelete = el => {
  const sh = sheetOf(el), p = person(sh.st.id);
  const used = D.movements.some(m => (m.split && m.split.shares && m.split.shares[p.id] != null) || m.paidBy === p.id || m.personId === p.id);
  if (used) return toast(`${p.name} compare in alcune spese divise: non si può eliminare.`);
  confirmBox(`Eliminare ${p.name}?`, '', 'Elimina', () => { D.people = D.people.filter(x => x !== p); save(); UI.sheets.filter(s => s.type === 'personView' || s.type === 'person').forEach(s => closeSheet(s)); refresh(); });
};
ACT.personOpen = el => openSheet('personView', { id: el.dataset.id });
function balanceText(b, name) {
  if (Math.abs(b) < 0.005) return `Tu e ${esc(name)} siete in pari`;
  return b > 0 ? `${esc(name)} ti deve <b class="num pos">${eur(b)}</b>` : `Devi <b class="num neg">${eur(-b)}</b> a ${esc(name)}`;
}
SHEETS.personView = {
  cls: 'tall', live: true,
  render(st, sh) {
    const p = person(sh.props.id);
    if (!p) return sheetHead('Persona') + '<div class="sheet-body"></div>';
    const b = personBalance(p.id);
    const hist = sortMovs(D.movements.filter(m => (m.split && m.split.shares && m.split.shares[p.id] != null) || m.paidBy === p.id || m.personId === p.id));
    let h = sheetHead(p.name, { right: `<button class="lnk" data-a="personEdit" data-id="${p.id}">Modifica</button>` }) + '<div class="sheet-body">';
    h += `<div class="gv-top"><span class="g-e xl" style="background:var(--surface-2)">${esc(p.emoji || '🙂')}</span><p class="lead center">${balanceText(b, p.name)}</p></div>`;
    h += `<button class="btn dark w" data-a="settleNew" data-id="${p.id}">Registra un rimborso</button>`;
    h += section('Spese e rimborsi', hist.length ? `<div class="mlist">${hist.map(m => movRow(m)).join('')}</div>` : '<p class="muted">Ancora niente in comune.</p>');
    return h + '</div>';
  }
};
ACT.personEdit = el => openSheet('person', { id: el.dataset.id });
ACT.settleNew = el => openSheet('settle', { personId: el.dataset.id });
SHEETS.settle = {
  init(p) {
    if (p.id) { const m = D.movements.find(x => x.id === p.id); return { id: m.id, personId: m.personId, dir: m.dir, amt: numStr(m.amount), accountId: m.accountId, date: m.date, note: m.note || '' }; }
    const b = personBalance(p.personId);
    return { id: null, personId: p.personId, dir: b >= 0 ? 'in' : 'out', amt: Math.abs(b) >= 0.01 ? numStr(Math.abs(b)) : '', accountId: defaultAccountId(), date: today(), note: '' };
  },
  render(st) {
    const p = person(st.personId), name = p ? p.name : '?';
    let h = sheetHead(st.id ? 'Modifica rimborso' : 'Rimborso') + '<div class="sheet-body">';
    h += `<div class="seg">${[['in', `${esc(name)} mi ha dato`], ['out', `Ho dato a ${esc(name)}`]].map(([k, l]) => `<button class="${st.dir === k ? 'on' : ''}" data-a="pick" data-f="dir" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += `<label class="fld"><span>Importo</span><input inputmode="decimal" data-in="set" data-f="amt" value="${esc(st.amt)}" placeholder="0,00"></label>`;
    h += fieldLabel(st.dir === 'in' ? 'Ricevuto su' : 'Pagato con') + accChips('accountId', st.accountId, false);
    h += fieldLabel('Data') + dateChips(st.date, 'date');
    h += '<p class="muted sm gap-t">Il rimborso aggiorna il saldo del conto ma non conta come entrata o uscita nel budget.</p>';
    if (st.id) h += `<div class="danger-z"><button class="link danger" data-a="settleDelete">Elimina rimborso</button></div>`;
    return h + `</div><footer class="sheet-foot"><button class="btn primary w" data-a="settleSave">Salva rimborso</button></footer>`;
  }
};
ACT.settleSave = el => {
  const sh = sheetOf(el), st = sh.st, amount = r2(strToNum(st.amt));
  if (!(amount > 0)) return toast("Inserisci l'importo");
  if (!acc(st.accountId)) return toast('Scegli un conto');
  const m = st.id ? D.movements.find(x => x.id === st.id) : { id: uid(), ts: Date.now(), type: 'settle', tags: [], note: '' };
  Object.assign(m, { personId: st.personId, dir: st.dir, amount, accountId: st.accountId, date: st.date });
  if (!st.id) D.movements.push(m);
  save(); closeSheet(sh); refresh(); toast('Rimborso salvato');
};
ACT.settleDelete = el => {
  const sh = sheetOf(el), id = sh.st.id;
  confirmBox('Eliminare il rimborso?', '', 'Elimina', () => { D.movements = D.movements.filter(m => m.id !== id); save(); closeSheet(sh); refresh(); });
};

