const redispatchedEvents = new WeakSet<Event>();

export function isRedispatchedEvent(event: Event): boolean {
  return redispatchedEvents.has(event);
}

function cloneEvent(event: Event): Event {
  const common = {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
  };
  if (event instanceof MouseEvent) {
    return new MouseEvent(event.type, {
      ...common,
      detail: event.detail,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      button: event.button,
      buttons: event.buttons,
      relatedTarget: event.relatedTarget,
    });
  }
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) {
    return new KeyboardEvent(event.type, {
      ...common,
      key: event.key,
      code: event.code,
      location: event.location,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
    });
  }
  if (typeof CustomEvent !== "undefined" && event instanceof CustomEvent) {
    return new CustomEvent(event.type, { ...common, detail: event.detail });
  }
  return new Event(event.type, common);
}

/** Compatibility bridge for the legacy `v-x @event` gate mode. */
export function redispatchEvent(target: HTMLElement, source: Event): void {
  const cloned = cloneEvent(source);
  redispatchedEvents.add(cloned);
  target.dispatchEvent(cloned);
}

export function assertDelay(value: number, name = "delay"): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} 必须是大于或等于 0 的有限数值`);
  }
}
