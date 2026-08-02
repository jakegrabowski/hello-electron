# AGENTS.md — North Star for this project

You are the lead engineer for **electron-hello**, a cross-platform desktop
application built with Electron and TypeScript, targeting **Windows, macOS,
and Linux** from a single codebase. Treat every decision through that lens:
one codebase, three operating systems, zero platform-specific surprises for
the user.

This file is the canonical brief. The files in `docs/` are the reference
material. When they disagree, **this file wins**; update the doc that's wrong.

## Mission

Build **Hello Electron**, a small, correct, secure cross-platform desktop app
that:

- runs identically on Windows, macOS, and Linux,
- is written in TypeScript end to end (main, preload, renderer),
- packages into native installers per OS (Windows `.exe`, macOS `.app`/`.zip`,
  Linux `.deb`),
- is a clean foundation the real product will be built on.

Hello Electron is itself the product for now — a hello-world that proves the
toolchain end to end.

## Per-OS packaging targets (locked in — see `docs/decisions.md`)

| OS      | Target                    | Maker                              | Build host       |
| ------- | ------------------------- | ---------------------------------- | ---------------- |
| Windows | `.exe` (Squirrel)         | `@electron-forge/maker-squirrel`   | Windows          |
| macOS   | `.app` / `.zip` (unsigned)| `@electron-forge/maker-zip`        | Any host         |
| Linux   | `.deb`                    | `@electron-forge/maker-deb`        | Any host         |

macOS `.dmg` + code signing are **deferred** (post-foundation): they require
macOS (`hdiutil`) + Apple certs. Today we ship an unsigned `.app`/`.zip`;
signing/notarization happens later via a `macos-latest` CI runner (ADR-007).

## WSL2 integration (Windows-only headline feature — ADR-010/011)

On Windows, Hello Electron accesses the **WSL2 environment** the way VS Code's
Remote-WSL does: the Electron main process spawns a Node **helper server
inside WSL2** via `wsl.exe`, and talks to it over **localhost loopback**
(JSON-RPC). Microsoft's WSL networking doc confirms a Windows app reaches a
WSL2 server at `localhost` by default. This is **Windows-only** — macOS has
no WSL and a Linux build inside WSL2 needs no bridge — so all WSL code is
behind a `process.platform === 'win32'` guard. Full design:
`docs/architecture.md` §7.

## Tech stack (decisions live in `docs/decisions.md`)

| Concern      | Choice                                              |
| ------------ | --------------------------------------------------- |
| Runtime      | Electron (Chromium + Node.js)                       |
| Language     | TypeScript (`strict: true`)                         |
| Bundler/dev  | Vite, via `@electron-forge/plugin-vite`             |
| Packaging    | Electron Forge (`forge make`)                       |
| Package mgr  | npm (switch repo-wide if you ever change it)        |
| Lint/format  | ESLint + Prettier (added at M2)                     |
| Tests        | Vitest (added at M2)                                |

**Languages Electron supports:** Electron is a JavaScript runtime (Node.js on
the backend, Chromium on the frontend). Anything that compiles to JavaScript
works — TypeScript is the practical choice. The renderer is a browser, so any
frontend framework (React, Vue, Svelte) or plain DOM is available. Native code
(Rust/C++) is possible via N-API, but we avoid it unless required. Full
breakdown: `docs/tech-stack.md`.

## Target repository layout

```
electron-hello/
├─ src/
│  ├─ main/          # Main process (Node side): window lifecycle, app events
│  │  ├─ main.ts
│  │  └─ wsl/        # Windows-only WSL client (spawn server, RPC) — guarded
│  ├─ preload/       # Preload: the ONLY bridge between main and renderer
│  │  └─ preload.ts
│  ├─ renderer/      # Renderer (browser side): UI
│  │  ├─ index.html
│  │  ├─ renderer.ts
│  │  └─ styles.css
│  ├─ shared/        # Imported everywhere (IPC channels, RPC types/protocol)
│  └─ wsl-server/    # Helper server that runs INSIDE WSL2 (separate Node build)
│     └─ index.ts
├─ forge.config.ts   # Electron Forge config (packaging targets per OS)
├─ tsconfig.json
├─ vite.*.config.ts  # main / preload / renderer / wsl-server Vite configs
├─ package.json
├─ AGENTS.md
└─ docs/
```

## Non-negotiable rules

**Security (Electron defaults — never weaken):**

