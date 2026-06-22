# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
