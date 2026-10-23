"""Confronto tra due versioni dell'app, schermata per schermata (testo visibile).

    python3 tests/confronto.py vecchia/Budget.html dist/Budget.html

Serve dopo un riordino del codice che non deve cambiare nulla di visibile: carica gli stessi
dati di esempio in entrambe e stampa solo le differenze. Nessuna differenza = nessuna regressione.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
async def snap(b, html):
    ctx = await b.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce'); pg = await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','data:')) else r.abort())
    await pg.goto('file://'+html); await pg.wait_for_timeout(1200)
    await pg.evaluate("Math.random=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})()")
    await pg.click('[data-a="onbDemo"]'); await pg.wait_for_timeout(500)
    await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(400)
    out = {}
    for mon in [0, -1, -2]:
        for t in ['home','movs','invest','plan','stats']:
            for pt in (['fixed','budget','goals'] if t == 'plan' else [None]):
                await pg.evaluate(f"UI.month=addM(curMk(),{mon}); UI.tab='{t}'; {'UI.planTab='+repr(pt)+';' if pt else ''} render()"); await pg.wait_for_timeout(120)
                out[f'{t}{pt or ""}{mon}'] = await pg.evaluate("document.querySelector('#view').innerText")
    for s in ["openSheet('settings',{})", "openSheet('backup',{})", "openSheet('mov',{id:D.movements[5].id})", "openSheet('recap',{k:addM(curMk(),-1)})"]:
        await pg.evaluate(s); await pg.wait_for_timeout(300)
        out[s] = await pg.evaluate("document.querySelector('#sheets .sheet-wrap:last-child').innerText")
        await pg.evaluate("UI.sheets.slice().forEach(s=>closeSheet(s))"); await pg.wait_for_timeout(300)
    out['_err'] = errs; await ctx.close(); return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        a = await snap(b, os.path.abspath(sys.argv[1])); n = await snap(b, os.path.abspath(sys.argv[2]))
        import difflib
        for k in a:
            if a[k] != n.get(k):
                d = [l for l in difflib.unified_diff(str(a[k]).splitlines(), str(n[k]).splitlines(), lineterm='', n=0) if l[:1] in '+-' and l[:3] not in ('+++','---')]
                print('DIFF', k, d[:8])
        print('controllate', len(a)-1, 'schermate | errori prima:', a['_err'] or 'nessuno', '| errori dopo:', n['_err'] or 'nessuno')
        await b.close()
asyncio.run(main())
