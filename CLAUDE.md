# EFU Budget — istruzioni per Claude Code

Web app di budget personale per iPhone, sviluppata con Claude. Versione attuale: **2.4**.

## Con chi lavori

- L'utente non è uno sviluppatore: spiega in parole semplici, senza gergo tecnico.
- **Il repository è pubblico**: non scrivere mai dati personali o finanziari dell'utente in file, messaggi di commit o test.
- **Rispondi sempre in italiano, con risposte brevi e concise.**
- Prima di una modifica grande (nuova architettura, migrazione dei dati) proponi il piano e aspetta l'ok. Le correzioni piccole e chiare falle e basta.

## Cos'è l'app

- Un unico file HTML autosufficiente (HTML, CSS e JavaScript insieme), installato sull'iPhone da Safari con «Aggiungi alla schermata Home». Niente App Store.
- **I dati restano solo sul telefono**: `localStorage` (chiave `budget.iphone.v1`) per i dati, IndexedDB per le foto degli scontrini. Nessun server e nessun account.
- Unici servizi esterni:
  - il ponte dei prezzi, un Cloudflare Worker dell'utente su `https://efu-prezzi.edo-santucci.workers.dev`, con codice in `src/ponte-prezzi.js`;
  - i cambi BCE da `api.frankfurter.dev`.
- Pubblicata su **GitHub Pages**, repository `efu-budget` (pubblico).

## Comandi

```bash
python3 build.py                                   # compone dist/ dai sorgenti
python3 tests/collaudo.py                          # collaudo completo su dist/Budget.html
python3 tests/confronto.py vecchia.html dist/Budget.html   # differenze visibili tra due versioni
```

- I test usano Playwright per Python: `pip install playwright && python3 -m playwright install chromium`.
- **Dopo ogni modifica** esegui `build.py` e `tests/collaudo.py`: deve finire con «TUTTO OK».
- Dopo un riordino che non deve cambiare nulla di visibile, confronta con `tests/confronto.py` la versione prima e dopo.

## Struttura

- `src/*.js` sono moduli **concatenati in un unico script** nell'ordine di `src/order.json`. Non sono moduli ES: condividono le variabili globali.
- `src/style.css` è il foglio di stile.
- `src/template.html` è il guscio, con i segnaposti `/*CSS*/` e `/*JS*/`.
- `assets/` contiene icone, `manifest.webmanifest`, `sw.js` (service worker per l'offline) e `LEGGIMI.txt` (istruzioni per l'utente).
- `dist/` è generata, non va modificata a mano.

| Modulo | Contenuto |
|---|---|
| core.js | modello dati `D`, salvataggio `save()` con annulla, calcoli (saldi, statistiche, spese fisse, categorie suggerite) |
| ui.js | icone `ICONS`, `render()`, fogli a comparsa, toast, eventi, codice di blocco |
| views.js | schermate Home, Movimenti, Pianifica, Statistiche, Home personalizzabile |
| sheets.js | foglio movimento con tastierino e calcoli, spese fisse, conti, salvadanai, persone |
| io.js | azioni, impostazioni, import/export, backup |
| extra.js | annulla, import universale, valuta, accantonamenti, coppia, Apple Pay |
| carte.js, investimenti.js, automatici.js | carte di credito; investimenti; prezzi, PAC e interessi |
| spese-fisse.js, esportazione.js, guida.js | spese fisse mese per mese; Excel completo; guida in app |
| patrimonio.js, movimento.js, main.js | patrimonio netto; animazioni, vibrazione e gesti; avvio |

### Come funziona il codice

- **Azioni:** i registri `ACT`, `INP`, `CHG`, `VIEWS`, `SHEETS` e `SETTINGS` sono collegati agli attributi `data-a`, `data-in` e `data-ch` dell'HTML.
- **Rendering:** l'interfaccia è costruita con stringhe e `innerHTML`; `render()` ridisegna la schermata, `refresh()` anche i fogli aperti.
- **Testo dell'utente:** va sempre passato da `esc()`. Ma `sheetHead(title)` lo protegge già: non chiamare `esc()` sul titolo, altrimenti gli apostrofi diventano `&#39;` (difetto corretto nella 2.3).
- **Salvataggio:** `save()` salva e arma l'annulla; `save({ undo: false })` è per i cambi di impostazioni; `memo` e `invalidate` servono da cache dei calcoli.

## Regole da rispettare

