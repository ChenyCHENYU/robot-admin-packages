# Security notes

## Boundary

This package performs client-side parsing, generation and transport orchestration. It does not replace server-side MIME inspection, malware scanning, data-loss prevention, authorization, rate limiting, archive extraction controls or compliance retention.

Configured limits reduce accidental exhaustion and common denial-of-service inputs, but browsers may allocate memory while decoding an image, parsing a workbook or compressing an archive before JavaScript regains control. Apply stricter limits at the upload gateway for untrusted content.

## Untrusted data checklist

- Keep `formulaPolicy: "escape"` or use `"reject"` for CSV/Excel exports. Use `"preserve"` only for trusted values.
- Retain strict headers and row/column limits for CSV/Excel imports. Do not merge parsed records into privileged objects without schema validation.
- Validate business schemas after JSON, CSV or Excel parsing; syntactic validity is not semantic validity.
- Treat ZIP paths as logical archive names. If another system extracts the result, it must independently prevent zip-slip and symlink traversal.
- Use a `ChunkDownloadSink` for genuinely large files. The no-sink fallback buffers in memory and is intentionally bounded.
- Enable `useImage({ verifyMimeType: true })` for common untrusted raster formats, while retaining server-side MIME inspection and malware scanning.
- Verify complete file hashes and signatures on the server when integrity or authenticity matters. The sampled upload hash is only an identity hint; client `hashMode: "full"` is defense in depth, not a trust boundary.
- Use `shouldRetry` to exclude permanent HTTP or business failures from automatic chunk retries. Keep upload endpoints idempotent because transport outcomes can still be ambiguous.
- Abort client operations when the user leaves the workflow, and propagate the supplied signal to every network request.

## Dependency policy

SheetJS Community Edition 0.20.3 is bundled from the unmodified official release archive retained in the repository's `vendor/` directory. The build verifies its SHA-512 integrity and compares the runtime, declarations and license against the installed build input. Consumers do not download a SheetJS CDN dependency. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and the included Apache-2.0 license. Monitor the bundled SheetJS version, `jszip`, Vue and this package in the normal software-composition analysis process; bundled code still requires upstream security updates.

## Reporting

Please report suspected vulnerabilities privately to the maintainer email listed in `package.json`. Do not attach confidential source documents, credentials, personal data or production URLs to a public issue.