- `contextIsolation: true` — always.
- `nodeIntegration: false` — always.
- `sandbox: true` for the renderer unless a preload genuinely needs otherwise.
- Expose main-process capabilities to the renderer **only** through a
  `contextBridge` API defined in a preload script. Never put Node APIs in the
  page.
- Validate every IPC payload at the receiving end.

**Cross-platform correctness:**

- Use `path.join()` / `path.sep`. Never hardcode `\` or `/`.
- Use `app.getPath('userData' | 'documents' | 'desktop')` for writable
  locations. Never assume a home-directory layout.
- Guard platform-specific code with `process.platform`
  (`'win32' | 'darwin' | 'linux'`) and keep those branches small and isolated.
- WSL2 code is **Windows-only**. Never import `src/main/wsl/*` or
  `src/wsl-server/*` from code that runs on macOS/Linux. Gate entry points
  behind `process.platform === 'win32'`.
- Assume POSIX rules for line endings, permissions, and case-sensitivity.
  Filenames are lowercase-kebab-case.

**Code:**

- TypeScript `strict: true`. No `any` without a justifying comment.
- No commented-out code. No dead code. No comments unless asked.
- Prefer small, named functions over clever one-liners.
- Mimic existing conventions in the file you're editing.

## Process model (quick ref — full version in `docs/architecture.md`)

- **Main process** (`src/main`): Node.js. Owns app lifecycle, creates
  `BrowserWindow`s, talks to the OS. One per app.
- **Renderer process** (`src/renderer`): Chromium. Renders the UI. One per
  window. Has **no** Node access.
- **Preload** (`src/preload`): runs in the renderer with limited Node access
  *before* the page loads. Its sole job is to expose a safe, minimal API via
  `contextBridge.exposeInMainWorld`.
- **IPC**: `ipcMain.handle` / `ipcRenderer.invoke` (request/response) and
  `webContents.send` / `ipcRenderer.on` (events). Channel names are constants
  in `src/shared/`.

## Commands

```bash
npm install            # install deps
npm start              # run the app in dev (forge + vite)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format         # Prettier (write)
npm test               # Vitest
npm run package        # bundle the app, no installers
npm run make           # build native installers for the current OS
```

The **verify-before-done** triple for any code change:
`npm run typecheck && npm run lint && npm test`
(all three must pass; typecheck is never skipped).

## Dev environment (Linux / WSL2 host)

Development happens inside WSL2 (Ubuntu 24.04) with WSLg providing the display.
Full step-by-step setup (including the required system libraries):
`docs/setup.md`.

- **OS libs required to run the Linux Electron build** (absent from a fresh
  Ubuntu image): `sudo apt-get install -y libnss3 libnspr4 libasound2t64`.
  Without them `npm start` fails with
  `error while loading shared libraries: libnspr4.so`.
- **WebGL is blocklisted under WSLg** — Chromium prints a non-fatal
  `ContextResult::kFatalFailure: WebGL1 blocklisted` warning. Cosmetic; ignore
  unless the app needs WebGL.
- **TypeScript** is pinned to 5.x (5.9.3) — not the Forge template's `~4.5.4`
  (which can't parse modern `@types/node`), nor 7.x (the ESLint ecosystem
  doesn't support it yet). See ADR-013.
- Testing the Windows build's WSL bridge (M4) requires running the app as a
  Windows process — see `docs/architecture.md` §7.

## How to work

1. Read the relevant `docs/` file before touching unfamiliar territory.
2. For anything beyond a single edit, make a todo list and work it in order.
3. Implement against `docs/plan.md`; update the plan when reality diverges.
4. When you finish a task: run the verify triple, fix what breaks, then stop.
   Don't add features that weren't asked for.
5. Record any decision that changes the stack in `docs/decisions.md` as a new
   ADR. Don't silently overturn a prior decision.
6. Never commit unless the user asks. Never commit secrets. Commit messages
   are short and imperative.

## What "done" means for the foundation (M0–M1)

- `npm install` and `npm start` open a window showing "Hello, Electron!".
- `npm run typecheck` passes with zero errors.
- A single IPC round-trip works (renderer → preload → main → back).
- `npm run package` produces a runnable app on the host OS.
- `docs/plan.md` is current.

The **headline feature** — the WSL2 bridge (Windows UI + helper server in
WSL2 over loopback) — is built at M4 and tracked in `docs/plan.md`. Everything
else is future work in the plan.
