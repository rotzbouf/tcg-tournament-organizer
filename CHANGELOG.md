# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.4] - 2026-06-28

### Fixed
- **Scryfall Rate Limit** — 120 ms Pause zwischen paginierten API-Requests eingebaut; verhindert 429-Fehler beim Laden großer Formatlisten (z. B. MTG Standard mit ~12 Seiten)

## [1.6.3] - 2026-06-28

### Changed
- **Banlist-Strategie pro Format** — Jedes Format deklariert jetzt einen Validierungstyp: `legal_list` (MTG Standard, Pauper: vollständige legale Kartenliste von Scryfall), `rotation` (Pokémon Standard: Set-Code-Whitelist für Pokémon-Karten; Trainer/Energie werden übersprungen da Namens-basiert) oder `banlist` (alle anderen: explizite Verboten/Limited/Semi-Limited-Listen). MTG Vintage lädt zusätzlich die Restricted-List (max. 1 Kopie). Die Banlist-Ansicht zeigt für jedes Format den passenden Badge und die entsprechenden Statistiken

## [1.6.2] - 2026-06-28

### Added
- **Saison-Zeitraum** — Beim Erstellen einer Saison wird ein Start- und Enddatum festgelegt. Alle abgeschlossenen Turniere desselben Spiels, deren Erstellungsdatum im Zeitraum liegt, werden automatisch zur Saison gewertet — kein manuelles Hinzufügen mehr nötig. Der Zeitraum ist nachträglich editierbar
- **Saison-Opt-out bei Turniererstellung** — Existiert eine aktive Saison für das gewählte Spiel, erscheint beim Erstellen eines Turniers die Checkbox „Zur Saison werten" (Standard: angehakt). Wird sie deaktiviert, wird das Turnier nicht in der Saison-Wertung berücksichtigt
- **Archivierte Turniere aus Sidebar entfernt** — Archivierte Turniere erscheinen nicht mehr in der Navigation

## [1.6.1] - 2026-06-28

### Fixed
- **Pokémon Standard Banlist-Laden** — Trainer-Namen-Fetch entfernt, der ~18 API-Requests erzeugte und ins Timeout lief. Rotations-Check gilt jetzt nur für Pokémon-Karten (set-code-basiert); Trainer und Energie werden übersprungen, da reprinted Karten ohne vollständige Datenbank nicht zuverlässig geprüft werden können
- **Scryfall API-Fehler** — `Accept: application/json`-Header ergänzt, der von der Scryfall API zwingend vorausgesetzt wird
- **Scryfall Fehler-Response** — Ungültige API-Responses (kein `data`-Array) werfen jetzt einen lesbaren Fehler statt einem `TypeError: data is not iterable`

## [1.6.0] - 2026-06-28

### Added
- **Rotations-Validierung für Pokémon TCG Standard** — Beim Laden der Banlist werden jetzt auch die aktuell legalen Standard-Sets (via pokemontcg.io) sowie alle legalen Trainer- und Energie-Karten-Namen geladen. Pokémon-Karten werden printing-basiert geprüft (Set-Code muss in der aktuellen Rotation sein); Trainer- und Energie-Karten sind legal wenn ihr Name in einem Standard-legalen Set vorkommt — unabhängig vom Druck
- **Rotations-Validierung für MTG Standard** — Beim Laden der Standard-Banlist von Scryfall wird eine vollständige Liste aller Standard-legalen Karten-Namen heruntergeladen. Die Prüfung ist namensbasiert, sodass Reprints in älteren Sets korrekt als legal erkannt werden
- **Set-Code im Parser** — Der Decklist-Parser extrahiert jetzt den Set-Code (`setCode`) als eigenes Feld aus PTCGL- und MTGA-Exportformaten. Karten-Namen enthalten keine Set-Info mehr. Der Parser erkennt außerdem den Abschnittstyp (`section`: pokemon / trainer / energy) für Pokémon-Decklisten

## [1.5.5] - 2026-06-27

