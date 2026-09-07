# Security policy

Only the latest published minor version receives security fixes while the
package remains below 1.0. Please reproduce a suspected issue against that
version before reporting it.

Do not open a public issue for vulnerabilities or include production tokens,
cookies, request payloads, or customer data in a report. Use GitHub's private
security advisory flow for this repository and provide a minimal sanitized
reproduction, affected version, expected impact, and suggested mitigation.

Request caches are process-local by default. Applications must clear the
active client's cache and cancel pending requests when the authenticated
identity or tenant changes.
