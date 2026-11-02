const assert = require("node:assert/strict");
const { readFileSync, realpathSync } = require("node:fs");
const { dirname, join } = require("node:path");

async function main() {
  const format = process.argv[2];
  assert.ok(format === "import" || format === "require");
  const load = (name) =>
    format === "import" ? import(name) : Promise.resolve(require(name));
  const vue = await load("vue");
  const { renderToString } = await load("vue/server-renderer");
  const sdk = await load("@robot-admin/dictionary/vue");
  const { createSSRApp, h, onServerPrefetch, ref } = vue;
  const {
    createDictionaryPlugin,
    useDictionary,
    useDictLabels,
    useDictionaries,
  } = sdk;
  assert.equal("DICTIONARY_PROVIDER_KEY" in sdk, false);
  assert.equal(
    vue.version,
    "3.4.0",
    "must run the actual declared minimum Vue",
  );
  assert.ok(
    realpathSync(require.resolve("vue")).startsWith(
      realpathSync(join(__dirname, "node_modules")),
    ),
  );
  const sdkRoot = dirname(dirname(require.resolve("@robot-admin/dictionary")));
  const pkg = JSON.parse(readFileSync(join(sdkRoot, "package.json"), "utf8"));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.peerDependencies), ["vue"]);
  for (const name of [
    "naive-ui",
    "@robot-admin/naive-ui-components",
    "@agile-team/mach-table-vue",
    "pinia",
    "axios",
  ])
    assert.throws(() => require.resolve(name), { code: "MODULE_NOT_FOUND" });

  async function render(plugin, setup) {
    const app = createSSRApp({ setup });
    app.use(plugin);
    const store = app.runWithContext(useDictionaries);
    try {
      return await renderToString(app);
    } finally {
      plugin.dispose(app);
      assert.equal(store.getDictionary("status").getOptions().length, 0);
    }
  }

  // Vue3.4 SSR 不缓存 computed，此静态场景可捕获解析结果对象触发的同步递归。
  const staticPlugin = createDictionaryPlugin({
    dictionaries: { status: [{ value: 0, label: "待下达" }] },
  });
  const row = ref({ status: 0 });
  const staticHtml = await render(staticPlugin, () => {
    const select = useDictionary("status");
    const detail = useDictLabels(row, { status: "status" });
    assert.equal(select.error.value, null);
    assert.equal(detail.error.value, null);
    return () =>
      h("section", [
        h(
          "select",
          select.options.value.map((option) =>
            h("option", { value: option.value }, option.label),
          ),
        ),
        h("span", detail.labels.value.status),
      ]);
  });
  assert.equal(
    staticHtml,
    '<section><select><option value="0">待下达</option></select><span>待下达</span></section>',
  );
  assert.equal(row.value.status, 0);

  let requests = 0;
  let identityReads = 0;
  const identity = ref("tenant-a");
  const remotePlugin = createDictionaryPlugin({
    scope: () => {
      identityReads++;
      return identity.value;
    },
    load: async (code, { scope, signal }) => {
      requests++;
      assert.equal(code, "status");
      assert.equal(scope, "tenant-a");
      assert.equal(signal.aborted, false);
      await Promise.resolve();
      return [{ value: 0, label: "执行中" }];
    },
  });
  assert.equal(requests, 0);
  const remoteHtml = await render(remotePlugin, () => {
    const first = useDictionary("status");
    const second = useDictionary("status");
    const detail = useDictLabels(row, { status: "status" });
    onServerPrefetch(() =>
      Promise.all([first.reload(), second.reload(), detail.reload()]),
    );
    return () =>
      h("section", [
        h(
          "select",
          first.options.value.map((option) =>
            h("option", { value: option.value }, option.label),
          ),
        ),
        h("span", second.label(0)),
        h("span", detail.labels.value.status),
      ]);
  });
  assert.equal(
    remoteHtml,
    '<section><select><option value="0">执行中</option></select><span>执行中</span><span>执行中</span></section>',
  );
  assert.equal(requests, 1, "same-code SSR consumers share one request");
  const previousReads = identityReads;
  identity.value = "tenant-b";
  assert.equal(
    identityReads,
    previousReads,
    "dispose stops the application identity watcher",
  );
  console.log(
    `Vue ${vue.version} ${format}: independent native SSR, shared request and disposal passed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
