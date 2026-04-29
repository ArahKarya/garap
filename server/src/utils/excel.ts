import ExcelJS from 'exceljs';
import type { Response } from 'express';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: string;
}

export async function exportToExcel<T extends Record<string, unknown>>(
  res: Response,
  filename: string,
  columns: ExcelColumn[],
  rows: T[],
  sheetName = 'Sheet1',
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  for (const row of rows) {
    ws.addRow(row);
  }

  columns.forEach((c, idx) => {
    if (c.format) ws.getColumn(idx + 1).numFmt = c.format;
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
