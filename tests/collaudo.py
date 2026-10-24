"""Collaudo end-to-end di EFU Budget (Playwright, Chromium headless).

    python3 build.py && python3 tests/collaudo.py [percorso/di/Budget.html]

Apre l'anteprima, carica i dati di esempio e prova le funzioni principali come farebbe
una persona: stampa OK / ERR per ogni controllo ed esce con codice 1 se qualcosa fallisce.
Le schermate finiscono in tests/schermate/ (ignorata da git).
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(R, 'dist', 'Budget.html')
SHOT = os.path.join(R, 'tests', 'schermate') + os.sep
os.makedirs(SHOT, exist_ok=True)
FAIL = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
        errs=[]
        pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
        pg.on('console', lambda m: errs.append('console: '+m.text) if m.type=='error' else None)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
        await pg.goto('file://'+HTML); await pg.wait_for_timeout(1300)
        await pg.click('[data-a="onbDemo"]'); await pg.wait_for_timeout(500)
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(500)
        def ok(c, msg):
            print(('OK  ' if c else 'ERR ') + msg)
            if not c: FAIL.append(msg)
        # tutte le sezioni
        for t in ['home','movs','invest','plan','stats']:
            await pg.evaluate(f"goTab('{t}')"); await pg.wait_for_timeout(500)
        txt = await pg.evaluate("[...['home','movs','invest','plan','stats']].map(t=>{UI.tab=t;render();return document.querySelector('#view').innerText.length})")
        ok(all(x > 100 for x in txt), f'sezioni con contenuto {txt}')
        await pg.evaluate("UI.tab='home'; render()"); await pg.wait_for_timeout(1300)
        # ---- tastierino con le operazioni
        await pg.click('.ffab'); await pg.wait_for_timeout(500)
        for k in ['1','2','+','8',',','5','0']: await pg.click(f'.key[data-k="{k}"]'); await pg.wait_for_timeout(30)
        r1 = await pg.evaluate("[topSheet().st.amt, $('.amt').innerText.replace(/\\s+/g,' ')]")
        ok(r1[0] == '20,5', f'12+8,50 → {r1}')
        await pg.screenshot(path=SHOT+'k-calc.png')
        for k in ['del','del','del','del','del','del','del']: await pg.click('.key[data-k="del"]')
        for k in ['4','5','/','2']: await pg.click(f'.key[data-k="{k}"]')
        r2 = await pg.evaluate("topSheet().st.amt"); ok(r2 == '22,5', f'45/2 → {r2}')
        for k in ['+','*']: await pg.click(f'.key[data-k="{k}"]')
        r3 = await pg.evaluate("[topSheet().st.expr, topSheet().st.amt]"); ok(r3 == ['45/2*', '22,5'], f'operatore sostituito → {r3}')
        await pg.click('.key[data-k="3"]'); r4 = await pg.evaluate("topSheet().st.amt"); ok(r4 == '67,5', f'45/2*3 (precedenza) → {r4}')
        await pg.evaluate("(()=>{const s=topSheet(); s.st.expr='5-10'; s.st.amt=''; drawSheet(s)})()")
        r5 = await pg.evaluate("[$('.amt-next').disabled, $('.amt-v').textContent]"); ok(r5[0] and '5' in r5[1], f'risultato negativo blocca Avanti → {r5}')
        # tastiera fisica
        await pg.evaluate("(()=>{const s=topSheet(); s.st.expr=''; s.st.amt=''; drawSheet(s)})()")
        await pg.keyboard.type('10*3'); r6 = await pg.evaluate("topSheet().st.amt"); ok(r6 == '30', f'tastiera 10*3 → {r6}')
        # ---- salva subito come
        n0 = await pg.evaluate("D.movements.length")
        qp = await pg.evaluate("[...document.querySelectorAll('.qp-c')].map(b=>b.textContent.trim()+(b.disabled?' (spento)':''))")
        ok(len(qp) > 0, f'proposte sul tastierino: {qp}')
        await pg.screenshot(path=SHOT+'k-qp.png')
        lab = await pg.evaluate("$('.qp-c').dataset.t")
        await pg.click('.qp-c'); await pg.wait_for_timeout(700)
        last = await pg.evaluate("(()=>{const m=D.movements[D.movements.length-1]; return [D.movements.length, m.description, m.amount, cat(m.categoryId).name, m.date===today(), UI.sheets.length, $('#toast').innerText]})()")
        ok(last[0] == n0 + 1 and last[1] == lab and last[2] == 30 and last[5] == 0, f'salvato in un tocco: {last}')
        # proposte spente senza importo
        await pg.click('.ffab'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("[...document.querySelectorAll('.qp-c')].every(b=>b.disabled)"), 'proposte spente finché non c\'è l\'importo')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(400)
        # ---- tieni premuto il +
        bb = await pg.locator('.ffab').bounding_box()
        await pg.mouse.move(bb['x']+30, bb['y']+30); await pg.mouse.down(); await pg.wait_for_timeout(650); await pg.mouse.up(); await pg.wait_for_timeout(500)
        top = await pg.evaluate("UI.sheets.map(s=>s.type)"); ok(top == ['repeat'], f'pressione lunga apre «Ripeti»: {top}')
        await pg.screenshot(path=SHOT+'k-repeat.png')
        rows = await pg.evaluate("[...document.querySelectorAll('.rp-go .rt')].map(e=>e.innerText.split('\\n')[0])")
        n1 = await pg.evaluate("D.movements.length")
        await pg.click('.rp-go'); await pg.wait_for_timeout(600)
        rr = await pg.evaluate("(()=>{const m=D.movements[D.movements.length-1]; return [D.movements.length, m.description, m.date===today(), !m.fixedId, UI.sheets.length]})()")
        ok(rr[0] == n1 + 1 and rr[1] == rows[0] and rr[2] and rr[4] == 0, f'ripetuto «{rows[0]}»: {rr}')
        await pg.mouse.move(bb['x']+30, bb['y']+30); await pg.mouse.down(); await pg.wait_for_timeout(650); await pg.mouse.up(); await pg.wait_for_timeout(500)
        await pg.click('.rp-ed'); await pg.wait_for_timeout(700)
        ed = await pg.evaluate("(()=>{const s=topSheet(); return [s.type, s.st.step, s.st.amt, s.st.description, !!cat(s.st.categoryId)]})()")
        ok(ed[0] == 'mov' and ed[1] == 'amount' and ed[3] == rows[0] and ed[4], f'matita apre il foglio precompilato: {ed}')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(400)
        # un tocco breve sul + apre ancora il foglio normale
        await pg.click('.ffab'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("UI.sheets.map(s=>s.type).join()") == 'mov', 'tocco breve sul + apre il nuovo movimento')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(400)
        # ---- scorri a destra per duplicare, a sinistra per eliminare
        await pg.evaluate("goTab('movs')"); await pg.wait_for_timeout(1200)
        async def swipe(i, dx, steps=16):
            row = pg.locator('#view .mrow[data-a="movOpen"]').nth(i); bx = await row.bounding_box()
            y = bx['y']+bx['height']/2; x = bx['x']+bx['width']/2
            await pg.mouse.move(x, y); await pg.mouse.down()
            for s in range(1, steps+1): await pg.mouse.move(x+dx*s/steps, y); await pg.wait_for_timeout(14)
            return row
        n2 = await pg.evaluate("D.movements.length")
        src = await pg.evaluate("$$('#view .mrow[data-a=\"movOpen\"]')[2].querySelector('.mt').textContent")
        await swipe(2, 70, 8); await pg.screenshot(path=SHOT+'k-dup-half.png'); await pg.mouse.up(); await pg.wait_for_timeout(500)
        half = await pg.evaluate("$$('#view .mrow[data-a=\"movOpen\"]')[2].style.transform"); ok(half == 'translateX(88px)', f'mezzo scorrimento a destra mostra Duplica: {half}')
        await pg.click('.mdup >> nth=0', force=True); await pg.wait_for_timeout(700)
        d1 = await pg.evaluate("(()=>{const m=D.movements[D.movements.length-1]; return [D.movements.length, m.description, m.date===today()]})()")
        ok(d1[0] == n2 + 1 and d1[2], f'duplicato «{src}» con la data di oggi: {d1}')
        await pg.mouse.up()
        await swipe(3, 200); await pg.mouse.up(); await pg.wait_for_timeout(700)
        ok(await pg.evaluate("D.movements.length") == n2 + 2, 'scorrimento lungo a destra duplica')
        await swipe(1, -200); await pg.mouse.up(); await pg.wait_for_timeout(900)
        ok(await pg.evaluate("D.movements.length") == n2 + 1, 'scorrimento a sinistra elimina ancora')
        # ---- ricerche salvate
        await pg.fill('#q', 'esselunga'); await pg.wait_for_timeout(400)
        await pg.click('[data-a="searchSave"]'); await pg.wait_for_timeout(400)
        sv = await pg.evaluate("D.settings.searches.map(s=>s.name)"); ok(sv == ['esselunga'], f'ricerca salvata: {sv}')
        await pg.evaluate("UI.q=''; UI.filters=blankFilters(); render()"); await pg.wait_for_timeout(300)
        await pg.click('[data-a="searchUse"]'); await pg.wait_for_timeout(400)
        u = await pg.evaluate("[UI.q, $('#q').value, $$('#mvList .mrow').length]"); ok(u[0] == 'esselunga' and u[1] == 'esselunga', f'ricerca richiamata: {u}')
        await pg.screenshot(path=SHOT+'k-search.png')
        await pg.click('[data-a="searchDel"]'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("D.settings.searches.length") == 0, 'ricerca tolta')
        # ---- Home riordinata (2.4): 4 voci in basso, patrimonio in fondo che apre salvadanai e investimenti
        await pg.evaluate("goTab('home')"); await pg.wait_for_timeout(900)
        r = await pg.evaluate("[$$('.ftab').length, !!$('#view .hero .alerts'), !!$('#view .nw-tile')]")
        ok(r == [5, True, True], f'barra a 5 voci con Investimenti, avvisi in alto, riquadro patrimonio: {r}')
        await pg.click('.nw-tile'); await pg.wait_for_timeout(600)
        r = await pg.evaluate("[!!$('#sheets .gcard'), !!$('#sheets [data-a=\"invOpen\"]')]")
        ok(r == [True, True], f'patrimonio con salvadanai e investimenti: {r}')
        await pg.click('#sheets [data-a="invOpen"]'); await pg.wait_for_timeout(900)
        r = await pg.evaluate("[UI.tab, UI.sheets.length]")
        ok(r == ['invest', 0], f'investimenti aperti dal patrimonio: {r}')
        ok(await pg.evaluate("$('.ftab[data-t=\"invest\"]').classList.contains('on')"), 'Investimenti attivo nella barra')
        # ---- Home personalizzabile
        await pg.evaluate("UI.q=''; UI.filters=blankFilters(); goTab('home')"); await pg.wait_for_timeout(1200)
        await pg.evaluate("openSheet('settings',{})"); await pg.wait_for_timeout(400)
        await pg.click('[data-p="home"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SHOT+'k-homeset.png')
        await pg.click('[data-a="homeTog"][data-k="kpis"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="homeTog"][data-k="forecast"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="homeMove"][data-k="recent"][data-d="-1"]'); await pg.wait_for_timeout(200)
        hs = await pg.evaluate("[D.settings.homeOff, homeSaved().slice(-3), !!$('#view .kpis'), !!$('#view .sumrow')]")
        ok(hs[0] == ['kpis','forecast'] and hs[1] == ['recent','recap','wealth'] and not hs[2] and not hs[3], f'sezioni nascoste e spostate: {hs}')
        urg = await pg.evaluate("[homeUrgent(), homeOrder(true).slice(0,3)]"); print('    urgenti:', urg)
        await pg.evaluate("D.settings.homeUrgent=false"); off = await pg.evaluate("[homeOrder(true), homeSaved().filter(homeOn)]")
        ok(off[0] == off[1], f'senza «urgente» si segue l\'ordine scelto: {off[0][:3]}')
        await pg.click('[data-a="homeReset"]'); await pg.wait_for_timeout(300)
        ok(await pg.evaluate("!D.settings.homeOff && !!$('#view .kpis')"), 'Home ripristinata')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(300)
        # ---- numero sull'icona
        bc = await pg.evaluate("[badgeOk(), badgeCount()]"); print('    badge disponibile/conteggio:', bc)
        # ---- calendario
        ics = await pg.evaluate("fixedIcs()")
        t = ics['text']
        ok(ics['n'] > 0 and t.startswith('BEGIN:VCALENDAR') and t.count('BEGIN:VEVENT') == ics['n'] == t.count('END:VEVENT') and '\r\n' in t and 'TRIGGER:PT9H' in t, f"file calendario con {ics['n']} scadenze")
        print('    ' + [l for l in t.split('\r\n') if l.startswith('SUMMARY')][0])
        await pg.evaluate("UI.tab='plan'; UI.planTab='fixed'; render()"); await pg.wait_for_timeout(400)
        await pg.click('[data-a="fxIcs"]'); await pg.wait_for_timeout(500)
        ok(await pg.evaluate("topSheet().type==='fileReady' && $('#sheets .sheet-wrap:last-child').innerText.includes('Calendario')"), 'foglio del file calendario')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(300)
        # ---- apostrofi
        await pg.evaluate("(()=>{const c=D.categories.find(c=>c.type==='out'); c.name=\"Spese dell'auto\"; save(); openSheet('category',{id:c.id})})()"); await pg.wait_for_timeout(400)
        await pg.evaluate("ACT.catDelete && ACT.catDelete($('#sheets .sheet-wrap:last-child [data-a=\"catDelete\"]'))"); await pg.wait_for_timeout(400)
        ttl = await pg.evaluate("($('#sheets .sheet-wrap:last-child .sh-h h2')||{}).textContent")
        ok(ttl and "dell'auto" in ttl and '&#39;' not in ttl, f'titolo conferma: {ttl}')
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(300)
        # ---- etichette grafici
        await pg.evaluate("UI.month=addM(curMk(),-1); UI.tab='home'; render()"); await pg.wait_for_timeout(300)
        print('    striscia:', await pg.evaluate("($('.strip')||{getAttribute:()=>''}).getAttribute('aria-label')"))
        ok(not errs, 'nessun errore JavaScript' + (': ' + str(errs[:3]) if errs else ''))
        await b.close()
    print(f"\n{'TUTTO OK' if not FAIL else str(len(FAIL)) + ' CONTROLLI FALLITI'}")
    sys.exit(1 if FAIL else 0)
asyncio.run(main())
