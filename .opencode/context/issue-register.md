# Issue Register

Baseline review recorded on 2026-08-20. No issue below is approved for
implementation merely because it appears in this register. Work follows
`.opencode/context/workflow.md` one issue at a time.

## Critical

### EH-001 - Packaged Windows app cannot run the WSL helper

- Status: Open
- Evidence: `package.json:9-19`, `forge.config.ts:10-39`,
  `src/main/wsl/wsl-client.ts:53-59`.
- Finding: package/make does not build or copy `dist/wsl-server/index.js` as an
  external resource. The packaged ASAR contains the WSL client chunk but not
  the helper. A WSL Node process cannot execute a file inside Electron's ASAR.
- Impact: the installed Windows app cannot complete its headline directory
  operation.
- Required validation: inspect a Windows package and complete an installed
  end-to-end test.

## High

### EH-002 - WSL startup failures can crash Electron or leak processes

- Status: Open
- Evidence: `src/main/wsl/wsl-client.ts:61-96,129-134`.
- Finding: child spawn errors are not handled; readiness and connection failure
  paths do not guarantee listener, socket, and child cleanup; connection has no
  timeout.

### EH-003 - RPC requests can remain pending forever

- Status: Open
- Evidence: `src/main/wsl/wsl-client.ts:98-150`,
  `src/renderer/renderer.ts:23-34`.
- Finding: requests have no deadline, transport termination does not reject
  pending work, and the main process retains a dead cached client.

### EH-004 - RPC messages and results are not runtime validated

- Status: Open
- Evidence: `src/shared/rpc/protocol.ts:10-33`,
  `src/wsl-server/index.ts:42-83`, `src/main/wsl/wsl-client.ts:107-140`.
- Finding: parsed JSON and method data are asserted to TypeScript interfaces.
  Primitives such as JSON `null` can crash an endpoint, and malformed envelopes
  can reach filesystem operations.
- Constraint: `AGENTS.md` requires validation at trust boundaries.

### EH-005 - TCP chunk decoding can corrupt Unicode JSON

- Status: Open
- Evidence: `src/main/wsl/wsl-client.ts:68-69,107-108`,
  `src/wsl-server/index.ts:72-73`, `src/shared/rpc/framing.ts:5-19`.
- Finding: each arbitrary TCP chunk is independently converted to UTF-8 text.
  A split multibyte character can corrupt a path, filename, or JSON message.

### EH-006 - WSL-side Node is an undeclared product dependency

- Status: Open
- Evidence: `src/main/wsl/wsl-client.ts:129-131`, `docs/setup.md`.
- Finding: the app invokes `wsl.exe -e node` without bundling, provisioning,
  detecting, or documenting a compatible Node runtime inside the distro.
- Decision required: prerequisite detection versus shipping a runtime/server
  installation model.

## Medium

### EH-007 - Concurrent initialization can spawn duplicate helpers

- Status: Open
- Evidence: `src/main/main.ts:55-67`.
- Finding: the singleton is assigned only after asynchronous startup, allowing
  concurrent callers to create multiple children and leak all but one.

### EH-008 - Windows routing has no WSL availability fallback

- Status: Open
- Evidence: `src/main/main.ts:57-69`, `docs/plan.md:29-33`.
- Finding: every Windows process uses WSL based only on `process.platform`,
  while existing documentation also describes local filesystem behavior for
  pure Windows.
- Decision required: whether WSL is mandatory, selectable, or optional.

### EH-009 - Helper PID and shutdown lifecycle are unreliable

- Status: Open
- Evidence: `src/wsl-server/index.ts:26,70-106`.
- Finding: startup requires a writable inherited CWD for a PID file; accepted
  sockets are not tracked; graceful shutdown can wait indefinitely.

### EH-010 - RPC resource usage is unbounded

- Status: Open
- Evidence: `src/shared/rpc/framing.ts:5-19`,
  `src/wsl-server/index.ts:70-84`.
- Finding: frame size, buffered bytes, concurrent requests, connection count,
  response size, and idle duration have no limits.

### EH-011 - Loopback RPC has no client authentication

- Status: Open
- Evidence: `src/wsl-server/index.ts:70-94`.
- Finding: loopback binding is correct, but any local process that discovers
  the port can call filesystem methods under the WSL user's permissions.
- Decision required: threat model and required path scope.

### EH-012 - Electron privilege boundaries need additional hardening

- Status: Open
- Evidence: `src/main/main.ts:16-39,57-70`, `index.html:3-18`.
- Finding: IPC caller identity and argument count are not validated; navigation,
  new windows, and permission requests are unrestricted; no CSP is defined.

### EH-013 - Automated tests do not exercise product behavior

- Status: Open
- Evidence: `src/shared/dir.test.ts`,
  `src/shared/rpc/framing.test.ts`, `vitest.config.ts:3-7`.
- Finding: five tests cover sorting and basic line splitting only. There are no
  client/server integration, failure, security, packaging, or Electron IPC
  tests.

### EH-014 - Typecheck excludes TypeScript build configurations

- Status: Open
- Evidence: `tsconfig.json:15` and all `vite.*.config.ts` plus
  `vitest.config.ts`.
- Finding: the hard typecheck gate does not semantically check most build and
  test configuration files.

### EH-015 - Development toolchain has known advisories

- Status: Open
- Evidence: `package-lock.json`; `npm audit` on 2026-08-20 reported 35
  development findings, while `npm audit --omit=dev` reported zero production
  vulnerabilities.
- Finding: Vite/esbuild and archive/tooling dependencies have advisories.
- Constraint: do not use `npm audit fix --force`; upgrades require a reviewed,
  compatible migration plan.

### EH-016 - WSL path, distro, and runtime assumptions are incomplete

- Status: Open
- Evidence: `src/main/wsl/wsl-client.ts:42-58,129-131`.
- Finding: path conversion assumes drive-letter mounts at `/mnt/<drive>` and
  does not define UNC/custom-mount behavior; default distro and runtime are
  implicit.

## Low

### EH-017 - Packaging documentation and metadata are incomplete

- Status: Open
- Evidence: `forge.config.ts:10-19`, `package.json:1-21`, `docs/setup.md`.
- Finding: Linux `.deb` host-tool requirements are understated; maintainer,
  product icons, stable identity metadata, and tailored macOS plist values are
  absent or generic.

### EH-018 - Repository maintenance details need cleanup

- Status: Open
- Evidence: `package.json:18-30`, `.gitignore`, `.prettierignore`, root files.
- Finding: `wsl-server:stop` is POSIX-specific and can mask failure; the native
  auto-unpack plugin is installed but unused; Markdown is excluded from
  formatting.
- Progress: the root MIT `LICENSE` and preventive ignores for local
  environment, signing, and OpenCode-generated files were added during public
  repository preparation. The remaining maintenance items keep this issue open.

### EH-019 - Documentation contains implementation and milestone drift

- Status: Open
- Evidence: `docs/architecture.md`, `docs/tech-stack.md`,
  `docs/decisions.md`, `docs/plan.md`.
- Finding: M4/M5 ownership, signing timing, client implementation status, and
  cross-platform packaging claims are inconsistent.

## Positive Baseline

- Electron uses `contextIsolation: true`, `nodeIntegration: false`, and
  `sandbox: true`.
- Electron fuses enable ASAR integrity and disable unsafe Node execution modes.
- Platform-specific WSL client loading is guarded by a Windows-only dynamic
  import.
- The helper binds to `127.0.0.1` and child arguments do not use a shell.
- Renderer filenames are inserted with `textContent`.
- Production dependencies reported zero audit vulnerabilities on 2026-08-20.
