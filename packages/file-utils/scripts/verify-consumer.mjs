import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { packageRoot } from './check-vendor.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-utils-consumer-'))
console.log(`Isolated no-lock consumer: ${root}`)
execFileSync('bun', ['pm', 'pack', '--destination', root], { cwd: packageRoot, stdio: 'pipe' })
const archive = fs.readdirSync(root).find(filename => filename.endsWith('.tgz'))
assert.ok(archive)
fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
  private: true,
  type: 'module',
  dependencies: { '@robot-admin/file-utils': `file:./${archive}`, vue: '3.3.0' },
  devDependencies: { typescript: '5.8.3', '@types/node': '22.13.9' },
}, null, 2))
fs.copyFileSync(path.join(packageRoot, 'scripts/consumer-runtime.mjs'), path.join(root, 'consumer-runtime.mjs'))
for (const extension of ['mts', 'cts']) fs.copyFileSync(path.join(packageRoot, 'scripts/consumer-types.ts'), path.join(root, `consumer.${extension}`))
fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2020', lib: ['ES2020', 'DOM', 'DOM.Iterable'], skipLibCheck: false }, include: ['consumer.mts', 'consumer.cts'] }, null, 2))
assert.ok(!fs.existsSync(path.join(root, 'bun.lock')))
execFileSync('bun', ['install', '--ignore-scripts'], { cwd: root, stdio: 'inherit', timeout: 120_000 })
execFileSync(process.execPath, ['consumer-runtime.mjs'], { cwd: root, stdio: 'inherit' })
execFileSync('bun', ['x', '--no-install', 'tsc', '--noEmit'], { cwd: root, stdio: 'inherit' })
console.log('Fresh minimum-peer consumer passed. Evidence retained:', root)
