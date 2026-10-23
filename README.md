# EFU Budget

Web app di budget personale per iPhone: un unico file, installabile dalla schermata Home, con i dati che restano solo sul telefono.

- **Sorgenti:** sono in `src/`. L'app si compone con `python3 build.py`, che produce `dist/EFU-Budget/`.
- **Collaudo:** `python3 tests/collaudo.py`.
- **Pubblicazione:** è automatica. A ogni modifica su `main`, GitHub compone l'app, la collauda e la pubblica su GitHub Pages solo se il collaudo passa.
- **Per lavorarci con Claude Code:** `CLAUDE.md` contiene tutto il contesto.
