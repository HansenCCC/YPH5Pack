const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isImage(ext) {
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

// 明确哪些是纯文本文件可以加注释的
const commentableTextExts = ['.js', '.css', '.vue', '.html', '.txt', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];

// JSON 和类似格式，不允许加注释
const noCommentExts = ['.json', '.lock', '.yml', '.yaml', '.toml', '.xml'];

// 其他不支持注释的文本文件也按无害追加处理
const safeAppendExts = ['.md', '.csv', '.properties', '.ini'];

// 生成随机字符串
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
    console.warn(`exiftool未安装或执行失败，跳过图片修改: ${filePath}`);
  }
}

// 修改文本文件，插入随机注释
function modifyTextFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let content = fs.readFileSync(filePath, 'utf8');

    if (commentableTextExts.includes(ext)) {
      let comment = '';
      if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.mjs', '.cjs'].includes(ext)) {
        comment = `/* ${randomString(30)} */\n`;
      } else if (ext === '.css') {
        comment = `/* ${randomString(30)} */\n`;
      } else if (ext === '.html') {
        comment = `<!-- ${randomString(30)} -->\n`;
      } else if (ext === '.txt') {
        comment = `// ${randomString(30)}\n`;
      } else {
        comment = `/* ${randomString(30)} */\n`;
      }
      content = comment + content;
    } else if (noCommentExts.includes(ext)) {
      if (!content.endsWith('\n')) {
        content += '\n';
      } else {
        content += ' ';
      }
    } else if (safeAppendExts.includes(ext)) {
      if (!content.endsWith('\n')) {
        content += '\n';
      } else {
        content += ' ';
      }
    } else {
      if (!content.endsWith('\n')) {
        content += '\n';
      } else {
        content += ' ';
      }
    }

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
      } else {
        modifyTextFile(fullPath);
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
