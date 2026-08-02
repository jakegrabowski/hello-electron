# Architecture

This is the reference for how Electron works and how this project uses it.
`AGENTS.md` is the brief; this is the textbook.

## 1. What Electron actually is

Electron bundles **Chromium** (the rendering engine — a browser) and
**Node.js** (the server-side JS runtime) into one distributable app binary.
You write a UI in web technologies, drive native OS features from Node, and
ship a single `.exe` / `.app` / AppImage that users run like any native app.

Because Chromium + Node are bundled, every Electron app is roughly
**80–150 MB**. That's the trade-off for using web tech on the desktop.

## 2. The three-process model

### Main process
- Entry: `src/main/main.ts`.
- Exactly **one** per app. The orchestrator.
- Owns: app lifecycle (`app.whenReady`, `window-all-closed`, `before-quit`),
  creating `BrowserWindow`s, menu/tray, native dialogs, and anything needing
  Node/OS access (fs, child_process, native modules).
- Full Node.js access. **No** DOM.

### Renderer process
- Entry: `src/renderer/index.html` loading `renderer.ts`.
- One per window. This is "the browser".
- Renders HTML/CSS/JS like a web page. Any frontend framework works.
- **No** direct Node access (`nodeIntegration: false`). To reach the OS it
  asks the main process through the preload bridge.

### Preload script
- Entry: `src/preload/preload.ts`.
- Runs in the renderer process *before* the page's own scripts load, in an
  isolated JavaScript world (because `contextIsolation: true`).
- Has limited Node access (enough to use `ipcRenderer`).
- Its **only** job: define a narrow, safe API and expose it to the page with
  `contextBridge.exposeInMainWorld('app', { ... })`. The page then calls
  `window.app.doThing()` instead of touching Node directly.

## 3. IPC (inter-process communication)

Two shapes:

| Shape          | Main side           | Renderer/preload side | Use when                  |
| -------------- | ------------------- | --------------------- | ------------------------- |
| Request/reply  | `ipcMain.handle`    | `ipcRenderer.invoke`  | You need a return value   |
| Fire events    | `webContents.send`  | `ipcRenderer.on`      | Main pushes updates to UI |

Channel names are string constants — keep them in one place
(`src/shared/ipc-channels.ts`) so main and renderer can't drift apart.

Always validate the payload at the `ipcMain.handle` boundary — the renderer is
untrusted web content.

## 4. Security model (defaults we never weaken)

| Flag               | Value   | Why                                             |
| ------------------ | ------- | ----------------------------------------------- |
| `contextIsolation` | `true`  | Keeps preload JS separate from page JS          |
| `nodeIntegration`  | `false` | Pages must not touch Node directly              |
| `sandbox`          | `true`  | Limits what the renderer can do at the OS level |
| `webSecurity`      | `true`  | Enforces same-origin / CSP                      |

Prefer loading local files (`loadFile`) over remote URLs. If you must load
remote content, use HTTPS and set a Content-Security-Policy. The
[Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
is the source of truth.

## 5. Packaging for three platforms

Electron Forge's `make` command runs **makers** that produce per-OS artifacts:

| OS      | Maker(s)                                                | Output                  |
| ------- | ------------------------------------------------------- | ----------------------- |
| Windows | `@electron-forge/maker-squirrel` (+ optional `maker-msi`)| `.exe` (Squirrel) / `.msi` |
| macOS   | `@electron-forge/maker-zip`, `maker-dmg`                | `.zip` / `.dmg`         |
| Linux   | `maker-deb`, `maker-rpm`, `maker-flatpak`, `maker-snap` | `.deb` / `.rpm` / etc.  |

### Cross-compilation reality
- You generally **cannot** reliably build a macOS `.dmg` on Windows, or a
  Windows `.exe` on macOS, from one machine.
- The standard fix is a **CI build matrix** (GitHub Actions runners:
  `windows-latest`, `macos-latest`, `ubuntu-latest`) — each runner builds its
  own platform. See `docs/plan.md` M4.
- `forge make --platform=<win32|darwin|linux>` can target other platforms for
  unpacked/archive outputs, but native installers are best built on their
  native OS. (CI matrix is now M5 — see `docs/plan.md`.)

### Code signing & notarization
Required for real distribution (macOS Gatekeeper, Windows SmartScreen). Set up
later via Forge signing config with certificates. Out of scope for hello-world.

## 6. Auto-update (later)
Squirrel (Win) and `autoUpdater` (mac) handle updates once a feed is
configured. Not in scope for the foundation.

## 7. WSL2 integration (Windows-only feature module)

Hello Electron's headline capability on Windows is **accessing the WSL2
environment** the way VS Code's Remote-WSL does. This is **Windows-only**:
macOS has no WSL, and a Linux build running *inside* WSL2 already has native
access and needs no bridge. All WSL code is behind a
`process.platform === 'win32'` guard (ADR-010).

### Architecture: Windows UI + helper server in WSL2 (ADR-011)

Two processes, communicating over loopback:

```
┌─────────────────────┐     wsl.exe (spawn)      ┌──────────────────────┐
│  Electron (Windows) │ ───────────────────────► │  Helper server       │
│  main process       │     localhost:PORT       │  (Node, inside WSL2) │
│  = the UI client    │ ◄─────────────────────── │  fs / child_process  │
└─────────────────────┘     JSON-RPC replies     └──────────────────────┘
```

1. The **Windows Electron main process** spawns the helper:
   `wsl.exe -d <distro> -e node <server.js>`.
2. The **helper server** (Node, in WSL2) binds to `127.0.0.1:<port>` and
   serves RPCs (file ops, command exec, …).
3. They talk over **localhost**. Microsoft's WSL networking doc confirms a
   Windows app reaches a server running inside WSL2 at `localhost` by default
   (NAT localhost forwarding); mirrored mode makes it bidirectional.
   Source: <https://learn.microsoft.com/en-us/windows/wsl/networking>

### Security
- Helper binds to **`127.0.0.1` only** — never `0.0.0.0` (that exposes it to
  the LAN).
- Treat the loopback channel as semi-trusted: validate every RPC payload.
- The server runs with the WSL user's permissions — expose only the RPCs you
  need.

### Lifecycle
- Client spawns the server on demand and tracks the child PID.
- On `before-quit`, the client terminates the server (or the server exits when
  stdio closes).
- Server binds an **ephemeral port** and prints it to stdio on startup so the
  client can connect without port clashes.

### Where the code lives
- `src/wsl-server/` — the helper server (own build target, Node/Linux).
- `src/main/wsl/` — Windows-only client code (spawn, connect, RPC client).
- `src/shared/rpc/` — the RPC protocol/types shared by client and server.

## 8. Further reading
- Electron docs: <https://www.electronjs.org/docs/latest>
- Forge docs: <https://www.electronjs.org/docs/latest/tutorial/forge>
- Context isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- WSL networking: <https://learn.microsoft.com/en-us/windows/wsl/networking>
