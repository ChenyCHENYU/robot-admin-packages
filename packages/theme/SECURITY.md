# Security policy

Only the latest published minor version receives security fixes while the
package remains below 1.0. Please reproduce a suspected issue against that
version before reporting it.

Do not open a public issue for vulnerabilities or include production tokens,
cookies, customer data, or persisted theme payloads in a report. Use GitHub's
private security advisory flow for this repository and provide a minimal,
sanitized reproduction with the affected version and expected impact.

The package treats browser storage and View Transition support as optional.
Applications should still apply an appropriate Content Security Policy and
must not persist secrets in theme or design-style storage keys.
