"""Prova di aggiornamento: nessuno deve perdere i dati.

Uso: python3 tests/aggiornamento.py CARTELLA_VERSIONE_ONLINE dist/EFU-Budget

Pubblica la versione online su un indirizzo di prova, ci carica i dati di esempio
(con una foto), poi mette la nuova versione allo stesso indirizzo e riapre, come fa
l'iPhone. Controlla che i dati salvati e tutti i calcoli siano identici, che la
nuova versione salvi, e che tornando alla vecchia non si perda nulla.
"""
import asyncio, json, shutil, os, subprocess, glob, sys, tempfile
from playwright.async_api import async_playwright
OLD, NEW = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
TMP = tempfile.mkdtemp(); SITE = os.path.join(TMP, 'site') + '/'; os.makedirs(SITE)
FAIL = []
def check(c, msg):
    print(('OK  ' if c else 'ERR ') + msg)
    if not c: FAIL.append(msg)
def put(v):
    for f in glob.glob(SITE+'*'): os.remove(f)
    for f in glob.glob((OLD if v == 'old' else NEW) + '/*'):
        if os.path.isfile(f): shutil.copy(f, SITE)
METRICS = """async () => { const t = today(); const ks = [...new Set(D.movements.map(m => m.date.slice(0,7)))].sort();
 const fc = forecast();
 return { ver: APP_VERSION,
  counts: {acc: D.accounts.length, cat: D.categories.length, mov: D.movements.length, fixed: D.fixed.length, people: D.people.length, inv: D.invest.length, goals: D.accounts.filter(a=>a.kind==='goal').length},
  bal: balancesAt(t), months: ks.map(k => { const s = monthStats(k); return [k, s.inc, s.out, s.net, s.byCat]; }),
  nw: nwAt(t), inv: invTotals(), fcEnd: fc.end, pend: pendingFixed(curMk()).map(p => [p.f.id, p.due]),
  photo: !!(await photoURL('ph-prova')), demo: !!D.settings.demo }; }"""
async def main():
    put('old')
    srv = subprocess.Popen(['python3','-m','http.server','8765','--directory',SITE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    errs=[]
    try:
      async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(os.path.join(TMP, 'profilo'), viewport={'width':390,'height':844}, reduced_motion='reduce')
        pg = ctx.pages[0] if ctx.pages else await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        async def open_until(ver):
            for i in range(4):
                await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
                v = await pg.evaluate("typeof APP_VERSION!=='undefined' ? APP_VERSION : null")
                if v == ver: return i+1
            return None
        # 1) versione online: dati, una foto, impostazioni
        old_ver = None
        await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
        old_ver = await pg.evaluate("APP_VERSION")
        print('versione online:', old_ver)
        await pg.click('[data-a="onbDemo"]'); await pg.wait_for_timeout(600)
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))")
        await pg.evaluate("""async () => { D.settings.demo = false;
          await PhotoDB.put('ph-prova', {buf: new Uint8Array([137,80,78,71,1,2,3]).buffer, type: 'image/png'});
          D.movements[0].photoId = 'ph-prova'; save(); }""")
        await pg.wait_for_timeout(500)
        sw = await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))")
        raw1 = await pg.evaluate("localStorage.getItem('budget.iphone.v1')")
        m1 = await pg.evaluate(METRICS)
        # 2) pubblico la 2.4 nello stesso indirizzo e riapro, come fa l'iPhone
        put('new')
        new_ver = open(os.path.join(NEW, 'index.html'), encoding='utf-8').read().split("APP_VERSION = '")[1].split("'")[0]
        check(sw, 'service worker attivo nella versione online')
        check(await open_until(new_ver) is not None, f'la {new_ver} si apre allo stesso indirizzo')
        raw2 = await pg.evaluate("localStorage.getItem('budget.iphone.v1')")
        m2 = await pg.evaluate(METRICS)
        same = {k: m1[k] == m2[k] for k in m1 if k != 'ver'}
        print('versioni:', m1['ver'], '->', m2['ver'])
        check(json.loads(raw1) == json.loads(raw2), 'dati salvati identici dopo l\'apertura')
        check(all(same.values()), f'tutti i calcoli uguali {m2["counts"]}, {len(m2["months"])} mesi; diversi: {[k for k,v in same.items() if not v]}')
        check(m2['photo'], 'foto dello scontrino leggibile')
        # 3) uso la 2.4: aggiungo una spesa
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))")
        await pg.click('.ffab'); await pg.wait_for_timeout(500)
        for k in ['4','2']: await pg.click(f'.key[data-k="{k}"]'); await pg.wait_for_timeout(40)
        n_before = m2['counts']['mov']
        await pg.click('.qp-c'); await pg.wait_for_timeout(800)
        n_after = await pg.evaluate("D.movements.length")
        check(n_after == n_before + 1, f'la nuova versione salva ({n_before} -> {n_after} movimenti)')
        m3 = await pg.evaluate(METRICS)
        # 4) ritorno alla versione online (piano di riserva): deve leggere tutto
        put('old')
        check(await open_until(old_ver) is not None, 'si torna alla versione online')
        m4 = await pg.evaluate(METRICS)
        same = {k: m3[k] == m4[k] for k in m3 if k != 'ver'}
        check(all(same.values()) and m4['photo'], f'ritorno indietro senza perdite; diversi: {[k for k,v in same.items() if not v]}')
        check(not errs, f'nessun errore nella pagina {errs}')
        await ctx.close()
    finally:
        srv.terminate()
        shutil.rmtree(TMP, ignore_errors=True)
asyncio.run(main())
print('\nTUTTO OK' if not FAIL else f'\n{len(FAIL)} PROBLEMI')
sys.exit(1 if FAIL else 0)
