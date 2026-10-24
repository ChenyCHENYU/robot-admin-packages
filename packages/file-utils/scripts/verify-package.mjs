import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { packageRoot, verifyVendoredSheetJs } from './check-vendor.mjs'

verifyVendoredSheetJs()
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
for (const group of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, version] of Object.entries(pkg[group] ?? {})) {
    assert.notEqual(name, 'xlsx', 'Consumer must not install xlsx')
    assert.ok(!/^(?:https?:|file:|link:|workspace:)/.test(version), `Unexpected consumer installation source: ${name}`)
  }
}
const dist = path.join(packageRoot, 'dist')
const files = fs.readdirSync(dist)
assert.ok(!files.some(filename => filename.endsWith('.map')), 'Publish builds must not include debug sourcemaps')
const scripts = files.filter(filename => /\.(?:js|cjs)$/.test(filename))
const contents = new Map(scripts.map(filename => [filename, fs.readFileSync(path.join(dist, filename), 'utf8')]))
const vendors = scripts.filter(filename => contents.get(filename).includes('0.20.3') && contents.get(filename).includes('SheetJS'))
assert.equal(vendors.filter(filename => filename.endsWith('.js')).length, 1, 'One shared ESM SheetJS runtime')
assert.equal(vendors.filter(filename => filename.endsWith('.cjs')).length, 1, 'One shared CommonJS SheetJS runtime')
for (const filename of vendors) assert.ok(fs.statSync(path.join(dist, filename)).size <= 520 * 1024, `SheetJS chunk exceeds dedicated budget: ${filename}`)
const ownBytes = scripts.filter(filename => !vendors.includes(filename)).reduce((sum, filename) => sum + fs.statSync(path.join(dist, filename)).size, 0)
assert.ok(ownBytes <= 128 * 1024, `File-utils own JS exceeds 128 KiB: ${ownBytes}`)
for (const filename of files.filter(name => /\.(?:js|cjs|d\.ts|d\.cts)$/.test(name))) {
  const text = fs.readFileSync(path.join(dist, filename), 'utf8')
  assert.ok(!/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]xlsx(?:['"/])/.test(text), `Unresolved runtime/type xlsx import: ${filename}`)
}

/** Traverse the real internal import graph rather than assuming entry size equals load size. */
function graph(entry, found = new Set()) {
  const filename = path.basename(entry)
  if (found.has(filename)) return found
  assert.ok(contents.has(filename), `Missing emitted chunk: ${filename}`)
  found.add(filename)
  for (const match of contents.get(filename).matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
    graph(match[1], found)
  }
  return found
}

for (const [name, entry] of Object.entries(pkg.exports)) {
  if (typeof entry === 'string') continue
  for (const condition of ['import', 'require']) {
    assert.ok(fs.existsSync(path.join(packageRoot, entry[condition].types)))
    const imports = graph(entry[condition].default)
    if (['./csv', './file', './download', './image', './chunk', './config'].includes(name)) {
      assert.ok(!vendors.some(filename => imports.has(filename)), `${name} ${condition} loads spreadsheet runtime`)
    }
  }
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'file-utils-package-'))
try {
  execFileSync('bun', ['pm', 'pack', '--destination', temporary], { cwd: packageRoot, stdio: 'pipe' })
  const archive = fs.readdirSync(temporary).find(filename => filename.endsWith('.tgz'))
  assert.ok(archive)
  const entries = execFileSync('tar', ['-tf', path.join(temporary, archive)], { encoding: 'utf8' }).split('\n')
  for (const required of ['package/THIRD_PARTY_NOTICES.md', 'package/licenses/SheetJS.txt', 'package/dist/excel.d.ts', 'package/dist/excel.d.cts']) assert.ok(entries.includes(required), `Missing package artifact: ${required}`)
  assert.ok(!entries.some(entry => /\/(?:node_modules|src|vendor)\//.test(entry)), 'Do not publish build sources or dependency archives')
  console.log(JSON.stringify({ package: pkg.name, version: pkg.version, ownJavaScriptBytes: ownBytes, vendorChunks: vendors.map(filename => ({ filename, bytes: fs.statSync(path.join(dist, filename)).size })), packedBytes: fs.statSync(path.join(temporary, archive)).size, runtimeCDN: false, externalWorkbookTypes: false }))
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
