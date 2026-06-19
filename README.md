# TCG Tournament Organizer

Desktop-Anwendung zur Organisation von TCG-Turnieren im Schweizer System.

## Features

- **Mehrere Turniere gleichzeitig** — Yu-Gi-Oh!, Pokémon TCG, Star Wars: Unlimited, Riftbound
- **Schweizer System** — Automatische Paarung, Bye-Verwaltung, Rematch-Vermeidung
- **Unabhängige Timer** — Jedes Turnier hat seinen eigenen Countdown
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

## Schweizer System

- **Punkte**: 3 (Sieg), 1 (Unentschieden), 0 (Niederlage)
- **Rundenanzahl**: ⌈log₂(Spieleranzahl)⌉
- **Paarung**: Spieler mit gleicher Punktzahl werden gegeneinander gepaart
- **Bye**: Bei ungerader Spielerzahl erhält der niedrigstrangierte Spieler ein Freilos (3 Punkte)
- **Tiebreaker**: Buchholz → Median-Buchholz → Sonneborn-Berger → Direkter Vergleich

## Lizenz

MIT
