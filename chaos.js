const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isImage(ext) {
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

function isTextFile(ext) {
  return ['.js', '.css', '.vue', '.html', '.json', '.txt'].includes(ext);
}

function randomString(len = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

// 修改图片元数据（添加自定义注释）
function modifyImageMetadata(filePath) {
  const comment = `Modified-${randomString(20)}`;
  try {
    execSync(`exiftool -overwrite_original -Comment="${comment}" "${filePath}"`);
    console.log(`Image metadata modified: ${filePath}`);
  } catch (err) {
    console.error(`Failed to modify image metadata: ${filePath}`, err.message);
  }
}

// 修改文本文件，插入随机注释
function modifyTextFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    let comment;
    if (ext === '.js' || ext === '.vue' || ext === '.json') {
      comment = `/* ${randomString(30)} */\n`;
    } else if (ext === '.css' || ext === '.html' || ext === '.txt') {
      comment = `/* ${randomString(30)} */\n`;
    } else {
      comment = `// ${randomString(30)}\n`;
    }
    content = comment + content;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Text file modified: ${filePath}`);
  } catch (err) {
    console.error(`Failed to modify text file: ${filePath}`, err.message);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      traverseDir(fullPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (isImage(ext)) {
        modifyImageMetadata(fullPath);
      } else if (isTextFile(ext)) {
        modifyTextFile(fullPath);
      } else {
        // 其他文件暂不处理
      }
    }
  });
}

const targetDir = process.argv[2] || process.cwd();
if (!fs.existsSync(targetDir)) {
  console.error(`目录不存在: ${targetDir}`);
  process.exit(1);
}
console.log(`开始处理目录: ${targetDir}`);
traverseDir(targetDir);
console.log('全部完成。');
