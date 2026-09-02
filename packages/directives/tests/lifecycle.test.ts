// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createDirectives } from "../src/install";
import { createCopyDirective } from "../src/directives/copy";
import debounce from "../src/directives/debounce";
import clickOutside from "../src/directives/click-outside";
import drag from "../src/directives/drag";
import {
  createPermissionDirective,
  hasPermission,
} from "../src/directives/permission";
import watermark, { clearWatermarkCache } from "../src/directives/watermark";

function mount(
  directive: any,
  element: HTMLElement,
  value?: unknown,
  arg?: string,
) {
  directive.mounted?.(element, { value, arg }, undefined, undefined);
}

function update(
  directive: any,
  element: HTMLElement,
  value?: unknown,
  arg?: string,
) {
  directive.updated?.(element, { value, arg }, undefined, undefined);
}

function unmount(directive: any, element: HTMLElement) {
  directive.unmounted?.(element, {}, undefined, undefined);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  clearWatermarkCache();
});

describe("permission directive", () => {
  it("supports wildcard/AND authorization and restores the exact host state", () => {
    expect(
      hasPermission(["users:read", "users:write"], { "users:*": true }, "AND"),
    ).toBe(true);

    let authorized = false;
    const denied = vi.fn();
    const directive = createPermissionDirective({
      getAuthData: () => ({ "orders:read": authorized }),
      onDenied: denied,
    });
    const button = document.createElement("button");
    button.style.display = "inline-flex";
    button.style.opacity = "0.8";
    button.setAttribute("aria-disabled", "false");

    mount(directive, button, {
      permissions: "orders:read",
      fallback: "disable",
    });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    update(directive, button, {
      permissions: "orders:read",
      fallback: "disable",
    });
    expect(denied).toHaveBeenCalledTimes(1);

    authorized = true;
    update(directive, button, {
      permissions: "orders:read",
      fallback: "disable",
    });
    expect(button.disabled).toBe(false);
    expect(button.style.display).toBe("inline-flex");
    expect(button.style.opacity).toBe("0.8");
    expect(button.getAttribute("aria-disabled")).toBe("false");

    unmount(directive, button);
    expect(button.disabled).toBe(false);
  });

  it("does not overwrite host changes and reports a changed permission set", () => {
    const denied = vi.fn();
    const directive = createPermissionDirective({
      getAuthData: () => ({}),
      onDenied: denied,
    });
    const element = document.createElement("div");
    element.style.display = "flex";

    mount(directive, element, "orders:read");
    expect(element.style.display).toBe("none");
    element.style.display = "grid";
    update(directive, element, "orders:write");
    expect(element.style.display).toBe("none");
    expect(denied).toHaveBeenCalledTimes(2);

    element.style.display = "inline-grid";
    unmount(directive, element);
    expect(element.style.display).toBe("inline-grid");
  });
});

describe("DOM ownership", () => {
  it("only restores drag styles that are still owned by the directive", () => {
    const element = document.createElement("div");
    element.style.cursor = "help";
    mount(drag, element, true);
    expect(element.style.cursor).toBe("move");

    element.style.cursor = "crosshair";
    element.style.left = "40px";
    unmount(drag, element);

    expect(element.style.cursor).toBe("crosshair");
    expect(element.style.left).toBe("40px");
  });

  it("renders a device-pixel-ratio-aware watermark tile", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    let canvas: HTMLCanvasElement | undefined;
    const context = {
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      globalAlpha: 1,
      font: "",
      fillStyle: "",
      textAlign: "start",
      textBaseline: "alphabetic",
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        canvas = this;
        return context as unknown as CanvasRenderingContext2D;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,watermark",
    );
    const element = document.createElement("div");

    mount(watermark, element, { text: "audit", gap: [160, 80] });

    expect(canvas?.width).toBe(320);
    expect(canvas?.height).toBe(160);
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(
      element.querySelector<HTMLElement>(".ra-watermark")?.style.backgroundSize,
    ).toBe("160px 80px");
    unmount(watermark, element);
  });
});

describe("owned event directives", () => {
  it("debounces a handler and clears pending work on unmount", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const button = document.createElement("button");
    mount(debounce, button, { delay: 50, handler }, "click");

    button.click();
    button.click();
    vi.advanceTimersByTime(49);
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);

    button.click();
    unmount(debounce, button);
    vi.runAllTimers();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shares a document listener and honors excluded elements", () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    const excluded = document.createElement("button");
    excluded.className = "keep-open";
    document.body.append(host, excluded);
    const handler = vi.fn();
    mount(clickOutside, host, { handler, exclude: [".keep-open"] });
    vi.runOnlyPendingTimers();

    excluded.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);

    unmount(clickOutside, host);
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("copy and plugin integration", () => {
  it("copies dynamic text, reports success and restores accessibility attributes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal("isSecureContext", true);
    const notify = vi.fn();
    const success = vi.fn();
    const directive = createCopyDirective({ notify });
    const element = document.createElement("span");
    element.style.cursor = "help";

    mount(directive, element, { text: () => "secret", onSuccess: success });
    element.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("secret"));
    expect(success).toHaveBeenCalledWith("secret");
    expect(notify).toHaveBeenCalledWith("success", "复制成功");
    expect(element.getAttribute("role")).toBe("button");

    unmount(directive, element);
    expect(element.style.cursor).toBe("help");
    expect(element.hasAttribute("role")).toBe(false);
    expect(element.hasAttribute("tabindex")).toBe(false);
  });

  it("registers every directive with a configurable prefix", () => {
    const names: string[] = [];
    const plugin = createDirectives({ prefix: "ra-" }) as {
      install(app: { directive(name: string): void }): void;
    };
    plugin.install({ directive: (name) => void names.push(name) });

    expect(names).toHaveLength(11);
    expect(names).toContain("ra-permission");
    expect(names).toContain("ra-click-outside");
  });
});
