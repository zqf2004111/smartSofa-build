const fs = require('fs');
const path = require('path');
const WordExtractor = require('word-extractor');

const docPath = path.join(__dirname, '蓝牙广播数据文档(初版).doc');
if (!fs.existsSync(docPath)) {
  console.error("Doc file does not exist at", docPath);
  process.exit(1);
}

const extractor = new WordExtractor();
extractor.extract(docPath)
  .then(doc => {
    fs.writeFileSync(path.join(__dirname, 'doc_content.txt'), doc.getBody());
    console.log('Successfully written doc_content.txt');
  })
  .catch(err => {
    console.error('Error extracting word doc:', err);
    process.exit(1);
  });