1. **Versione:** si cambia solo in `src/core.js` (`APP_VERSION`); `build.py` aggiorna da sé la cache di `sw.js` e la prima riga di `LEGGIMI.txt`.
2. **Ogni nuova versione** aggiunge la voce «Novità della versione X» in `src/guida.js`, come seconda voce della guida, e un paragrafo «NOVITÀ DELLA X» in `assets/LEGGIMI.txt`.
3. **`dist/EFU-Budget/` resta piatta:** nessuna sottocartella e **mai un secondo `index.html`**. Una vecchia copia di sicurezza in `v1/` ha sostituito l'app durante il caricamento su GitHub; ora vale solo l'ultima versione.
4. **Aspetto:** resta quello della 1.9 (bianco, corallo `#FF385C`, font di sistema, barra in basso a pillola) con il movimento aggiunto dalla 2.0.
   - La direzione grafica «Tattile» e la variante «Premium» sono state accantonate: non reintrodurle senza richiesta.
   - Della Premium è entrata solo l'intestazione fissa traslucida.
5. **Movimento:** rispetta sempre «Riduci movimento» (`RM()`, `prefers-reduced-motion`).
6. **Nessuna funzione** che mandi i dati dell'utente a un server senza una richiesta esplicita.
7. **Doppia verifica:** ogni modifica va provata in tema chiaro e scuro, a 390 px di larghezza (iPhone).

## Pubblicazione (automatica)

- `.github/workflows/pubblica.yml`: a ogni push su `main` GitHub compone l'app, esegue `tests/collaudo.py` e, **solo se passa**, pubblica `dist/EFU-Budget/` su GitHub Pages (Settings → Pages → Source: **GitHub Actions**).
- Su una pull request compone e collauda soltanto: è il modo sicuro per provare una modifica prima di pubblicarla.
- Nel repository non ci sono più i file dell'app pronti: si generano. Non caricare a mano `index.html` o altri file di `dist/`.
- Sull'iPhone l'app si aggiorna alla riapertura; a volte va chiusa dal multitasking.

Se cambia `src/ponte-prezzi.js`, l'utente deve incollarlo anche nel Worker su Cloudflare (Edit code → Deploy).

## Prossimi passi concordati (in ordine)

1. ~~Git e pubblicazione automatica~~: fatto (vedi «Pubblicazione»).
2. **Spostare i dati da `localStorage` (limite di circa 5 MB) a IndexedDB:**
   - migrazione automatica;
   - backup prima del passaggio;
   - la stessa chiave resta come ripiego per un periodo.
3. **Test unitari dei calcoli:** saldi, cicli carta, PAC, interessi, previsioni, patrimonio.
4. **Riordino graduale** verso componenti (es. Preact + htm), una schermata alla volta, verificando con `tests/confronto.py`.
5. **Backup automatico cifrato** sul Worker Cloudflare: cifratura sul telefono con una password dell'utente.

**Lasciati fuori finora:**
- testo grande dell'iPhone (Dynamic Type), perché richiede di rifare l'impaginazione;
- impostazioni e occhio spostati in basso, perché cambierebbero l'aspetto della 1.9;
- notifiche vere, perché servirebbe un server.

## Storia breve

| Versione | Novità |
|---|---|
| 1.0–1.9 | base, multi-conto, spese fisse, Apple Pay, coppia, cambi BCE, carte, investimenti, PAC, interessi, Excel completo, guida |
| 2.0 | motion design (transizioni, numeri che scorrono, scorri per eliminare, vibrazione) |
| 2.1 | pulizia del codice, patrimonio netto, categorie che imparano, storico prezzi dal ponte |
| 2.2 | intestazione fissa traslucida, riepilogo del conto toccando il conto in Home; eliminata la copia 1.9 |
| 2.3 | calcoli nel tastierino, «Salva subito come», ripeti con pressione lunga sul +, scorri a destra per duplicare, Home personalizzabile, numero sull'icona, scadenze nel calendario (.ics), ricerche salvate, contrasti, VoiceOver sui grafici |
| 2.4 | uscite in nero (rosso solo per gli avvisi), schede uniformi, nome sotto l'icona attiva, avvisi raggruppati, conti a griglia, «A fine mese» e «Al giorno» in cima alla Home, Oggi/Ieri nel tastierino, nomi categorie non spezzati; barra a 4 voci con la voce attiva più larga; Home riordinata, salvadanai e investimenti nel Patrimonio (Investimenti è una pagina con freccia indietro, non più una voce della barra) |
