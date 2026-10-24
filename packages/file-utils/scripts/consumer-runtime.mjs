import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import * as esm from '@robot-admin/file-utils'
import { useExcel as esmExcel } from '@robot-admin/file-utils/excel'
import { useCSV as esmCSV } from '@robot-admin/file-utils/csv'

const require = createRequire(import.meta.url)
const cjs = require('@robot-admin/file-utils')
const { useExcel: cjsExcel } = require('@robot-admin/file-utils/excel')
const { useCSV: cjsCSV } = require('@robot-admin/file-utils/csv')
assert.throws(() => require.resolve('xlsx'), { code: 'MODULE_NOT_FOUND' })

let output
const originalURL = URL.createObjectURL
URL.createObjectURL = blob => { output = blob; return originalURL(blob) }
globalThis.document = {
  body: { appendChild() {} },
  createElement: () => ({ style: {}, click() {}, remove() {} }),
  defaultView: { URL, setTimeout(callback) { callback(); return 0 } },
}
try {
  for (const [format, entry, useExcel, useCSV] of [['esm', esm, esmExcel, esmCSV], ['cjs', cjs, cjsExcel, cjsCSV]]) {
    assert.equal(entry.useExcel, useExcel, `${format} root and Excel entry share one implementation`)
    entry.configureFileUtils({ limits: { maxRows: 1 } })
    assert.throws(() => useCSV().parse('name\nAlice\nBob'), /CSV 行数/, `${format} subpaths share configured context`)
    entry.resetFileUtilsConfig()
    const excel = useExcel()
    await excel.exportToExcel([{ 编号: '9007199254740993', 名称: '精确编号', 金额: 12.5, 内容: '=SUM(1,2)' }], { sheetName: '明细' })
    assert.ok(output instanceof Blob)
    assert.deepEqual(Array.from(new Uint8Array(await output.arrayBuffer()).slice(0, 2)), [80, 75], 'Actual XLSX ZIP bytes')
    const data = await excel.readFile(output)
    assert.equal(data.明细[0].编号, '9007199254740993')
    assert.equal(data.明细[0].金额, 12.5)
    assert.equal(data.明细[0].内容, "'=SUM(1,2)")
    assert.deepEqual(excel.workbook.value.SheetNames, ['明细'])
    await excel.exportMultipleSheets({ 第一页: [{ id: 'A' }], 第二页: [{ id: 'B' }] })
    assert.deepEqual(Object.keys(await excel.readFile(output)), ['第一页', '第二页'])
    console.log(`${format}: real workbook round-trip, formula protection, exact ID, multiple sheets and subpath identity passed without installed xlsx`)
  }
} finally {
  URL.createObjectURL = originalURL
  delete globalThis.document
}
