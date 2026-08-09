# Hello Electron

Hello Electron is a small cross-platform desktop application built with
Electron, TypeScript, Vite, and Electron Forge. It proves the development,
security, IPC, testing, and native packaging foundations that a larger desktop
product can build on.

The current demo opens a desktop window and lists the contents of the user's
home directory through a secure preload bridge.

## Project Status

This repository is an early foundation, not a production release.

| Platform | Current status                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux    | Development flow and `.deb` packaging verified on Ubuntu under WSL2.                                                                                 |
| macOS    | An unsigned `.app`/`.zip` build has been tested successfully. Signing and notarization are deferred.                                                 |
| Windows  | Runtime and installer behavior are not yet verified. The packaged WSL helper is incomplete and the WSL feature must not be treated as release-ready. |

Known defects and planned hardening work are recorded in the
[issue register](.opencode/context/issue-register.md). Work is handled one
approved issue at a time.

## Architecture

The application follows Electron's three-process security model:

- **Main process**: owns application lifecycle, native filesystem access, and
  operating-system integration.
- **Preload**: exposes a narrow `window.app` API through `contextBridge`.
- **Renderer**: displays the UI without direct Node.js access.

The renderer uses these Electron security settings:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`

On macOS and Linux, directory reads use the local filesystem. The intended
Windows architecture starts a helper server inside WSL2 through `wsl.exe` and
communicates with it over localhost JSON-RPC. That bridge is still under review
and is not complete in packaged Windows builds.

See [Architecture](docs/architecture.md) and
[Architecture Decisions](docs/decisions.md) for the full design.

## Requirements

- A current Node.js LTS release and npm
- Platform-specific build tools for native installers
- Linux/WSL2 runtime libraries described in [Setup](docs/setup.md)

On Ubuntu 24.04, the Electron runtime dependencies used by this project are:

```bash
sudo apt-get install -y libnss3 libnspr4 libasound2t64
```

## Development

Install dependencies:

```bash
npm install
```

Start the development application:

```bash
npm start
```

The window should display "Hello, Electron!". Select **Read directory** to list
the current platform's configured home-directory source.

## Verification

Every code change must pass:

```bash
npm run typecheck
npm run lint
npm test
```

The combined project gate is:

```bash
npm run typecheck && npm run lint && npm test
```

## Packaging

Package the application without creating an installer:

```bash
npm run package
```

Build the native installer configured for the current platform:

```bash
npm run make
```

| Platform | Target                 | Notes                                                                                           |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Windows  | Squirrel `.exe`        | Build and test on Windows. The WSL helper packaging issue must be resolved before distribution. |
| macOS    | Unsigned `.app`/`.zip` | Gatekeeper will warn until signing and notarization are added.                                  |
| Linux    | `.deb`                 | Requires Debian packaging tools such as `dpkg` and `fakeroot`.                                  |

See [Setup](docs/setup.md) for detailed host requirements and commands.

## Repository Guide

- [AGENTS.md](AGENTS.md): canonical engineering and collaboration rules
- [Roadmap](docs/plan.md): milestones and current implementation status
- [Architecture](docs/architecture.md): Electron and WSL process design
- [Decisions](docs/decisions.md): accepted architecture decision records
- [Tech Stack](docs/tech-stack.md): technology choices and alternatives
- [Issue Register](.opencode/context/issue-register.md): reviewed defects and
  improvement work

## License

Licensed under the [MIT License](LICENSE).
