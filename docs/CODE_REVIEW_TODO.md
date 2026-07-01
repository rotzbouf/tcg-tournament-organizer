# Code Review TODO

Findings from the full code review (2026-07-01). Grouped by severity. Check off as fixed.

## 🔴 High

- [ ] **H1b — Inline decklists still broadcast regardless of visibility.**
  `sanitizeTournament` (`electron/server/sse.ts`) now strips `dateOfBirth`/`playerId`,
  but each player's `decklist` is still in the scoped state / `/api/tournament`, so a
  client can read hidden/`to_only` decklists from SSE, bypassing `decklistVisibility`.
  Not stripped yet because the mobile page pre-fills a player's *own* deck from state
  (`mobile.html:317`). *Fix needs a decision:* drop the pre-fill and strip decklists,
  or add a per-session token so only the owner sees their list.

- [x] **H1 — Full app state leaked to every LAN device.** (player DB + other
  tournaments + PII removed; see H1b for the remaining decklist case)
  `/api/state` (`electron/server/router.ts:70`) and the SSE broadcast
  (`electron/ipc/stateSync.ts:17`, `electron/server/sse.ts:29`) send the entire
  `getCurrentState()` — all tournaments **plus** the player database (Elo history,
  penalty history, dates of birth, player IDs). Any phone that scans the QR code
  receives the whole database in real time.
  *Fix:* serve only the bound tournament, filtered; never expose `playerDatabase`.

- [x] **H2 — Discord round-1 pairings don't match the real pairings.**
  `src/state/TournamentContext.tsx:35` runs `tournamentReducer(state, action)` a
  second time to build the Discord message, but the reducer is non-deterministic
  (`generateFirstRoundPairings` shuffles randomly — `src/engine/swiss.ts:252`), so
  the posted pairings differ from what is stored.
  *Fix:* derive side effects from the actual new state (e.g. a `useEffect` reacting
  to state), not by re-running the reducer.

- [x] **H3 — No request-body size limit on the LAN server (DoS).**
  `readBody` (`electron/server/router.ts:190`) accumulates `data += chunk` with no
  cap; one large POST can exhaust main-process memory.
  *Fix:* cap body size (~1 MB) and abort on overflow.

## 🟡 Medium

- [x] **M1 — SSE clients are global, not per tournament.**
  `clients` in `electron/server/sse.ts:3` is a single Set. With multiple concurrent
  tournament servers: every client receives every tournament's broadcast; stopping
  one server (`closeAll()`) drops all SSE connections; `getClientCount()` is global.
  *Fix:* key clients by `tournamentId`.

- [x] **M2 — `COMPLETE_TOURNAMENT` has no re-entry guard (double Elo).**
  `UPDATE_ELO_RATINGS` guards on `status !== 'completed' || eloApplied`
  (`src/state/tournamentReducer.ts:683`); `COMPLETE_TOURNAMENT`
  (`tournamentReducer.ts:413`) does not, so a double dispatch applies Elo twice.
  *Fix:* add `if (tournament.status === 'completed') return state`.

- [x] **M3 — Elo/penalty DB matching is name-only.**
  Matching uses `name.toLowerCase()` (`tournamentReducer.ts:435`, `:596`, `:772`);
  `playerId` is ignored, so same-name players merge history.
  *Fix:* prefer `playerId` when present.

- [x] **M4 — `/api/matches/:id/result` bypasses TO confirmation.**
  `/report` (`router.ts:151`) goes through the confirmation queue, but
  `/api/matches/:id/result` (`router.ts:164`) dispatches `SUBMIT_MATCH_RESULT`
  directly — any LAN client can finalize any match.
  *Fix:* remove if legacy, otherwise gate it.

- [x] **M5 — ~60 lines of duplicated Elo/DB update logic.**
  `COMPLETE_TOURNAMENT` (`tournamentReducer.ts:413-476`) and `UPDATE_ELO_RATINGS`
  (`:681-739`) are near-identical and have already diverged (see M2).
  *Fix:* extract a shared helper.

- [x] **M6 — Migration logic diverges between load paths.**
  `src/lib/storage.ts` (localStorage) sets defaults for `ageDivisionsEnabled`,
  `archived`, `rounds[].phaseIndex`, and player fields; `migrateTournament` in
  `src/lib/serialization.ts` (file import) does not, so imported files can miss
  fields.
  *Fix:* share one migration function.

## 🟢 Low / polish

- [ ] **L1 — Electron hardening:** no `setWindowOpenHandler`/`will-navigate` guard and
  no CSP in `electron/main.ts` (context isolation / nodeIntegration are correct).
- [ ] **L2 — Swiss edge case:** if every odd player has already had a bye, `assignBye`
  returns `null` and one player is left with no match at all
  (`src/engine/swiss.ts:110-115`).
- [ ] **L3 — `httpsGet` ignores `statusCode >= 400`** (`electron/ipc/banlistHandlers.ts`);
  4xx/5xx HTML lands in `JSON.parse` with a cryptic error.
- [ ] **L4 — CORS `*` on mutating endpoints** (`router.ts:47`) — theoretical
  DNS-rebinding / CSRF.
- [ ] **L5 — Test gaps:** no tests for reducer core cases, `router.ts`,
  `banlistHandlers`, or `serialization`.
- [ ] **L6 — Lint warning:** `TournamentContext.tsx` exports non-components
  (react-refresh warning).

## Suggested order

1. H1 (privacy leak) — most user impact.
2. H2 (wrong Discord pairings).
3. H3 + M1 (server robustness, same area).
4. M2 / M5 (reducer cleanup + Elo guard together) and M6.
5. Low / polish as capacity allows.
</content>
