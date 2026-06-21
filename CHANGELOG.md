# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
