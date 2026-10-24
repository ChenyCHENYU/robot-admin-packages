import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(packageRoot, '../..')
export const sheetJsIntegrity = 'sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA=='

/** Compare the official archive, installed build input and published attribution. */
export function verifyVendoredSheetJs() {
  const archive = path.join(workspaceRoot, 'vendor/xlsx-0.20.3.tgz')
  assert.equal(`sha512-${createHash('sha512').update(fs.readFileSync(archive)).digest('base64')}`, sheetJsIntegrity)
  const upstream = filename => execFileSync('tar', ['-xOf', archive, `package/${filename}`])
  const original = JSON.parse(upstream('package.json').toString())
  assert.equal(original.name, 'xlsx')
  assert.equal(original.version, '0.20.3')
  assert.equal(original.license, 'Apache-2.0')
  const installed = path.dirname(fileURLToPath(import.meta.resolve('xlsx')))
  for (const filename of ['package.json', 'xlsx.mjs', 'xlsx.js', 'types/index.d.ts', 'LICENSE']) {
    assert.ok(upstream(filename).equals(fs.readFileSync(path.join(installed, filename))), `SheetJS build input differs from upstream: ${filename}`)
  }
  assert.ok(upstream('LICENSE').equals(fs.readFileSync(path.join(packageRoot, 'licenses/SheetJS.txt'))))
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
  const workspace = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'))
  assert.equal(pkg.dependencies.xlsx, undefined)
  assert.equal(workspace.devDependencies.xlsx, 'file:vendor/xlsx-0.20.3.tgz')
  for (const entry of ['licenses', 'THIRD_PARTY_NOTICES.md']) assert.ok(pkg.files.includes(entry))
  return { version: original.version, integrity: sheetJsIntegrity }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log('Verified original SheetJS build input and license:', verifyVendoredSheetJs())
}
