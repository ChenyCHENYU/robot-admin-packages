# @robot-admin/theme

## 0.4.0

### Minor Changes

- Harden localStorage reads/writes for privacy mode and quota errors, and validate persisted theme/design-style values.
- Make `init()` idempotent, add `destroy()` for listener cleanup, and add configurable Store ids for multi-instance applications.
- Support async View Transition callbacks, SSR and reduced-motion fallback, while preserving real callback errors.
- Remove the ineffective `duration` option; configure transition duration through CSS.