### Fixed
- **Strafen-Dialog: Button direkt aktiv** — Der „Strafe vergeben"-Button war beim ersten Öffnen des Dialogs deaktiviert, obwohl der erste Spieler bereits vorausgewählt war. Initialwert von `playerId` stimmt jetzt mit dem angezeigten Select-Eintrag überein
- **Mobile-Vibration bei Timer-Ablauf** — `navigator.vibrate()` wird vom Browser ignoriert wenn die Seite nicht sichtbar ist (Bildschirm gesperrt / Tab im Hintergrund). Die Vibration wird jetzt nachgeholt sobald die Seite wieder sichtbar wird (`visibilitychange`-Listener). Vibrationsmuster verlängert (3× 500 ms). AudioContext wird vor der Wiedergabe explizit resumt um die Autoplay-Blockierung auf Mobile zu umgehen

## [1.5.4] - 2026-06-27

### Fixed
- **Judge Call für gedroppte Spieler gesperrt** — Der Server lehnt Judge Calls von Spielern mit `droppedInRound !== null` mit HTTP 403 ab. Gedroppte Spieler können keinen Judge mehr rufen

## [1.5.3] - 2026-06-27

### Changed
- **Auto-Sieg beim Drop** — Droppt ein Spieler während einer laufenden Runde und sein Match ist noch ausstehend, erhält der Gegner automatisch den Sieg. Bereits eingetragene Ergebnisse und Freilose bleiben unverändert

## [1.5.2] - 2026-06-27

### Fixed
- **Judge-Call-Spam** — Wiederholt ein Spieler einen Judge Call bevor der TO bestätigt hat, wird der alte Eintrag ersetzt statt ein weiterer Banner anzuhängen. Pro Spieler ist immer nur ein offener Judge Call sichtbar

## [1.5.1] - 2026-06-27

### Added
- **Turnier-Archiv** — Abgeschlossene Turniere können im Dashboard archiviert werden. Tab-Umschalter „Aktiv / Archiv" trennt laufende von archivierten Turnieren. Archivierung ist jederzeit rückgängig machbar („Wiederherstellen")
- **Konflikt-Erkennung bei Self-Reporting** — Melden beide Spieler eines Matches ein widersprüchliches Ergebnis (beide Sieg oder beide Niederlage), erscheint ein rotes Warn-Banner. Der TO muss das Ergebnis dann manuell per Schaltfläche eintragen; automatisches Bestätigen ist gesperrt. Stimmen beide Meldungen überein, wird dies im gelben Banner als „Beide melden …" angezeigt

## [1.5.0] - 2026-06-26

