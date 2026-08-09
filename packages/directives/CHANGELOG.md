# @robot-admin/directives

## 1.1.1

### Patch Changes

- Render `v-loading` text with safe DOM APIs instead of interpolating user content into `innerHTML`.
- Cancel delayed `v-click-outside` registration during same-tick unmounts to prevent document listener leaks.
- Make `v-watermark` resize handling use the latest binding options and remove production debug logging.
- Add regression tests for the security and lifecycle contracts.
