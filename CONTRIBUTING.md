# Mitwirken

Danke für dein Interesse am TCG Tournament Organizer! Fehlerberichte, Verbesserungsvorschläge und Pull Requests sind willkommen.

Bitte beachte den [Verhaltenskodex](CODE_OF_CONDUCT.md). Sicherheitslücken meldest du bitte **nicht** öffentlich, sondern wie in der [Security Policy](SECURITY.md) beschrieben.

## Fehler melden und Ideen einbringen

Eröffne ein [Issue](../../issues/new/choose) mit der passenden Vorlage. Bei Fehlern helfen uns:

- App-Version (z. B. 1.7.3) und Betriebssystem
- betroffenes Spiel und Turnierformat
- Schritte zum Nachstellen und was du erwartet hast
- bei Regelfragen: ein Verweis auf die offizielle Regel (Turnierregeln, Strafkataloge)

Entferne vor dem Anhängen von Turnier-Exporten personenbezogene Daten (Namen, Spieler-IDs, Decklisten).

## Entwicklungsumgebung

Voraussetzung ist Node.js in der Version aus [`.nvmrc`](.nvmrc).

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests (Vitest)
npx tsc --noEmit   # Typprüfung
npm run lint       # ESLint
```

Verwende `tsc` nur mit `--noEmit`; erzeugte `.js`-Dateien neben den Quellen stören den Vite-Build.

## Pull Requests

1. Forke das Repository und erstelle einen Branch von `main`.
2. Halte die Änderung klein und thematisch geschlossen.
3. Ergänze oder passe Tests an — Turnierlogik (Paarung, Tiebreaker, Strafen) braucht Tests, die sich auf die offiziellen Regeln stützen.
4. Stelle sicher, dass `npm test`, `npx tsc --noEmit` und `npm run lint` fehlerfrei durchlaufen.
5. Neue Texte kommen in beide Sprachdateien (Deutsch und Englisch).
6. Trage nutzersichtbare Änderungen im [Changelog](CHANGELOG.md) unter einer neuen Version ein; bestehende Einträge bleiben unverändert.
7. Eröffne den Pull Request gegen `main` und fülle die Vorlage aus.

Commit-Nachrichten folgen dem Muster `typ: Kurzbeschreibung` (z. B. `fix:`, `feat:`, `docs:`, `chore:`, `ci:`).

## Hinweise zum Code

- Der Electron-Teil (`electron/` und die von dort erreichten Module aus `src/`) nutzt relative Imports statt des `@/`-Alias.
- Die App verwendet einen `HashRouter`; ein `BrowserRouter` führt in Desktop-Builds zu leeren Fenstern.

## Lizenz

Mit deinem Beitrag stimmst du zu, dass er unter der [MIT-Lizenz](LICENSE) des Projekts veröffentlicht wird.
