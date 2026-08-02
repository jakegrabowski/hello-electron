# Decisions (Architecture Decision Records)

Status legend: **Proposed · Accepted · Superseded · Deprecated**.
When a decision here is overturned, add a new ADR that supersedes it — don't
edit the old one silently.

## ADR-001 — Use Electron Forge + Vite for tooling (Accepted)
**Context.** We need dev server + bundling + cross-platform packaging.
Options: electron-forge (official), electron-builder, electron-vite
(community).
**Decision.** Electron Forge with the Vite plugin. Forge is Electron's
officially recommended toolchain, ships makers for all three target OSes, and
its Vite plugin gives fast HMR and first-class TypeScript.
**Consequences.** One tool covers dev + package + make. Config lives in
`forge.config.ts`. We follow Forge's makers model for per-OS output.

## ADR-002 — TypeScript, strict, end to end (Accepted)
**Context.** Electron runs JS; we want type safety.
**Decision.** TypeScript with `strict: true` for main, preload, and renderer.
**Consequences.** `tsc --noEmit` runs in CI (`npm run typecheck`). Vite handles
transpilation; type checking is a separate, required step.

## ADR-003 — Security: contextBridge + isolation (Accepted)
**Context.** Renderer is untrusted web content.
**Decision.** `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`. All main-process access goes through a `contextBridge` API
defined in the preload.
**Consequences.** No `require()` in the renderer. Every capability is an
explicit IPC channel. See `docs/architecture.md` §3–4.

## ADR-004 — Package manager: npm (Accepted)
**Context.** Need one manager so lockfiles and docs stay consistent.
**Decision.** npm — universal and what Forge's docs assume.
**Consequences.** `package-lock.json`. Switching to pnpm/yarn later is allowed
but must be done repo-wide and recorded as a superseding ADR.

## ADR-005 — Frontend: plain DOM + TypeScript (Accepted)
**Context.** Hello Electron is a hello-world; the real app's UI complexity is
unknown.
**Decision.** Plain DOM + TypeScript in the renderer. No framework yet.
**Consequences.** Zero runtime deps in the renderer; fastest start. Revisit
(add a superseding ADR) if/when the real app needs a framework.

## ADR-006 — Windows installer: Squirrel `.exe` (Accepted)
**Context.** Forge offers Squirrel (`.exe`) and MSI (`.msi`, WiX).
**Decision.** Squirrel `.exe` via `@electron-forge/maker-squirrel`.
**Consequences.** Auto-update capable later. MSI deferred unless enterprise
distribution is needed. Must be built on a Windows host (or `windows-latest`
CI runner).

## ADR-007 — macOS: unsigned `.app`/`.zip` now; `.dmg` + signing deferred (Accepted)
**Context.** A signed `.dmg` requires macOS (`hdiutil`) + an Apple Developer ID
cert. We have no Mac and no cert yet.
**Decision.** Ship an **unsigned** `.app`/`.zip` via `@electron-forge/maker-zip`,
buildable on any host. Gatekeeper will warn — acceptable for hello-world.
Produce the `.dmg` and signing/notarization later (M4, on a `macos-latest` CI
runner with a cert).
**Consequences.** Users must bypass Gatekeeper to run the macOS build today.
A real release later needs the cert + CI Mac.

## ADR-008 — Linux installer: `.deb` (Accepted)
**Context.** Forge offers `.deb`, `.rpm`, flatpak, snap.
**Decision.** `.deb` via `@electron-forge/maker-deb` (buildable on any host).
**Consequences.** Covers Debian/Ubuntu (the majority). `.rpm` / flatpak / snap
added later only if needed.

## ADR-009 — Dependency policy: official, else popular + well-documented (Accepted)
**Context.** Choosing libraries for a foundation that must be safe to build on.
**Decision.** Prefer **official** packages (from the platform / Electron team).
If none exists, allow a third-party package only if it is **popular, actively
maintained, and well-documented**. Record the rationale in an ADR whenever a
non-official package is adopted.
**Consequences.** Electron Forge (official), the Forge Vite plugin (official),
and Vite (popular + documented) all qualify.

## ADR-010 — WSL2 integration is a Windows-only feature module (Accepted)
**Context.** The app's headline feature is accessing the WSL2 filesystem /
environment, VS Code Remote-WSL style. macOS has no WSL; a Linux build running
inside WSL2 already has native access and needs no bridge.
**Decision.** WSL2 integration ships **only in the Windows build**, guarded by
`process.platform === 'win32'`. The cross-platform core stays generic.
**Consequences.** macOS/Linux builds are feature-lighter. WSL code is isolated
under a platform guard so it can't break other OS builds.

## ADR-011 — WSL architecture: Windows UI + helper server over loopback (Accepted)
**Context.** Need a way for the Windows Electron app to reach the WSL2
environment. Options: (a) UNC `\\wsl.localhost` file reads, (b) `wsl.exe`
per-command, (c) long-running helper server in WSL2 (the VS Code pattern).
**Decision.** Option (c): the Windows main process spawns a Node helper server
inside WSL2 via `wsl.exe`; the helper binds to `127.0.0.1` and the client
connects over localhost loopback (JSON-RPC over TCP/WebSocket). Confirmed
feasible by Microsoft's WSL networking doc — a Windows app reaches a WSL2
server at `localhost` by default.
**Consequences.** Adds a separate build target (`src/wsl-server/`), an RPC
protocol in `src/shared/`, and lifecycle management (spawn / health-check /
shutdown). More moving parts, but the proven, scalable pattern. Transport
details (e.g. `ws` vs raw TCP, JSON-RPC library) are decided when M4 is built.

## ADR-012 — TypeScript 7.x + modern strict tsconfig (overrides Forge template) (Superseded by ADR-013)
**Context.** The official `@electron-forge/template-vite-typescript` pins
TypeScript `~4.5.4`. That version cannot parse modern `@types/node` (syntax
errors TS1005/TS1109 in `node_modules`), and TS 7 later removed the template's
`baseUrl` and `moduleResolution: "node"` options.
**Decision.** Pin TypeScript `^7.0.2` and use a modern strict tsconfig:
`"moduleResolution": "bundler"`, `"strict": true`, `"lib": ["ESNext",
"DOM", "DOM.Iterable"]`, `"types": ["node"]`, no `baseUrl`. Add `vite/client`
types via `src/vite-env.d.ts` so `.css` imports typecheck.
**Consequences.** `npm run typecheck` is clean. ESLint/@typescript-eslint will
be added at M2 at versions that support TS 7. Keep the TS version current.

## ADR-013 — TypeScript 5.9.3 (supersedes ADR-012's TS 7.x) (Accepted)
**Context.** ADR-012 pinned TypeScript `^7.0.2`. But `typescript-eslint` (the
standard ESLint integration, added at M2) peer-requires
`typescript >=4.8.4 <6.1.0` — TS 7 is not yet supported by the ESLint
ecosystem, which made `npm install` fail with an unrecoverable `ERESOLVE`.
**Decision.** Pin TypeScript `^5.9.3` (latest 5.x) instead of 7.x. TS 5.9.3
still solves the original problem in ADR-012 (it parses modern `@types/node`;
only the template's `~4.5.4` couldn't) and supports the same strict modern
tsconfig (`moduleResolution: "bundler"`, `strict: true`). The rest of ADR-012
(the tsconfig shape, `vite/client` types) is unchanged.
**Consequences.** `npm install` resolves cleanly without `--legacy-peer-deps`,
and ESLint/typescript-eslint works. Revisit once the ESLint ecosystem supports
TS 7+.
