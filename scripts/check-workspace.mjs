import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(rootDir, 'packages')
const rootManifest = readJson(join(rootDir, 'package.json'))
const lockfile = readBunLock(join(rootDir, 'bun.lock'))
const rootReadme = readFileSync(join(rootDir, 'README.md'), 'utf8')
const errors = []

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readBunLock(path) {
  const input = readFileSync(path, 'utf8')
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]

    if (inString) {
      output += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    if (character === ',') {
      let next = index + 1
      while (/\s/.test(input[next] ?? '')) next += 1
      if (input[next] === '}' || input[next] === ']') continue
    }

    output += character
  }

  return JSON.parse(output)
}

function assert(condition, message) {
  if (!condition) errors.push(message)
}

assert(rootManifest.private === true, '根项目必须保持 private: true')
assert(rootManifest.version === '0.0.0', '根项目版本必须保持 0.0.0，禁止作为 npm 包发布')
assert(rootManifest.workspaces?.includes('packages/*'), '根项目必须包含 packages/* 工作区')

const packageNames = new Set()
const packageDirectories = readdirSync(packagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(packagesDir, entry.name, 'package.json')))
  .map(entry => entry.name)
  .sort((left, right) => left.localeCompare(right, 'en'))

for (const directory of packageDirectories) {
  const packageDir = join(packagesDir, directory)
  const manifest = readJson(join(packageDir, 'package.json'))
  const label = manifest.name ?? directory

  assert(/^@robot-admin\/[a-z0-9-]+$/.test(manifest.name ?? ''), `${label}: 包名必须使用 @robot-admin/*`)
  assert(!packageNames.has(manifest.name), `${label}: 包名重复`)
  packageNames.add(manifest.name)

  assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? ''), `${label}: 版本号不符合 SemVer`)
  assert(manifest.private !== true, `${label}: 可发布子包不能标记为 private`)
  assert(manifest.license === 'MIT', `${label}: license 必须为 MIT`)
  assert(manifest.repository?.directory === `packages/${directory}`, `${label}: repository.directory 不正确`)
  assert(manifest.publishConfig?.access === 'public', `${label}: publishConfig.access 必须为 public`)
  assert(manifest.publishConfig?.registry === 'https://registry.npmjs.org/', `${label}: npm registry 不正确`)
  assert(lockfile.workspaces?.[`packages/${directory}`]?.version === manifest.version, `${label}: bun.lock 工作区版本未同步为 ${manifest.version}`)

  for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE']) {
    assert(existsSync(join(packageDir, file)), `${label}: 缺少 ${file}`)
  }

  for (const script of ['build', 'test', 'type-check', 'prepublishOnly']) {
    assert(Boolean(manifest.scripts?.[script]), `${label}: 缺少 ${script} 脚本`)
  }

  for (const file of ['dist', 'README.md', 'LICENSE']) {
    assert(manifest.files?.includes(file), `${label}: files 未包含 ${file}`)
  }

  const readmeLine = rootReadme
    .split(/\r?\n/)
    .find(line => line.includes(`[${manifest.name}](./packages/${directory})`))
  assert(Boolean(readmeLine), `${label}: 根 README 缺少包入口`)
  assert(readmeLine?.includes(`\`${manifest.version}\``), `${label}: 根 README 版本未同步为 ${manifest.version}`)

  for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dependency, range] of Object.entries(manifest[group] ?? {})) {
      assert(!String(range).startsWith('workspace:'), `${label}: ${group}.${dependency} 不能携带 workspace: 协议进入发布流程`)
    }
  }
}

const ignoredDirectories = new Set(['.git', '.cache', 'coverage', 'dist', 'node_modules'])

function collectRepositoryFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectRepositoryFiles(path)
    }
    return entry.isFile() ? [path] : []
  })
}

for (const path of collectRepositoryFiles(rootDir)) {
  if (!existsSync(path) || statSync(path).size > 1_000_000) continue

  const content = readFileSync(path)
  if (content.includes(0)) continue

  const text = content.toString('utf8')
  const file = relative(rootDir, path)
  assert(!/npm_[A-Za-z0-9]{20,}/.test(text), `${file}: 检测到疑似 npm token`)
  assert(!/:_authToken\s*=\s*(?!\$\{)[^\s]+/.test(text), `${file}: 检测到持久化 npm 凭证`)
}

if (errors.length > 0) {
  console.error(`工作区契约检查失败（${errors.length} 项）：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`✓ 工作区契约检查通过：${packageDirectories.length} 个包，README、版本、发布元数据与凭证边界一致。`)
