const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const obfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const argv = require('minimist')(process.argv.slice(2));

const inputPath = argv._[0];
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('❌ 请输入有效的文件路径或目录路径');
  process.exit(1);
}

const keepStructure = argv['keep-structure'] !== false; // 默认为 true
const minifyCss = argv['minify-css'] !== false;         // 默认为 true

// 获取输入路径名（目录或文件名，不带扩展名）
const baseName = path.basename(inputPath, path.extname(inputPath));

// 格式化当前时间为 YYYYMMDD_HHMMSS
function getFormattedTime() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '_' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

// 输出目录：输入路径同级目录下，名字带时间戳
const parentDir = path.dirname(path.resolve(inputPath));
const outputDir = path.join(parentDir, `${baseName}_${getFormattedTime()}`);

console.log(`输入路径: ${inputPath}`);
console.log(`输出目录: ${outputDir}`);

// 根据输入是文件还是目录返回 HTML 文件列表
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (/\.(html?|HTML?)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

function copyAllAssets(fromDir, toDir) {
  if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true });
  const items = fs.readdirSync(fromDir);
  for (const item of items) {
    const srcPath = path.join(fromDir, item);
    const dstPath = path.join(toDir, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyAllAssets(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function getHtmlFilesOrSingle(input) {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    return getHtmlFiles(input);
  } else if (stat.isFile() && /\.(html?|HTML?)$/.test(input)) {
    return [input];
  }
  return [];
}

// 统一输入路径根，用于计算相对路径
const statInput = fs.statSync(inputPath);
const baseInputPath = statInput.isDirectory() ? inputPath : path.dirname(inputPath);

copyAllAssets(baseInputPath, outputDir);

const htmlFiles = getHtmlFilesOrSingle(inputPath);
const handledFiles = new Set();

for (const htmlFilePath of htmlFiles) {
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  const $ = cheerio.load(htmlContent);
  const htmlDir = path.dirname(htmlFilePath);

  // 先算当前 HTML 文件输出路径，用于后续相对路径计算
  const relHtmlPath = keepStructure
    ? path.relative(baseInputPath, htmlFilePath)
    : 'obf_' + path.basename(htmlFilePath);
  const finalHtmlPath = path.join(outputDir, relHtmlPath);

  // 处理 JS
  $('script').each((i, el) => {
    const src = $(el).attr('src');

    if (src) {
      const scriptPath = path.resolve(htmlDir, src);
      if (fs.existsSync(scriptPath)) {
        handledFiles.add(path.resolve(scriptPath));

        const jsContent = fs.readFileSync(scriptPath, 'utf-8');
        const obfuscatedCode = obfuscator.obfuscate(jsContent, {
          compact: true,
          controlFlowFlattening: true,
          selfDefending: true,
          stringArray: true
        }).getObfuscatedCode();

        const relOutputPath = keepStructure
          ? path.relative(baseInputPath, scriptPath)
          : 'obf_' + path.basename(src);
        const newJsPath = path.join(outputDir, relOutputPath);

        fs.mkdirSync(path.dirname(newJsPath), { recursive: true });
        fs.writeFileSync(newJsPath, obfuscatedCode, 'utf-8');

        // 替换为从当前 HTML 输出文件位置到新 JS 文件的相对路径
        const relativeSrc = path.relative(path.dirname(finalHtmlPath), newJsPath).replace(/\\/g, '/');
        $(el).attr('src', relativeSrc);

        console.log(`🔒 混淆并保存 JS: ${newJsPath}`);
      }
    } else {
      // 混淆内联 JS
      const inlineCode = $(el).html();
      const obfuscatedCode = obfuscator.obfuscate(inlineCode).getObfuscatedCode();
      $(el).html(obfuscatedCode);
      console.log(`🔒 混淆内联 JS`);
    }
  });

  // 处理 CSS
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href || !minifyCss) return;

    const cssPath = path.resolve(htmlDir, href);
    if (fs.existsSync(cssPath)) {
      handledFiles.add(path.resolve(cssPath));

      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      const output = new CleanCSS({}).minify(cssContent).styles;

      const relOutputPath = keepStructure
        ? path.relative(baseInputPath, cssPath)
        : 'min_' + path.basename(cssPath);
      const newCssPath = path.join(outputDir, relOutputPath);

      fs.mkdirSync(path.dirname(newCssPath), { recursive: true });
      fs.writeFileSync(newCssPath, output, 'utf-8');

      const relativeHref = path.relative(path.dirname(finalHtmlPath), newCssPath).replace(/\\/g, '/');
      $(el).attr('href', relativeHref);

      console.log(`🎨 压缩并保存 CSS: ${newCssPath}`);
    }
  });

  // 压缩内联 CSS
  if (minifyCss) {
    $('style').each((i, el) => {
      const raw = $(el).html();
      const minified = new CleanCSS({}).minify(raw).styles;
      $(el).html(minified);
      console.log(`🎨 压缩内联 CSS`);
    });
  }

  // 写入处理后的 HTML
  fs.mkdirSync(path.dirname(finalHtmlPath), { recursive: true });
  fs.writeFileSync(finalHtmlPath, $.html(), 'utf-8');
  handledFiles.add(path.resolve(htmlFilePath));
  console.log(`✅ 已保存 HTML：${finalHtmlPath}`);
}

// 复制未处理的静态资源
function copyStaticAssets(fromDir, toDir) {
  const items = fs.readdirSync(fromDir);
  for (const item of items) {
    const fullPath = path.join(fromDir, item);
    const relPath = path.relative(baseInputPath, fullPath);
    const targetPath = path.join(toDir, relPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      copyStaticAssets(fullPath, toDir);
    } else {
      const ext = path.extname(item).toLowerCase();
      const isHandled = handledFiles.has(path.resolve(fullPath));

      // 过滤已处理的文件和 html/js/css，复制其他资源文件
      if (!isHandled && !['.html', '.htm', '.js', '.css'].includes(ext)) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(fullPath, targetPath);
        console.log(`📁 复制静态资源: ${relPath}`);
      }
    }
  }
}

copyStaticAssets(baseInputPath, outputDir);

console.log('\n🎉 所有文件处理完成');
