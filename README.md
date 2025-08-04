# YPH5Pack

> 一款自动化的 H5 项目打包混淆工具，支持 JavaScript 混淆、CSS 压缩、资源复制，并保留或重构目录结构。

## ✨ 功能特色

- ✅ 混淆所有 JS 代码（内联和外链，使用 `javascript-obfuscator`）
- ✅ 压缩所有 CSS（内联和外链，使用 `clean-css`）
- ✅ 支持保留原始目录结构或统一扁平输出
- ✅ 自动复制未处理的静态资源（图片、字体等）
- ✅ 支持处理整个目录或单个 HTML 文件
- ✅ 输出目录自动带时间戳，便于版本管理与对比

## 📦 安装

无需安装为全局模块，直接 clone 使用即可：

```sh
git clone https://github.com/yourname/YPH5Pack.git
cd YPH5Pack
npm install
```

<br/>

## 🚀 使用方法

```
node app.js ./your-html-folder
```

<br/>

## 📁 输出结构示例

```
your-html-folder_20250804_114503/
├── index.html
├── obf_main.js
├── min_style.css
├── assets/
│   └── logo.png
└── ...
```
