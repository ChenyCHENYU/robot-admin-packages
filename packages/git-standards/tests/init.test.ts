import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addPackageScripts,
  generateConfigFiles,
  init,
  type ESLintOptions,
  type FeatureSet,
} from "../src/cli/init";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];
const baseFeatures: FeatureSet = {
  eslint: true,
  lintStaged: true,
  prettier: false,
  oxlint: false,
  editorconfig: false,
};

async function createProject(packageJson: Record<string, unknown> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "robot-standards-init-"));
  tempDirs.push(dir);
  await writeFile(join(dir, "package.json"), JSON.stringify(packageJson));
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("configuration generation", () => {
  it("rejects a nested Git target before writing configuration", async () => {
    const root = await mkdtemp(join(tmpdir(), "robot-standards-nested-"));
    tempDirs.push(root);
    const nested = join(root, "packages", "app");
    await mkdir(join(root, ".git"));
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "package.json"), "{}");

    await expect(init({ cwd: nested, ci: true })).rejects.toThrow(
      "目标目录不是 Git 仓库根目录",
    );
    await expect(
      readFile(join(nested, "commitlint.config.js")),
    ).rejects.toThrow();
  });

  it.each<ESLintOptions>([
    { framework: "react", typescript: true, jsdoc: false },
    { framework: "vanilla", typescript: true, jsdoc: false },
    { framework: "vue", typescript: false, jsdoc: false },
  ])(
    "generates syntactically valid $framework config",
    async (eslintOptions) => {
      const dir = await createProject({ type: "module" });
      await generateConfigFiles(dir, baseFeatures, eslintOptions);

      const configPath = join(dir, "eslint.config.mjs");
      await expect(
        execFileAsync(process.execPath, ["--check", configPath]),
      ).resolves.toBeDefined();
      const config = await readFile(configPath, "utf8");
      expect(config).toContain("js.configs.recommended");
      if (eslintOptions.framework === "react") {
        expect(config).toContain("reactPlugin.configs.flat.recommended");
      }
      if (eslintOptions.framework === "vanilla") {
        expect(config).toContain("...tseslint.configs.recommended");
      }
      if (eslintOptions.framework === "vue") {
        expect(config).toContain("...pluginVue.configs['flat/essential']");
      }
    },
    20_000,
  );
});

describe("package.json updates", () => {
  it("preserves scripts and custom configuration while adding missing defaults", async () => {
    const dir = await createProject({
      type: "module",
      scripts: { lint: "custom-lint", prepare: "build-assets" },
      config: { commitizen: { path: "custom-adapter" } },
      "lint-staged": {
        "src/**/*.{js,jsx,ts,tsx,vue}": ["custom-check"],
      },
    });

    await addPackageScripts(dir, "bun", baseFeatures);
    const result = JSON.parse(
      await readFile(join(dir, "package.json"), "utf8"),
    );

    expect(result.scripts).toMatchObject({
      lint: "custom-lint",
      prepare: "build-assets && husky",
      cz: "git-cz",
    });
    expect(result.config.commitizen).toEqual({ path: "custom-adapter" });
    expect(result.config["cz-customizable"]).toEqual({
      config: ".cz-config.cjs",
    });
    expect(result["lint-staged"]["src/**/*.{js,jsx,ts,tsx,vue}"]).toEqual([
      "custom-check",
      "eslint --fix --no-cache",
    ]);
  });

  it("fills a missing Commitizen adapter path without dropping its options", async () => {
    const dir = await createProject({
      config: { commitizen: { retry: true } },
    });

    await addPackageScripts(dir, "yarn", {
      ...baseFeatures,
      eslint: false,
      lintStaged: false,
    });
    const result = JSON.parse(
      await readFile(join(dir, "package.json"), "utf8"),
    );

    expect(result.config.commitizen).toEqual({
      retry: true,
      path: "node_modules/cz-customizable",
    });
    expect(result.scripts.postinstall).toBe("husky");
  });
});
