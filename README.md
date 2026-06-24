# TCG Tournament Organizer

Desktop-Anwendung zur Organisation von TCG-Turnieren mit Swiss-System, Double Elimination, Round Robin und Top Cut. Vollständig offline-fähig.

## Features

- **Mehrere Turniere gleichzeitig** — Yu-Gi-Oh!, Pokémon TCG, Star Wars: Unlimited, Riftbound, Disney Lorcana, Altered, Magic: The Gathering
- **4 Turnier-Formate** — Swiss, Swiss + Top Cut, Double Elimination, Round Robin
- **Multi-Phase-Turniere** — Mehrere Phasen hintereinander (z.B. Round Robin → Swiss → Top Cut)
- **Penalty-System** — Verwarnungen, Spielverlust, Matchverlust, Disqualifikation, Custom-Notizen; Cross-Tournament-Tracking in der Spieler-Datenbank
- **Decklisten** — Import aus MTGA, PTCGL, Moxfield, Limitless, Pixelborn, DreamBorn und weiteren Tools; Sichtbarkeits-Modi (Versteckt/Nur TO/Öffentlich); Kartenbank-Validierung (Kartenzahl, Kopien-Limit)
- **Manuelle Paarungsänderung** — Spieler zwischen Matches per Klick tauschen
- **Elo-Rankings** — Persistente Spieler-Datenbank mit Elo-Wertung über mehrere Turniere, Elo-Verlauf-Graph, Statistik-Übersicht
- **Spielerprofil** — TCG-spezifische Spieler-IDs hinterlegen (Konami-ID, Pokemon Player ID, etc.)
- **Discord Webhook** — Paarungen, Standings und Ergebnisse automatisch in Discord posten
- **Dark Mode** — Hell, Dunkel oder System-Einstellung. Mobile-Seite folgt dem System-Theme
- **Rundenzeit** — Auswählbar von 20 bis 90 Minuten, Timer in Sidebar sichtbar, Alarm (Sound + Notification + Vibration) bei Ablauf, stummschaltbar
- **Rangliste mit Tiebreakern** — Buchholz, Median-Buchholz, Sonneborn-Berger
- **Auto-Save** — Automatische Speicherung via localStorage
- **Undo** — Aktionen rückgängig machen (Ctrl+Z)
- **Bulk Import** — Spielerliste per Textarea einfügen
- **Paarungen drucken** — Druckoptimierte Ansicht mit Turnier-Header, PDF-Export für Paarungen und Standings
- **QR-Code drucken** — QR-Code für mobile Spielerregistrierung ausdrucken
- **Mobile Turnier-Navigation** — Registrierte Spieler können Paarungen und Rangliste direkt am Handy einsehen
- **Tischnummern** — Automatische Nummerierung auf Match-Cards
- **JSON Export/Import** — Turnierdaten speichern und laden
- **Zweisprachig** — Deutsch und Englisch
- **Keyboard Shortcuts** — Ctrl+E Export, Ctrl+I Import, Ctrl+Z Undo

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

## Turnier-Formate

### Swiss-Runden

- **Punkte**: 3 (Sieg), 1 (Unentschieden), 0 (Niederlage)
- **Rundenanzahl**: ⌈log₂(Spieleranzahl)⌉ — entspricht dem offiziellen Standard von Yu-Gi-Oh!, Pokémon und Magic
- **Paarung**: Spieler mit gleicher Punktzahl werden gegeneinander gepaart (Backtracking-Algorithmus mit Rematch-Vermeidung)
- **Bye**: Bei ungerader Spielerzahl erhält der niedrigstrangierte Spieler ein Freilos (3 Punkte). Kein Spieler erhält mehr als ein Freilos pro Turnier.
- **Tiebreaker**: Buchholz → Median-Buchholz → Sonneborn-Berger

### Top Cut (Single Elimination)

- Single-Elimination-Bracket nach Abschluss der Swiss-Runden (Top 4, 8, 16 oder 32)
- Seeding basiert auf Swiss-Rangliste
- Kein Unentschieden im Top Cut
- Platzierung nach Bracket-Ergebnis (Sieger = 1., Finalist = 2., Halbfinal-Verlierer = 3.–4.)

### Double Elimination

- Winners-Bracket und Losers-Bracket mit Grand Final
- Erste Niederlage → Losers-Bracket, zweite Niederlage → ausgeschieden
- Platzierung nach Bracket-Tiefe

### Round Robin

- Jeder Spieler spielt gegen jeden anderen genau einmal
- Circle-Algorithmus für optimale Paarung
- Ideal für kleine Gruppen (4–8 Spieler)

## Penalty-System

| Strafe | Effekt |
|--------|--------|
| Verwarnung | Wird protokolliert, kein Spieleffekt |
| Spielverlust (Game Loss) | Wird protokolliert, für Richter-Referenz |
| Matchverlust (Match Loss) | Setzt das Matchergebnis automatisch auf Gegner-Sieg |
| Disqualifikation | Spieler wird sofort aus dem Turnier gedroppt |

Strafen (außer Notizen) werden zusätzlich in der Spieler-Datenbank gespeichert. Beim Hinzufügen eines Spielers mit bestehenden Strafen wird eine Warnung angezeigt.

## Elo-Rankings

- Standard-Elo-Formel mit K=32 (neue Spieler) und K=16 (etablierte Spieler, 30+ Matches)
- Persistente Spieler-Datenbank über alle Turniere
- Turnier-History mit Elo-Verlauf pro Spieler
- Automatische Anwendung beim Turnierende (einmalig, kein manueller Button)

## Lizenz

MIT
