# @robot-admin/file-utils

## 2.0.0

### Major Changes

- **Breaking:** ZIP export helpers now rethrow failures after updating export state, allowing callers to handle errors with `try/catch` instead of receiving a silent failure result.
- **Breaking:** CSV parsing now enforces RFC 4180 quoting rules and rejects malformed quoting or duplicate headers; generated rows use CRLF line endings.
- Sanitize ZIP paths against absolute paths, drive prefixes, parent traversal, control characters and Windows reserved names; reject collisions after normalization.
- Add XML tag-name validation and clearer Base64/JSON read errors.
- Harden Canvas context acquisition and chunk option validation; add a fifth `AbortSignal` argument to upload callbacks so aborts cancel in-flight work.
- Include file size in sampled SHA-256 fingerprints and report unsupported `crypto.subtle` environments explicitly.
- Externalize `xlsx`, `jszip` and `file-saver` from the library bundles, reducing duplicate output substantially.
