import { describe, expect, it } from "vitest";
import { createLintStagedConfig } from "../src/configs/lint-staged";

describe("lint-staged config", () => {
  it("enables only ESLint by default", () => {
    expect(createLintStagedConfig()).toEqual({
      "src/**/*.{js,jsx,ts,tsx,vue}": ["eslint --fix --no-cache"],
    });
  });

  it("honors explicit feature switches", () => {
    expect(
      createLintStagedConfig({ eslint: false, oxlint: true, prettier: true }),
    ).toEqual({
      "src/**/*.{js,jsx,ts,tsx,vue}": [
        "oxlint --max-warnings 0 --deny-warnings",
        "prettier --write",
      ],
      "*.{json,md,yml,yaml}": ["prettier --write"],
    });
  });
});
