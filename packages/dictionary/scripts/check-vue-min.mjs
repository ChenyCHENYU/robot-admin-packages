import { spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 独立执行的网络消费者检查；不加入默认 verify，也不调整工作区的 Vue/锁文件。
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const minimumVue = "3.4.0";
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (pkg.peerDependencies.vue !== `^${minimumVue}`)
  throw new Error("Vue 支持下限已变化，请同步最低版本消费者。");
await access(join(root, "dist/vue.js"));
await access(join(root, "dist/vue.cjs"));

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_PATH: "" },
    timeout: 90_000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
      { cause: result.error },
    );
  return result.stdout.trim();
}

const fixture = await mkdtemp(join(tmpdir(), "dictionary-vue-min-"));
try {
  run(
    "bun",
    [
      "pm",
      "pack",
      "--ignore-scripts",
      "--quiet",
      "--filename",
      join(fixture, "dictionary.tgz"),
    ],
    root,
  );
  await copyFile(
    join(root, "tests/fixtures/vue-min/consumer.cjs"),
    join(fixture, "consumer.cjs"),
  );
  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify({
      name: "dictionary-minimum-vue-consumer",
      private: true,
      dependencies: {
        "@robot-admin/dictionary": "file:./dictionary.tgz",
        vue: minimumVue,
      },
    }),
  );
  run(
    "bun",
    ["install", "--ignore-scripts", "--registry=https://registry.npmjs.org"],
    fixture,
  );
  // 每种导出格式使用独立 Node 进程，从临时消费者解析包，不能借用工作区 Vue。
  for (const format of ["import", "require"])
    console.log(
      run(process.execPath, [join(fixture, "consumer.cjs"), format], fixture),
    );
} finally {
  await rm(fixture, { recursive: true, force: true });
}
