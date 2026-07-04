---
name: verify
description: Build and drive the Electron app end-to-end with playwright-core to verify changes at the real surface (window, userData files, LAN server).
---

# Verify: TCG Tournament Organizer (Electron)

## Build & prerequisites

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"   # Bash tool defaults to system Node 18
npm run build                                                # renderer → dist/, main+preload → dist-electron/
ls node_modules/electron/dist/electron || (cd node_modules/electron && node install.js)  # binary is not downloaded by default
npm ls playwright-core || npm i --no-save playwright-core    # driver; --no-save keeps package.json clean
```

## Drive the app

Launch the production build with playwright-core's `_electron`, isolated from the
user's real data via `XDG_CONFIG_HOME` (userData then lands in `$XDG/Electron` —
the dev launch has no productName, so the dir is literally named `Electron`):

```js
const { _electron } = require('<repo>/node_modules/playwright-core')
const app = await _electron.launch({
  executablePath: '<repo>/node_modules/electron/dist/electron',
  args: ['<repo>/dist-electron/main.js', '--no-sandbox'],
  env: { ...process.env, XDG_CONFIG_HOME: tmpdir, DISPLAY: process.env.DISPLAY || ':0' },
})
const page = await app.firstWindow()
```

No xvfb on this machine — windows open on the user's display `:0`. Keep sessions short.

## Gotchas

- UI language defaults to **German** — use German labels in selectors
  (`Neues Turnier`, `Turnier erstellen`, `Turniername`, …); labels live in `src/i18n/de.json`.
- State persists with a **500 ms debounce** (localStorage + `state:sync` IPC → `state.json`
  in userData). Sleep ≥1.5 s after a mutation before asserting on files.
- Storage layout in userData: `state.json` (atomic tmp+rename), `backups/state-<iso>.json`
  (10-min rotation, max 10, empty states are never backed up), `state.json.corrupt`
  (bad/undecryptable originals are always moved aside, never overwritten).
- Files are **safeStorage-encrypted** (`TCGSAFE1:` + base64) when the OS keychain is
  available — check via `page.evaluate(() => window.electronAPI.getEncryptionStatus())`;
  assert on the raw file only through that flag. Legacy plaintext files stay readable.
  localStorage holds NO state copy in Electron anymore (migration source only).
- Recovery on corrupt/missing `state.json`: legacy localStorage (transition only),
  then newest valid disk backup (shows amber notice in the sidebar).
- Useful flows: create tournament (Dashboard → `Neues Turnier`), Backups dialog
  (sidebar → `Backups`), restore (entry → `Wiederherstellen` → confirm, also `Wiederherstellen`).

## LAN server & mobile page

- Start the server in the app: tournament view → tab `Mobile` → `Server starten`;
  the URL appears in the panel's `.font-mono` element. Then drive the HTTP API
  directly with `fetch` (Node 22 global) — POSTs are rate-limited to 30/min/IP (429).
- To drive the **mobile page** as a "phone", launch a second Electron instance
  with a 3-line main that just does `new BrowserWindow().loadURL(process.env.MOBILE_URL)`,
  its own fresh `XDG_CONFIG_HOME` (own localStorage), then use Playwright on its
  first window. Mobile UI is plain JS with element ids (`#rf`, `#rl`, `#rm`, …),
  German by default.
- `page.evaluate(() => window.electronAPI.<method>(...))` works in the TO app —
  contextBridge exposes to the main world; handy to call IPC (e.g. `getPlayerToken`).

Complete driver scripts lived in the 2026-07-04 session scratchpad:
`drive-storage.cjs` (create/corrupt/recover/restore), `drive-lanserver.cjs`
(rate limit + QR claim tokens + phone simulation), `drive-safestorage.cjs`
(encryption at rest, legacy-localStorage migration, PII leak check) —
pattern: launch → act → `app.close()` → mutate files/HTTP from outside →
relaunch → assert UI + files.
