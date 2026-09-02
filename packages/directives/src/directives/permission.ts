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

export type PermissionBinding = string | readonly string[] | PermissionOptions;

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
  appliedDisplay?: string;
  appliedOpacity?: string;
  appliedPointerEvents?: string;
  appliedAriaDisabled?: string;
  appliedDisabled?: boolean;
  lastDeniedSignature?: string;
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
    : required.some((permission) =>
        checkSinglePermission(permission, authData),
      );
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
      "disabled" in el
        ? Boolean((el as HTMLButtonElement).disabled)
        : undefined,
  };
  states.set(el, state);
  return state;
}

function releaseRestriction(el: HTMLElement, state: PermissionState): void {
  if (state.appliedDisplay !== undefined) {
    if (el.style.display === state.appliedDisplay)
      el.style.display = state.display;
    else state.display = el.style.display;
    state.appliedDisplay = undefined;
  } else {
    state.display = el.style.display;
  }
  if (state.appliedOpacity !== undefined) {
    if (el.style.opacity === state.appliedOpacity)
      el.style.opacity = state.opacity;
    else state.opacity = el.style.opacity;
    state.appliedOpacity = undefined;
  } else {
    state.opacity = el.style.opacity;
  }
  if (state.appliedPointerEvents !== undefined) {
    if (el.style.pointerEvents === state.appliedPointerEvents) {
      el.style.pointerEvents = state.pointerEvents;
    } else {
      state.pointerEvents = el.style.pointerEvents;
    }
    state.appliedPointerEvents = undefined;
  } else {
    state.pointerEvents = el.style.pointerEvents;
  }
  if (state.appliedAriaDisabled !== undefined) {
    if (el.getAttribute("aria-disabled") === state.appliedAriaDisabled) {
      if (state.ariaDisabled === null) el.removeAttribute("aria-disabled");
      else el.setAttribute("aria-disabled", state.ariaDisabled);
    } else {
      state.ariaDisabled = el.getAttribute("aria-disabled");
    }
    state.appliedAriaDisabled = undefined;
  } else {
    state.ariaDisabled = el.getAttribute("aria-disabled");
  }
  if (state.disabled !== undefined && "disabled" in el) {
    const control = el as HTMLButtonElement;
    if (state.appliedDisabled !== undefined) {
      if (control.disabled === state.appliedDisabled)
        control.disabled = state.disabled;
      else state.disabled = control.disabled;
      state.appliedDisabled = undefined;
    } else {
      state.disabled = control.disabled;
    }
  }
}

function applyRestriction(
  el: HTMLElement,
  state: PermissionState,
  fallback: PermissionFallback,
): void {
  if (fallback === "hide") {
    el.style.display = "none";
    state.appliedDisplay = "none";
    return;
  }
  el.setAttribute("aria-disabled", "true");
  state.appliedAriaDisabled = "true";
  if ("disabled" in el) {
    (el as HTMLButtonElement).disabled = true;
    state.appliedDisabled = true;
  } else {
    el.style.pointerEvents = "none";
    state.appliedPointerEvents = "none";
  }
  if (fallback === "show") {
    el.style.opacity = "0.5";
    state.appliedOpacity = "0.5";
  }
}

function applyPermission(
  el: HTMLElement,
  options: PermissionOptions,
  provider: PermissionProvider,
): void {
  const state = captureState(el);
  releaseRestriction(el, state);
  const required = normalizePermissions(options.permissions);
  if (required.length === 0) {
    state.lastDeniedSignature = undefined;
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
    state.lastDeniedSignature = undefined;
    return;
  }

  applyRestriction(el, state, options.fallback ?? "hide");
  const deniedSignature = `${reason}\u0000${mode}\u0000${required.join(
    "\u0000",
  )}`;
  if (state.lastDeniedSignature !== deniedSignature) {
    options.onDenied?.(reason);
    provider.onDenied?.(reason, el);
  }
  state.lastDeniedSignature = deniedSignature;
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
      if (state) releaseRestriction(el, state);
      states.delete(el);
    },
  };
}

export default createPermissionDirective();