### Added
- **Spieler Self-Reporting** — Spieler können ihr Matchergebnis direkt auf der Mobile-Seite eintragen. Der TO sieht einen Bestätigungs-Banner im Rundenbereich und muss das gemeldete Ergebnis explizit bestätigen, bevor es gespeichert wird
- **Saison-Management** — Neue Saisons-Seite in der Navigation. Mehrere abgeschlossene Turniere können zu einer Saison zusammengefasst werden. Konfigurierbare Punkte-Tiers nach Platzierung (Standard: 1.=10, 2.=7, 3.–4.=5, 5.–8.=3, 9.–16.=1). Die Saison-Rangliste wird automatisch über alle verknüpften Turniere berechnet
- **Elo Seeding** — Erste Runde optional nach Elo-Wertung paaren (S-Kurven-Methode: #1 vs. #N/2+1, #2 vs. #N/2+2 usw.). Aktivierbar pro Turnier beim Erstellen
- **Visuelles Bracket** — Neuer „Bracket"-Tab erscheint sobald Top-Cut-Runden existieren. Zeigt den gesamten Eliminationsbaum mit Champion-Hervorhebung
- **Turnier-Abschlussbericht** — HTML-Export nach Turnierende mit Champion-Box, Statistiken, vollständiger Rangliste und allen Rundenpaarungen

## [1.4.1] - 2026-06-26

### Fixed
- **Windows-Build: Dashboard leer** — BrowserRouter durch HashRouter ersetzt. Auf Windows wurde der `file://`-Pfad (`/C:/…/index.html`) nicht als Route `/` erkannt, wodurch der gesamte Dashboard-Inhalt (inkl. „Neues Turnier"-Button) nicht gerendert wurde

## [1.4.0] - 2026-06-24

### Added
- **Dark Mode** — Drei Modi: Hell, Dunkel, System. Toggle in der Sidebar, Theme-Wahl wird gespeichert. Mobile-Seite folgt dem System-Setting des Handys
- **Timer-Alarm** — Sound (Web Audio Beep), Desktop-Notification und Mobile-Vibration bei Rundenende. Sound per Toggle stummschaltbar
- **Elo-Verlauf-Graph** — SVG-Linien-Chart in der Spielerhistorie zeigt Elo-Entwicklung über alle Turniere mit Hover-Tooltips
- **Statistik-Karten** — Rangliste zeigt Spieleranzahl, Durchschnitts-Elo und aktivsten Spieler als Übersicht
- **Paarungen-PDF-Export** — Neue Export-Funktion für Paarungen mit Tischnummern, Spielernamen und Ergebnissen

### Changed
- Alle Farben auf semantische CSS-Variablen umgestellt für konsistentes Theming
- Druckansicht verbessert: saubere Tabellen, versteckte Buttons, Seitenumbruch-Regeln, Print-Header mit Turniername und Rundennummer

## [1.3.3] - 2026-06-23

### Added
- **Power Pairings** — Letzte Swiss-Runde paart innerhalb eines Punktebrackets nach Tiebreaker-Rang. Pro Turnier zu- und abschaltbar (Standard: an)
- **Turnier-Vorlagen** — Wiederkehrende Turnierformate als Vorlage speichern und beim Erstellen laden
- **Decklist-Sichtbarkeit bei Erstellung** — Sichtbarkeitsmodus direkt beim Turnier-Erstellen auswählbar

### Changed
- Game-Score-Felder (Spiele) werden nur noch bei TCGs mit GW%-Tiebreaker angezeigt (SWU, Lorcana, Altered, MTG), nicht mehr bei YGO, Pokémon und Riftbound

## [1.3.2] - 2026-06-23

### Added
- **Manuelle Paarungsänderung** — Spieler zwischen Matches tauschen per Klick (Spieler auswählen → zweiten Spieler anklicken → Swap)
- **Decklist-Sichtbarkeits-Modi** — Drei Modi: Versteckt, Nur für TO, Öffentlich. Steuerbar über neuen Decklisten-Tab, Mobile-Seite respektiert Einstellung
- **Kartenbank-Validierung** — Decklisten werden gegen Deck-Regeln geprüft (Kartenzahl, maximale Kopien pro Karte). Regeln pro TCG konfiguriert
- **Cross-Tournament Penalty-Tracking** — Strafen werden in der Spieler-Datenbank gespeichert und bei zukünftigen Turnieren als Warnung angezeigt
- **Decklist-Übersicht** — Neuer Tab für den TO mit allen eingereichten Decklisten, aufklappbar pro Spieler

### Fixed
- Hardcoded Strings ("Tournament not found", "3 pts") durch i18n-Keys ersetzt

## [1.3.1] - 2026-06-23

### Added
- **Custom-Notiz im Penalty-System** — Neue Option "Notiz" als Strafart, rein zur Dokumentation ohne Spieleffekt
- **Multi-Format Decklist-Import** — Unterstützung für MTGA, PTCGL, Moxfield, Limitless, Pixelborn, DreamBorn, Archidekt, pokemoncard.io Formate; Sektions-Header werden automatisch übersprungen

## [1.3.0] - 2026-06-23

### Added
- **Disney Lorcana** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor), Minimum 4 Swiss-Runden
- **Altered** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor)
- **Magic: The Gathering** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor), Minimum 4 Swiss-Runden
- Per-Spiel konfigurierbare Mindest-Rundenanzahl (`minSwissRounds`)

## [1.2.9] - 2026-06-23

### Added
- **Navigation nach Registrierung** — Registrierte Spieler sehen sofort Paarungen- und Rangliste-Tabs auf der mobilen Seite

### Changed
- "Nicht du? Wechseln"-Button auf der mobilen Seite entfernt, um versehentliche Doppel-Registrierungen zu vermeiden

### Fixed
- Mobile Seite zeigte weiße Seite wegen Syntax-Fehler in Template-Literal

## [1.2.8-beta] - 2026-06-23

### Added
- **QR-Code drucken** — Drucken-Button im QR-Code-Fenster, damit der QR-Code am Eventtag ausgedruckt im Shop ausgelegt werden kann
- **Automatische Elo-Aktualisierung** — Elo-Wertung wird automatisch beim Turnierende angewendet, mit Schutz gegen doppelte Anwendung
- **SSE Initial-State** — Mobile Seite erhält sofort den aktuellen Turnierstand beim Verbinden

