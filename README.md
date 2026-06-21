# TCG Tournament Organizer

Desktop-Anwendung zur Organisation von TCG-Turnieren im Schweizer System mit optionalem Top Cut.

## Features

- **Mehrere Turniere gleichzeitig** — Yu-Gi-Oh!, Pokémon TCG, Star Wars: Unlimited, Riftbound
- **Schweizer System** — Automatische Paarung, Bye-Verwaltung, Rematch-Vermeidung
- **Top Cut** — Optionales KO-System nach Swiss-Runden (Top 4, 8, 16 oder 32)
- **Rundenzeit** — Auswählbar von 20 bis 90 Minuten, Timer in Sidebar sichtbar
- **Rangliste mit Tiebreakern** — Buchholz, Median-Buchholz, Sonneborn-Berger
- **JSON Export/Import** — Turnierdaten speichern und laden
- **Zweisprachig** — Deutsch und Englisch

## Tech Stack

- Electron + React + TypeScript
- Vite (Bundler)
- TailwindCSS (Styling)
- Vitest (Tests)

## Entwicklung

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Tests ausführen
npm test

# Produktions-Build
npm run build

# Electron-App bauen
npm run electron:build
```

## Turniersystem

### Swiss-Runden

- **Punkte**: 3 (Sieg), 1 (Unentschieden), 0 (Niederlage)
- **Rundenanzahl**: ⌈log₂(Spieleranzahl)⌉
- **Paarung**: Spieler mit gleicher Punktzahl werden gegeneinander gepaart
- **Bye**: Bei ungerader Spielerzahl erhält der niedrigstrangierte Spieler ein Freilos (3 Punkte). Kein Spieler erhält mehr als ein Freilos pro Turnier.
- **Tiebreaker**: Buchholz → Median-Buchholz → Sonneborn-Berger

### Top Cut

- Single-Elimination-Bracket nach Abschluss der Swiss-Runden
- Seeding basiert auf Swiss-Rangliste (1. vs letzter, 2. vs vorletzter, etc.)
- Kein Unentschieden im Top Cut
- Platzierung nach Bracket-Ergebnis (Sieger = 1., Finalist = 2., Halbfinal-Verlierer = 3.–4.)

## Lizenz

MIT
