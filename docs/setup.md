# Setup / Getting Started

How to get **Hello Electron** running on a fresh dev machine. Target dev host:
WSL2 (Ubuntu 24.04) with WSLg. macOS and native Windows also work.

## 1. System requirements

- **Node.js** — developed on Node 24; any current LTS works.
- **npm** — ships with Node.
- **Linux/WSL2**: Ubuntu 24.04 (or another Debian/Ubuntu).
- **macOS / Windows (native)**: no extra system packages needed.

## 2. Install OS libraries (Linux / WSL2 only)

This is the step most people miss. Electron bundles Chromium, which
**dynamically links** against a few system libraries that a minimal Ubuntu
image does not pre-install. Without them `npm start` fails with:

```
error while loading shared libraries: libnspr4.so: cannot open shared object file
```

Install them once:

```bash
sudo apt-get install -y libnss3 libnspr4 libasound2t64
```

| Package          | Why it's needed                                  |
| ---------------- | ------------------------------------------------ |
| `libnss3`        | Chromium's TLS / certificate stack (NSS)         |
| `libnspr4`       | NSPR — the runtime NSS depends on                |
| `libasound2t64`  | ALSA audio (Chromium links it even if unused)    |

> **On a more minimal image** (e.g. a stripped server or CI runner without a
> desktop layer), the other Chromium deps may also be missing. Install the
> full set:
> ```bash
> sudo apt-get install -y \
>   libnss3 libnspr4 libasound2t64 \
>   libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
>   libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
>   libgbm1 libpango-1.0-0 libcairo2 libatspi2.0-0t64
> ```
> (The `t64` suffix is Ubuntu 24.04's 64-bit-time-transition rename.)

## 3. Install project dependencies

```bash
npm install
```

## 4. Run in development

```bash
npm start
```

Opens the Hello Electron window. On Linux/WSL2 the window appears via WSLg.
DevTools opens automatically while running unpackaged.

## 5. Verify

```bash
npm run typecheck   # tsc --noEmit — the hard gate, always green
```

(Lint and tests arrive at M2: `npm run lint`, `npm test`.)

## 6. Package / build installers

```bash
npm run package     # bundle the app into out/ (no installers)
npm run make        # build native installers for the current OS
```

See `docs/architecture.md` §5 for which installer each OS produces and which
hosts can build which artifacts.

## Notes

- **TypeScript** is pinned to 7.x — not the Forge template's `~4.5.4`, which
  can't parse modern `@types/node`. See ADR-012.
- Under **WSLg**, Chromium prints a cosmetic
  `ContextResult::kFatalFailure: WebGL1 blocklisted` warning. Ignore it unless
  the app needs WebGL.
- Testing the **Windows build's WSL bridge** (M4) means running the app as a
  Windows process — see `docs/architecture.md` §7.