### Changed
- Manueller "Elo aktualisieren"-Button entfernt (Missbrauchsschutz)
- "Nächste Runde generieren"-Button nach Turnierende deaktiviert
- Mobile Seite nutzt gebundene Turnier-ID statt erstes Turnier aus dem State

### Fixed
- Mobile Registrierungsseite konnte leer bleiben wenn der initiale API-Aufruf fehlschlug
- SSE-Updates auf dem Registrierungs-Tab wurden komplett blockiert

## [1.2.7] - 2026-06-22

### Added
- **CSV-Export** — Turnierergebnisse als CSV exportieren (Rang, Name, Spieler-ID, Punkte, Tiebreaker)
- **PDF-Export** — Formatiertes Ergebnis-PDF mit Turnierinformationen und Standings-Tabelle
- **Automatische Top-Cut-Berechnung** — Top-Cut-Größe wird anhand der Spieleranzahl nach offiziellen Regeln berechnet (9–16: Top 4, 17–32: Top 8, 33–64: Top 16, 65+: Top 32)

### Changed
- Manuelle Top-Cut-Auswahl entfernt, ersetzt durch automatische Berechnung beim Turnierstart

## [1.2.6-beta] - 2026-06-22

### Added
- **Einzelne Spieler aus Datenbank löschen** — ×-Button pro Spieler in der Rangliste mit Bestätigungsdialog

## [1.2.5-beta] - 2026-06-22

### Added
- **Autocomplete bei Spielereingabe** — Vorschläge aus der Datenbank beim Tippen mit Name und Elo-Anzeige, Auswahl per Klick oder Pfeiltasten
- **Turnierformat in der Turnieransicht** — Format (Swiss, Swiss + Top Cut, etc.), Top-Cut-Größe und Altersklassen im Header sichtbar
- **Umschalten Gesamt-/Divisions-Rangliste** — Buttons zum Wechsel zwischen Rangliste pro Altersklasse und Gesamtrangliste

### Changed
- Separates Dropdown "Spieler aus Datenbank hinzufügen" entfernt, durch integriertes Autocomplete ersetzt

## [1.2.4-beta] - 2026-06-22

### Added
- **Judge Call über Mobile** — Spieler können per Button einen Judge an ihren Tisch rufen, Tischnummer wird automatisch erkannt
- Popup-Benachrichtigung auf dem TO-Bildschirm mit Spielername und Tischnummer
- Eigenes Match wird in der mobilen Paarungsansicht blau hervorgehoben
- Rundenzeit-Timer auf der mobilen Seite sichtbar

### Changed
- **Ergebnis-Reporting nur noch über TO** — Result-Buttons aus der mobilen Ansicht entfernt, Hinweis auf Meldung beim Turnierleiter

## [1.2.3-beta] - 2026-06-22

### Added
- **Pokémon TCG Altersklassen** — Offizielle Divisionen (Junior / Senior / Masters) basierend auf Geburtsjahr und Season-Zyklus (Sep–Aug)
- Paarung pro Division getrennt (Juniors nur gegen Juniors, etc.)
- Standings pro Division mit eigener Rangliste
- Division-Badge in der Turnier-Spielerliste
- TO kann Altersklassen bei Turniererstellung deaktivieren für kleine lokale Turniere
- **Erweiterte mobile Registrierung** — Vorname, Nachname, Geburtsdatum (optional), Spieler-ID (optional)
- Session-Speicherung in localStorage für spätere Rückkehr zum Turnier
- Spieler können nur noch eigene Deckliste einreichen (kein Dropdown für andere Spieler)

## [1.2.2-beta] - 2026-06-22

### Added
- **QR-Code im eigenen Fenster öffnen** — Separates Always-on-Top-Fenster mit Turniername und QR-Code, mehrere gleichzeitig möglich für parallele Turnierregistrierung

### Fixed
- **QR-Code wird nach Server-Start nicht angezeigt** — QR-Code-Generierung in den Renderer-Prozess verschoben, umgeht Bundler-Probleme mit dem qrcode-Modul im Hauptprozess
- **Mobile Registrierung: Eingabefeld wird nach Sekunden zurückgesetzt** — Timer-Update vom DOM-Rebuild getrennt, Eingabefelder bleiben während der Eingabe erhalten
- **Spieler können Decklisten für andere einreichen** — Register und Decklist als zusammenhängender Flow, Spieler können nur ihre eigene Deckliste einreichen

