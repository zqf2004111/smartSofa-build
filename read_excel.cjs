const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, 'APP通讯协议功能清单20260429.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error("Excel file does not exist at", excelPath);
  process.exit(1);
}

const workbook = xlsx.readFile(excelPath);
let output = '';

workbook.SheetNames.forEach(sheetName => {
  output += `\n# Sheet: ${sheetName}\n\n`;
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  rows.forEach(row => {
    if (row && row.length > 0) {
      output += row.map(cell => cell !== undefined && cell !== null ? String(cell).replace(/\n/g, ' ') : '').join(' | ') + '\n';
    }
  });
});

fs.writeFileSync(path.join(__dirname, 'excel_content.md'), output);
console.log('Successfully written excel_content.md');
