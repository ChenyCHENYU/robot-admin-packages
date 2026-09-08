# @robot-admin/theme

## 0.4.1

### Patch Changes

- Keep state, storage and DOM attributes consistent when View Transition is unavailable or fails, and make concurrent transition markers safe.
- Resolve system color preference before pre-init actions, clean invalid persisted values, and reject empty or conflicting Store options.
- Freeze published theme metadata, add reduced-motion CSS fallbacks, and preserve the existing visual selectors and public API.
- Add lifecycle, persistence, compatibility, transition and package-boundary verification.
- Correct README integration guidance and ship license, changelog and security policy in the npm artifact.

## 0.4.0

### Minor Changes

- Harden localStorage reads/writes for privacy mode and quota errors, and validate persisted theme/design-style values.
- Make `init()` idempotent, add `destroy()` for listener cleanup, and add configurable Store ids for multi-instance applications.
- Support async View Transition callbacks, SSR and reduced-motion fallback, while preserving real callback errors.
- Remove the ineffective `duration` option; configure transition duration through CSS.
