# Code Review TODO

Findings from the full code review (2026-07-01). Grouped by severity. Check off as fixed.

## 🔴 High

- [x] **H1b — Inline decklists still broadcast regardless of visibility.**
  Fixed with the token approach: `sanitizeTournament` now strips `decklist`;
  `/api/register` issues a per-session token (`electron/server/sessions.ts`),
  the own-deck pre-fill uses the token-gated `GET /api/my-decklist`, and
  `POST /api/players/:id/decklist` and `/api/players/:id/drop` require a token
  matching the target player.
  Re-claiming an existing name while registration is open issues a fresh token
  without creating a duplicate player (covers desk-registered players and
  cleared phone storage). Known limit: identity is name-based, so during the
  registration phase someone who knows a player's name could claim a token for
  it; after registration closes no new tokens are issued.

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

- [x] **L1 — Electron hardening:** `web-contents-created` now denies window.open and
  blocks navigation off the app's own origin for every window (main + QR popups);
  a CSP meta tag is injected into `index.html` on production builds
  (`connect-src` allows Discord webhooks; dev/HMR unaffected).
- [x] **L2 — Swiss edge case:** if every odd player has already had a bye, the
  lowest-ranked player now receives an unavoidable second bye instead of being
  left without a match; `byesForUnpaired` no longer skips `hasBye` players either.
- [x] **L3 — `httpsGet` now rejects `statusCode >= 400`** with a typed
  `HttpStatusError`; the Scryfall 429 retry logic handles the error path too.
- [x] **L4 — CORS headers removed entirely** (the mobile page is same-origin) and a
  Host-header guard rejects DNS-name hosts (DNS-rebinding protection: legitimate
  clients always address the server by IP literal or localhost).
- [x] **L5 — Test gaps:** added tests for `serialization`/`migration`, `router.ts`
  (host guard, state scoping, register/token flow, decklist/drop gating, report),
  `sessions`, `sanitizeTournament`, and an L2 regression test. Reducer core cases
  were already covered. Still untested: `banlistHandlers` (needs HTTP mocking).
- [x] **L6 — Lint warning:** context + hook moved to `src/state/useTournamentContext.ts`;
  `TournamentContext.tsx` now only exports the provider component.

## Suggested order

1. H1 (privacy leak) — most user impact.
2. H2 (wrong Discord pairings).
3. H3 + M1 (server robustness, same area).
4. M2 / M5 (reducer cleanup + Elo guard together) and M6.
5. Low / polish as capacity allows.
</content>
