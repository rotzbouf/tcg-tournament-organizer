# TCG Tournament Organizer

Desktop-Anwendung zur Organisation von TCG-Turnieren mit Swiss-System, Double Elimination, Round Robin und Top Cut. Vollständig offline-fähig.

## Features

- **Mehrere Turniere gleichzeitig** — Yu-Gi-Oh!, Pokémon TCG, Magic: The Gathering, Star Wars: Unlimited, Riftbound, Disney Lorcana, Altered, Flesh and Blood, One Piece Card Game, Dragon Ball Super: Fusion World
- **4 Turnier-Formate** — Swiss, Swiss + Top Cut, Double Elimination, Round Robin
- **Multi-Phase-Turniere** — Mehrere Phasen hintereinander (z.B. Round Robin → Swiss → Top Cut)
- **Penalty-System** — Offizielle Strafkataloge (Magic IPG, Pokémon Penalty Guidelines, Yu-Gi-Oh!-Turnierpolitik) mit automatischem Strafvorschlag und Eskalation bei Wiederholung; Verwarnungen, Spielverlust, Matchverlust, Disqualifikation, Custom-Notizen; Cross-Tournament-Tracking in der Spieler-Datenbank
- **Decklisten** — Import aus MTGA, PTCGL, Moxfield, Limitless, Pixelborn, DreamBorn und weiteren Tools; Sichtbarkeits-Modi (Versteckt/Nur TO/Öffentlich); Kartenbank-Validierung (Kartenzahl, Kopien-Limit); automatische TO-Warnung bei illegal nachgereichter Liste
- **Deck-Checks** — Zufallstisch-Auswahl per Klick, Decklisten-Einsicht beider Spieler, Abschluss mit Befund/ohne Befund (Befund öffnet direkt den Strafen-Dialog), automatische Zeitgutschrift (Check-Dauer + 3 Minuten), aufklappbares Protokoll
- **Manuelle Paarungsänderung** — Spieler zwischen Matches per Klick tauschen
- **Spielersuche** — Spieler-Tab nach Name/Spieler-ID/Deck filtern, Runden-Tab nach Spielername oder Tischnummer; akzent-tolerant („jose" findet „José"), gedruckt wird immer die vollständige Paarungsliste
- **Saison-Management** — Mehrere Turniere zu einer Saison zusammenfassen. Konfigurierbare Punkte-Tiers nach Platzierung. Automatische Saison-Rangliste über alle verknüpften Events
- **Spieler Self-Reporting** — Spieler können Ergebnis auf der Mobile-Seite melden; TO bestätigt vor der Speicherung
- **Judge-Zugang mobil** — Co-Judges arbeiten per QR-Code vom Handy mit: Ergebnisse direkt eintragen, Strafen vergeben, Spieler droppen, Judge-Rufe übernehmen (first-claim-wins), Decklisten für Deck-Checks einsehen; jederzeit widerrufbar
- **Elo Seeding** — Erste Runde optional nach Elo-Wertung per S-Kurve paaren
- **Visuelles Bracket** — Grafische Top-Cut-Bracket-Ansicht mit Champion-Hervorhebung
- **Turnier-Abschlussbericht** — HTML-Export mit Champion, Statistiken und allen Runden
- **Export-Brücken zu offiziellen Tools** — Pokémon: importierbare TOM-Datei (.tdf); Magic (EventLink) und Yu-Gi-Oh! (KTS): Rundenergebnis-CSV als Übertragungshilfe
- **Elo-Rankings** — Persistente Spieler-Datenbank mit Elo-Wertung über mehrere Turniere, Elo-Verlauf-Graph, Statistik-Übersicht
- **Spielerprofil** — TCG-spezifische Spieler-IDs hinterlegen (Konami-ID, Pokemon Player ID, etc.)
- **Discord Webhook** — Paarungen, Standings und Ergebnisse automatisch in Discord posten
- **Dark Mode** — Hell, Dunkel oder System-Einstellung. Mobile-Seite folgt dem System-Theme
- **Rundenzeit** — Auswählbar von 20 bis 90 Minuten, Timer in Sidebar sichtbar, Alarm (Sound + Notification + Vibration) bei Ablauf, stummschaltbar
- **Time Extensions** — Extra-Zeit pro Tisch (TO in der Match-Karte, Judge vom Handy), Badge am Match und in den Mobile-Paarungen; nach Rundenende zählt am verlängerten Tisch ein eigener Countdown weiter
- **Rangliste mit Tiebreakern** — Buchholz, Median-Buchholz, Sonneborn-Berger
- **Auto-Save mit Backups** — Automatische Speicherung als Datei im Benutzerdatenordner (verschlüsselt über den System-Schlüsselbund, sofern verfügbar), rotierende Backups alle 2 Minuten (alters-gestaffelt ausgedünnt) mit Wiederherstellungs-Dialog
- **Undo** — Aktionen rückgängig machen (Ctrl+Z)
- **Bulk Import** — Spielerliste per Textarea einfügen
- **Druck-Suite** — Druckoptimierte Ansicht mit Turnier-Header, PDF-Export für Paarungen (nach Tisch und alphabetisch nach Name), Match-Slips mit Unterschriftszeilen, Standings und großformatigen Ranglisten-Aushang
- **QR-Code drucken** — QR-Code für mobile Spielerregistrierung ausdrucken; zusätzlich QR pro Spieler mit vorab gebundenem Zugriffs-Token (sofortige Anmeldung ohne Namens-Registrierung)
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
- **Rundenanzahl**: ⌈log₂(Spieleranzahl)⌉; bei Turnieren mit Top Cut nach den offiziellen Mit-Cut-Tabellen des jeweiligen Spiels (Magic MTR, Pokémon Play!-Handbuch, Konami-Policy), die in einigen Bereichen davon abweichen
- **Paarung**: Exaktes Maximum-Weight-Matching (Blossom-Algorithmus) über alle aktiven Spieler — Rematches nur, wenn mathematisch unvermeidbar; Spieler mit gleicher Punktzahl werden bestmöglich gegeneinander gepaart (ein großer Pair-Down wird gegenüber zwei kleinen vermieden)
- **Bye**: Bei ungerader Spielerzahl erhält der niedrigstrangierte Spieler ein Freilos (3 Punkte). Kein Spieler erhält mehr als ein Freilos pro Turnier.
- **Tiebreaker**: Buchholz → Median-Buchholz → Sonneborn-Berger

### Top Cut (Single Elimination)

- Single-Elimination-Bracket nach Abschluss der Swiss-Runden; Cut-Größe automatisch nach den offiziellen Regeln des Spiels (z.B. Magic: ab 9 Spielern Top 8; Pokémon: 9–20 Top 4, ab 21 Top 8; Yu-Gi-Oh!: 9–32 Top 4, ab 33 Top 8) oder fest Top 4/8/16/32
- Seeding nach Swiss-Rangliste im offiziellen Standard-Bracket: Seed 1 trifft den niedrigsten Qualifikanten (1 vs 16, 8 vs 9, …), Seed 1 und 2 können sich frühestens im Finale begegnen
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
