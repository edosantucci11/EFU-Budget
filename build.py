#!/usr/bin/env python3
"""EFU Budget: ricompone l'app da src/ e assets/.

    python3 build.py

Produce in dist/:
  EFU-Budget/          i file da caricare su GitHub Pages (index.html, sw.js, icone…)
  EFU-Budget-iPhone.zip la stessa cartella compressa
  Budget.html          anteprima da aprire nel browser (IS_PACKAGE = false: niente service worker)

La versione si cambia SOLO in src/core.js (APP_VERSION): da lì vengono aggiornati
anche la cache di sw.js e la prima riga di LEGGIMI.txt.
"""
import json, os, re, shutil, zipfile

R = os.path.dirname(os.path.abspath(__file__))
S, A, D = (os.path.join(R, d) for d in ('src', 'assets', 'dist'))
rd = lambda p: open(p, encoding='utf-8').read()


def html(package=True):
    parts = [rd(os.path.join(S, n)) for n in json.load(open(os.path.join(S, 'order.json')))]
    js = ''.join(p if p.endswith('\n') or i == len(parts) - 1 else p + '\n' for i, p in enumerate(parts))
    # il codice del ponte Cloudflare viene incluso nell'app per il pulsante «copia il codice»
    js = js.replace('/*PONTE*/', json.dumps(rd(os.path.join(S, 'ponte-prezzi.js'))), 1)
    if not package:
        assert js.count('const IS_PACKAGE = true;') == 1
        js = js.replace('const IS_PACKAGE = true;', 'const IS_PACKAGE = false;', 1)
    t = rd(os.path.join(S, 'template.html'))
    return t.replace('/*CSS*/', rd(os.path.join(S, 'style.css')), 1).replace('/*JS*/', js, 1)


def version():
    return re.search(r"const APP_VERSION = '([0-9.]+)'", rd(os.path.join(S, 'core.js'))).group(1)


if __name__ == '__main__':
    ver = version()
    out = os.path.join(D, 'EFU-Budget')
    shutil.rmtree(D, ignore_errors=True)
    os.makedirs(out)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html(True))
    for f in sorted(os.listdir(A)):
        shutil.copy(os.path.join(A, f), out)
    shutil.copy(os.path.join(S, 'ponte-prezzi.js'), out)
    sw = os.path.join(out, 'sw.js')
    txt = re.sub(r"const CACHE = 'budget-v[0-9.]+';", f"const CACHE = 'budget-v{ver}';", rd(sw))
    open(sw, 'w', encoding='utf-8').write(txt)
    le = os.path.join(out, 'LEGGIMI.txt')
    txt = re.sub(r'versione [0-9]+\.[0-9]+(\.[0-9]+)?\b', 'versione ' + ver, rd(le), count=1)
    open(le, 'w', encoding='utf-8').write(txt)
    # una sola cartella piatta: niente sottocartelle, un solo index.html (vedi CLAUDE.md)
    assert all(os.path.isfile(os.path.join(out, f)) for f in os.listdir(out))
    open(os.path.join(D, 'Budget.html'), 'w', encoding='utf-8').write(html(False))
    z = os.path.join(D, 'EFU-Budget-iPhone.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(os.listdir(out)):
            zf.write(os.path.join(out, f), 'EFU-Budget/' + f)
    print(f'EFU Budget {ver}: dist/EFU-Budget/ ({len(os.listdir(out))} file), dist/Budget.html, dist/EFU-Budget-iPhone.zip')
