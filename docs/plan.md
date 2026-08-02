# Plan / Roadmap

Living document. Update it as work lands. Each milestone has explicit
"done when" criteria.

Legend: ☐ not started · ▶ in progress · ☑ done.

## M0 — Foundation scaffold ☑
Set up the Electron Forge + Vite + TypeScript project skeleton.

Done when:
- ☑ `npm install` succeeds.
- ☑ `npm start` opens a window.
- ☑ `npm run typecheck` is configured and passes.
- ☑ Repository matches the layout in `AGENTS.md`.

Notes: TypeScript pinned to 7.x + a modern strict tsconfig (ADR-012). The
Linux/WSL2 dev host needs `libnss3 libnspr4 libasound2t64` installed (see
`AGENTS.md`). `src/wsl-server/` and `src/main/wsl/` arrive at M4.

## M1 — Hello Electron + readDir feature ☑
Prove the toolchain, the security model, and the cross-platform feature seam.

The demo feature: a "Read directory" button that lists the contents of the
user's home directory (files + folders) in the window.

Done when:
- ☑ Window shows "Hello, Electron!" from the renderer.
- ☑ A `contextBridge` API exists in `src/preload/preload.ts`.
- ☑ IPC round-trip works: button → `window.app.readDir()` → preload →
  `ipcMain.handle('fs:readDir')` → `fs.readdir(os.homedir())` → list rendered.
- ☑ Works on the host OS via local `fs` (the path macOS/Linux/pure-Windows
  use permanently; Windows+WSL2 swaps this handler for the WSL route at M4).
- ☑ `contextIsolation` / `nodeIntegration` / `sandbox` are set to the secure
  defaults and verified.

Notes: verified end-to-end on WSL2/Linux — the button lists `/home/<user>`.
The `DirListing` contract (`{ path, entries[] }`) is what M4's WSL handler will
also return, so the renderer stays unchanged when the source swaps.

## M2 — Quality gates
Add linting, formatting, tests.

Done when:
- ☐ ESLint + Prettier configured; `npm run lint` passes.
- ☐ Vitest configured; `npm test` passes with at least one meaningful test.
- ☐ The verify triple (`typecheck && lint && test`) is the gate for every
  change.

## M3 — Cross-platform packaging
Produce installers per ADR-006 / ADR-007 / ADR-008.

Done when:
- ☐ `forge.config.ts` declares makers: `maker-squirrel` (Win `.exe`),
  `maker-zip` (macOS `.app`/`.zip`, unsigned), `maker-deb` (Linux `.deb`).
- ☐ `npm run make` produces a runnable artifact for the host OS.
- ☐ Docs note which artifacts can be built on which host (Win installer needs
  Windows; macOS `.zip` + Linux `.deb` build on any host).

## M4 — WSL2 bridge (Windows-only headline feature)
VS Code-style: Windows Electron UI + helper server inside WSL2 over loopback.
See ADR-010 / ADR-011 and `docs/architecture.md` §7.

Done when:
- ☐ `src/wsl-server/` exists: a Node server that listens on `127.0.0.1`,
  answers one RPC (e.g. `listDir(path)` → entries), built as its own Vite
  target. Runs standalone inside WSL2.
- ☐ `src/main/wsl/` exists (Windows-only, `process.platform === 'win32'`
  guard): spawns the server via `wsl.exe`, connects over localhost, exposes an
  RPC client.
- ☐ End-to-end round-trip on Windows: renderer → preload → main → WSL server
  → back; UI lists the WSL `$HOME` directory.
- ☐ macOS/Linux builds still start and run (the WSL module is not imported).
- ☐ `npm run typecheck` clean; helper binds to `127.0.0.1` only.

## M5 — CI build matrix
Build all three platforms in CI.

Done when:
- ☐ GitHub Actions workflow with `windows-latest`, `macos-latest`,
  `ubuntu-latest`.
- ☐ Each runner uploads its native artifact (Win `.exe`, macOS `.zip`, Linux
  `.deb`).

## M6 — The real application (spec pending)
The product beyond hello-world. Until spec'd: no app-specific code lands.

## Backlog (decide later)
- macOS `.dmg` + code signing / notarization (ADR-007) — needs Mac CI + cert.
- Windows MSI (ADR-006) — only if enterprise distribution is needed.
- Linux `.rpm` / flatpak / snap (ADR-008).
- Frontend framework — if the real app's UI complexity justifies it (would
  supersede ADR-005).
- WSL bridge hardening: server packaging (bundle into app vs run from repo),
  auth on the loopback channel, file-watch/streaming, distro picker.
- Auto-update.
- Installer customization (icons, install dir).
- Telemetry / crash reporting.