## [1.2.1-beta] - 2026-06-22

### Added
- **Spieler-ID / Spielerprofil** — TCG-spezifische Spieler-IDs hinterlegen (Konami-ID, Pokemon Player ID, etc.)
- Spielerprofil-Ansicht in der Rangliste mit editierbarer Spieler-ID
- Spieler-ID-Spalte in der Ranglisten-Übersicht
- Spieler-ID wird bei Turnier-Anmeldung aus der Datenbank übernommen
- Spieler-ID wird in der Turnier-Spielerliste angezeigt

### Fixed
- **QR-Code wird nach Server-Start nicht angezeigt** — `qrcode`-Modul wurde beim Bundling nicht externalisiert, dynamischer Import schlug still fehl
- `qrcode` als Rollup-External konfiguriert und statisch importiert
- `electron-builder.yml` enthält nun `qrcode` und dessen Dependencies für den produktiven Build

## [1.2.0-beta] - 2026-06-21

### Added
- **Local web server for mobile player access** — Players scan a QR code to interact via phone browser
- Mobile page: view pairings, submit results, register, submit decklists, view standings
- Server-Sent Events for live state updates to all connected devices
- QR code generation for local network URL
- Server Panel tab in tournament view with start/stop controls
- IPC state synchronization bridge between renderer and main process
- Timer state sync for mobile timer display
- REST API endpoints for tournament interaction
- Auto-detect local IP address for server URL
- Server auto-cleanup on app close

## [1.1.0] - 2026-06-21

### Added
- Game-level result tracking (game scores within a match, e.g., 2-1 in best-of-3)
- Game-configurable tiebreaker system: TCG-standard (OMW%, GW%, OGW%) for YGO/Pokemon/SWU, chess-standard (Buchholz/SB) for Riftbound
- Tiebreaker minimum floors (33% for SWU/MTG-style, 25% for YGO/Pokemon)
- Head-to-head tiebreaker for YGO and Pokemon
- Game Loss penalty now mechanically awards opponent +1 game win
- Grand Final bracket reset option for Double Elimination tournaments
- Losers bracket pairing with rematch avoidance
- Game score input fields on MatchCard

### Changed
- StandingsTable shows game-appropriate tiebreaker columns (OMW%/GW%/OGW% or Buchholz/SB based on game)
- Discord webhook messages use i18n system instead of hardcoded German strings
- Tiebreaker configuration per game via GameConfig

## [1.0.0] - 2026-06-21

### Added
- **Tournament Formats:** Double Elimination (winners/losers bracket, grand final) and Round Robin (circle algorithm)
- **Format Selection:** Choose between Swiss, Swiss + Top Cut, Double Elimination, and Round Robin when creating a tournament
- **Penalty System:** Issue warnings, game losses, match losses, and disqualifications; auto-applies match results and drops
- **Multi-Phase Tournaments:** Configure sequential phases (e.g., Round Robin → Swiss → Top Cut) with player advancement between phases
- **Decklist Submission:** Players can submit full card lists (parsed from "3x Card Name" format) with card count stats
- **Elo Rankings:** Persistent player database with Elo ratings across tournaments (K=32 new, K=16 established)
- **Rankings Page:** Searchable player rankings with tournament history and Elo progression
- **Discord Webhook:** Post pairings, standings, and results to Discord channels automatically
- **Discord Settings Tab:** Configure and test webhook URL per tournament
- Round Robin engine tests
- Double Elimination engine tests
- Elo calculation engine tests
- Decklist parser tests

### Changed
- Standings calculation supports Round Robin and Double Elimination bracket phases
- Serialization version bumped to 1.2.0 with backward-compatible migration
- UPDATE_TOURNAMENT allows changing Discord webhook URL at any tournament stage

## [0.9.0] - 2026-06-21

### Added
- Auto-save via localStorage — tournament data persists across sessions
- Error boundary — catches React errors with reload fallback
- Confirmation dialogs for delete tournament and drop player
- Undo system with history stack (Ctrl+Z)
- Tournament editing during registration (name, round time, top cut)
- Bulk player import via textarea (one name per line)
- Print pairings button with print-optimized CSS
- Table numbers on match cards
- Deck name tracking per player
- Keyboard shortcuts: Ctrl+E export, Ctrl+I import, Ctrl+Z undo
- Reducer test suite (20 test cases)
- Top cut engine tests
- `nearestPowerOfTwo` utility function

