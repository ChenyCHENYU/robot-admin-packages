import type { Directive } from "vue";

export type PermissionMode = "AND" | "OR";
export type PermissionFallback = "hide" | "disable" | "show";
export type PermissionRecord = Readonly<Record<string, unknown>>;

export interface PermissionOptions {
  permissions?: string | readonly string[];
  authData?: PermissionRecord;
  mode?: PermissionMode;
  fallback?: PermissionFallback;
  onDenied?: (reason: string) => void;
}

export type PermissionBinding =
  | string
  | readonly string[]
  | PermissionOptions;

export interface PermissionProvider {
  getAuthData?: () => PermissionRecord | undefined;
  check?: (
    permissions: readonly string[],
    mode: PermissionMode,
    element: HTMLElement,
  ) => boolean;
  onDenied?: (reason: string, element: HTMLElement) => void;
}

interface PermissionState {
  display: string;
  opacity: string;
  pointerEvents: string;
  ariaDisabled: string | null;
  disabled?: boolean;
  lastDeniedReason?: string;
}

const states = new WeakMap<HTMLElement, PermissionState>();

function normalizePermissions(
  permissions: string | readonly string[] | undefined,
): readonly string[] {
  if (!permissions) return [];
  return (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => String(permission).trim())
    .filter(Boolean);
}

function parseOptions(value: PermissionBinding | undefined): PermissionOptions {
  if (!value) return { fallback: "hide", mode: "OR" };
  if (typeof value === "string" || Array.isArray(value)) {
    return { permissions: value, fallback: "hide", mode: "OR" };
  }
  return { fallback: "hide", mode: "OR", ...value };
}

function checkSinglePermission(
  permission: string,
  authData: PermissionRecord,
): boolean {
  if (Boolean(authData[permission])) return true;
  for (const [key, allowed] of Object.entries(authData)) {
    if (
      allowed &&
      key.endsWith("*") &&
      permission.startsWith(key.slice(0, -1))
    ) {
      return true;
    }
  }
  return false;
}

export function hasPermission(
  permissions: string | readonly string[],
  authData: PermissionRecord,
  mode: PermissionMode = "OR",
): boolean {
  const required = normalizePermissions(permissions);
  if (required.length === 0) return true;
  return mode === "AND"
    ? required.every((permission) =>
        checkSinglePermission(permission, authData),
      )
    : required.some((permission) => checkSinglePermission(permission, authData));
}

function captureState(el: HTMLElement): PermissionState {
  const existing = states.get(el);
  if (existing) return existing;
  const state: PermissionState = {
    display: el.style.display,
    opacity: el.style.opacity,
    pointerEvents: el.style.pointerEvents,
    ariaDisabled: el.getAttribute("aria-disabled"),
    disabled:
      "disabled" in el ? Boolean((el as HTMLButtonElement).disabled) : undefined,
  };
  states.set(el, state);
  return state;
}

function restoreElement(el: HTMLElement, state: PermissionState): void {
  el.style.display = state.display;
  el.style.opacity = state.opacity;
  el.style.pointerEvents = state.pointerEvents;
  if (state.ariaDisabled === null) el.removeAttribute("aria-disabled");
  else el.setAttribute("aria-disabled", state.ariaDisabled);
  if (state.disabled !== undefined && "disabled" in el) {
    (el as HTMLButtonElement).disabled = state.disabled;
  }
}

function applyRestriction(
  el: HTMLElement,
  fallback: PermissionFallback,
): void {
  if (fallback === "hide") {
    el.style.display = "none";
    return;
  }
  el.setAttribute("aria-disabled", "true");
  if ("disabled" in el) (el as HTMLButtonElement).disabled = true;
  else el.style.pointerEvents = "none";
  if (fallback === "show") el.style.opacity = "0.5";
}

function applyPermission(
  el: HTMLElement,
  options: PermissionOptions,
  provider: PermissionProvider,
): void {
  const state = captureState(el);
  restoreElement(el, state);
  const required = normalizePermissions(options.permissions);
  if (required.length === 0) {
    state.lastDeniedReason = undefined;
    return;
  }

  const mode = options.mode ?? "OR";
  const authData = options.authData ?? provider.getAuthData?.();
  let allowed = false;
  let reason = "权限不足";
  if (provider.check) allowed = provider.check(required, mode, el);
  else if (authData) allowed = hasPermission(required, authData, mode);
  else reason = "权限数据未提供";

  if (allowed) {
    state.lastDeniedReason = undefined;
    return;
  }

  applyRestriction(el, options.fallback ?? "hide");
  if (state.lastDeniedReason !== reason) {
    options.onDenied?.(reason);
    provider.onDenied?.(reason, el);
  }
  state.lastDeniedReason = reason;
}

export function createPermissionDirective(
  provider: PermissionProvider = {},
): Directive<HTMLElement, PermissionBinding | undefined> {
  return {
    mounted(el, binding) {
      captureState(el);
      applyPermission(el, parseOptions(binding.value), provider);
    },
    updated(el, binding) {
      applyPermission(el, parseOptions(binding.value), provider);
    },
    unmounted(el) {
      const state = states.get(el);
      if (state) restoreElement(el, state);
      states.delete(el);
    },
  };
}

export default createPermissionDirective();
