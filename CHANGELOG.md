# Changelog

## Unreleased

### Breaking changes

- **CLI:** config files in an unknown format make it fail, like `load()` does by default, instead of being silently skipped; pass `--ignore-unknown-formats` for the previous behavior.

### Fixed

- **CLI:** exits with code 1 on failure.
- **CLI:** `-p` with a missing path reports `no value at <path>` instead of crashing in JSON mode.
- **CLI:** repeated `-p` accept dotted paths instead of silently dropping them; a missing path is reported instead of omitted.
- A malformed `json:` env value fails with `invalid JSON in <VAR>` (the parse error as `cause`) instead of a bare `SyntaxError`.

## 5.0.0 (2026-10-14)

### Breaking changes

- **Windows:** the global config is read from `%APPDATA%\<appName>` instead of `~/.config/<appName>`; move existing files there.
- **YAML:** js-yaml ≥ 4 is required, v3 is no longer supported.
- **Merging:** non-plain objects (dates from YAML/TOML, class instances) are replaced instead of merged, so a later source now overrides them.

### Added

- Format packages (`ini`, `js-yaml`, `json5`, `smol-toml`, `strip-json-comments`) are declared as optional peer dependencies, so npm checks their versions.

### Fixed

- Config directories whose path contains glob characters (e.g. `project (copy)`) are no longer ignored, and Windows paths are handled correctly.
- JSON configs no longer fail to parse when strip-json-comments ≥ 4 (ESM-only) is installed.
- A `__proto__` key in a config can no longer pollute `Object.prototype`.
- `watch()` honors `entries` and `defaults` when `"vendor"` is not in `entries`.

### Changed

- 16 fewer runtime dependencies (fast-glob removed), which also removes the braces advisory (GHSA-vfj7-8cjw-p6xm) from installs.
- chokidar upgraded to 5.
