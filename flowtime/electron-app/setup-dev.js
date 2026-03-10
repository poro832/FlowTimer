const fs = require('fs');
const path = require('path');
const link = path.join(__dirname, 'shared');
const target = path.resolve(__dirname, '..', 'shared');

try {
  const stat = fs.lstatSync(link);
  // 깨진 심링크면 제거
  if (stat.isSymbolicLink() && !fs.existsSync(link)) {
    fs.unlinkSync(link);
    fs.symlinkSync(target, link, 'junction');
    console.log('shared junction recreated');
  } else {
    console.log('shared already linked');
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    fs.symlinkSync(target, link, 'junction');
    console.log('shared junction created');
  }
}
