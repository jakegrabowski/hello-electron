# Tech stack reference

Companion to `AGENTS.md`. Lists what we use, why, and the alternatives we
considered.

## Runtime: Electron
Bundles Chromium + Node.js into a desktop binary. Pros: web tech on desktop,
huge ecosystem, full OS access via Node. Cons: ~100 MB binaries, higher RAM
than native. Chosen because the requirement is cross-platform from one
codebase with a web-style UI.

### Alternatives considered
- **Tauri**: Rust core + the OS's system webview. Much smaller binaries, but a
  Rust backend and per-platform webview rendering differences. Ruled out — the
  requirement is Electron specifically.
- **NW.js**: similar to Electron, smaller community.
- **Native (Qt / Flutter / .NET MAUI)**: different languages, heavier
  per-platform work.

## Language: TypeScript
Electron runs JavaScript (Chromium renders JS, Node runs JS). **TypeScript
compiles to JavaScript**, so it runs everywhere Electron does — main, preload,
and renderer. We use `strict` mode.

### What languages *can* you use with Electron?
- **Natively:** JavaScript (it's a JS runtime).
- **Via compilation to JS:** TypeScript (our choice), plus anything else with
  a JS target — Dart, ReasonML/ReScript, Elm, CoffeeScript, PureScript.
- **In the renderer:** any frontend framework — React, Vue, Svelte, Solid,
  Lit, or plain DOM. The renderer *is* a Chromium browser.
- **WebAssembly:** Rust, C++, C#, Go, AssemblyScript → `.wasm`, loadable in
  the renderer for CPU-heavy work.
- **Native modules:** C/C++/Rust via Node N-API, for main-process work that
  must call into the OS. We avoid these unless necessary — they complicate
  cross-platform builds.

Bottom line: the whole stack is the **JavaScript / TypeScript ecosystem**,
plus whatever frontend framework we pick later.

## Bundler / dev server: Vite (via @electron-forge/plugin-vite)
Fast HMR, ESM-native, first-class TS. Forge's plugin wires up separate Vite
configs for main, preload, and renderer.

## Packaging: Electron Forge
`npm run package` (bundled app, no installer) and `npm run make` (native
installers). Makers per OS are listed in `docs/architecture.md` §5.

## Package manager: npm
See ADR-004. Universal; matches what Forge's docs assume.

## Tooling added later (tracked in `docs/plan.md`)
- ESLint + Prettier (M2)
- Vitest (M2)
- GitHub Actions build matrix (M4)
- Code signing + auto-update (post-foundation)
