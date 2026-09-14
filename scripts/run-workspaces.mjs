import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(rootDir, 'packages')
const task = process.argv[2]
const bunExecutable = process.platform === 'win32' ? 'bun.exe' : 'bun'

if (!task) {
  console.error('用法: bun scripts/run-workspaces.mjs <script>')
  process.exit(1)
}

const workspaces = readdirSync(packagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => {
    const directory = join(packagesDir, entry.name)
    const manifestPath = join(directory, 'package.json')

    if (!existsSync(manifestPath)) return null

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    return { directory, manifest }
  })
  .filter(Boolean)
  .filter(workspace => workspace.manifest.scripts?.[task])
  .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name, 'en'))

if (workspaces.length === 0) {
  console.log(`没有工作区声明 ${task} 脚本。`)
  process.exit(0)
}

for (const workspace of workspaces) {
  const directory = relative(rootDir, workspace.directory)
  console.log(`\n▶ ${workspace.manifest.name}: ${task}`)

  const result = spawnSync(bunExecutable, ['run', '--cwd', directory, task], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`\n✓ ${workspaces.length} 个工作区的 ${task} 脚本执行完成。`)
process.exit(0)
