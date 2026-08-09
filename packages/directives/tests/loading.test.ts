import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpinnerElement } from "../src/directives/loading";

class FakeSvgElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeSvgElement[] = [];
  readonly style: Record<string, string> = {};

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  appendChild(child: FakeSvgElement) {
    this.children.push(child);
    return child;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("loading spinner", () => {
  it("treats malicious color input as a literal SVG attribute", () => {
    vi.stubGlobal("document", {
      createElementNS: () => new FakeSvgElement(),
    });
    const payload = `\"></circle></svg><img src=x onerror=alert(1)>`;

    const svg = createSpinnerElement(payload, Number.NaN) as any;
    expect(svg.attributes.get("width")).toBe("32");
    expect(svg.children).toHaveLength(1);
    expect(svg.children[0].attributes.get("stroke")).toBe(payload);
  });

  it("clamps runtime spinner sizes", () => {
    vi.stubGlobal("document", {
      createElementNS: () => new FakeSvgElement(),
    });
    expect((createSpinnerElement("red", 1) as any).attributes.get("width")).toBe(
      "8",
    );
    expect(
      (createSpinnerElement("red", 9999) as any).attributes.get("width"),
    ).toBe("256");
  });
});
