# Security notes

## Boundary

These directives run in the browser and do not replace server-side authorization, validation or audit controls. In particular, `v-permission` only controls presentation: every privileged API must independently enforce authorization.

Watermarks deter casual redistribution but cannot prevent screenshots or deliberate DOM modification. `preventDelete` restores accidental or simple removal; it is not a DRM mechanism.

## Safe integration

- Treat copy text, tooltip text and loading text as untrusted. The package renders UI text through DOM properties rather than HTML injection.
- Use `styleNonce` for Loading and Tooltip when a strict Content Security Policy requires nonces. Review Canvas data URLs before enabling watermarks under a restrictive CSP.
- Provide permission data synchronously and fail closed while identity is loading. Avoid placing tokens or personal data in directive bindings or DOM attributes.
- Permission and drag cleanup only restores DOM state still owned by the directive. Continue treating application-side style and authorization state as the source of truth.
- Prefer handler-owned debounce/throttle bindings. Compatibility mode redispatches a synthetic DOM event and should not be used as an authorization boundary.
- Keep Vue and this package updated, and test Pointer Events, observers and clipboard behavior against the browsers supported by the application.

## Reporting

Please report suspected vulnerabilities privately to the maintainer email listed in `package.json`. Do not include production secrets, access tokens or personal data in a public issue.
