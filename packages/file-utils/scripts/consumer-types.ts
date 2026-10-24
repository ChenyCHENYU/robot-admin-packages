import { useExcel, type UseExcelReturn } from '@robot-admin/file-utils/excel'
import { createFileUtils } from '@robot-admin/file-utils'

const excel: UseExcelReturn = useExcel()
const workbook = excel.workbook.value
if (workbook) {
  const names: string[] = workbook.SheetNames
  const cell = workbook.Sheets[names[0]]?.A1
  const numberFormat: string | number | undefined = cell?.z
  void numberFormat
}
const contextExcel: UseExcelReturn = createFileUtils().excel
void contextExcel
