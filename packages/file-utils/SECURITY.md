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
- Verify complete file hashes and signatures on the server when integrity or authenticity matters. The sampled upload hash is only an identity hint.
- Abort client operations when the user leaves the workflow, and propagate the supplied signal to every network request.

## Dependency policy

SheetJS is consumed from its official release tarball and pinned by the repository lockfile. Organizations that disallow URL dependencies should mirror the exact artifact in their approved registry and preserve integrity metadata. Monitor `xlsx`, `jszip`, Vue and this package in the normal software-composition analysis process.

## Reporting

Please report suspected vulnerabilities privately to the maintainer email listed in `package.json`. Do not attach confidential source documents, credentials, personal data or production URLs to a public issue.
