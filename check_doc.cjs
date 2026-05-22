const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '蓝牙广播数据文档(初版).doc');
if (!fs.existsSync(docPath)) {
  console.error("Doc file does not exist at", docPath);
  process.exit(1);
}

const buffer = fs.readFileSync(docPath);
console.log("File size:", buffer.length);
console.log("First 16 bytes (Hex):", buffer.slice(0, 16).toString('hex'));
console.log("First 64 characters (UTF-8/ASCII):", buffer.slice(0, 64).toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