### Fixed
- Top cut validates player count and clamps to nearest power of 2
- Top cut rejects non-power-of-2 player counts
- Match results can only be submitted in the active (non-complete) round
- Dialog component now traps focus and has proper ARIA attributes
- RoundHistory accordion has aria-expanded and aria-controls

### Changed
- Standings calculated from Swiss rounds only (excluding top cut matches)
- Dialog uses role="dialog", aria-modal, aria-labelledby, and focus restoration

### Removed
- Unused `selectActiveTournaments` selector

## [0.8.2] - 2026-06-21

### Added
- Round timer displayed next to tournament name in sidebar for running tournaments

## [0.8.1] - 2026-06-21

### Added
- Top 32 option for Top Cut tournament mode

### Fixed
- Top Cut standings now rank players by bracket placement (winner = 1st, finalist = 2nd, etc.) instead of Swiss tiebreakers
- Swiss points and tiebreakers are calculated from Swiss rounds only, excluding Top Cut matches
- Players can no longer receive more than one bye in a tournament

## [0.8.0] - 2026-06-21

### Added
- Round time selection via dropdown menu (20–90 minutes in 10-minute steps)
- Tournament mode selection: Swiss-only or with Top Cut (Top 4, Top 8, Top 16)
- Top Cut single-elimination bracket phase after Swiss rounds
- Top Cut status badge and round counter in tournament view
- Draw option hidden in Top Cut matches (single elimination requires a winner)

### Changed
- Migrated Tailwind CSS configuration to v4 syntax (@import, @theme)
- Replaced PostCSS plugin `tailwindcss` with `@tailwindcss/postcss`

## [0.7.1] - 2026-06-21

### Added
- CI pipeline with typecheck, lint, and tests
- CodeQL security scanning
- Dependabot config for npm and GitHub Actions
- ESLint with TypeScript and React plugins
- Security policy with vulnerability reporting guidelines

### Changed
- Bump dependencies: react 19, react-dom 19, i18next 26, react-i18next 17, electron 42, vite-plugin-electron 1.0, tailwindcss 4, jsdom 29
- Bump GitHub Actions: checkout v7, setup-node v6, upload-artifact v7, action-gh-release v3, codeql-action v4

## [0.7.0] - 2026-06-20

### Added
- Drop player from running tournament
- Dropped players keep their rank in standings but are excluded from future rounds
- Multiple byes per round when pairing constraints require it
- Visual indicators for dropped players (strikethrough, drop round label)
- Active/total player count display during tournament

## [0.6.0] - 2026-06-19

### Added
- JSON export/import with schema validation
- Native Electron file dialogs with browser fallback
- Export/Import buttons in sidebar

## [0.5.0] - 2026-06-19

### Added
- Independent countdown timer per tournament
- Drift-free timer using endTimestamp approach
- Compact timer display on dashboard cards
- Full timer controls (start/pause/reset) in tournament view
- Visual color changes at 5min, 1min, and expired

## [0.4.0] - 2026-06-19

### Added
- Tournament detail view with tabbed interface
- Player management (add/remove during registration)
- Round generation with Swiss pairing
- Match result entry with one-click buttons
- Standings table with all tiebreaker columns
- Round history with accordion display

## [0.3.0] - 2026-06-19

### Added
- State management with React Context + useReducer
- Dashboard with tournament cards
- Create tournament dialog (name, game, round time)
- Sidebar navigation with tournament list
- Reusable UI components (Button, Card, Dialog, Input, Select, Badge)
- i18n setup with German and English translations

## [0.2.0] - 2026-06-19

### Added
- Swiss pairing algorithm with backtracking for rematch avoidance
- Standings calculator with Buchholz, Median-Buchholz, Sonneborn-Berger tiebreakers
- Scoring module (3-1-0 point system)
- 31 unit tests for all engine modules

## [0.1.0] - 2026-06-19

### Added
- Project scaffold with Vite + React + TypeScript + Electron
- TailwindCSS styling setup
- Basic app shell layout with sidebar navigation
- i18n support (German and English) with i18next
- Electron main process with IPC for file operations
- TypeScript type definitions for Tournament, Player, Round, Match, Standing
- Game configuration for Yu-Gi-Oh!, Pokémon TCG, Star Wars: Unlimited, Riftbound
