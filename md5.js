const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ignoredDirs = ['node_modules', '.git', 'dist', 'build', 'out'];

function isImage(ext) {
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

const commentableTextExts = ['.js', '.css', '.vue', '.html', '.txt', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
const noCommentExts = ['.json', '.lock', '.yml', '.yaml', '.toml', '.xml'];
const safeAppendExts = ['.md', '.csv', '.properties', '.ini'];

function randomString(len = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

function modifyImageMetadata(filePath) {
  const comment = `Modified-${randomString(20)}`;
  try {
    execSync(`exiftool -overwrite_original -Comment="${comment}" "${filePath}"`);
    console.log(`Image metadata modified: ${filePath}`);
  } catch (err) {
    console.warn(`exiftool未安装或执行失败，跳过图片修改: ${filePath}`);
  }
}

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
    if (ignoredDirs.includes(file)) {
      console.log(`跳过目录: ${path.join(dir, file)}`);
      return;
    }

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
