# Verified upstream build artifacts

`xlsx-0.20.3.tgz` is the unmodified SheetJS Community Edition 0.20.3 release from https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz.

SHA-512 integrity:

```text
sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==
```

The archive is a workspace development dependency. `packages/file-utils/scripts/check-vendor.mjs` verifies its hash and compares the installed source, declarations, manifest and license before building. It is not published as a nested archive or a consumer dependency.

`file-utils` bundles one shared runtime chunk per output format and resolves workbook declarations. Release builds are minified and omit sourcemaps; `FILE_UTILS_DEBUG_SOURCEMAP=true bun run build` is available for local debugging. `check:package` rejects debug maps in release artifacts and checks runtime/type imports, lightweight entry graphs and separate vendor/own-code byte budgets. `check:consumer` creates a fresh no-lock project using the actual tarball and Vue 3.3.0, then verifies ESM/CommonJS Excel round-trips and strict declarations without installing `xlsx`.

The upstream Apache-2.0 license and attribution are included in `packages/file-utils/licenses/SheetJS.txt` and `THIRD_PARTY_NOTICES.md`. Updating bundled SheetJS requires a deliberate upstream archive/integrity/license review and rerunning the same checks.
